import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { store } from './src/store';
import { acceptWarning, setProfile, setLoggedIn, setAuthUser } from './src/store/slices/userSlice';
import { Gradients } from './src/theme/colors';

import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen1 from './src/screens/OnboardingScreen1';
import LoginScreen from './src/screens/LoginScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import HomeScreen from './src/screens/GirlsHomeScreen';

function MainApp() {
  const dispatch = useDispatch();
  const [screen, setScreen] = useState('splash');

  const handleLoginSuccess = (userData) => {
    dispatch(setLoggedIn(true));
    dispatch(setProfile({ gender: 'girl' }));
    AsyncStorage.setItem('gender', 'girl').catch(() => {});
    const isNewUser = !userData?.name || userData.name.trim() === '';
    setScreen(isNewUser ? 'profileSetup' : 'home');
  };

  return (
    <SafeAreaProvider>
      {screen === 'splash' &&
      <SplashScreen onComplete={async () => {
        try {
          const [[, session], [, warningDone]] = await AsyncStorage.multiGet([
            'user_session', 'warning_accepted',
          ]);
          if (session) {
            const { token, user: u } = JSON.parse(session);
            dispatch(setAuthUser({ token, user: u }));
            dispatch(acceptWarning());
            dispatch(setProfile({ gender: 'girl', name: u.name, avatar_url: u.avatar_url }));
            setScreen('home');
            return;
          }
          if (!warningDone) { setScreen('onboarding'); return; }
          dispatch(acceptWarning());
          setScreen('login');
        } catch {
          setScreen('onboarding');
        }
      }} />
      }

      {screen === 'onboarding' &&
      <OnboardingScreen1
        onNext={() => setScreen('login')}
        onLogin={() => setScreen('login')} />
      }

      {screen === 'login' &&
      <LoginScreen onLoginSuccess={handleLoginSuccess} />
      }

      {screen === 'profileSetup' &&
      <ProfileSetupScreen onComplete={() => setScreen('home')} />
      }

      {screen === 'home' &&
      <HomeScreen onLogout={() => {
        AsyncStorage.multiRemove(['auth_token', 'user_id', 'user_session', 'gender']).catch(() => {});
        setScreen('login');
      }} />
      }
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <MainApp />
    </Provider>
  );
}