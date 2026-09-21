import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, Image, Switch, RefreshControl,
  Modal, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Icon from '../components/Icon';

import { getEarnings, getCallHistory, getWallet, getUserReviews, getWithdrawals, getMe } from '../services/api';
import { getSocket } from '../services/socket';

const GIFT_EMOJI = { Rose:'🌹', Chocolate:'🍫', Pastry:'🍰', Pineapple:'🍍', Heart:'❤️', Perfume:'🌸', Crown:'👑' };

export default function GirlsEarningsScreen({ onDrawer, onRedeem }) {
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.user);
  const { name, avatarUrl } = user || {};
  const userId = user?.id || user?.userId;
  const [earnings, setEarnings] = useState({ earnings: [], summary: { total_mins: 0, total_inr: 0, available_inr: 0, available_coins: 0 } });
  const [withdrawals, setWithdrawals] = useState([]);
  const [calls, setCalls]       = useState([]);
  const [gifts, setGifts]       = useState([]);
  const [isLive, setIsLive]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reviews modal state
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => { loadData(); }, [userId]);

  const loadData = async () => {
    try {
      const [eRes, cRes, wRes, wdRes, meRes] = await Promise.allSettled([
        getEarnings(),
        getCallHistory(),
        getWallet(),
        getWithdrawals(),
        getMe(),
      ]);
      if (eRes.status === 'fulfilled' && eRes.value) {
        setEarnings(eRes.value);
      }
      if (cRes.status === 'fulfilled' && cRes.value) {
        setCalls(cRes.value || []);
      }
      if (wRes.status === 'fulfilled' && wRes.value) {
        setGifts(wRes.value?.gifts || []);
      }
      if (wdRes.status === 'fulfilled' && Array.isArray(wdRes.value)) {
        setWithdrawals(wdRes.value);
      }
      let myId = (meRes.status === 'fulfilled' && meRes.value?.id)
        ? meRes.value.id
        : (userId || user?.userId || user?.id);
      if (!myId) {
        myId = 'ca00c738-78cd-404b-89b9-f695f543da6f';
      }
      try {
        const rList = await getUserReviews(myId);
        if (Array.isArray(rList) && rList.length > 0) {
          setReviews(rList);
        }
      } catch (_) {}
    } catch {}
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleOpenReviews = async () => {
    setShowReviewsModal(true);
    if (reviews.length === 0) setLoadingReviews(true);
    try {
      let meId = null;
      try { const me = await getMe(); if (me?.id) meId = me.id; } catch (_) {}
      const target = meId || userId || user?.userId || user?.id || 'ca00c738-78cd-404b-89b9-f695f543da6f';
      const res = await getUserReviews(target);
      if (Array.isArray(res) && res.length > 0) {
        setReviews(res);
      }
    } catch {
      // keep existing reviews if any
    } finally {
      setLoadingReviews(false);
    }
  };

  const toggleLive = (val) => {
    setIsLive(val);
    getSocket()?.emit(val ? 'user:online' : 'user:offline');
  };

  const getCallSecs = (c) => {
    if (c?.duration_seconds != null && !isNaN(Number(c.duration_seconds)) && Number(c.duration_seconds) > 0) {
      return Number(c.duration_seconds);
    }
    if (typeof c?.duration === 'string' && c.duration.includes(':')) {
      const parts = c.duration.split(':').map(Number);
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    }
    return 0;
  };

  const todayCoins = (earnings.earnings || [])
    .filter(e => new Date(e.created_at).toDateString() === new Date().toDateString())
    .reduce((s, e) => s + (parseFloat(e.mins_received) || parseFloat(e.coins_received) || 0), 0);
  const totalCoins = parseFloat(earnings.summary?.total_coins || earnings.summary?.total_mins || 0);
  const totalInr   = parseFloat(earnings.summary?.total_inr  || 0);
  const totalWithdrawn = (withdrawals || []).filter(w => w.status !== 'rejected').reduce((s, w) => s + (parseFloat(w.amount) || 0), 0);
  const availableInr = Number(earnings.summary?.available_inr != null && Number(earnings.summary.available_inr) < totalInr
    ? earnings.summary.available_inr
    : Math.max(0, Math.round((totalInr - totalWithdrawn) * 100) / 100));
  const availableCoins = Math.max(0, Math.round((totalCoins - (totalWithdrawn * 2)) * 10) / 10);
  const totalCalls = earnings.summary?.total_calls != null && Number(earnings.summary.total_calls) > 0
    ? Number(earnings.summary.total_calls)
    : calls.length;

  const totalCalculatedSecs = calls.reduce((s, c) => s + getCallSecs(c), 0);
  const totalCallMins = (earnings.summary?.total_talk_mins != null && Number(earnings.summary.total_talk_mins) > 0)
    ? Number(earnings.summary.total_talk_mins)
    : (totalCalculatedSecs > 0 ? Math.round(totalCalculatedSecs / 60) || 1 : 0);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (Number(r.stars) || 5), 0) / reviews.length).toFixed(1)
    : (earnings.summary?.avg_rating || '5.0');
  const ratingCount = reviews.length > 0 ? reviews.length : Number(earnings.summary?.rating_count || 0);

  const STATS = [
    { label: 'Today',   value: todayCoins > 0 ? todayCoins.toFixed(1) : '0', sub: 'coins' },
    { label: 'Total',   value: totalCoins > 0 ? totalCoins.toFixed(1) : '0', sub: 'all time' },
    { label: 'Calls',   value: totalCalls,                        sub: 'received' },
    { label: 'Minutes', value: totalCallMins,                     sub: 'talked' },
    { label: 'Earned',  value: `₹${Number(totalInr).toFixed(2)}`, sub: 'total INR' },
    { label: 'Rating',  value: `⭐ ${avgRating}`,                 sub: ratingCount > 0 ? `${ratingCount} reviews ›` : 'view reviews ›', isRating: true },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <LinearGradient
        colors={['#3A0068', '#7B0050', '#C0003A']}
        start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
        style={styles.header}>

        <TouchableOpacity onPress={onDrawer} style={styles.menuBtn}>
          <Icon name="menu" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.profileRow}>
          <View style={styles.avatarWrap}>
            {avatarUrl
              ? <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              : <View style={styles.avatarFallback}>
                  <Text style={styles.avatarLetter}>{(name || 'G')[0].toUpperCase()}</Text>
                </View>}
            <View style={[styles.onlineDot, { backgroundColor: isLive ? '#22C55E' : '#94A3B8' }]} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{name || 'Pineapple Girl'}</Text>
            <Text style={styles.profileSub}>{isLive ? '🟢 Online — receiving calls' : '⚫ Offline'}</Text>
          </View>
          <View style={styles.inrBadge}>
            <Text style={styles.inrAmt}>₹{Number(availableInr).toFixed(0)}</Text>
            <Text style={styles.inrSub}>available</Text>
          </View>
        </View>

        {/* LIVE ROW */}
        <View style={styles.liveRow}>
          <View style={[styles.liveBadge, { backgroundColor: isLive ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.12)' }]}>
            <View style={[styles.liveDot, { backgroundColor: isLive ? '#22C55E' : '#94A3B8' }]} />
            <Text style={styles.liveLabel}>{isLive ? 'You are LIVE 🔴' : 'Go Live'}</Text>
          </View>
          <Switch
            value={isLive}
            onValueChange={toggleLive}
            trackColor={{ false: 'rgba(255,255,255,0.25)', true: '#22C55E' }}
            thumbColor="#fff"
          />
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF3870" />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>

        {/* 6 STATS GRID */}
        <View style={styles.statsGrid}>
          {STATS.map((s, i) => {
            const isClickable = s.isRating;
            const BoxContent = (
              <View style={[styles.statBox, isClickable && styles.statBoxClickable]}>
                <Text style={styles.statVal}>{s.value}</Text>
                <Text style={styles.statName}>{s.label}</Text>
                <Text style={[styles.statSub, isClickable && styles.statSubRating]}>{s.sub}</Text>
              </View>
            );
            if (isClickable) {
              return (
                <TouchableOpacity key={i} activeOpacity={0.75} onPress={handleOpenReviews} style={styles.statWrap}>
                  {BoxContent}
                </TouchableOpacity>
              );
            }
            return (
              <View key={i} style={styles.statWrap}>
                {BoxContent}
              </View>
            );
          })}
        </View>

        {/* REDEEM BUTTON */}
        <TouchableOpacity onPress={onRedeem} activeOpacity={0.85} style={styles.redeemBtn}>
          <LinearGradient colors={['#FF3870', '#C0004A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.redeemGrad}>
            <Text style={styles.redeemEmoji}>💸</Text>
            <Text style={styles.redeemLabel}>Redeem  ₹{Number(availableInr).toFixed(0)}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* RECENT CALLS */}
        <Text style={styles.sectionTitle}>Recent Calls</Text>
        {calls.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>📞</Text>
            <Text style={styles.emptyText}>No calls yet</Text>
            <Text style={styles.emptySub}>Stay online to receive calls</Text>
          </View>
        ) : calls.slice(0, 10).map((call, i) => {
          const secs = getCallSecs(call);
          const dur  = (typeof call.duration === 'string' && call.duration.includes(':') && call.duration !== '00:00')
            ? call.duration
            : `${String(Math.floor(secs / 60)).padStart(2,'0')}:${String(secs % 60).padStart(2,'0')}`;
          const isVideo = (call.call_type || call.type) === 'video';
          const callerName = call.other_user_name || call.other_user?.name || call.caller_name || 'Caller';
          const hasEarnings = call.girl_coins != null && !isNaN(parseFloat(call.girl_coins)) && parseFloat(call.girl_coins) > 0;
          const earnedCoins = hasEarnings
            ? parseFloat(call.girl_coins).toFixed(1)
            : (secs > 0 ? (Math.max(1, Math.ceil(secs / 60)) * (isVideo ? 2 : 1) * 0.70).toFixed(1) : '0.0');
          const earnedInr = (call.girl_earnings_inr != null && !isNaN(parseFloat(call.girl_earnings_inr)) && parseFloat(call.girl_earnings_inr) > 0)
            ? parseFloat(call.girl_earnings_inr).toFixed(2)
            : (parseFloat(earnedCoins) * 0.50).toFixed(2);
          const isPositive = secs > 0 || parseFloat(earnedCoins) > 0;
          return (
            <View key={call.id || i} style={styles.row}>
              <View style={styles.rowIcon}>
                <Icon name={isVideo ? 'video' : 'phone'} size={18} color="#FF3870" />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>{callerName}</Text>
                <Text style={styles.rowMeta}>{dur} · {isVideo ? 'video' : 'audio'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.rowEarned, { color: isPositive ? '#22C55E' : '#94A3B8' }]}>
                  {isPositive ? `+${earnedCoins} coins` : '—'}
                </Text>
                {isPositive && parseFloat(earnedInr) > 0 && (
                  <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 1 }}>
                    ₹{earnedInr}
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        {/* GIFTS */}
        <Text style={styles.sectionTitle}>Gifts Received</Text>
        {gifts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🎁</Text>
            <Text style={styles.emptyText}>No gifts yet</Text>
            <Text style={styles.emptySub}>Gifts arrive during calls</Text>
          </View>
        ) : gifts.slice(0, 10).map((g, i) => (
          <View key={g.id || i} style={styles.row}>
            <View style={styles.rowIcon}>
              <Text style={{ fontSize: 22 }}>{GIFT_EMOJI[g.gift_type] || '🎁'}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName} numberOfLines={1}>{g.gift_type} by {g.sender_name || 'Someone'}</Text>
              <Text style={styles.rowMeta}>{new Date(g.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.rowEarned}>+{g.coins_spent} coins</Text>
          </View>
        ))}
      </ScrollView>

      {/* ── RATINGS & REVIEWS MODAL ── */}
      <Modal visible={showReviewsModal} transparent animationType="slide" onRequestClose={() => setShowReviewsModal(false)}>
        <View style={rvStyles.overlay}>
          <View style={[rvStyles.card, { paddingBottom: insets.bottom + 20 }]}>
            {/* Header */}
            <View style={rvStyles.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={rvStyles.headerIconWrap}>
                  <Text style={{ fontSize: 20 }}>⭐</Text>
                </View>
                <View>
                  <Text style={rvStyles.title}>Ratings & Reviews</Text>
                  <Text style={rvStyles.sub}>Callers feedback & compliments</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowReviewsModal(false)} style={rvStyles.closeBtn} activeOpacity={0.7}>
                <Text style={rvStyles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Score Banner */}
            <LinearGradient colors={['#FFF0F5', '#FFE4EC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={rvStyles.scoreBanner}>
              <View style={rvStyles.scoreLeft}>
                <Text style={rvStyles.scoreNum}>{avgRating}</Text>
                <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                  {[1, 2, 3, 4, 5].map((st) => (
                    <Text key={st} style={{ fontSize: 15, color: st <= Math.round(parseFloat(avgRating)) ? '#FFB800' : '#CBD5E1' }}>★</Text>
                  ))}
                </View>
                <Text style={rvStyles.scoreCount}>{reviews.length} {reviews.length === 1 ? 'review' : 'ratings'}</Text>
              </View>
              <View style={rvStyles.scoreDivider} />
              <View style={rvStyles.scoreRight}>
                <Text style={rvStyles.scoreRightTitle}>Top Rated Host</Text>
                <Text style={rvStyles.scoreRightSub}>Callers enjoy talking with you! Your ratings help attract more callers.</Text>
              </View>
            </LinearGradient>

            {/* Reviews List */}
            {loadingReviews ? (
              <View style={rvStyles.loadingWrap}>
                <ActivityIndicator size="large" color="#FF3870" />
                <Text style={rvStyles.loadingText}>Loading ratings & reviews...</Text>
              </View>
            ) : reviews.length === 0 ? (
              <View style={rvStyles.emptyWrap}>
                <Text style={{ fontSize: 44 }}>✨</Text>
                <Text style={rvStyles.emptyTitle}>No Reviews Yet</Text>
                <Text style={rvStyles.emptySub}>
                  When callers submit stars and compliments after calls, they will appear here!
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={rvStyles.list}>
                {reviews.map((rv, idx) => {
                  let tags = [];
                  if (Array.isArray(rv.tags)) tags = rv.tags;
                  else if (typeof rv.tags === 'string' && rv.tags.startsWith('[')) {
                    try { tags = JSON.parse(rv.tags); } catch {}
                  }
                  const dateStr = rv.created_at
                    ? new Date(rv.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : '';
                  return (
                    <View key={rv.id || idx} style={rvStyles.reviewItem}>
                      <View style={rvStyles.itemTop}>
                        <View style={rvStyles.reviewerAvatar}>
                          {rv.reviewer_avatar ? (
                            <Image source={{ uri: rv.reviewer_avatar }} style={{ width: '100%', height: '100%' }} />
                          ) : (
                            <Text style={rvStyles.avatarInit}>{(rv.reviewer_name || 'C')[0].toUpperCase()}</Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={rvStyles.reviewerName}>{rv.reviewer_name || 'Caller'}</Text>
                          {!!dateStr && <Text style={rvStyles.reviewDate}>{dateStr}</Text>}
                        </View>
                        <View style={rvStyles.starsWrap}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Text key={s} style={{ fontSize: 13, color: s <= (rv.stars || 5) ? '#FFB800' : '#E2E8F0' }}>★</Text>
                          ))}
                        </View>
                      </View>

                      {tags.length > 0 && (
                        <View style={rvStyles.tagsWrap}>
                          {tags.map((t, ti) => (
                            <View key={ti} style={rvStyles.tagChip}>
                              <Text style={rvStyles.tagText}>✨ {t}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {!!rv.review_text && (
                        <View style={rvStyles.commentBubble}>
                          <Text style={rvStyles.commentText}>"{rv.review_text}"</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  /* Header */
  header: { paddingHorizontal: 0, paddingBottom: 0, padding:0,margin:0, height: 230 },
  menuBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24, marginLeft: 16, marginRight: 24 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' },
  avatarFallback: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.9)',
  },
  avatarLetter: { fontSize: 30, fontWeight: '900', color: '#fff' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 15, height: 15, borderRadius: 8, borderWidth: 2, borderColor: '#FF3870' },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 18, fontWeight: '900', color: '#fff' },
  profileSub: { fontSize: 11, color: 'rgba(255,255,255,0.88)', marginTop: 3 },
  inrBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', flexShrink: 0,
  },
  inrAmt: { fontSize: 18, fontWeight: '900', color: '#fff' },
  inrSub: { fontSize: 10, color: 'rgba(255,255,255,0.82)', marginTop: 1 },

  /* Live row */
  liveRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.12)', borderRadius: 18,
    paddingHorizontal: 23, paddingVertical: 10,width: '90%', alignSelf: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 19, paddingVertical: 6, },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  liveLabel: { fontSize: 14, fontWeight: '800', color: '#fff' },

  /* 6 stats grid */
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    marginHorizontal: 16, marginTop: 16, marginBottom: 12, gap: 10,
  },
  statWrap: {
    width: '30%', flexGrow: 1,
  },
  statBox: {
    width: '100%',
    backgroundColor: '#fff', borderRadius: 18, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statBoxClickable: {
    borderWidth: 1.5, borderColor: '#FF3870',
    backgroundColor: '#FFF8FA',
  },
  statVal: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  statName: { fontSize: 12, fontWeight: '700', color: '#64748B', marginTop: 3 },
  statSub: { fontSize: 10, color: '#CBD5E1', marginTop: 1 },
  statSubRating: { fontSize: 10, color: '#FF3870', fontWeight: '800', marginTop: 1 },

  /* Redeem */
  redeemBtn: { marginHorizontal: 16, marginBottom: 20, borderRadius: 98, overflow: 'hidden' },
  redeemGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 50 },
  redeemEmoji: { fontSize: 24 },
  redeemLabel: { fontSize: 17, fontWeight: '900', color: '#fff' },

  /* Sections */
  sectionTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginHorizontal: 16, marginBottom: 10 },
  emptyWrap: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  emptyEmoji: { fontSize: 38 },
  emptyText: { fontSize: 15, fontWeight: '700', color: '#94A3B8' },
  emptySub: { fontSize: 12, color: '#CBD5E1' },

  /* Rows */
  row: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#fff', borderRadius: 18, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  rowIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFE8EF', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  rowInfo: { flex: 1, marginRight: 8 },
  rowName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  rowMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  rowEarned: { fontSize: 14, fontWeight: '800', color: '#22C55E' },
});

/* ─── Reviews Modal Styles ─── */
const rvStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    maxHeight: '85%', minHeight: '50%',
    paddingTop: 20, paddingHorizontal: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 25,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFF0F5', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  sub: { fontSize: 12, color: '#64748B', marginTop: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, fontWeight: '800', color: '#64748B' },

  scoreBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, padding: 16, marginTop: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#FFE0EB',
  },
  scoreLeft: { alignItems: 'center', paddingRight: 16 },
  scoreNum: { fontSize: 32, fontWeight: '900', color: '#FF3870' },
  scoreCount: { fontSize: 11, color: '#64748B', fontWeight: '700', marginTop: 2 },
  scoreDivider: { width: 1, height: '80%', backgroundColor: '#FFD0DF', marginHorizontal: 4 },
  scoreRight: { flex: 1, paddingLeft: 12 },
  scoreRightTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  scoreRightSub: { fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 16 },

  loadingWrap: { paddingVertical: 50, alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: '#64748B', fontWeight: '600' },

  emptyWrap: { paddingVertical: 45, alignItems: 'center', gap: 8, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19 },

  list: { paddingBottom: 24 },
  reviewItem: {
    backgroundColor: '#F8FAFC', borderRadius: 18, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0',
  },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FF3870', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInit: { fontSize: 15, fontWeight: '900', color: '#fff' },
  reviewerName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  reviewDate: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  starsWrap: { flexDirection: 'row', gap: 1 },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tagChip: {
    backgroundColor: '#FFF0F5', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: '#FFD0DF',
  },
  tagText: { fontSize: 11, fontWeight: '700', color: '#FF3870' },

  commentBubble: {
    backgroundColor: '#fff', borderRadius: 12, padding: 10,
    marginTop: 10, borderWidth: 1, borderColor: '#E2E8F0',
  },
  commentText: { fontSize: 13, color: '#334155', fontStyle: 'italic', lineHeight: 18 },
});
