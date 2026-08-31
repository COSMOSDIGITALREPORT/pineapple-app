import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  TextInput, ScrollView, Image, KeyboardAvoidingView,
  Platform, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch } from 'react-redux';
import { Colors, Gradients } from '../theme/colors';
import Icon from '../components/Icon';
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
      if (digits.length !== 10) { setError('Please enter your 10-digit mobile number'); return; }
      setLoading(true);
      try {
        await sendOtp(digits);
        setStep('otp');
        setTimeout(() => otpRefs[0].current?.focus(), 300);
      } catch (e) {
        setError(e?.message || 'Failed to send OTP. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      const otpCode = otp.join('');
      if (otpCode.length < 4) { setError('Enter the 4-digit OTP'); return; }
      setLoading(true);
      try {
        const data = await verifyOtp(phone.trim(), otpCode, 'girl');
        await completeLogin(data);
      } catch (e) {
        setError('Invalid or expired OTP. Try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert('Coming Soon', 'Google login will be available in next update.');
  };

  const handleAppleLogin = () => {
    Alert.alert('Coming Soon', 'Apple login will be available in next update.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F8" />

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
              : 'Enter the OTP sent to +91 ' + phone}
          </Text>

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
                  onChangeText={(t) => { setPhone(t.replace(/\D/g, '')); setError(''); }}
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
              <TouchableOpacity onPress={() => { setStep('phone'); setOtp(['','','','']); setError(''); }} style={styles.resendBtn}>
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

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8} onPress={handleGoogleLogin}>
              <Icon name="google" size={20} color="#DB4437" />
              <Text style={styles.socialBtnText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={styles.socialBtn} onPress={handleAppleLogin}>
              <Icon name="apple" size={20} color="#000" />
              <Text style={styles.socialBtnText}>Apple</Text>
            </TouchableOpacity>
          </View>
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
  logoSection: { alignItems: 'center', marginBottom: 24 },
  logoImgWrap: {
    width: 150, height: 150, borderRadius: 75, overflow: 'hidden',
    marginBottom: 6,
    shadowColor: '#FF3870', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  logoImg: { width: 150, height: 150 },
  wordWrap: { position: 'relative', alignSelf: 'center', marginTop: 4, marginBottom: 2 },
  brandName: { fontSize: 34, fontFamily: 'Pacifico-Regular', color: '#1C1C1C', includeFontPadding: false },
  heartDot: { position: 'absolute', top: -7, left: 25, color: '#FF3870', fontSize: 9, includeFontPadding: false },
  brandSub: { fontSize: 11, color: '#FF3870', marginTop: 6, letterSpacing: 3.5, fontWeight: '700' },
  card: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 32,
    padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05, shadowRadius: 20, elevation: 5,
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
    backgroundColor: '#FFF0F0', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#FFCCCC',
  },
  errorTitle: { fontSize: 14, fontWeight: 'bold', color: '#D32F2F', marginBottom: 4 },
  errorMsg: { fontSize: 13, color: '#B71C1C' },
  btnWrap: { width: '100%', marginBottom: 24 },
  continueBtn: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  continueBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#EEEEEE' },
  dividerText: { paddingHorizontal: 16, fontSize: 12, color: '#CCCCCC', fontWeight: 'bold' },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1, height: 56, borderRadius: 16, borderWidth: 1, borderColor: '#EEEEEE',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  socialBtnText: { fontSize: 16, fontWeight: '600', color: Colors.dark },
  termsText: { marginTop: 40, fontSize: 12, color: Colors.textLight, textAlign: 'center', lineHeight: 18 },
  termsLink: { color: Colors.dark, fontWeight: 'bold' },
});
