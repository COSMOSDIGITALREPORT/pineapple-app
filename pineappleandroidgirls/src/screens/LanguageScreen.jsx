import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { Colors } from '../theme/colors';

const POPULAR = [
  { id: 'hi', label: 'Hindi',   native: 'हिंदी',    flag: '🇮🇳' },
  { id: 'en', label: 'English', native: 'English',   flag: '🇬🇧' },
  { id: 'bn', label: 'Bengali', native: 'বাংলা',     flag: '🇮🇳' },
  { id: 'ta', label: 'Tamil',   native: 'தமிழ்',     flag: '🇮🇳' },
  { id: 'te', label: 'Telugu',  native: 'తెలుగు',    flag: '🇮🇳' },
  { id: 'mr', label: 'Marathi', native: 'मराठी',     flag: '🇮🇳' },
];

const REGIONAL = [
  { id: 'gu', label: 'Gujarati',   native: 'ગુજરાતી',   flag: '🇮🇳' },
  { id: 'kn', label: 'Kannada',    native: 'ಕನ್ನಡ',     flag: '🇮🇳' },
  { id: 'ml', label: 'Malayalam',  native: 'മലയാളം',    flag: '🇮🇳' },
  { id: 'pa', label: 'Punjabi',    native: 'ਪੰਜਾਬੀ',    flag: '🇮🇳' },
  { id: 'ur', label: 'Urdu',       native: 'اردو',       flag: '🇮🇳' },
  { id: 'bh', label: 'Bhojpuri',   native: 'भोजपुरी',   flag: '🇮🇳' },
  { id: 'or', label: 'Odia',       native: 'ଓଡ଼ିଆ',      flag: '🇮🇳' },
  { id: 'as', label: 'Assamese',   native: 'অসমীয়া',   flag: '🇮🇳' },
];

export default function LanguageScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState('hi');

  const selectedLang = [...POPULAR, ...REGIONAL].find(l => l.id === selected);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="arrow-left" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Language</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Selected preview banner */}
      <View style={styles.selectedBanner}>
        <LinearGradient
          colors={['#FF3870', '#C0004A']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.selectedBlobL} />
        <View style={styles.selectedBlobR} />
        <Text style={styles.selectedFlag}>{selectedLang?.flag}</Text>
        <View>
          <Text style={styles.selectedLabel}>{selectedLang?.label}</Text>
          <Text style={styles.selectedNative}>{selectedLang?.native}</Text>
        </View>
        <View style={styles.selectedCheck}>
          <Icon name="check" size={16} color={Colors.secondary} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}>

        {/* Popular */}
        <Text style={styles.sectionLabel}>POPULAR</Text>
        <View style={styles.grid}>
          {POPULAR.map((lang) => {
            const isSel = selected === lang.id;
            return (
              <TouchableOpacity
                key={lang.id}
                style={[styles.gridCard, isSel && styles.gridCardSelected]}
                onPress={() => setSelected(lang.id)}
                activeOpacity={0.85}>
                {isSel && (
                  <LinearGradient
                    colors={['#FF3870', '#C0004A']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text style={styles.gridFlag}>{lang.flag}</Text>
                <Text style={[styles.gridLabel, isSel && styles.gridLabelSel]}>{lang.label}</Text>
                <Text style={[styles.gridNative, isSel && styles.gridNativeSel]}>{lang.native}</Text>
                {isSel && (
                  <View style={styles.gridCheck}>
                    <Icon name="check" size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Regional */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>REGIONAL</Text>
        <View style={styles.list}>
          {REGIONAL.map((lang) => {
            const isSel = selected === lang.id;
            return (
              <TouchableOpacity
                key={lang.id}
                style={[styles.listRow, isSel && styles.listRowSelected]}
                onPress={() => setSelected(lang.id)}
                activeOpacity={0.85}>
                <Text style={styles.listFlag}>{lang.flag}</Text>
                <View style={styles.listInfo}>
                  <Text style={[styles.listLabel, isSel && styles.listLabelSel]}>{lang.label}</Text>
                  <Text style={styles.listNative}>{lang.native}</Text>
                </View>
                <View style={[styles.radio, isSel && styles.radioActive]}>
                  {isSel && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      {/* Confirm footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.88} style={styles.confirmBtn}>
          <LinearGradient
            colors={['#FF3870', '#C0004A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.confirmText}>Save Language</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF5F8' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark,
    includeFontPadding: false,
  },

  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    margin: 16,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  selectedBlobL: {
    position: 'absolute', top: -30, left: -30,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  selectedBlobR: {
    position: 'absolute', bottom: -20, right: -20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  selectedFlag: { fontSize: 32 },
  selectedLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    includeFontPadding: false,
  },
  selectedNative: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginTop: 2,
    includeFontPadding: false,
  },
  selectedCheck: {
    marginLeft: 'auto',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 2,
    includeFontPadding: false,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    width: '30.5%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  gridCardSelected: { borderColor: 'transparent' },
  gridFlag: { fontSize: 26 },
  gridLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.dark,
    includeFontPadding: false,
    textAlign: 'center',
  },
  gridLabelSel: { color: '#fff' },
  gridNative: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    includeFontPadding: false,
    textAlign: 'center',
  },
  gridNativeSel: { color: 'rgba(255,255,255,0.85)' },
  gridCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  list: { gap: 8 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  listRowSelected: { borderColor: Colors.secondary, backgroundColor: '#FFE8EF' },
  listFlag: { fontSize: 22 },
  listInfo: { flex: 1 },
  listLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
    includeFontPadding: false,
  },
  listLabelSel: { color: Colors.secondary },
  listNative: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 2,
    includeFontPadding: false,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: Colors.secondary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.secondary,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(248,249,251,0.95)',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  confirmBtn: {
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    includeFontPadding: false,
  },
});
