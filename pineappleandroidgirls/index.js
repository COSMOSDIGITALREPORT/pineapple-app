/**
 * @format
 */

import { AppRegistry, NativeModules, Text, TextInput } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from './App';
import { name as appName } from './app.json';

// Universal Font Scaling Safeguard:
// Prevents high Android system font size settings from distorting layouts, cards, drawer menus & modals
if (Text.defaultProps == null) Text.defaultProps = {};
Text.defaultProps.allowFontScaling = false;
Text.defaultProps.maxFontSizeMultiplier = 1.0;

if (TextInput.defaultProps == null) TextInput.defaultProps = {};
TextInput.defaultProps.allowFontScaling = false;
TextInput.defaultProps.maxFontSizeMultiplier = 1.0;

const { RingtoneModule } = NativeModules;

// Register background handler for FCM notifications
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[FCM] Message handled in background:', remoteMessage);
  const type = remoteMessage?.data?.type;

  if (type === 'incoming_call') {
    try {
      await AsyncStorage.setItem('@pineapple_pending_incoming_call', JSON.stringify(remoteMessage.data));
      // NOTE: Do NOT call RingtoneModule.showCallNotification here.
      // Native PineappleFirebaseMessagingService already handles incoming call notification & activity launch.
    } catch (_) {}
  } else if (type === 'call_cancelled' || type === 'call_ended') {
    try {
      await AsyncStorage.removeItem('@pineapple_pending_incoming_call');
      RingtoneModule?.dismissCallNotification?.();
      RingtoneModule?.stopRingtone?.();
    } catch (_) {}
  }
});

AppRegistry.registerComponent(appName, () => App);
