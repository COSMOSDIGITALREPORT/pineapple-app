import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useDispatch } from 'react-redux';
import { setProfile } from '../store/slices/userSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CARD_W = (width - 60) / 2;

function GirlIcon({ color }) {
  return (
    <Svg width={80} height={110} viewBox="0 0 80 110">
      <Circle cx="40" cy="24" r="20" fill={color} />
      <Path d="M20 24 Q12 48 16 72 Q22 84 40 88 Q58 84 64 72 Q68 48 60 24" fill={color} opacity={0.7} />
      <Path d="M26 80 Q12 96 8 110 L72 110 Q68 96 54 80 Z" fill={color} />
    </Svg>);

}

function BoyIcon({ color }) {
  return (
    <Svg width={80} height={110} viewBox="0 0 80 110">
      <Circle cx="40" cy="22" r="20" fill={color} />
      <Rect x="24" y="46" width="32" height="36" rx="6" fill={color} />
      <Rect x="24" y="78" width="14" height="32" rx="5" fill={color} />
      <Rect x="42" y="78" width="14" height="32" rx="5" fill={color} />
    </Svg>);

}

export default function GenderScreen({ onGirl, onBoy }) {
  const [selected, setSelected] = useState(null);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const handleContinue = () => {
    if (!selected) return;
    dispatch(setProfile({ name: '', gender: selected, dob: '' }));
    selected === 'girl' ? onGirl() : onBoy();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 20 }]}>
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      {/* Brand */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#FF4DA6', '#7B61FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.brandPill}>
          <Text style={styles.brandText}>Pineapple</Text>
        </LinearGradient>
      </View>

      {/* Title */}
      <View style={styles.titleWrap}>
        <Text style={styles.title}>Who are you?</Text>
        <Text style={styles.subtitle}>This helps us personalize your experience</Text>
      </View>

      {/* Cards */}
      <View style={styles.cardsRow}>
        {/* Girl */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelected('girl')}
          style={styles.cardTouch}>
          {selected === 'girl' ?
          <LinearGradient
            colors={['#FF4DA6', '#FF85C2']}
            style={[styles.card, styles.cardSelected]}>
              <GirlIcon color="rgba(255,255,255,0.9)" />
              <Text style={styles.cardLabelSelected}>I am Girl</Text>
            </LinearGradient> :

          <View style={[styles.card, styles.cardGirl]}>
              <GirlIcon color="#FF4DA6" />
              <Text style={[styles.cardLabel, { color: '#FF4DA6' }]}>I am Girl</Text>
            </View>
          }
        </TouchableOpacity>

        {/* Boy */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelected('boy')}
          style={styles.cardTouch}>
          {selected === 'boy' ?
          <LinearGradient
            colors={['#7B61FF', '#A78BFA']}
            style={[styles.card, styles.cardSelected]}>
              <BoyIcon color="rgba(255,255,255,0.9)" />
              <Text style={styles.cardLabelSelected}>I am Boy</Text>
            </LinearGradient> :

          <View style={[styles.card, styles.cardBoy]}>
              <BoyIcon color="#7B61FF" />
              <Text style={[styles.cardLabel, { color: '#7B61FF' }]}>I am Boy</Text>
            </View>
          }
        </TouchableOpacity>
      </View>

      {/* Note */}
      <Text style={styles.note}>Wrong gender = permanent ban 🚫</Text>

      {/* Continue */}
      <View style={[styles.btnArea, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          onPress={handleContinue}
          activeOpacity={selected ? 0.85 : 1}
          style={styles.btnWrap}>
          <LinearGradient
            colors={selected ? ['#FF4DA6', '#7B61FF'] : ['#E2E8F0', '#CBD5E1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}>
            <Text style={[styles.btnText, !selected && styles.btnTextDisabled]}>
              Continue →
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>);

}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F7FB',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  blobTopRight: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,77,166,0.05)',
    top: -80,
    right: -80
  },
  blobBottomLeft: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(123,97,255,0.05)',
    bottom: -60,
    left: -60
  },
  header: { alignItems: 'center', marginBottom: 32 },
  brandPill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20
  },
  brandText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    includeFontPadding: false
  },
  titleWrap: { alignItems: 'center', marginBottom: 40 },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1d1b20',
    letterSpacing: -1,
    marginBottom: 8,
    includeFontPadding: false
  },
  subtitle: { fontSize: 15, color: '#64748b', fontWeight: '600', includeFontPadding: false },
  cardsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20
  },
  cardTouch: { width: CARD_W },
  card: {
    width: CARD_W,
    height: 220,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 20
  },
  cardGirl: {
    backgroundColor: '#FFF1F8',
    borderWidth: 2,
    borderColor: '#FFD9E5'
  },
  cardBoy: {
    backgroundColor: '#F5F3FF',
    borderWidth: 2,
    borderColor: '#DDD6FE'
  },
  cardSelected: {
    shadowColor: '#FF4DA6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: '900',
    includeFontPadding: false
  },
  cardLabelSelected: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    includeFontPadding: false
  },
  note: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '800',
    marginBottom: 12,
    includeFontPadding: false
  },
  btnArea: { width: '100%', marginTop: 'auto' },
  btnWrap: {
    borderRadius: 32,
    shadowColor: '#7B61FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8
  },
  btn: {
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    includeFontPadding: false
  },
  btnTextDisabled: { color: '#94a3b8' }
});