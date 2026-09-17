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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';
import { getTransactions, getWallet } from '../services/api';

const FILTERS = ['All', 'Purchases', 'Spin Gifts', 'Sent Gifts'];

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

export default function TransactionsScreen({ onBack, onBuyCoins }) {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('All');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = async () => {
    try {
      const data = await getTransactions();
      if (Array.isArray(data)) {
        setTransactions(data);
      } else {
        const walletData = await getWallet();
        setTransactions(walletData?.transactions || []);
      }
    } catch {
      try {
        const walletData = await getWallet();
        setTransactions(walletData?.transactions || []);
      } catch {
        setTransactions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  const filteredTxns = transactions.filter((t) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Purchases') return t.type === 'purchase';
    if (activeFilter === 'Spin Gifts') return t.type === 'spin_gift' || t.type === 'earn';
    if (activeFilter === 'Sent Gifts') return t.type === 'spend';
    return true;
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="arrow-left" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => {
            const isActive = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.8}
                style={[styles.filterChip, isActive && styles.filterChipActive]}>
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.secondary} />
        }>
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.secondary} />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : filteredTxns.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptySub}>
              {activeFilter === 'All'
                ? 'Your coin purchases and spin rewards will appear here.'
                : `No ${activeFilter.toLowerCase()} found in your history.`}
            </Text>
            {onBuyCoins && (
              <TouchableOpacity style={styles.buyBtn} onPress={onBuyCoins} activeOpacity={0.85}>
                <LinearGradient colors={Gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buyBtnGrad}>
                  <Text style={styles.buyBtnText}>+ Get Coins</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredTxns.map((t) => {
            const isPurchase = t.type === 'purchase';
            const isSpin = t.type === 'spin_gift' || t.type === 'earn';
            const isSpend = t.type === 'spend';

            const iconEmoji = isPurchase ? '🪙' : isSpin ? '🎰' : isSpend ? '🎁' : '💳';
            const badgeBg = isPurchase ? '#ECFDF5' : isSpin ? '#FEF3C7' : '#FFF1F2';
            const badgeColor = isPurchase ? '#059669' : isSpin ? '#D97706' : '#E11D48';
            const amountPrefix = isSpend ? '-' : '+';
            const amountColor = isSpend ? '#E11D48' : '#059669';

            return (
              <View key={t.id || Math.random().toString()} style={styles.card}>
                <View style={[styles.iconWrap, { backgroundColor: badgeBg }]}>
                  <Text style={styles.iconEmoji}>{iconEmoji}</Text>
                </View>

                <View style={styles.infoWrap}>
                  <View style={styles.titleRow}>
                    <Text style={styles.titleText} numberOfLines={1}>
                      {isPurchase ? 'Coin Purchase' : isSpin ? 'Spin Reward' : isSpend ? 'Gift Sent' : 'Transaction'}
                    </Text>
                    <Text style={[styles.amountText, { color: amountColor }]}>
                      {amountPrefix}{Math.abs(t.amount || 0)} {isPurchase || isSpend || isSpin ? 'Coins' : ''}
                    </Text>
                  </View>

                  <Text style={styles.descText} numberOfLines={2}>{t.description || 'Wallet transaction'}</Text>
                  <Text style={styles.dateText}>{formatDate(t.created_at)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 56,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.dark },
  filterWrap: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: Colors.secondary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#fff',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 24,
  },
  infoWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.dark,
    flex: 1,
    marginRight: 8,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '900',
  },
  descText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  centerLoading: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  emptyWrap: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  buyBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    width: 180,
  },
  buyBtnGrad: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#fff',
  },
});
