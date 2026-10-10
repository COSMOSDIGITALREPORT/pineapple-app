import { Platform, PermissionsAndroid, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveFcmToken } from './api';

/**
 * Request notification permissions (including Android 13+ POST_NOTIFICATIONS)
 */
export async function requestNotificationPermission() {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('[FCM] Notification permission denied by user');
        return false;
      }
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log('[FCM] Permission status:', authStatus, 'enabled:', enabled);
    return enabled;
  } catch (err) {
    console.warn('[FCM] Permission request failed:', err?.message || err);
    return false;
  }
}

/**
 * Retrieves FCM token and syncs it with backend server
 */
export async function syncFcmToken(userIdOverride) {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return null;

    const token = await messaging().getToken();
    if (token) {
      console.log('[FCM] Token acquired:', token.substring(0, 15) + '...');
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
        console.log('[FCM] Token synced to backend successfully for user:', userId);
      } catch (apiErr) {
        console.log('[FCM] Backend sync deferred (user not yet authenticated)');
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

export function getPendingIncomingCall() {
  const call = pendingIncomingCall;
  pendingIncomingCall = null;
  return call;
}

export function onIncomingCallNotification(listener) {
  incomingCallListeners.add(listener);
  // If there was an incoming call received while no listeners were registered, dispatch immediately
  if (pendingIncomingCall) {
    const call = pendingIncomingCall;
    pendingIncomingCall = null;
    try {
      listener(call);
    } catch (e) {
      console.warn('[FCM] Pending call listener error:', e);
    }
  }
  return () => incomingCallListeners.delete(listener);
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

/**
 * Sets up foreground and background notification listeners
 */
export function setupNotificationListeners(onNotificationPress) {
  // 1. Token Refresh listener
  const unsubscribeToken = messaging().onTokenRefresh(async (newToken) => {
    console.log('[FCM] Token refreshed');
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
    if (remoteMessage.data?.type === 'incoming_call') {
      notifyIncomingCall(remoteMessage.data);
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
    if (remoteMessage?.data?.type === 'incoming_call') {
      pendingIncomingCall = remoteMessage.data;
      notifyIncomingCall(remoteMessage.data);
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
        if (remoteMessage?.data?.type === 'incoming_call') {
          pendingIncomingCall = remoteMessage.data;
          notifyIncomingCall(remoteMessage.data);
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
