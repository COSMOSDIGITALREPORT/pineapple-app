/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from './App';
import { name as appName } from './app.json';

// Register background handler for FCM notifications
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[FCM] Message handled in background:', remoteMessage);
  if (remoteMessage?.data?.type === 'incoming_call') {
    try {
      await AsyncStorage.setItem('@pineapple_pending_incoming_call', JSON.stringify(remoteMessage.data));
    } catch (_) {}
  }
});

AppRegistry.registerComponent(appName, () => App);
