import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';
import { getEarnings, getWithdrawals, getWallet, getCallHistory } from '../services/api';

const { width } = Dimensions.get('window');

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'call', label: '📞 Calls' },
  { id: 'gift', label: '🎁 Gifts' },
  { id: 'withdrawal', label: '💸 Withdrawals' },
];

const GIFT_EMOJI = {
  Rose: '🌹',
  Chocolate: '🍫',
  Pastry: '🍰',
  Pineapple: '🍍',
  Heart: '❤️',
  Perfume: '🧴',
  Crown: '👑',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day} ${month} ${year}, ${hours}:${mins} ${ampm}`;
}

function formatDuration(seconds = 0) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export default function GirlsTransactionsScreen({ onBack, onRedeem }) {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    total_coins: 0,
    total_inr: 0,
    available_inr: 0,
    available_coins: 0,
    total_withdrawn_inr: 0,
    pending_withdrawals: 0,
  });

  const fetchData = async () => {
    try {
      const [eRes, wRes, walRes, cRes] = await Promise.allSettled([
        getEarnings(),
        getWithdrawals(),
        getWallet(),
        getCallHistory(),
      ]);

      const eData = eRes.status === 'fulfilled' ? eRes.value : null;
      const wList = wRes.status === 'fulfilled' && Array.isArray(wRes.value) ? wRes.value : [];
      const walData = walRes.status === 'fulfilled' ? walRes.value : null;
      const cList = cRes.status === 'fulfilled' && Array.isArray(cRes.value) ? cRes.value : [];

      const totalWithdrawn = wList
        .filter((w) => w.status !== 'rejected')
        .reduce((s, w) => s + (parseFloat(w.amount) || 0), 0);

      const pendingWdCount = wList.filter((w) => w.status === 'pending').length;

      const totalInr = parseFloat(eData?.summary?.total_inr || 0);
      const totalCoins = parseFloat(eData?.summary?.total_coins || eData?.summary?.total_mins || 0);
      const availInr = Math.max(0, Math.round((totalInr - totalWithdrawn) * 100) / 100);
      const availCoins = Math.max(0, Math.round((totalCoins - totalWithdrawn * 2) * 10) / 10);

      setSummary({
        total_coins: totalCoins,
        total_inr: totalInr,
        available_inr: availInr,
        available_coins: availCoins,
        total_withdrawn_inr: totalWithdrawn,
        pending_withdrawals: pendingWdCount,
      });

      const combined = [];

      // 1. Calls
      (cList || []).forEach((c) => {
        if (!c) return;
        const secs = Number(c.duration_seconds) || 0;
        const callCoins = parseFloat(c.girl_coins || (c.mins_deducted ? (c.mins_deducted * 0.7).toFixed(2) : 0));
        const callInr = parseFloat(c.girl_earnings_inr || (callCoins * 0.5).toFixed(2));
        const dateVal = c.created_at || c.ended_at;
        const ts = dateVal ? new Date(dateVal).getTime() : 0;

        combined.push({
          id: `call_${c.id || Math.random()}`,
          category: 'call',
          title: c.call_type === 'video' ? 'Video Call' : 'Voice Call',
          subtitle: `${c.other_user_name || 'User'} · ${formatDuration(secs)}`,
          date: dateVal,
          timestamp: ts,
          coins: callCoins > 0 ? `+${callCoins.toFixed(1)}` : null,
          inr: `+₹${callInr.toFixed(2)}`,
          isIncome: true,
          icon: c.call_type === 'video' ? 'video' : 'phone',
          iconBg: c.call_type === 'video' ? '#8B5CF6' : '#EC4899',
        });
      });

      // 2. Gifts Received
      const giftsList = walData?.gifts || [];
      giftsList.forEach((g) => {
        if (!g) return;
        const coinsSpent = parseFloat(g.coins_spent || g.coins || 0);
        const inrVal = (coinsSpent * 0.5).toFixed(2);
        const emoji = GIFT_EMOJI[g.gift_type] || '🎁';
        const dateVal = g.created_at;
        const ts = dateVal ? new Date(dateVal).getTime() : 0;

        combined.push({
          id: `gift_${g.id || Math.random()}`,
          category: 'gift',
          title: `${emoji} ${g.gift_type || 'Gift'} Received`,
          subtitle: `From ${g.sender_name || 'Caller'}`,
          date: dateVal,
          timestamp: ts,
          coins: coinsSpent > 0 ? `+${coinsSpent}` : null,
          inr: `+₹${inrVal}`,
          isIncome: true,
          emoji,
          iconBg: '#F59E0B',
        });
      });

      // 3. Withdrawals
      wList.forEach((w) => {
        if (!w) return;
        const amt = parseFloat(w.amount) || 0;
        const fee = parseFloat(w.fee_amount) || 0;
        const dateVal = w.created_at;
        const ts = dateVal ? new Date(dateVal).getTime() : 0;

        combined.push({
          id: `wd_${w.id || Math.random()}`,
          category: 'withdrawal',
          title: w.same_day ? '⚡ Instant Withdrawal' : 'Standard Withdrawal',
          subtitle: `UPI: ${w.upi_id}${fee > 0 ? ` · Fee: ₹${fee.toFixed(2)}` : ''}`,
          date: dateVal,
          timestamp: ts,
          inr: `-₹${amt.toFixed(2)}`,
          status: (w.status || 'pending').toLowerCase(),
          isIncome: false,
          icon: 'arrow-up-right',
          iconBg: '#EF4444',
        });
      });

      // Sort by newest first
      combined.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(combined);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const filteredList = transactions.filter((t) => {
    if (activeFilter === 'all') return true;
    return t.category === activeFilter;
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1A002C" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Transactions</Text>
          <Text style={styles.headerSubtitle}>Earnings & Payout History</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn} activeOpacity={0.7}>
          <Icon name="rotate-ccw" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF2A6D" />}>
        
        {/* Balance Hero Card */}
        <LinearGradient
          colors={['#3B004E', '#7E004B', '#B8004F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}>
          
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroLabel}>Available Balance</Text>
              <View style={styles.heroAmountRow}>
                <Text style={styles.heroCurrency}>₹</Text>
                <Text style={styles.heroAmount}>{summary.available_inr.toFixed(2)}</Text>
                <View style={styles.heroCoinChip}>
                  <Text style={styles.heroCoinChipText}>🪙 {summary.available_coins.toFixed(0)}</Text>
                </View>
              </View>
            </View>

            {!!onRedeem && (
              <TouchableOpacity style={styles.redeemBtn} onPress={onRedeem} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.redeemBtnGrad}>
                  <Text style={styles.redeemBtnText}>Redeem</Text>
                  <Icon name="chevron-right" size={14} color="#000" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>Total Earned</Text>
              <Text style={styles.heroStatValue}>₹{summary.total_inr.toFixed(2)}</Text>
            </View>
            <View style={styles.heroStatSeparator} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>Total Withdrawn</Text>
              <Text style={styles.heroStatValue}>₹{summary.total_withdrawn_inr.toFixed(2)}</Text>
            </View>
            {summary.pending_withdrawals > 0 && (
              <>
                <View style={styles.heroStatSeparator} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>Pending</Text>
                  <Text style={[styles.heroStatValue, { color: '#FFD700' }]}>
                    {summary.pending_withdrawals} Req
                  </Text>
                </View>
              </>
            )}
          </View>
        </LinearGradient>

        {/* Filter Tabs */}
        <View style={styles.filterWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {FILTERS.map((f) => {
              const isActive = activeFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterTab, isActive && styles.filterTabActive]}
                  onPress={() => setActiveFilter(f.id)}
                  activeOpacity={0.8}>
                  <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Transactions List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Activity & Ledger</Text>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#FF2A6D" />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : filteredList.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>📜</Text>
              <Text style={styles.emptyTitle}>No Transactions Yet</Text>
              <Text style={styles.emptySub}>
                {activeFilter === 'call'
                  ? 'Your voice and video call earnings will appear here.'
                  : activeFilter === 'gift'
                  ? 'Gifts received during calls will appear here.'
                  : activeFilter === 'withdrawal'
                  ? 'Your payout requests will appear here.'
                  : 'Start taking calls to earn coins and withdraw real cash!'}
              </Text>
            </View>
          ) : (
            filteredList.map((item) => {
              return (
                <View key={item.id} style={styles.txnCard}>
                  {/* Icon badge */}
                  <View style={[styles.iconWrap, { backgroundColor: item.iconBg || 'rgba(255,255,255,0.1)' }]}>
                    {item.emoji ? (
                      <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                    ) : (
                      <Icon name={item.icon || 'star'} size={18} color="#FFFFFF" />
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.txnInfo}>
                    <Text style={styles.txnTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.txnSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                    <Text style={styles.txnDate}>{formatDate(item.date)}</Text>
                  </View>

                  {/* Amount / Status */}
                  <View style={styles.txnRight}>
                    <Text style={[styles.txnInr, item.isIncome ? styles.incomeText : styles.expenseText]}>
                      {item.inr}
                    </Text>

                    {item.coins && (
                      <Text style={styles.txnCoins}>{item.coins} 🪙</Text>
                    )}

                    {item.status && (
                      <View
                        style={[
                          styles.statusBadge,
                          item.status === 'approved'
                            ? styles.statusApproved
                            : item.status === 'rejected'
                            ? styles.statusRejected
                            : styles.statusPending,
                        ]}>
                        <Text
                          style={[
                            styles.statusText,
                            item.status === 'approved'
                              ? styles.statusTextApproved
                              : item.status === 'rejected'
                              ? styles.statusTextRejected
                              : styles.statusTextPending,
                          ]}>
                          {item.status === 'approved'
                            ? '✓ Paid'
                            : item.status === 'rejected'
                            ? '✗ Rejected'
                            : '⏳ Pending'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F0018',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1A002C',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  /* Hero Balance Card */
  heroCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#FF2A6D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  heroCurrency: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFD700',
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroCoinChip: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  heroCoinChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFD700',
  },
  redeemBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  redeemBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
  },
  redeemBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1A002C',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginVertical: 14,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  heroStatItem: {
    alignItems: 'center',
  },
  heroStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
  },
  heroStatValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  heroStatSeparator: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  /* Filters */
  filterWrap: {
    marginBottom: 16,
  },
  filterScroll: {
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  filterTabActive: {
    backgroundColor: '#FF2A6D',
    borderColor: '#FF2A6D',
    shadowColor: '#FF2A6D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  filterTabText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  /* List Section */
  listSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 2,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  emptyWrap: {
    paddingVertical: 50,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Transaction Card */
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txnInfo: {
    flex: 1,
    gap: 2,
  },
  txnTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  txnSubtitle: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },
  txnDate: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
    marginTop: 2,
  },
  txnRight: {
    alignItems: 'flex-end',
    gap: 2,
    marginLeft: 8,
  },
  txnInr: {
    fontSize: 14,
    fontWeight: '900',
  },
  incomeText: {
    color: '#22C55E',
  },
  expenseText: {
    color: '#F87171',
  },
  txnCoins: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD700',
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  statusApproved: {
    backgroundColor: 'rgba(34,197,94,0.18)',
  },
  statusPending: {
    backgroundColor: 'rgba(234,179,8,0.18)',
  },
  statusRejected: {
    backgroundColor: 'rgba(239,68,68,0.18)',
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  statusTextApproved: {
    color: '#22C55E',
  },
  statusTextPending: {
    color: '#EAB308',
  },
  statusTextRejected: {
    color: '#EF4444',
  },
});
