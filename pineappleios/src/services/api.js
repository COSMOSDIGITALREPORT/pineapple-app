import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 👇 Yahan apna ngrok URL daal do (ngrok http 3000 run karo terminal mein)
// Simulator: localhost:3000 (iOS) / 10.0.2.2:3000 (Android emulator)
// Real device: ngrok URL daal do jaise 'https://abc123.ngrok-free.app'
const NGROK_URL = 'https://pineapple-eynu.onrender.com';
const IS_REAL_DEVICE = true;

const BASE_URL = IS_REAL_DEVICE
  ? NGROK_URL
  : Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

// ── HTTP helper ─────────────────────────────────────────────────────────────
async function request(method, path, body) {
  const token = await AsyncStorage.getItem('auth_token');
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let bodyText;
  try {
    bodyText = await res.text();
  } catch {}
  let data;
  try {
    data = JSON.parse(bodyText);
  } catch {
    throw new Error(`API returned non-JSON (status ${res.status}): ${bodyText?.substring(0, 200)}`);
  }
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

const get  = (path)        => request('GET',    path);
const post = (path, body)  => request('POST',   path, body);
const put  = (path, body)  => request('PUT',    path, body);
const del  = (path)        => request('DELETE', path);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const sendOtp = (phone) => post('/auth/send-otp', { phone });

export const verifyOtp = async (phone, otp, gender) => {
  const data = await post('/auth/verify-otp', { phone, otp, gender });
  await AsyncStorage.setItem('auth_token', data.token);
  return data;
};

export const firebaseLogin = async (idToken, gender) => {
  const data = await post('/auth/firebase-login', { idToken, gender });
  await AsyncStorage.setItem('auth_token', data.token);
  return data;
};

export const googleAuth = (idToken) => post('/auth/google', { idToken });
export const logout = () => AsyncStorage.removeItem('auth_token');

// ── Users ────────────────────────────────────────────────────────────────────
export const getMe = () => get('/users/me');

export const updateProfile = (profile) => put('/users/me', profile);

export const uploadAvatar = async (fileUri) => {
  const token = await AsyncStorage.getItem('auth_token');
  const formData = new FormData();
  const filename = fileUri.split('/').pop();
  const ext = filename.split('.').pop().toLowerCase();
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  formData.append('photo', { uri: fileUri, name: filename, type: mime });
  const res = await fetch(`${BASE_URL}/upload/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
    body: formData,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Upload failed: server error'); }
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.url;
};

export const getLiveUsers = () => get('/users/live');
export const getTopGirls  = () => get('/users/top');

export const setOffline = () => put('/users/me/offline');

// ── Calls ────────────────────────────────────────────────────────────────────
export const initiateCall = (receiverId, type = 'audio') =>
  post('/calls/initiate', { receiverId, type });

export const getReceiverToken = (callId) => get(`/calls/${callId}/receiver-token`);

export const endCall = (callId, durationSeconds) =>
  put(`/calls/${callId}/end`, { duration: durationSeconds });

export const getCallHistory = async () => {
  const rows = await get('/calls/history');
  const userId = await AsyncStorage.getItem('user_id');

  return rows.map((c) => {
    const isCaller = c.caller_id === userId;
    return {
      id:         c.id,
      type:       c.type,
      status:     c.status === 'ended' ? 'completed' : c.status,
      duration:   formatDuration(c.duration_seconds),
      created_at: c.created_at,
      other_user: {
        name:       isCaller ? c.receiver_name : c.caller_name,
        avatar_url: isCaller ? c.receiver_avatar : c.caller_avatar,
        is_online:  false,
      },
    };
  });
};

function formatDuration(seconds = 0) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ── Rooms ────────────────────────────────────────────────────────────────────
export const getRooms    = ()                         => get('/rooms');
export const createRoom  = (name, topic, language)    => post('/rooms', { name, topic, language });
export const joinRoom    = (roomId)                   => post(`/rooms/${roomId}/join`);
export const leaveRoom   = (roomId)                   => post(`/rooms/${roomId}/leave`);
export const endRoom     = (roomId)                   => del(`/rooms/${roomId}`);

// ── Wallet ───────────────────────────────────────────────────────────────────
export const getWallet = () => get('/wallet');

export const sendGift = (receiverId, giftType, coinsCost) =>
  post('/wallet/gift', { receiverId, giftType, coinsCost });

export const redeemGiftApi = (giftValue, giftLabel) =>
  post('/wallet/redeem-gift', { giftValue, giftLabel });

// ── Premium ───────────────────────────────────────────────────────────────────
export const getPlans   = () => get('/premium/plans');
export const subscribe  = (planId) => post('/premium/subscribe', { planId });

// ── Spin ──────────────────────────────────────────────────────────────────────
const SPIN_META = {
  coins:   { emoji: '🍍', label: 'Coins' },
  minutes: { emoji: '⏱️', label: 'Minutes' },
  jackpot: { emoji: '💎', label: 'Jackpot!' },
};

export const getSpinStatus = () => get('/spin/status');

export const spin = async () => {
  const data = await post('/spin');
  return { prizeIndex: data.prizeIndex, prize: data.prize, coins: data.coins };
};


export const createPaymentOrder = (packageId) => post('/payment/create-order', { packageId });
export const verifyPayment = (data) => post('/payment/verify', data);

export const reportUser    = (userId, reason) => post(`/users/${userId}/report`, { reason });
export const blockUser     = (userId)         => post(`/users/${userId}/block`, {});
export const unblockUser   = (userId)         => request('DELETE', `/users/${userId}/block`);
export const getBlockedUsers = ()             => get('/users/blocked');
export const deleteAccount = ()               => request('DELETE', '/users/me');

// ── Ratings ──────────────────────────────────────────────────────────────────
export const rateUser = (userId, stars, callId, review = '', tags = []) => post(`/users/${userId}/rate`, { stars, callId, review, tags });
export const getUserReviews = (userId) => get(`/users/${userId}/reviews`);
