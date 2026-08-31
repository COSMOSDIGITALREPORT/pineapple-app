import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Image,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Gradients } from '../theme/colors';
import Icon from '../components/Icon';

const LOGO = require('../image/pineapple_logo.png');

const { width, height } = Dimensions.get('window');

function FloatingHeartBg({ left, top, size, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: -20, duration: 3500, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0,   duration: 3500, useNativeDriver: true }),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.Text style={{ position: 'absolute', left, top, fontSize: size, color: 'rgba(255,255,255,0.12)', transform: [{ translateY: anim }] }}>♥</Animated.Text>
  );
}

export default function OnboardingScreen1({ onNext, onLogin }) {
  return (
    <LinearGradient colors={Gradients.primary} style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* vertically floating background hearts */}
      <FloatingHeartBg left={-20}      top={40}          size={180} delay={0}    />
      <FloatingHeartBg left={width-80} top={100}         size={130} delay={600}  />
      <FloatingHeartBg left={30}       top={height*0.5}  size={110} delay={1200} />
      <FloatingHeartBg left={width-65} top={height*0.62} size={90}  delay={400}  />

      {/* texture overlay */}
      <View style={styles.textureOverlay} />

      <View style={styles.content}>
        {/* logo */}
        <View style={styles.logoWrap}>
          <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
        </View>

        <Text style={styles.brandName}>Pineapple</Text>
        <Text style={styles.tagline}>Real people. Real connections.</Text>

        <View style={styles.actionsWrap}>
          <TouchableOpacity
            onPress={onNext}
            activeOpacity={0.9}
            style={styles.getStartedBtn}>
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onLogin}
            activeOpacity={0.7}
            style={styles.loginBtn}>
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Icon name="lock" size={14} color="#FFFFFF" />
        <Text style={styles.footerText}>Encrypted. Private. Secure.</Text>
      </View>
    </LinearGradient>);

}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  textureOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
 
  logoImg: {
    width: 130,
    height: 130,
  },
  brandName: {
    fontSize: 42,
    fontFamily: 'Pacifico-Regular',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 60,
  },
  actionsWrap: {
    width: '100%',
    alignItems: 'center',
  },
  getStartedBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  loginBtn: {
    width: '100%',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 6,
    opacity: 0.8,
    fontWeight: '600'
  }
});