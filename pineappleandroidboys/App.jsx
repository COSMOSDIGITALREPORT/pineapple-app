import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { store } from './src/store';
import { acceptWarning, setProfile, setLoggedIn, addCoins, setAuthUser, setCoins } from './src/store/slices/userSlice';
import { getMe, createPaymentOrder, verifyPayment } from './src/services/api';
import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_LOGO } from './src/assets/razorpay_logo';
import { Gradients } from './src/theme/colors';

import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen1 from './src/screens/OnboardingScreen1';
import SafetyScreen from './src/screens/SafetyScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import HomeScreen from './src/screens/HomeScreen';

const WELCOME_PLANS = [
  { id: 'starter', packId: 'pack_100', mins: 120, price: '₹100', priceNum: 100, emoji: '📞', colors: ['#FF3870','#C0004A'] },
  { id: 'popular', packId: 'pack_200', mins: 240, price: '₹200', priceNum: 200, emoji: '⭐', colors: ['#FF3870','#C0004A'] },
  { id: 'premium', packId: 'pack_500', mins: 700, price: '₹500', priceNum: 500, emoji: '🎰', colors: ['#FF3870','#C0004A'], popular: true },
];

function WelcomeModal({ visible, onBuy, onSkip }) {
  const [selected, setSelected] = useState('premium');
  const plan = WELCOME_PLANS.find((p) => p.id === selected);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={mStyles.overlay}>
        <View style={mStyles.card}>

          {/* close button — absolute so it doesn't shift layout */}
          <TouchableOpacity style={mStyles.closeBtn} onPress={onSkip} activeOpacity={0.7}>
            <Text style={mStyles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {/* centered icon */}
          <LinearGradient colors={['#FF3870','#C0004A']} start={{x:0,y:0}} end={{x:1,y:1}} style={mStyles.topIcon}>
            <Text style={{fontSize:34}}>🎰</Text>
          </LinearGradient>

          <Text style={mStyles.title}>Get Calling Minutes</Text>
          <Text style={mStyles.sub}>Talk to girls · Send gifts · Spin the Fortune Wheel</Text>

          {/* plans */}
          <View style={mStyles.plans}>
            {WELCOME_PLANS.map((p) => {
              const isActive = selected === p.id;
              return (
                <TouchableOpacity key={p.id} onPress={() => setSelected(p.id)} activeOpacity={0.85} style={mStyles.planWrap}>
                  {isActive ? (
                    <View style={mStyles.planActive}>
                      <LinearGradient colors={p.colors} start={{x:0,y:0}} end={{x:1,y:0}} style={StyleSheet.absoluteFill} />
                      <Text style={mStyles.planEmoji}>{p.emoji}</Text>
                      <Text style={mStyles.planMinsActive}>{p.mins} mins</Text>
                      <View style={{flex:1}}/>
                      <Text style={mStyles.planPriceActive}>{p.price}</Text>
                    </View>
                  ) : (
                    <View style={mStyles.planRow}>
                      <Text style={mStyles.planEmoji}>{p.emoji}</Text>
                      <Text style={mStyles.planMins}>{p.mins} mins</Text>
                      <View style={{flex:1}}/>
                      <Text style={mStyles.planPrice}>{p.price}</Text>
                    </View>
                  )}
                  {p.popular && (
                    <View style={mStyles.hotBadge}><Text style={mStyles.hotText}>🔥 Best</Text></View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={() => onBuy(plan)} activeOpacity={0.9} style={mStyles.buyBtn}>
            <View style={mStyles.buyGrad}>
              <LinearGradient colors={plan?.colors || Gradients.primary} start={{x:0,y:0}} end={{x:1,y:0}} style={StyleSheet.absoluteFill} />
              <Text style={mStyles.buyText}>Get {plan?.mins} Minutes  ·  {plan?.price}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={onSkip} style={mStyles.skipBtn}>
            <Text style={mStyles.skipText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function MainApp() {
  const dispatch = useDispatch();
  const userPhone = useSelector((s) => s.user.phone);
  const [screen, setScreen] = useState('splash');
  const [showWelcome, setShowWelcome] = useState(false);

  const handleLoginSuccess = (userData) => {
    dispatch(setLoggedIn(true));
    dispatch(setProfile({ gender: 'boy' }));
    AsyncStorage.setItem('gender', 'boy').catch(() => {});
    const isNewUser = !userData?.name || userData.name.trim() === '';
    if (isNewUser) {
      setScreen('profileSetup');
    } else {
      setScreen('home');
      setShowWelcome(true);
    }
  };

  const handleBuyPlan = async (plan) => {
    try {
      const order = await createPaymentOrder(plan.packId);
      const options = {
        description: `${plan.mins} Calling Minutes`,
        currency: 'INR',
        key: order.keyId,
        amount: order.amount,
        order_id: order.orderId,
        name: 'Pineapple',
        image: RAZORPAY_LOGO,
        prefill: { contact: userPhone || '', email: '' },
        theme: { color: '#FF3870', backdrop_color: 'rgba(0,0,0,0.75)' },
      };
      const data = await RazorpayCheckout.open(options);
      const result = await verifyPayment({
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
        packageId: plan.packId,
      });
      dispatch(addCoins(result.minsAdded));
      dispatch(setProfile({
        isPremium: result.isPremium,
        planId: result.planId,
        intro9Used: result.intro9Used ?? (plan.packId === 'pack_9' ? true : undefined),
        intro_9_used: result.intro_9_used ?? (plan.packId === 'pack_9' ? true : undefined),
      }));
    } catch (err) {
      // user cancelled (err.code === 0) — do nothing
    } finally {
      setShowWelcome(false);
    }
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
            dispatch(setProfile({ gender: 'boy', name: u.name, avatar_url: u.avatar_url }));
            try {
              const fresh = await getMe();
              if (fresh) {
                dispatch(setCoins(fresh.coins ?? fresh.minutes ?? 0));
                dispatch(setProfile({ ...fresh, gender: 'boy' }));
              }
            } catch (_) {}
            setScreen('home');
            return;
          }
          if (warningDone === 'true') dispatch(acceptWarning());
          if (!warningDone) { setScreen('onboarding'); return; }
          setScreen('login');
        } catch {
          setScreen('onboarding');
        }
      }} />
      }

      {screen === 'onboarding' &&
      <OnboardingScreen1
        onNext={() => setScreen('safety')}
        onLogin={() => setScreen('safety')} />
      }

      {screen === 'safety' &&
      <SafetyScreen onAccept={() => {
        dispatch(acceptWarning());
        AsyncStorage.setItem('warning_accepted', 'true').catch(() => {});
        setScreen('login');
      }} />
      }

      {screen === 'login' &&
      <LoginScreen onLoginSuccess={handleLoginSuccess} />
      }

      {screen === 'profileSetup' &&
      <ProfileSetupScreen onComplete={() => { setScreen('home'); setShowWelcome(true); }} />
      }

      {screen === 'home' &&
      <HomeScreen onLogout={() => {
        AsyncStorage.multiRemove(['auth_token', 'user_id', 'user_session']).catch(() => {});
        setShowWelcome(false);
        setScreen('login');
      }} />
      }

      <WelcomeModal
        visible={showWelcome}
        onBuy={handleBuyPlan}
        onSkip={() => setShowWelcome(false)}
      />
    </SafeAreaProvider>
  );
}

const mStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#1A0A04',
    borderRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#FF5A7A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  topIcon: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#FF3870',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  title: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center' },
  sub: {
    fontSize: 13, color: 'rgba(255,255,255,0.7)',
    marginTop: 6, marginBottom: 24,
    textAlign: 'center', lineHeight: 20,
  },

  plans: { width: '100%', gap: 14, marginBottom: 22 },

  /* wrapper for each plan row — no overflow:hidden so badge shows */
  planWrap: { width: '100%' },

  planRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  planEmoji: { fontSize: 22 },
  planMins: { fontSize: 16, fontWeight: '800', color: '#fff', flex: 1 },
  planPrice: { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.65)' },

  planActive: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 16,
    overflow: 'hidden',
  },
  planMinsActive: { fontSize: 16, fontWeight: '900', color: '#fff', flex: 1 },
  planPriceActive: { fontSize: 16, fontWeight: '900', color: '#fff' },

  /* badge sits on top of planWrap, outside the gradient */
  hotBadge: {
    position: 'absolute', top: -9, right: 12, zIndex: 5,
    backgroundColor: '#FF3B6F',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },
  hotText: { fontSize: 10, color: '#fff', fontWeight: '900', letterSpacing: 0.3 },

  buyBtn: { width: '100%', height: 54, borderRadius: 27, overflow: 'hidden', marginBottom: 12 },
  buyGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  buyText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
  skipBtn: { paddingVertical: 8 },
  skipText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
});

export default function App() {
  return (
    <Provider store={store}>
      <MainApp />
    </Provider>);

}