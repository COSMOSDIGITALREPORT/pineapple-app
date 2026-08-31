import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { Colors } from '../theme/colors';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'We collect your phone number for OTP verification, profile information (name, age, gender, city, language, photo), call history, and usage data to improve our services.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'Your information is used to provide and improve our services, match you with other users, process payments, send notifications, and ensure platform safety.',
  },
  {
    title: '3. Audio & Video Calls',
    body: 'Calls are powered by Agora RTC. We do not record calls. Microphone and camera access is used solely for voice and video communication between users.',
  },
  {
    title: '4. Data Sharing',
    body: 'We do not sell your personal data. We may share data with service providers (Agora, Razorpay, MSG91) solely to operate our services. We may disclose data if required by law.',
  },
  {
    title: '5. Coins & Payments',
    body: 'Coins are virtual currency used within the app for calls and gifts. Payments are processed securely via Razorpay. We do not store your payment card details.',
  },
  {
    title: '6. User Safety',
    body: 'You can report or block any user at any time. Reported users are reviewed by our team. We reserve the right to suspend accounts that violate our community guidelines.',
  },
  {
    title: '7. Data Retention',
    body: 'We retain your data as long as your account is active. You can delete your account at any time from Settings. Upon deletion, your data is permanently removed within 30 days.',
  },
  {
    title: '8. Children\'s Privacy',
    body: 'Pineapple is intended for users aged 18 and above. We do not knowingly collect data from minors. If you believe a minor has created an account, please contact us immediately.',
  },
  {
    title: '9. Contact Us',
    body: 'For privacy-related queries, contact us at: support@pineappleapp.in',
  },
];

export default function PrivacyPolicyScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.updated}>Last updated: May 2026</Text>
        <Text style={styles.intro}>
          Pineapple ("we", "our", "us") is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information.
        </Text>

        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: Colors.dark },
  scroll: { padding: 20, paddingBottom: 48 },
  updated: { fontSize: 12, color: '#94A3B8', marginBottom: 12 },
  intro: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.dark, marginBottom: 6 },
  sectionBody: { fontSize: 14, color: '#475569', lineHeight: 22 },
});
