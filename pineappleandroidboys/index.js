/**
 * @format
 */

import { AppRegistry, Text, TextInput } from 'react-native';
import messaging from '@react-native-firebase/messaging';
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

// Register background handler for FCM notifications
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[FCM] Message handled in background:', remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
