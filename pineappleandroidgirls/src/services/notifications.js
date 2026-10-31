import { Platform, PermissionsAndroid, Alert, NativeModules, DeviceEventEmitter } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveFcmToken } from './api';

const { RingtoneModule } = NativeModules;

/**
 * Request notification permissions (including Android 13+ POST_NOTIFICATIONS)
 */
export async function requestNotificationPermission() {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('[FCM] Notification permission denied by user');
          return false;
        }
      }
      return true;
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log('[FCM] Permission status:', authStatus, 'enabled:', enabled);
    return enabled;
  } catch (err) {
    console.warn('[FCM] Permission request failed:', err?.message || err);
    return Platform.OS === 'android';
  }
}

/**
 * Retrieves FCM token and syncs it with backend server
 */
export async function syncFcmToken(userIdOverride) {
  try {
    // Request permission in background, but do NOT block token retrieval
    requestNotificationPermission().catch(() => {});

    const token = await messaging().getToken();
    if (token) {
      console.log('[PineappleCall] FCM Token acquired:', token.substring(0, 15) + '...');
      await AsyncStorage.setItem('fcm_token', token);

      let userId = userIdOverride;
      if (!userId) {
        try {
          const session = await AsyncStorage.getItem('user_session');
          if (session) {
            const parsed = JSON.parse(session);
            userId = parsed?.user?.id;
          }
        } catch (_) {}
      }
      if (!userId) {
        try {
          userId = await AsyncStorage.getItem('user_id');
        } catch (_) {}
      }

      // Sync with backend
      try {
        await saveFcmToken(token, userId);
        console.log('[PineappleCall] Token synced to backend successfully for user:', userId);
      } catch (apiErr) {
        console.log('[PineappleCall] Backend sync deferred (user not yet authenticated)');
      }
    }

    return token;
  } catch (err) {
    console.warn('[FCM] Token acquisition failed:', err?.message || err);
    return null;
  }
}

let pendingIncomingCall = null;
const incomingCallListeners = new Set();
const callCancelledListeners = new Set();

export async function getPendingIncomingCall() {
  if (Platform.OS === 'android' && RingtoneModule?.getInitialCallData) {
    try {
      const initialCall = await RingtoneModule.getInitialCallData();
      if (initialCall && initialCall.callId) {
        return initialCall;
      }
    } catch (_) {}
  }

  if (pendingIncomingCall) {
    const call = pendingIncomingCall;
    pendingIncomingCall = null;
    return call;
  }
  try {
    const raw = await AsyncStorage.getItem('@pineapple_pending_incoming_call');
    if (raw) {
      await AsyncStorage.removeItem('@pineapple_pending_incoming_call');
      return JSON.parse(raw);
    }
  } catch (_) {}
  return null;
}

export function onIncomingCallNotification(listener) {
  incomingCallListeners.add(listener);

  if (pendingIncomingCall) {
    const call = pendingIncomingCall;
    pendingIncomingCall = null;
    try {
      listener(call);
    } catch (e) {
      console.warn('[FCM] Pending call listener error:', e);
    }
  } else {
    getPendingIncomingCall().then((pending) => {
      if (pending) {
        try { listener(pending); } catch (_) {}
      }
    }).catch(() => {});
  }

  const subNative = DeviceEventEmitter.addListener('onIncomingCall', (data) => {
    notifyIncomingCall(data);
  });

  return () => {
    incomingCallListeners.delete(listener);
    subNative.remove();
  };
}

export function onCallCancelledNotification(listener) {
  callCancelledListeners.add(listener);

  const subNative = DeviceEventEmitter.addListener('onCallCancelled', (data) => {
    notifyCallCancelled(data);
  });

  return () => {
    callCancelledListeners.delete(listener);
    subNative.remove();
  };
}

function notifyIncomingCall(data) {
  if (incomingCallListeners.size === 0) {
    pendingIncomingCall = data;
    return;
  }
  incomingCallListeners.forEach((fn) => {
    try {
      fn(data);
    } catch (e) {
      console.warn('[FCM] Incoming call listener error:', e);
    }
  });
}

function notifyCallCancelled(data) {
  pendingIncomingCall = null;
  AsyncStorage.removeItem('@pineapple_pending_incoming_call').catch(() => {});
  try { RingtoneModule?.dismissCallNotification?.(); } catch (_) {}

  callCancelledListeners.forEach((fn) => {
    try {
      fn(data);
    } catch (e) {
      console.warn('[FCM] Call cancelled listener error:', e);
    }
  });
}

/**
 * Sets up foreground and background notification listeners
 */
export function setupNotificationListeners(onNotificationPress) {
  // 1. Token Refresh listener
  const unsubscribeToken = messaging().onTokenRefresh(async (newToken) => {
    console.log('[PineappleCall] onTokenRefresh acquired new token:', newToken.substring(0, 15) + '...');
    await AsyncStorage.setItem('fcm_token', newToken);
    try {
      let userId = null;
      try {
        const session = await AsyncStorage.getItem('user_session');
        if (session) {
          const parsed = JSON.parse(session);
          userId = parsed?.user?.id;
        }
      } catch (_) {}
      await saveFcmToken(newToken, userId);
    } catch (_) {}
  });

  // 2. Foreground notifications (show in-app alert or trigger call modal)
  const unsubscribeMessage = messaging().onMessage(async (remoteMessage) => {
    console.log('[FCM] Foreground notification received:', remoteMessage);
    const type = remoteMessage.data?.type;

    if (type === 'incoming_call') {
      notifyIncomingCall(remoteMessage.data);
      return;
    }
    if (type === 'call_cancelled' || type === 'call_ended') {
      notifyCallCancelled(remoteMessage.data);
      return;
    }

    const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'Pineapple';
    const body  = remoteMessage.notification?.body  || remoteMessage.data?.body  || '';

    if (title || body) {
      Alert.alert(title, body);
    }
  });

  // 3. User tapped notification while app was in background
  const unsubscribeOpenedApp = messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('[FCM] Notification opened from background:', remoteMessage);
    const type = remoteMessage?.data?.type;

    if (type === 'incoming_call') {
      pendingIncomingCall = remoteMessage.data;
      notifyIncomingCall(remoteMessage.data);
      return;
    }
    if (type === 'call_cancelled' || type === 'call_ended') {
      notifyCallCancelled(remoteMessage.data);
      return;
    }

    if (onNotificationPress && remoteMessage) {
      onNotificationPress(remoteMessage);
    }
  });

  // 4. App opened from quit state via notification tap
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('[FCM] Notification opened from quit state:', remoteMessage);
        const type = remoteMessage?.data?.type;

        if (type === 'incoming_call') {
          pendingIncomingCall = remoteMessage.data;
          notifyIncomingCall(remoteMessage.data);
          return;
        }
        if (type === 'call_cancelled' || type === 'call_ended') {
          notifyCallCancelled(remoteMessage.data);
          return;
        }

        if (onNotificationPress) {
          onNotificationPress(remoteMessage);
        }
      }
    })
    .catch((err) => console.warn('[FCM] getInitialNotification error:', err));

  return () => {
    unsubscribeToken();
    unsubscribeMessage();
    unsubscribeOpenedApp();
  };
}
