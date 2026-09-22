import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 👇 Yahan apna ngrok URL daal do (ngrok http 3000 run karo terminal mein)
const NGROK_URL = 'https://pineapple-backend-f0yj.onrender.com';
const LOCAL_IP  = 'http://192.168.31.238:3000';
const IS_REAL_DEVICE = true; // simulator ke liye false, real device ke liye true

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

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error('Network request failed. Check your internet connection and make sure the server is running.');
  }

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Server error (${res.status})`); }
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
  const data = await post("/auth/verify-otp", { phone, otp, gender });
  await AsyncStorage.setItem('auth_token', data.token);
  return data;
};

export const firebaseLogin = async (idToken, gender) => {
  const data = await post('/auth/firebase-login', { idToken, gender });
  await AsyncStorage.setItem('auth_token', data.token);
  return data;
};

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

  return (rows || []).map((c) => {
    const isCaller = c.caller_id === userId;
    const otherId = c.other_user_id || (isCaller ? c.receiver_id : c.caller_id);
    const otherName = c.other_user_name || (isCaller ? c.receiver_name : c.caller_name) || 'User';
    const otherAvatar = c.other_user_avatar || (isCaller ? c.receiver_avatar : c.caller_avatar);
    const secs = Number(c.duration_seconds) || 0;
    const callType = c.call_type || c.type || 'audio';
    return {
      ...c,
      id:         c.id,
      call_type:  callType,
      type:       callType,
      status:     c.status === 'ended' ? 'completed' : c.status,
      duration_seconds: secs,
      duration:   formatDuration(secs),
      created_at: c.created_at,
      other_user_id: otherId,
      other_user_name: otherName,
      other_user_avatar: otherAvatar,
      other_user: {
        id:         otherId,
        name:       otherName,
        avatar_url: otherAvatar,
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

// ── Earnings (Girls) ─────────────────────────────────────────────────────────
export const getEarnings       = ()             => get('/earnings');
export const requestWithdrawal = (amount, upi_id, sameDay = false) => post('/earnings/withdraw', { amount, upi_id, sameDay });
export const getWithdrawals    = ()             => get('/earnings/withdrawals');

// ── Rooms ────────────────────────────────────────────────────────────────────
export const getRooms    = ()                         => get('/rooms');
export const createRoom  = (name, topic, language)    => post('/rooms', { name, topic, language });
export const joinRoom    = (roomId)                   => post(`/rooms/${roomId}/join`);
export const leaveRoom   = (roomId)                   => post(`/rooms/${roomId}/leave`);
export const endRoom     = (roomId)                   => del(`/rooms/${roomId}`);

// ── Wallet ───────────────────────────────────────────────────────────────────
export const getWallet = () => get('/wallet');
export const getTransactions = () => get('/wallet/transactions');

export const sendGift = (receiverId, giftType, coinsCost) =>
  post('/wallet/gift', { receiverId, giftType, coinsCost });

// ── Premium ───────────────────────────────────────────────────────────────────
export const getPlans   = () => get('/premium/plans');
export const subscribe  = (planId) => post('/premium/subscribe', { planId });

// ── Spin ──────────────────────────────────────────────────────────────────────
const SPIN_META = {
  coins:   { emoji: '🍍', label: 'Coins' },
  minutes: { emoji: '⏱️', label: 'Minutes' },
  jackpot: { emoji: '💎', label: 'Jackpot!' },
};

export const spin = async () => {
  const data = await post('/spin');
  const meta = SPIN_META[data.reward.type] || { emoji: '🎁', label: 'Gift' };
  return {
    reward: {
      type:  data.reward.type,
      value: data.reward.value,
      label: `${meta.label} x${data.reward.value}`,
      emoji: meta.emoji,
    },
  };
};

// ── Payment (Razorpay) ────────────────────────────────────────────────────────
export const createPaymentOrder = (packageId) => post('/payment/create-order', { packageId });
export const verifyPayment = (razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId) =>
  post('/payment/verify', { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId });

// ── Block & Report ────────────────────────────────────────────────────────────
export const blockUser       = (userId)        => post(`/users/${userId}/block`, {});
export const unblockUser     = (userId)        => request('DELETE', `/users/${userId}/block`);
export const getBlockedUsers = ()              => get('/users/blocked');
export const reportUser      = (userId, reason) => post(`/users/${userId}/report`, { reason });

// ── Ratings ──────────────────────────────────────────────────────────────────
export const rateUser = (userId, stars, callId, review = '', tags = []) => post(`/users/${userId}/rate`, { stars, callId, review, tags });
export const getUserReviews = (userId) => get(`/users/${userId}/reviews`);

export const getSupportMessages = () => get('/support/messages');
export const sendSupportMessage = (message, is_quick_faq = false) => post('/support/messages', { message, is_quick_faq });
