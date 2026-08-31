import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { acceptWarning } from '../store/slices/userSlice';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';

const RULES = [
  { icon: 'heart',          text: 'Treat every member with respect and kindness' },
  { icon: 'shield',         text: 'No harassment, hate speech, or abusive language' },
  { icon: 'lock',           text: 'Never share anyone\'s personal information' },
  { icon: 'eye-off',        text: 'No explicit or inappropriate content of any kind' },
  { icon: 'alert-triangle', text: 'All violations are reviewed by our safety team' },
];

export default function SafetyScreen({ onAccept, onBack }) {
  const [checked, setChecked] = useState(false);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleAccept = () => {
    if (!checked) return;
    dispatch(acceptWarning());
    onAccept();
  };

  const handleCheckPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 80,  useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.1,  duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 80,  useNativeDriver: true }),
    ]).start();
    setChecked((v) => !v);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Full screen orange gradient */}
      <LinearGradient
        colors={['#CC1850', '#FF3870', '#8B1030', '#5C0020']}
        start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Icon name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🍍</Text>
          </View>
          <Text style={styles.logoWordmark}>pineapple</Text>
          <View style={styles.safetyPill}>
            <View style={styles.safetyDot} />
            <Text style={styles.safetyPillText}>24×7 Safety</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Safety First</Text>
        <Text style={styles.subtitle}>
          Our community is built on respect.{'\n'}Please read before you continue.
        </Text>

        {/* Rules card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Community Guidelines</Text>
          {RULES.map((rule, i) => (
            <View key={i} style={[styles.ruleRow, i < RULES.length - 1 && styles.ruleRowBorder]}>
              <View style={styles.ruleIconWrap}>
                <LinearGradient
                  colors={['#FF3870', '#C0004A']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Icon name={rule.icon} size={14} color="#fff" />
              </View>
              <Text style={styles.ruleText}>{rule.text}</Text>
            </View>
          ))}
        </View>

        {/* Warning banner */}
        <View style={styles.warningCard}>
          <View style={styles.warningIconWrap}>
            <Icon name="zap" size={16} color="#FF3B6A" />
          </View>
          <Text style={styles.warningText}>
            Inappropriate behavior leads to an{' '}
            <Text style={styles.warningBold}>immediate permanent ban</Text>
            {' '}and may be reported to authorities.
          </Text>
        </View>

        {/* Checkbox */}
        <TouchableOpacity
          style={styles.checkRow}
          activeOpacity={0.85}
          onPress={handleCheckPress}
        >
          <Animated.View style={[styles.checkboxOuter, checked && styles.checkboxChecked, { transform: [{ scale: scaleAnim }] }]}>
            {checked && (
              <View style={styles.checkboxFill}>
                <Icon name="check" size={14} color="#FF5A7A" />
              </View>
            )}
          </Animated.View>
          <Text style={styles.checkText}>
            I understand that any misconduct will result in a{' '}
            <Text style={styles.checkBold}>permanent ban and legal action.</Text>
          </Text>
        </TouchableOpacity>

        {/* Accept button */}
        <TouchableOpacity
          onPress={handleAccept}
          activeOpacity={checked ? 0.85 : 1}
        >
          <View style={[styles.btn, !checked && styles.btnDisabled]}>
            <Text style={[styles.btnText, !checked && styles.btnTextOff]}>
              Accept & Continue
            </Text>
            {checked && <Icon name="arrow-right" size={18} color="#FF5A7A" style={{ marginLeft: 8 }} />}
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  scroll: { paddingHorizontal: 24 },

  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },

  logoSection: { alignItems: 'center', marginBottom: 24 },
  logoCircle: {
    width: 90, height: 90, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.45)',
  },
  logoEmoji: { fontSize: 48 },
  logoWordmark: {
    fontSize: 30, fontWeight: '900', color: '#fff',
    letterSpacing: -0.5, marginBottom: 10,
  },
  safetyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
  },
  safetyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2BB673' },
  safetyPillText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  title: {
    fontSize: 32, fontWeight: '900', color: '#fff',
    textAlign: 'center', marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 6,
  },
  cardTitle: {
    fontSize: 12, fontWeight: '800', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 1.2,
    paddingVertical: 16,
  },
  ruleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, gap: 14,
  },
  ruleRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  ruleIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ruleText: { flex: 1, fontSize: 13.5, color: '#1e293b', lineHeight: 20, fontWeight: '500' },

  warningCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, padding: 16, gap: 12, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  warningIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  warningText: { flex: 1, fontSize: 13, color: '#fff', lineHeight: 20 },
  warningBold: { fontWeight: '800', color: '#fff' },

  checkRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, marginBottom: 24,
  },
  checkboxOuter: {
    width: 26, height: 26, borderRadius: 8,
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'transparent',
    overflow: 'hidden', flexShrink: 0,
  },
  checkboxChecked: {
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  checkboxFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  checkText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19 },
  checkBold: { color: '#fff', fontWeight: '800' },

  btn: {
    height: 58, borderRadius: 18,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { backgroundColor: 'rgba(255,255,255,0.3)' },
  btnText: { fontSize: 17, fontWeight: '900', color: '#FF5A7A' },
  btnTextOff: { color: 'rgba(255,255,255,0.5)' },
});
