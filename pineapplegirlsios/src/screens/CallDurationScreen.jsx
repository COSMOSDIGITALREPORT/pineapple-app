import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Svg, { Path, Line } from 'react-native-svg';

function minutesUsed(duration) {
  const [mins, secs] = (duration || '00:00').split(':').map(Number);
  const m = mins || 0, s = secs || 0;
  return s > 0 ? m + 1 : Math.max(m, 1);
}

const { width, height } = Dimensions.get('window');


const HEARTS = [
  { x: 0.08, size: 18, dur: 9000,  delay: 0,    opacity: 0.20 },
  { x: 0.28, size: 36, dur: 11000, delay: 2500, opacity: 0.12 },
  { x: 0.52, size: 14, dur: 8500,  delay: 1000, opacity: 0.18 },
  { x: 0.72, size: 28, dur: 10000, delay: 3500, opacity: 0.14 },
  { x: 0.88, size: 22, dur: 9500,  delay: 1800, opacity: 0.16 },
];

function FloatingHeart({ x, size, dur, delay, opacity }) {
  const yAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = () => {
      yAnim.setValue(0);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(yAnim, { toValue: -height * 1.1, duration: dur, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 1, duration: dur * 0.15, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: dur * 0.6,  useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 0, duration: dur * 0.25, useNativeDriver: true }),
        ]),
      ]).start(() => loop());
    };
    const t = setTimeout(loop, delay);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: -size,
        left: width * x,
        opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, opacity] }),
        transform: [{ translateY: yAnim }],
      }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          fill="#FF9EC4"
          stroke="none"
        />
      </Svg>
    </Animated.View>
  );
}

export default function CallDurationScreen({ duration, callerUser, onRate, onSkip }) {
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.user);
  const isGirl = ['girl', 'female'].includes((user.gender || '').toLowerCase());

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#FFF0F6', '#FFD6E8', '#FFB8D4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating hearts */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {HEARTS.map((h, i) => <FloatingHeart key={i} {...h} />)}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}>

        {/* Call Ended badge */}
        <LinearGradient
          colors={['#FF3870', '#C0004A']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.endedBadge}>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path
              d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07C9.44 16.29 8.76 15.62 8 14.89m-3.5-3.07A19.79 19.79 0 0 1 1.43 3.2 2 2 0 0 1 3.41 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.39 8.91"
              stroke="#fff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Line x1="23" y1="1" x2="1" y2="23" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
          </Svg>
          <Text style={styles.endedText}>Call Ended</Text>
        </LinearGradient>

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarInner}>
              {callerUser?.avatar_url ? (
                <Image source={{ uri: callerUser.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{(callerUser?.name || '?')[0].toUpperCase()}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Name + city */}
        <Text style={styles.name}>{callerUser?.name || 'User'}</Text>
        {callerUser?.city
          ? <Text style={styles.nameSub}>📍 {callerUser.city}</Text>
          : <View style={{ height: 28 }} />
        }

        {/* Duration card */}
        <View style={styles.durationCard}>
          <Text style={styles.durationLabel}>CALL DURATION</Text>
          <Text style={styles.durationTime}>{duration || '00:00'}</Text>
          <View style={styles.durationDivider} />
          <Text style={styles.durationSub}>min  ·  sec</Text>
        </View>

        {/* Coins earned (girls) / minutes used (boys) */}
        <View style={styles.coinsBadge}>
          <Text style={styles.coinsEmoji}>{isGirl ? '🍍' : '⏱️'}</Text>
          <Text style={styles.coinsText}>
            {isGirl ? '+50 coins earned' : `${minutesUsed(duration)} min${minutesUsed(duration) === 1 ? '' : 's'} used`}
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.btnsWrap}>
          <TouchableOpacity onPress={onRate} activeOpacity={0.85} style={styles.rateBtnWrap}>
            <LinearGradient
              colors={['#FF3870', '#C0004A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.rateBtnText}>⭐  Rate Experience</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onSkip} activeOpacity={0.7} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },

 endedBadge: {
    height: 42,width: 130,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 0,
    borderRadius: 99,
    marginBottom: 32,
    shadowColor: '#C0004A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,paddingLeft: 8
  },
  endedText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },

  avatarWrap: { marginBottom: 20 },
  avatarRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#fff',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C0004A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  avatarInner: {
    width: 124,
    height: 124,
    borderRadius: 62,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFE0EC',
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: { backgroundColor: '#C0004A', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 48, color: '#fff', fontWeight: '900' },

  name: {
    fontSize: 26,
    fontWeight: '900',
    color: '#C0004A',
    letterSpacing: -0.5,
    marginBottom: 6,
    includeFontPadding: false,
    textAlign: 'center',
  },
  nameSub: {
    fontSize: 14,
    color: '#8B5A70',
    fontWeight: '600',
    marginBottom: 24,
    includeFontPadding: false,
    textAlign: 'center',
  },

  durationCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 26,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    shadowColor: '#C0004A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 6,
  },
  durationLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B08098',
    letterSpacing: 2.5,
    marginBottom: 10,
    includeFontPadding: false,
  },
  durationTime: {
    fontSize: 60,
    fontWeight: '900',
    color: '#C0004A',
    letterSpacing: -2,
    lineHeight: 66,
    includeFontPadding: false,
  },
  durationDivider: {
    width: 40,
    height: 1.5,
    backgroundColor: '#FFD6E8',
    borderRadius: 1,
    marginVertical: 12,
  },
  durationSub: {
    fontSize: 13,
    color: '#B08098',
    fontWeight: '600',
    letterSpacing: 1,
    includeFontPadding: false,
  },

  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 9999,
    marginBottom: 36,
    shadowColor: '#C0004A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  coinsEmoji: { fontSize: 18 },
  coinsText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#C0004A',
    includeFontPadding: false,
  },

  btnsWrap: { width: '100%', gap: 14 },

  rateBtnWrap: {
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#C0004A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  rateBtnText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fff',
    includeFontPadding: false,
    letterSpacing: 0.2,
  },

  skipBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B08098',
    includeFontPadding: false,
  },
});
