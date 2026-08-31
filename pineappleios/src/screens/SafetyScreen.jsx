import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, Animated, Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { acceptWarning } from '../store/slices/userSlice';
import Icon from '../components/Icon';
import { Colors } from '../theme/colors';

const LOGO = require('../image/pineapple_full.png');

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
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F8" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Icon name="arrow-left" size={20} color={Colors.dark} />
          </TouchableOpacity>
        )}

        {/* Header card — logo + safety pill */}
        <View style={styles.headerCard}>
          <View style={styles.logoCircle}>
            <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
          </View>
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
                  colors={['#FFA6C9', '#FF6FA5']}
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
            <Icon name="alert-triangle" size={17} color="#FF6FA5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.warningText}>
              Inappropriate behavior leads to an{' '}
              <Text style={styles.warningBold}>immediate permanent ban</Text>
              {' '}and may be reported to authorities.
            </Text>
          </View>
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
                <Icon name="check" size={14} color="#fff" />
              </View>
            )}
          </Animated.View>
          <View style={styles.checkIconRow}>
            <View style={styles.checkShieldWrap}>
              <Icon name="shield" size={14} color="#FF6FA5" />
            </View>
            <Text style={[styles.checkText, { flex: 1 }]}>
              I understand that any misconduct will result in a{' '}
              <Text style={styles.checkBold}>permanent ban and legal action.</Text>
            </Text>
          </View>
        </TouchableOpacity>

        {/* Accept button */}
        <TouchableOpacity
          onPress={handleAccept}
          activeOpacity={checked ? 0.85 : 0.7}
        >
          <LinearGradient
            colors={checked ? ['#FF3870', '#C0004A'] : ['#F0D0DC', '#E8C0D0']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.btn}>
            <Icon
              name={checked ? 'check-circle' : 'lock'}
              size={18}
              color={checked ? '#fff' : 'rgba(255,255,255,0.7)'}
            />
            <Text style={[styles.btnText, !checked && styles.btnTextOff]}>
              {'  '}Accept & Continue
            </Text>
            {checked && <Icon name="arrow-right" size={18} color="#fff" style={{ marginLeft: 6 }} />}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF5F8' },

  scroll: { paddingHorizontal: 24 },

  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },

  headerCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 20,
    marginBottom: 20,
    shadowColor: '#FF3870', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  logoCircle: {
    width: 100, height: 100, borderRadius: 28,
    backgroundColor: '#FFE8EF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  logoImg: { width: 80, height: 80 },
  safetyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF0F4',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
  },
  safetyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  safetyPillText: { fontSize: 12, fontWeight: '700', color: Colors.dark },

  title: {
    fontSize: 28, fontWeight: '900', color: Colors.dark,
    textAlign: 'center', marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14, color: '#8B5A70',
    textAlign: 'center', lineHeight: 22, marginBottom: 24,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 8,
    marginBottom: 16,
    shadowColor: '#FF3870',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
  },
  cardTitle: {
    fontSize: 12, fontWeight: '800', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 1.2,
    paddingVertical: 16,
  },
  ruleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, gap: 14,
  },
  ruleRowBorder: { borderBottomWidth: 1, borderBottomColor: '#FFF0F4' },
  ruleIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ruleText: { flex: 1, fontSize: 13.5, color: '#1e293b', lineHeight: 20, fontWeight: '500' },

  warningCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20, padding: 16, gap: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#FFD0DA',
    shadowColor: '#FF3870', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  warningIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#FFF0F4',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  warningText: { fontSize: 13, color: '#3D1020', lineHeight: 20 },
  warningBold: { fontWeight: '800', color: '#C0004A' },

  checkRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, marginBottom: 24,
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#F0D8E2',
  },
  checkIconRow: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  checkShieldWrap: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#FFF0F4',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checkboxOuter: {
    width: 26, height: 26, borderRadius: 8,
    borderWidth: 2, borderColor: '#D0A0B0',
    backgroundColor: 'transparent',
    overflow: 'hidden', flexShrink: 0,
  },
  checkboxChecked: {
    borderColor: '#FF3870',
    backgroundColor: '#FF3870',
  },
  checkboxFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  checkText: { flex: 1, fontSize: 13, color: '#5A2030', lineHeight: 19 },
  checkBold: { color: '#C0004A', fontWeight: '800' },

  btn: {
    height: 56, borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF3870',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  btnText: { fontSize: 17, fontWeight: '900', color: '#fff' },
  btnTextOff: { fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
});
