import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  StatusBar,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
import LinearGradient from 'react-native-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';

import { redeemGift, addCoins } from '../store/slices/userSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';
import { getWallet, redeemGiftApi } from '../services/api';

function GiftCard({ gift, onRedeem, onGift }) {
  const isPending = gift.status === 'pending';
  const timeAgo = Math.floor((Date.now() - gift.wonAt) / 60000);
  const timeLabel = timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`;
  const statusLabel = isPending ? 'Available' : gift.status === 'redeemed' ? 'Redeemed' : 'Gifted';

  return (
    <View style={[giftStyles.card, !isPending && giftStyles.cardUsed]}>
      <View style={[giftStyles.iconWrap, !isPending && giftStyles.iconWrapUsed]}>
        <Text style={{ fontSize: 24 }}>{gift.emoji || '🎁'}</Text>
      </View>

      <View style={giftStyles.info}>
        <Text style={[giftStyles.label, !isPending && giftStyles.labelUsed]}>{gift.label}</Text>
        <Text style={giftStyles.time}>Won {timeLabel} · {statusLabel}</Text>
        {isPending && <Text style={giftStyles.worth}>Worth ₹{gift.value}</Text>}
      </View>

      {isPending &&
      <View style={giftStyles.actions}>
          <TouchableOpacity onPress={onRedeem} style={giftStyles.redeemBtn}>
            <View style={giftStyles.redeemGrad}>
              <LinearGradient colors={Gradients.secondary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              <Text style={giftStyles.redeemText}>Redeem</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={onGift} style={giftStyles.giftBtn}>
            <Text style={giftStyles.giftText}>Send</Text>
          </TouchableOpacity>
        </View>
      }
    </View>);
}

const giftStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2
  },
  cardUsed: { opacity: 0.6 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7EC' },
  iconWrapUsed: { backgroundColor: '#F1F5F9' },
  info: { flex: 1 },
  label: { fontSize: 15, fontWeight: '700', color: Colors.dark, marginBottom: 3 },
  labelUsed: { color: '#94a3b8' },
  time: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  worth: { fontSize: 12, color: Colors.secondary, fontWeight: '700', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  redeemBtn: { borderRadius: 10, overflow: 'hidden' },
  redeemGrad: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, overflow: 'hidden' },
  redeemText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  giftBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.secondary },
  giftText: { fontSize: 13, fontWeight: '800', color: Colors.secondary }
});

export default function WalletScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { coins, gifts } = useSelector((state) => state.user);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWallet = async () => {
    try {
      const data = await getWallet();
      if (data?.coins != null) dispatch(addCoins(data.coins - coins));
    } catch {
      // backend not ready — keep redux state
    }
  };

  useEffect(() => { fetchWallet(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWallet();
    setRefreshing(false);
  };

  const pendingGifts = gifts.filter((g) => g.status === 'pending');
  const usedGifts = gifts.filter((g) => g.status !== 'pending');

  const handleRedeem = (gift) => {
    const mins = Math.floor(gift.value);
    Alert.alert(
      'Redeem Gift',
      `Convert ${gift.emoji} ${gift.label} into ${mins} calling minutes?\n\n₹${gift.value} = ${mins} mins`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Redeem', onPress: async () => {
            dispatch(redeemGift({ id: gift.id, action: 'redeem' }));
            try {
              const result = await redeemGiftApi(gift.value, gift.label);
              dispatch(addCoins(result.minsAdded - mins)); // sync with server total
            } catch { /* redux already updated locally */ }
          }
        }
      ]
    );
  };

  const handleGift = (gift) => {
    Alert.alert('Gift to a Girl', `Send "${gift.label}" as a gift to a girl you loved talking to?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Gift', onPress: () => dispatch(redeemGift({ id: gift.id, action: 'gift' })) }]
    );
  };

  const handleShare = async () => {
    await Share.share({
      message: 'Join me on Pineapple! Use my referral code PINE123 and get 200 free coins. Download now!'
    });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="arrow-left" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.secondary} />}>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.balanceTop}>
            <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
            <View style={styles.pineappleBadge}>
              <Icon name="star" size={18} color="#fff" />
            </View>
          </View>
          <Text style={styles.balanceAmount}>{coins.toLocaleString()}</Text>
          <Text style={styles.balanceSub}>Pineapple Coins</Text>

          <View style={styles.balanceStats}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatNum}>{pendingGifts.length}</Text>
              <Text style={styles.balanceStatLabel}>Gifts Pending</Text>
            </View>
            <View style={styles.balanceStatDivider} />
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatNum}>{usedGifts.length}</Text>
              <Text style={styles.balanceStatLabel}>Gifts Used</Text>
            </View>
            <View style={styles.balanceStatDivider} />
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatNum}>0</Text>
              <Text style={styles.balanceStatLabel}>Min Earned</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { marginTop: 24 }]}>
            {/* What you can win */}
            <Text style={styles.sectionLabel}>What You Can Win 🎰</Text>
            <View style={styles.prizeGrid}>
              {[
                { emoji: '🌹', label: 'Rose', worth: '₹10' },
                { emoji: '🍫', label: 'Choco', worth: '₹20' },
                { emoji: '🍰', label: 'Pastry', worth: '₹50' },
                { emoji: '🍍', label: 'Pineapple', worth: '₹100' },
                { emoji: '❤️', label: 'Heart', worth: '₹200' },
                { emoji: '🌸', label: 'Perfume', worth: '₹500' },
                { emoji: '👑', label: 'Crown', worth: '₹5,000' },
                { emoji: '💎', label: 'Diamond', worth: '₹10,000' },
              ].map((p, i) => (
                <View key={i} style={styles.prizeChip}>
                  <Text style={styles.prizeEmoji}>{p.emoji}</Text>
                  <Text style={styles.prizeName}>{p.label}</Text>
                  <Text style={styles.prizeWorth}>{p.worth}</Text>
                </View>
              ))}
            </View>

            {/* Fortune Wheel banner */}
            <View style={styles.spinBanner}>
              <Text style={styles.spinBannerText}>🎁  Spin the Fortune Wheel to win gifts!</Text>
            </View>

            {gifts.length === 0 ? null :

          <>
                {pendingGifts.length > 0 &&
            <>
                    <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Your Gifts</Text>
                    <View style={styles.giftList}>
                      {pendingGifts.map((g) =>
                <GiftCard
                  key={g.id}
                  gift={g}
                  onRedeem={() => handleRedeem(g)}
                  onGift={() => handleGift(g)} />
                )}
                    </View>
                  </>
                }

                {usedGifts.length > 0 &&
            <>
                    <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Past History</Text>
                    <View style={styles.giftList}>
                      {usedGifts.map((g) =>
                <GiftCard key={g.id} gift={g} />
                )}
                    </View>
                  </>
                }
              </>
            }
          </View>

          <TouchableOpacity style={[styles.referCard, { marginTop: 24 }]} activeOpacity={0.9} onPress={handleShare}>
            <View style={styles.referInfo}>
              <Text style={styles.referTitle}>Refer & Earn</Text>
              <Text style={styles.referSub}>Get 200 coins for every friend you invite</Text>
            </View>
            <View style={styles.referBtn}>
              <LinearGradient colors={Gradients.secondary} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
              <Icon name="share" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
      </ScrollView>
    </View>);

}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    height: 58,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.dark, letterSpacing: -0.3 },
  scroll: { paddingHorizontal: 24, paddingTop: 16 },
  balanceCard: {
    borderRadius: 28,
    padding: 22,
    overflow: 'hidden',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  pineappleBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  balanceAmount: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  balanceSub: { color: '#fff', fontSize: 14, fontWeight: '600', opacity: 0.9, marginTop: -4 },
  balanceStats: { flexDirection: 'row', alignItems: 'center', marginTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 10 },
  balanceStat: { flex: 1, alignItems: 'center' },
  balanceStatNum: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  balanceStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600', marginTop: 2 },
  balanceStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 4, marginTop: 24, marginBottom: 24 },
  tab: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: Colors.dark },
  tabText: { fontSize: 14, fontWeight: '700', color: Colors.textLight },
  tabTextActive: { color: '#fff' },
  section: { flex: 1 },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', color: Colors.dark, marginBottom: 16 },
  giftList: { gap: 12 },
  prizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  prizeChip: { width: (SCREEN_W - 48 - 24) / 4, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 4, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#F0D8E2', shadowColor: '#FF3870', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  prizeEmoji: { fontSize: 28 },
  prizeName: { fontSize: 11, fontWeight: '700', color: Colors.dark },
  prizeWorth: { fontSize: 10, fontWeight: '700', color: Colors.secondary },
  spinBanner: {
    backgroundColor: '#FFE8EF', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20,
    borderWidth: 1, borderColor: '#FFD0DA', alignItems: 'center',
  },
  spinBannerText: { fontSize: 13, fontWeight: '700', color: '#C0004A' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.dark, marginTop: 16 },
  emptySub: { fontSize: 14, color: Colors.textLight, marginTop: 4, textAlign: 'center' },
  coinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  coinPkg: { width: (SCREEN_W - 52) / 2, backgroundColor: '#fff', borderRadius: 24, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#EEEEEE' },
  coinPkgPopular: { borderColor: Colors.secondary, borderWidth: 2 },
  pkgRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  pkgRowSelected: { borderColor: Colors.secondary, backgroundColor: Colors.secondary + '08' },
  pkgEmoji: { fontSize: 26 },
  pkgInfo: { flex: 1 },
  pkgSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  pkgCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center' },
  payBtn: { height: 54, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 10 },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  payNote: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginBottom: 20 },
  popularBadge: { position: 'absolute', top: -12, backgroundColor: Colors.secondary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  popularText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  pkgCoins: { fontSize: 16, fontWeight: '800', color: Colors.dark },
  pkgCoinsSelected: { color: Colors.secondary },
  pkgPrice: { fontSize: 16, fontWeight: '800', color: '#64748B' },
  pkgPriceSelected: { color: Colors.secondary },
  referCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, padding: 20, marginTop: 24, gap: 16, borderWidth: 1, borderColor: '#EEEEEE' },
  referInfo: { flex: 1 },
  referTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.dark },
  referSub: { fontSize: 13, color: Colors.textLight, marginTop: 4 },
  referBtn: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }
});