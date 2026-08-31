import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Animated, Dimensions, Vibration,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Icon from '../components/Icon';
import { Colors } from '../theme/colors';

export default function IncomingCallScreen({ callData, onAccept, onReject }) {
  const insets = useSafeAreaInsets();
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;
  const ring3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1.6, duration: 1500, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1,   duration: 0,    useNativeDriver: true }),
        ])
      ).start();

    pulse(ring1, 0);
    pulse(ring2, 400);
    pulse(ring3, 800);

    // Vibrate on incoming call
    const vibInterval = setInterval(() => {
      Vibration.vibrate([500, 500], false);
    }, 2000);

    return () => {
      clearInterval(vibInterval);
      Vibration.cancel();
    };
  }, []);

  const isVideo = callData?.type === 'video';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1A0A04', '#2D1206', '#1A0A04']}
        style={StyleSheet.absoluteFill}
      />

      {/* Top label */}
      <View style={[styles.topWrap, { paddingTop: insets.top + 32 }]}>
        <Text style={styles.incomingLabel}>
          {isVideo ? '📹  Incoming Video Call' : '📞  Incoming Audio Call'}
        </Text>
      </View>

      {/* Avatar with rings */}
      <View style={styles.avatarSection}>
        <Animated.View style={[styles.ring, styles.ring3, { transform: [{ scale: ring3 }] }]} />
        <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: ring2 }] }]} />
        <Animated.View style={[styles.ring, styles.ring1, { transform: [{ scale: ring1 }] }]} />
        <View style={styles.avatarBorder}>
          {callData?.callerAvatar ? (
            <Image
              source={{ uri: callData?.callerAvatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }]}>
              <Icon name="user" size={52} color="rgba(255,255,255,0.5)" />
            </View>
          )}
        </View>
      </View>

      {/* Name */}
      <Text style={styles.callerName}>{callData?.callerName || 'Unknown'}</Text>
      <Text style={styles.callerSub}>wants to {isVideo ? 'video' : 'audio'} call you</Text>

      {/* Buttons */}
      <View style={[styles.btns, { paddingBottom: insets.bottom + 48 }]}>

        {/* Reject */}
        <TouchableOpacity style={styles.rejectBtn} onPress={onReject} activeOpacity={0.85}>
          <View style={styles.rejectCircle}>
            <Svg width={28} height={28} viewBox="0 0 24 24">
              <Path
                d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07C9.44 16.29 8.76 15.62 8 14.89m-3.5-3.07A19.79 19.79 0 0 1 1.43 3.2 2 2 0 0 1 3.41 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.39 8.91"
                stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none"
              />
            </Svg>
          </View>
          <Text style={styles.btnLabel}>Decline</Text>
        </TouchableOpacity>

        {/* Accept */}
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.85}>
          <View style={styles.acceptCircle}>
            <LinearGradient
              colors={['#FF3870', '#C0004A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Icon name={isVideo ? 'video' : 'phone'} size={28} color="#fff" />
          </View>
          <Text style={[styles.btnLabel, { color: Colors.primary }]}>Accept</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const RING_SIZE = 180;

const styles = StyleSheet.create({
  root: { flex: 1 },

  topWrap: { alignItems: 'center' },
  incomingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },

  avatarSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
  },
  ring1: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderColor: 'rgba(255,199,44,0.3)',
  },
  ring2: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderColor: 'rgba(255,199,44,0.18)',
  },
  ring3: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderColor: 'rgba(255,199,44,0.08)',
  },
  avatarBorder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: Colors.primary,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  avatar: { width: '100%', height: '100%' },

  callerName: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
    includeFontPadding: false,
  },
  callerSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 48,
    includeFontPadding: false,
  },

  btns: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 64,
    paddingHorizontal: 40,
  },
  rejectBtn: { alignItems: 'center', gap: 12 },
  rejectCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  acceptBtn: { alignItems: 'center', gap: 12 },
  acceptCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  btnLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    includeFontPadding: false,
  },
});
