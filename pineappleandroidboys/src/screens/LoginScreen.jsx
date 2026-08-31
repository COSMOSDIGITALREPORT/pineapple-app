import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  TextInput, ScrollView, Image, KeyboardAvoidingView,
  Platform, StatusBar, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch } from 'react-redux';
import { Colors, Gradients } from '../theme/colors';
import { sendOtp, verifyOtp } from '../services/api';
import { setAuthUser } from '../store/slices/userSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';

const { width } = Dimensions.get('window');
const LOGO = require('../image/pineapple_logo.png');

export default function LoginScreen({ onLoginSuccess }) {
  const dispatch = useDispatch();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 3) otpRefs[index + 1].current?.focus();
  };

  const handleOtpKeyPress = (key, index) => {
    if (key === 'Backspace' && !otp[index] && index > 0)
      otpRefs[index - 1].current?.focus();
  };

  const completeLogin = async (userData) => {
    dispatch(setAuthUser(userData));
    if (userData.user?.id) {
      await AsyncStorage.multiSet([
        ['user_id', userData.user.id],
        ['auth_token', userData.token],
        ['user_session', JSON.stringify({ token: userData.token, user: userData.user })],
      ]);
    }
    onLoginSuccess(userData.user);
  };

  const handleContinue = async () => {
    setError('');
    if (step === 'phone') {
      const digits = phone.trim();
      if (digits.length !== 10) {
        setError('Please enter your 10-digit mobile number');
        return;
      }
      setLoading(true);
      try {
        const res = await sendOtp(phone.trim());
        setDevOtp(res.dev_otp || '');
        setStep('otp');
        setTimeout(() => otpRefs[0].current?.focus(), 300);
      } catch (e) {
        setError(e.message || 'Failed to send OTP. Try again.');
      } finally {
        setLoading(false);
      }
    } else {
      const otpCode = otp.join('');
      if (otpCode.length < 4) {
        setError('Enter the 4-digit OTP');
        return;
      }
      setLoading(true);
      try {
        const data = await verifyOtp(phone.trim(), otpCode, 'boy');
        await completeLogin(data);
      } catch (e) {
        setError(e.message || 'Invalid OTP. Try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F8" />

      {/* Floating hearts background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {[
          { top: '8%',  left: '10%', size: 28, opacity: 0.12 },
          { top: '15%', left: '80%', size: 20, opacity: 0.10 },
          { top: '30%', left: '5%',  size: 16, opacity: 0.08 },
          { top: '22%', left: '65%', size: 24, opacity: 0.09 },
          { top: '55%', left: '88%', size: 18, opacity: 0.10 },
          { top: '65%', left: '4%',  size: 22, opacity: 0.09 },
          { top: '75%', left: '75%', size: 14, opacity: 0.08 },
          { top: '85%', left: '20%', size: 20, opacity: 0.10 },
        ].map((h, i) => (
          <Text key={i} style={{ position: 'absolute', top: h.top, left: h.left, fontSize: h.size, opacity: h.opacity, color: '#FF3870' }}>♥</Text>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={styles.logoSection}>
          <View style={styles.logoImgWrap}>
            <Image source={LOGO} style={styles.logoImg} resizeMode="cover" />
          </View>
          <View style={styles.wordWrap}>
            <Text style={styles.brandName}>Pineapple</Text>
            
          </View>
          <Text style={styles.brandSub}>DATING & CALLING APP</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{step === 'phone' ? 'Welcome' : 'Verify'}</Text>
          <Text style={styles.cardSub}>
            {step === 'phone'
              ? 'Enter your phone number to get started.'
              : 'Enter the code sent to your number.'}
          </Text>
          {devOtp ? <Text style={styles.devOtpHint}>Dev OTP: {devOtp}</Text> : null}

          {step === 'phone' ? (
            <View style={styles.fieldWrap}>
              <View style={styles.phoneInputRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.phonePrefix}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="98765 43210"
                  placeholderTextColor="#aaa"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(t) => { setPhone(t); setError(''); }}
                  maxLength={10} />
              </View>
            </View>
          ) : (
            <View style={styles.fieldWrap}>
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={otpRefs[i]}
                    style={styles.otpBox}
                    value={digit}
                    onChangeText={(t) => handleOtpChange(t.slice(-1), i)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center" />
                ))}
              </View>
              <TouchableOpacity onPress={() => setStep('phone')} style={styles.resendBtn}>
                <Text style={styles.resendText}>Resend Code</Text>
              </TouchableOpacity>
            </View>
          )}

          {error.length > 0 && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>⊗  {step === 'otp' ? 'Couldn\'t verify OTP' : 'Invalid number'}</Text>
              <Text style={styles.errorMsg}>{error}</Text>
            </View>
          )}

          <TouchableOpacity onPress={handleContinue} activeOpacity={0.85} style={styles.btnWrap} disabled={loading}>
            <LinearGradient
              colors={Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtn}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.continueBtnText}>Continue</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Text style={styles.termsLink} onPress={() => setShowPrivacy(true)}>Terms</Text>
          {' & '}
          <Text style={styles.termsLink} onPress={() => setShowPrivacy(true)}>Privacy Policy</Text>
        </Text>
      </ScrollView>
      {showPrivacy && <PrivacyPolicyScreen onBack={() => setShowPrivacy(false)} />}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF5F8' },
  scroll: {
    flexGrow: 1, paddingHorizontal: 24, paddingTop: 50,
    paddingBottom: 40, alignItems: 'center',
  },
  logoSection: { alignItems: 'center', marginBottom: 20 },
  logoImgWrap: {
    width: 130, height: 130, borderRadius: 65, overflow: 'hidden',
    marginBottom: 2,
    shadowColor: '#FF3870', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  logoImg: { width: 130, height: 130 },
  wordWrap: { position: 'relative', alignSelf: 'center', marginTop: 0, marginBottom: 2 },
  brandName: { fontSize: 34, fontFamily: 'Pacifico-Regular', color: '#1C1C1C', includeFontPadding: false },
  heartDot: { position: 'absolute', top: -7, left: 25, color: '#FF3870', fontSize: 9, includeFontPadding: false },
  brandSub: { fontSize: 11, color: '#FF3870', marginTop: 6, letterSpacing: 3.5, fontWeight: '700' },
  card: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 32,
    padding: 24, shadowColor: '#FF3870', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 5,
  },
  cardTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.dark, textAlign: 'center' },
  cardSub: { fontSize: 14, color: Colors.textLight, textAlign: 'center', marginTop: 8, marginBottom: 32 },
  fieldWrap: { marginBottom: 24 },
  phoneInputRow: { flexDirection: 'row', height: 56, backgroundColor: '#F5F5F5', borderRadius: 16, overflow: 'hidden' },
  countryCode: { width: 60, height: '100%', backgroundColor: '#EEEEEE', alignItems: 'center', justifyContent: 'center' },
  phonePrefix: { fontSize: 16, fontWeight: '600', color: Colors.dark },
  phoneInput: { flex: 1, height: '100%', paddingHorizontal: 16, fontSize: 16, color: Colors.dark },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  otpBox: {
    width: (width - 48 - 48 - 24) / 4, height: 64, backgroundColor: '#F5F5F5',
    borderRadius: 16, fontSize: 24, fontWeight: 'bold', color: Colors.secondary,
  },
  resendBtn: { alignSelf: 'center' },
  resendText: { fontSize: 14, color: Colors.secondary, fontWeight: '600' },
  errorBox: {
    backgroundColor: 'rgba(255,56,112,0.08)', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,56,112,0.25)',
  },
  errorTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.primary, marginBottom: 4 },
  errorMsg: { fontSize: 13, color: '#7a0030' },
  btnWrap: { width: '100%', marginBottom: 24 },
  continueBtn: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  continueBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  termsText: { marginTop: 40, fontSize: 12, color: Colors.textLight, textAlign: 'center', lineHeight: 18 },
  termsLink: { color: Colors.dark, fontWeight: 'bold' },
  devOtpHint: {
    fontSize: 13, color: Colors.primary, fontWeight: '700',
    textAlign: 'center', marginTop: -20, marginBottom: 8,
  },
});
