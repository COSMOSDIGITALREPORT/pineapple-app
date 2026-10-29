/**
 * @format
 */

import { AppRegistry, NativeModules } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from './App';
import { name as appName } from './app.json';

const { RingtoneModule } = NativeModules;

// Register background handler for FCM notifications
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[FCM] Message handled in background:', remoteMessage);
  const type = remoteMessage?.data?.type;

  if (type === 'incoming_call') {
    try {
      await AsyncStorage.setItem('@pineapple_pending_incoming_call', JSON.stringify(remoteMessage.data));
    } catch (_) {}
  } else if (type === 'call_cancelled' || type === 'call_ended') {
    try {
      await AsyncStorage.removeItem('@pineapple_pending_incoming_call');
      RingtoneModule?.dismissCallNotification?.();
    } catch (_) {}
  }
});

AppRegistry.registerComponent(appName, () => App);
