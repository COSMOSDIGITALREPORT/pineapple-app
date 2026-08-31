import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function WarningScreen({ onAccept }) {
  const insets = useSafeAreaInsets();
  const [isChecked, setIsChecked] = useState(false);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <LinearGradient colors={['#b7006f', '#5b3cdd']} style={StyleSheet.absoluteFill} />
      
      {/* Decorative Blobs */}
      <View style={styles.blobTopLeft} />
      <View style={styles.blobBottomRight} />

      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
        {/* Shield Icon Replacement (using shapes) */}
        <View style={styles.iconContainer}>
          <View style={styles.shieldBase}>
            <View style={styles.shieldInner} />
          </View>
          <View style={styles.shieldBanner}>
            <Text style={styles.bannerText}>24X7 SAFETY</Text>
          </View>
        </View>

        <Text style={styles.title}>Safety Declaration</Text>
        
        <View style={styles.glassCard}>
          <Text style={styles.warningText}>
            Pineapple is a community built on respect and kindness. We have a zero-tolerance policy for harassment or misconduct.
          </Text>
          <Text style={styles.warningText}>
            Any inappropriate behavior towards female users will lead to an immediate and permanent ban from the platform, and may be reported to local law enforcement.
          </Text>
        </View>

        <View style={styles.spacer} />

        {/* Custom Checkbox */}
        <TouchableOpacity
          style={styles.checkboxRow}
          activeOpacity={0.8}
          onPress={() => setIsChecked(!isChecked)}>
          
          <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
            {isChecked && <View style={styles.checkIcon} />}
          </View>
          <Text style={styles.checkboxLabel}>
            I understand that any misconduct will result in a permanent ban and legal action.
          </Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, !isChecked && styles.submitBtnDisabled]}
          onPress={onAccept}
          disabled={!isChecked}
          activeOpacity={0.8}>
          
          <LinearGradient
            colors={isChecked ? ['#FF4DA6', '#7B61FF'] : ['#666', '#444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBtn}>
            
            <Text style={styles.submitText}>ACCEPT & CONTINUE</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>);

}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  blobTopLeft: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(255, 77, 166, 0.1)',
    top: -150,
    left: -150
  },
  blobBottomRight: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(116, 89, 247, 0.1)',
    bottom: -100,
    right: -100
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center'
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 40
  },
  shieldBase: {
    width: 100,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  shieldInner: {
    width: 60,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 30,
    opacity: 0.8
  },
  shieldBanner: {
    backgroundColor: '#FF4DA6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  bannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: -1,
    includeFontPadding: false
  },
  glassCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  warningText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
    includeFontPadding: false
  },
  spacer: {
    flex: 1
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: '#fff',
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxChecked: {
    backgroundColor: '#FF4DA6',
    borderColor: '#FF4DA6'
  },
  checkIcon: {
    width: 14,
    height: 10,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
    marginTop: -2
  },
  checkboxLabel: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    includeFontPadding: false
  },
  submitBtn: {
    width: '100%',
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10
  },
  submitBtnDisabled: {
    opacity: 0.6
  },
  gradientBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    includeFontPadding: false
  }
});