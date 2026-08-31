import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';

const { width } = Dimensions.get('window');
const SHIMMER_W = width;
const HALF_W = (width - 40 - 12) / 2;

function ShimmerBox({ translateX, style }) {
  return (
    <View style={[styles.shimmerBase, style]}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.75)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill} />
        
      </Animated.View>
    </View>);

}

export default function LoadingScreen({ onRetry, onDashboard }) {
  const insets = useSafeAreaInsets();

  // Single shared shimmer animation for all skeleton boxes
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true
      })
    ).start();

    Animated.loop(
      Animated.sequence([
      Animated.timing(floatAnim, {
        toValue: -10,
        duration: 2000,
        useNativeDriver: true
      }),
      Animated.timing(floatAnim, {
        toValue: 0,
        duration: 2000,
        useNativeDriver: true
      })]
      )
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SHIMMER_W, SHIMMER_W]
  });

  return (
    <View
      style={[
      styles.root,
      { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]
      }>
      {/* Dot pattern overlay */}
      <View style={styles.dotPattern} pointerEvents="none" />

      {/* Floating pineapple hero */}
      <View style={styles.hero}>
        <Animated.View
          style={[styles.mascotWrap, { transform: [{ translateY: floatAnim }] }]}>
          <View style={styles.mascotGlowPink} />
          <View style={styles.mascotGlowPurple} />
          <Icon name="pineapple" size={148} />
        </Animated.View>
        <Text style={styles.heroTitle}>Refreshing your feed...</Text>
        <Text style={styles.heroSub}>
          Our pineapples are hard at work picking the sweetest connections just
          for you.
        </Text>
      </View>

      {/* Skeleton bento grid */}
      <View style={styles.bentoGrid}>
        {/* Large card — full width, h 192 */}
        <View style={[styles.glassCard, styles.wideCard, { height: 192 }]}>
          <View style={styles.skeletonCardTop}>
            <ShimmerBox translateX={translateX} style={styles.skAvatar} />
            <View style={{ gap: 8 }}>
              <ShimmerBox translateX={translateX} style={styles.skLine1} />
              <ShimmerBox
                translateX={translateX}
                style={[styles.skLine2, { opacity: 0.5 }]} />
              
            </View>
          </View>
          <View style={{ gap: 12 }}>
            <ShimmerBox translateX={translateX} style={styles.skLineFull} />
            <ShimmerBox translateX={translateX} style={styles.skLine3q} />
          </View>
        </View>

        {/* Two half cards */}
        <View style={[styles.glassCard, styles.halfCard]}>
          <ShimmerBox translateX={translateX} style={styles.skSquare} />
          <ShimmerBox translateX={translateX} style={styles.skLineFull} />
        </View>
        <View style={[styles.glassCard, styles.halfCard]}>
          <ShimmerBox translateX={translateX} style={styles.skSquare} />
          <ShimmerBox translateX={translateX} style={styles.skLineFull} />
        </View>

        {/* Wide row card */}
        <View style={[styles.glassCard, styles.wideCard, styles.rowCard]}>
          <View style={styles.rowLeft}>
            <ShimmerBox translateX={translateX} style={styles.skAvatarSm} />
            <ShimmerBox translateX={translateX} style={styles.skLineMd} />
          </View>
          <ShimmerBox translateX={translateX} style={styles.skBadge} />
        </View>
      </View>

      {/* CTAs */}
      <View style={styles.ctaGroup}>
        <TouchableOpacity
          onPress={onRetry}
          activeOpacity={0.75}
          style={styles.retryWrap}>
          <LinearGradient
            colors={['#FF4DA6', '#7B61FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.retryBtn}>
            <Text style={styles.retryIcon}>↻</Text>
            <Text style={styles.retryText}>Try again</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDashboard}
          style={styles.dashBtn}
          activeOpacity={0.8}>
          <Text style={styles.dashText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>);

}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F7FB',
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  dotPattern: {
    ...StyleSheet.absoluteFill,
    opacity: 0.04
  },

  /* Hero */
  hero: { alignItems: 'center', marginBottom: 28 },
  mascotWrap: {
    width: 192,
    height: 192,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  mascotGlowPink: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,77,166,0.15)'
  },
  mascotGlowPurple: {
    position: 'absolute',
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: 'rgba(123,97,255,0.1)'
  },
  mascotImg: { width: 148, height: 148 },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1d1b20',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center'
  },
  heroSub: {
    fontSize: 14,
    color: '#494551',
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280
  },

  /* Glass card base */
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 3,
    overflow: 'hidden'
  },

  /* Skeleton grid */
  bentoGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24
  },
  wideCard: { width: '100%', justifyContent: 'space-between' },
  halfCard: { width: HALF_W, height: 160, gap: 12 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  skeletonCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },

  /* Shimmer base shapes */
  shimmerBase: {
    backgroundColor: '#EDF0F7',
    borderRadius: 8,
    overflow: 'hidden'
  },
  skAvatar: { width: 48, height: 48, borderRadius: 24 },
  skAvatarSm: { width: 40, height: 40, borderRadius: 20 },
  skLine1: { width: 128, height: 14, borderRadius: 7 },
  skLine2: { width: 80, height: 12, borderRadius: 6 },
  skLineFull: { width: '100%', height: 14, borderRadius: 7 },
  skLine3q: { width: '75%', height: 14, borderRadius: 7 },
  skLineMd: { width: 96, height: 14, borderRadius: 7 },
  skSquare: { width: '100%', height: 96, borderRadius: 12 },
  skBadge: { width: 80, height: 32, borderRadius: 9999 },

  /* CTAs */
  ctaGroup: { width: '100%', gap: 12 },
  retryWrap: {
    borderRadius: 9999,
    shadowColor: '#7B61FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
    opacity: 0.85
  },
  retryBtn: {
    height: 64,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  retryIcon: { color: '#fff', fontSize: 22, fontWeight: '700' },
  retryText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  dashBtn: {
    height: 64,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: 'rgba(79,55,138,0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dashText: { fontSize: 16, fontWeight: '600', color: '#4f378a' }
});