import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Animated, StatusBar, Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const LOGO = require('../image/pineapple_logo.png');
const { width, height } = Dimensions.get('window');

const FloatingHeartBg = ({ left, top, size, delay, opacity = 0.09 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: -20, duration: 3800 + delay * 0.3, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0,   duration: 3800 + delay * 0.3, useNativeDriver: true }),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.Text style={{
      position: 'absolute', left, top, fontSize: size,
      color: `rgba(255,255,255,${opacity})`,
      transform: [{ translateY: anim }],
    }}>♥</Animated.Text>
  );
};

export default function SplashScreen({ onComplete }) {
  const loadAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const glowAnim  = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.timing(loadAnim, {
      toValue: 1, duration: 2800, delay: 300, useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && onComplete) onComplete();
    });
  }, []);

  const loadWidth = loadAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 180], extrapolate: 'clamp' });

  return (
    <LinearGradient
      colors={['#3D1030', '#7B1040', '#CC1850', '#FF3870']}
      start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }}
      style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <FloatingHeartBg left={-10}       top={height*0.05} size={220} delay={0}    opacity={0.07} />
      <FloatingHeartBg left={width-100} top={height*0.08} size={160} delay={600}  opacity={0.06} />
      <FloatingHeartBg left={20}        top={height*0.52} size={130} delay={1200} opacity={0.08} />
      <FloatingHeartBg left={width-80}  top={height*0.65} size={110} delay={300}  opacity={0.07} />
      <FloatingHeartBg left={width*0.3} top={height*0.78} size={80}  delay={900}  opacity={0.05} />

      <Animated.View style={[styles.center, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>

        <Animated.Image
          source={LOGO}
          style={[styles.logoImage, { opacity: glowAnim }]}
          resizeMode="contain"
        />

        <Text style={styles.titleText}>Pineapple</Text>
        <Text style={styles.tagline}>Dating & Calling App</Text>

        <View style={styles.loaderBg}>
          <Animated.View style={[styles.loaderMask, { width: loadWidth }]}>
            <LinearGradient
              colors={['#FFB3CC', '#FF3870', '#C0004A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.loaderFill}
            />
          </Animated.View>
        </View>

      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  glowCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#FF3870',
  },

  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 60,
  },

  logoImage: {
    width: 220,
    height: 220,
    marginBottom: 20,
    shadowColor: '#FF3870',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },

  titleText: {
    color: '#fff',
    fontSize: 48,
    fontFamily: 'Pacifico-Regular',
    letterSpacing: 1,
    includeFontPadding: false,
    lineHeight: 68,
    paddingTop: 10,
    marginBottom: 6,
  },

  tagline: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1.5,
    marginBottom: 52,
  },

  loaderBg: {
    width: 180, height: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    overflow: 'hidden',
  },

  loaderMask: {
    height: '100%',
    overflow: 'hidden',
  },

  loaderFill: {
    width: 180,
    height: '100%',
    borderRadius: 10,
  },
});
