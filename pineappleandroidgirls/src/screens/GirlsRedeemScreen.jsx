import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, StatusBar, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';
import { getEarnings, requestWithdrawal } from '../services/api';

const MIN_WITHDRAW = 100; // ₹100 minimum
const SAME_DAY_FEE_RATE = 0.10; // 10% fee for same-day withdrawal

export default function GirlsRedeemScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const [upi, setUpi]             = useState('');
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [summary, setSummary]     = useState({ total_mins: 0, total_inr: 0 });
  const [error, setError]         = useState('');
  const [sameDay, setSameDay]     = useState(false);
  const [submittingType, setSubmittingType] = useState(null); // 'standard' | 'instant' | null

  useEffect(() => {
    getEarnings()
      .then((d) => setSummary(d?.summary || { total_mins: 0, total_inr: 0, available_inr: 0, available_coins: 0 }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const availableInr = Number(summary.available_inr != null
    ? summary.available_inr
    : Math.max(0, (summary.total_inr || 0) - (summary.total_withdrawn_inr || 0)));
  const availableCoins = Number(summary.available_coins != null
    ? summary.available_coins
    : (availableInr * 2));
  const canRedeem    = availableInr >= MIN_WITHDRAW && upi.trim().length > 3;
  const feeAmount     = Math.round(availableInr * SAME_DAY_FEE_RATE * 100) / 100;
  const payoutAmount  = Math.max(0, availableInr - feeAmount);

  const handleSubmit = async (isSameDay) => {
    if (!upi.trim()) { setError('UPI ID daalo'); return; }
    if (availableInr < MIN_WITHDRAW) {
      setError(`Minimum ₹${MIN_WITHDRAW} chahiye. Abhi ₹${availableInr.toFixed(0)} available hai.`);
      return;
    }
    setSubmitting(true);
    setSubmittingType(isSameDay ? 'instant' : 'standard');
    setSameDay(isSameDay);
    setError('');
    try {
      await requestWithdrawal(availableInr.toFixed(2), upi.trim(), isSameDay);
      setSubmitted(true);
    } catch (e) {
      setError(e.message || 'Request fail hui. Dobara try karo.');
    } finally {
      setSubmitting(false);
      setSubmittingType(null);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.successWrap}>
          <LinearGradient colors={['#FF3870', '#C0004A']} style={styles.successIcon}>
            <Text style={{ fontSize: 36 }}>✅</Text>
          </LinearGradient>
          <Text style={styles.successTitle}>Request Submitted!</Text>
          <Text style={styles.successSub}>
            {sameDay
              ? `₹${payoutAmount.toFixed(0)} (after 10% same-day fee) will be sent to\n${upi}\ntoday.`
              : `₹${availableInr.toFixed(0)} will be sent to\n${upi}\nwithin 3–5 business days.`}
          </Text>
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Redeem Earnings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Balance card */}
        <LinearGradient
          colors={['#FF3870', '#C0004A', '#8B1030']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.balanceCard}>
          {loading ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <>
              <Text style={styles.balanceLabel}>Available to Redeem</Text>
              <Text style={styles.balanceAmount}>₹{availableInr.toFixed(0)}</Text>
              <Text style={styles.balanceMins}>{availableCoins > 0 ? availableCoins.toFixed(1) : '0'} coins available</Text>
            </>
          )}
        </LinearGradient>

        {/* Min note */}
        {availableInr < MIN_WITHDRAW && !loading && (
          <View style={styles.noteBox}>
            <Icon name="info" size={16} color="#EF4444" />
            <Text style={[styles.noteText, { color: '#EF4444' }]}>
              Need ₹{(MIN_WITHDRAW - availableInr).toFixed(0)} more to withdraw (min ₹{MIN_WITHDRAW})
            </Text>
          </View>
        )}

        {availableInr >= MIN_WITHDRAW && (
          <View style={[styles.noteBox, { backgroundColor: '#E8F7EF' }]}>
            <Icon name="check" size={16} color="#22C55E" />
            <Text style={[styles.noteText, { color: '#22C55E' }]}>
              You can withdraw ₹{availableInr.toFixed(0)} now!
            </Text>
          </View>
        )}

        {/* UPI Input */}
        <Text style={styles.inputLabel}>Your UPI ID</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="yourname@paytm / @upi"
            placeholderTextColor="#aaa"
            value={upi}
            onChangeText={(t) => { setUpi(t); setError(''); }}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {error.length > 0 && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Two withdrawal options */}
        <View style={styles.optionsWrap}>
          <TouchableOpacity
            style={[styles.optionCard, !canRedeem && styles.optionCardDisabled]}
            activeOpacity={0.85}
            disabled={!canRedeem || submitting}
            onPress={() => handleSubmit(true)}>
            <View style={styles.optionHeader}>
              <Text style={styles.optionTitle}>⚡ Instant Withdrawal</Text>
              <View style={styles.feeBadge}><Text style={styles.feeBadgeText}>10% fee</Text></View>
            </View>
            <Text style={styles.optionSub}>Get ₹{payoutAmount.toFixed(0)} today</Text>
            <View style={[styles.optionBtn, !canRedeem && styles.optionBtnDisabled]}>
              <LinearGradient
                colors={canRedeem ? Gradients.primary : ['#CBD5E1', '#94A3B8']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.optionBtnGrad}>
                {submitting && submittingType === 'instant'
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.optionBtnText}>
                      {canRedeem ? 'Instant Withdrawal' : (availableInr < MIN_WITHDRAW ? `Need ₹${MIN_WITHDRAW} to Withdraw` : 'Enter UPI ID')}
                    </Text>}
              </LinearGradient>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, !canRedeem && styles.optionCardDisabled]}
            activeOpacity={0.85}
            disabled={!canRedeem || submitting}
            onPress={() => handleSubmit(false)}>
            <View style={styles.optionHeader}>
              <Text style={styles.optionTitle}>Withdraw</Text>
              <View style={[styles.feeBadge, styles.freeBadge]}><Text style={[styles.feeBadgeText, styles.freeBadgeText]}>Free</Text></View>
            </View>
            <Text style={styles.optionSub}>Get ₹{availableInr.toFixed(0)} in 3–5 days</Text>
            <View style={[styles.optionBtnOutline, !canRedeem && styles.optionBtnDisabled]}>
              {submitting && submittingType === 'standard'
                ? <ActivityIndicator color={Colors.primary} size="small" />
                : <Text style={styles.optionBtnOutlineText}>
                    {canRedeem ? `Withdraw ₹${availableInr.toFixed(0)}` : (availableInr < MIN_WITHDRAW ? `Need ₹${MIN_WITHDRAW} to Withdraw` : 'Enter UPI ID')}
                  </Text>}
            </View>
          </TouchableOpacity>
        </View>

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

  scroll: { padding: 16, gap: 16, paddingBottom: 40 },

  balanceCard: {
    borderRadius: 28, padding: 6, alignItems: 'center',
    shadowColor: '#FF3870', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 12,
    minHeight: 180, justifyContent: 'center',
  },
  balanceLabel: { fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: '600', letterSpacing: 0.3 },
  balanceAmount: { fontSize: 64, fontWeight: '900', color: '#fff', marginTop: 8, marginBottom: 4 },
  balanceMins: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 6 },

  howCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  howTitle: { fontSize: 14, fontWeight: '800', color: Colors.dark, marginBottom: 10 },
  howItem: { fontSize: 13, color: '#64748B', lineHeight: 24 },

  noteBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12,
  },
  noteText: { fontSize: 13, fontWeight: '600', flex: 1 },

  inputLabel: { fontSize: 13, fontWeight: '700', color: Colors.dark },
  inputWrap: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  input: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.dark },

  errorText: { fontSize: 13, color: '#EF4444', fontWeight: '600', textAlign: 'center' },

  optionsWrap: { gap: 12 },
  optionCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    borderWidth: 1.5, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  optionCardDisabled: { opacity: 0.6 },
  optionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  optionTitle: { fontSize: 15, fontWeight: '800', color: Colors.dark },
  optionSub: { fontSize: 12, color: '#94A3B8', marginBottom: 12 },
  feeBadge: { backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  feeBadgeText: { fontSize: 11, fontWeight: '800', color: '#D97706' },
  freeBadge: { backgroundColor: '#F0FDF4' },
  freeBadgeText: { color: '#16A34A' },
  optionBtn: { borderRadius: 16, overflow: 'hidden', height: 46 },
  optionBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  optionBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  optionBtnOutline: {
    height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  optionBtnOutlineText: { fontSize: 14, fontWeight: '800', color: Colors.primary },
  optionBtnDisabled: { opacity: 0.6 },

  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  successIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 26, fontWeight: '900', color: Colors.dark },
  successSub: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 24 },
  doneBtn: { width: '100%', height: 54, borderRadius: 27, overflow: 'hidden', marginTop: 8 },
  doneBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
});
