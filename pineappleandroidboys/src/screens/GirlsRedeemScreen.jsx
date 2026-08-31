import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, StatusBar, ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';

const RATE = 0.1; // 1 coin = ₹0.10

export default function GirlsRedeemScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const { coins } = useSelector((s) => s.user);
  const [upi, setUpi] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const rupees = (coins * RATE).toFixed(0);

  if (submitted) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.successWrap}>
          <LinearGradient colors={['#FF5A7A', '#FFC72C']} style={styles.successIcon}>
            <Text style={{ fontSize: 36 }}>✅</Text>
          </LinearGradient>
          <Text style={styles.successTitle}>Request Submitted!</Text>
          <Text style={styles.successSub}>₹{rupees} will be sent to {upi} within 3-5 business days.</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={onBack} activeOpacity={0.85}>
            <LinearGradient colors={Gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.doneBtnGrad}>
              <Text style={styles.doneBtnText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Redeem Earnings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Balance card */}
        <LinearGradient colors={['#FF5A7A', '#FF8A5B', '#FFC72C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available to Redeem</Text>
          <View style={styles.balanceRow}>
            <Icon name="star" size={28} color="#fff" filled />
            <Text style={styles.balanceCoins}>{coins}</Text>
          </View>
          <Text style={styles.balanceRupees}>= ₹{rupees}</Text>
          <Text style={styles.balanceRate}>1 coin = ₹{RATE}</Text>
        </LinearGradient>

        {/* Min redeem note */}
        <View style={styles.noteBox}>
          <Icon name="info" size={16} color={Colors.primary} />
          <Text style={styles.noteText}>Minimum redemption: 500 coins (₹{(500 * RATE).toFixed(0)})</Text>
        </View>

        {/* UPI input */}
        <Text style={styles.inputLabel}>UPI ID</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="yourname@upi"
            placeholderTextColor="#aaa"
            value={upi}
            onChangeText={setUpi}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, (coins < 500 || !upi) && styles.submitBtnDisabled]}
          activeOpacity={0.85}
          disabled={coins < 500 || !upi}
          onPress={() => setSubmitted(true)}>
          <LinearGradient colors={Gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGrad}>
            <Text style={styles.submitText}>Redeem ₹{rupees}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {coins < 500 && (
          <Text style={styles.insufficientText}>Need {500 - coins} more coins to redeem</Text>
        )}
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
  headerTitle: { fontSize: 20, fontWeight: '900', color: Colors.dark },

  scroll: { padding: 16, gap: 16 },

  balanceCard: {
    borderRadius: 24, padding: 24,
    shadowColor: '#FF5A7A', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  balanceCoins: { fontSize: 48, fontWeight: '900', color: '#fff' },
  balanceRupees: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 4 },
  balanceRate: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  noteBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary + '15',
    borderRadius: 12, padding: 12,
  },
  noteText: { fontSize: 13, color: Colors.primary, fontWeight: '600', flex: 1 },

  inputLabel: { fontSize: 13, fontWeight: '700', color: Colors.dark, marginBottom: 4 },
  inputWrap: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  input: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.dark },

  submitBtn: { borderRadius: 20, overflow: 'hidden', height: 54 },
  submitBtnDisabled: { opacity: 0.5 },
  submitGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 16, fontWeight: '900', color: '#fff' },

  insufficientText: { fontSize: 13, color: '#EF4444', textAlign: 'center', fontWeight: '600' },

  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  successIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 26, fontWeight: '900', color: Colors.dark },
  successSub: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  doneBtn: { width: '100%', height: 54, borderRadius: 27, overflow: 'hidden', marginTop: 8 },
  doneBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
});
