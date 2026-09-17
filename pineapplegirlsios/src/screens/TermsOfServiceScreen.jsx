import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { Colors } from '../theme/colors';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By creating an account, downloading, or using the Pineapple application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the app.',
  },
  {
    title: '2. Eligibility & Age Verification',
    body: 'Pineapple is strictly intended for individuals aged 18 years or older. By registering, you confirm that you meet this age requirement. Any account found to belong to a minor will be immediately terminated.',
  },
  {
    title: '3. Host Earnings & Payout Policy',
    body: 'Female hosts receive a 70% share of virtual coins spent on voice calls, video calls, and virtual gifts received. Earnings are accumulated in INR and eligible for payout via UPI once the minimum withdrawal threshold of ₹100 is reached. Payouts are reviewed and disbursed securely.',
  },
  {
    title: '4. Code of Conduct & Safety',
    body: 'We maintain zero tolerance for harassment, hate speech, explicit illegal content, extortion, threats, or fraud. Users and hosts can report and block any abusive party at any time.',
  },
  {
    title: '5. Virtual Coins & Transactions',
    body: 'Coins purchased by male callers are virtual items used to connect with hosts and send gifts. Virtual coins purchased by callers are non-refundable once consumed.',
  },
  {
    title: '6. Audio & Video Calling Rules',
    body: 'All calling features are powered by Agora WebRTC. Screen recording or capturing private communications without consent is strictly prohibited.',
  },
  {
    title: '7. Account Termination & Moderation',
    body: 'Pineapple reserves the right to suspend or terminate accounts that violate our safety guidelines, engage in spam, or receive multiple user reports.',
  },
  {
    title: '8. Changes to Terms',
    body: 'We may update these terms periodically. Continued use of Pineapple following changes constitutes acceptance of the revised Terms of Service.',
  },
  {
    title: '9. Contact & Support',
    body: 'For queries, appeals, or legal support, contact us at: support@pineappleapp.in',
  },
];

export default function TermsOfServiceScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="arrow-left" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.updated}>Last updated: September 2026</Text>
        <Text style={styles.intro}>
          Please read these Terms of Service carefully before using Pineapple. By using our platform, you agree to comply with all guidelines outlined below.
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
