import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, Image, Switch, RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Icon from '../components/Icon';

import { getEarnings, getCallHistory, getWallet } from '../services/api';
import { getSocket } from '../services/socket';

const GIFT_EMOJI = { Rose:'🌹', Chocolate:'🍫', Pastry:'🍰', Pineapple:'🍍', Heart:'❤️', Perfume:'🌸', Crown:'👑' };

export default function GirlsEarningsScreen({ onDrawer, onRedeem }) {
  const insets = useSafeAreaInsets();
  const { name, avatarUrl } = useSelector((s) => s.user);
  const [earnings, setEarnings] = useState({ earnings: [], summary: { total_mins: 0, total_inr: 0 } });
  const [calls, setCalls]       = useState([]);
  const [gifts, setGifts]       = useState([]);
  const [isLive, setIsLive]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [eRes, cRes, wRes] = await Promise.allSettled([getEarnings(), getCallHistory(), getWallet()]);
      if (eRes.status === 'fulfilled' && eRes.value) {
        setEarnings(eRes.value);
      }
      if (cRes.status === 'fulfilled' && cRes.value) {
        setCalls(cRes.value || []);
      }
      if (wRes.status === 'fulfilled' && wRes.value) {
        setGifts(wRes.value?.gifts || []);
      }
    } catch {}
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const toggleLive = (val) => {
    setIsLive(val);
    getSocket()?.emit(val ? 'user:online' : 'user:offline');
  };

  const todayCoins = (earnings.earnings || [])
    .filter(e => new Date(e.created_at).toDateString() === new Date().toDateString())
    .reduce((s, e) => s + (parseFloat(e.mins_received) || parseFloat(e.coins_received) || 0), 0);
  const totalCoins    = parseFloat(earnings.summary?.total_coins || earnings.summary?.total_mins || 0);
  const totalInr      = parseFloat(earnings.summary?.total_inr  || 0);
  const totalCalls    = earnings.summary?.total_calls != null ? earnings.summary.total_calls : calls.length;
  const totalCallMins = earnings.summary?.total_talk_mins != null
    ? earnings.summary.total_talk_mins
    : Math.round(calls.reduce((s, c) => s + (Number(c.duration_seconds) || 0), 0) / 60);

  const STATS = [
    { label: 'Today',   value: todayCoins > 0 ? todayCoins.toFixed(1) : '0', sub: 'coins' },
    { label: 'Total',   value: totalCoins > 0 ? totalCoins.toFixed(1) : '0', sub: 'all time' },
    { label: 'Calls',   value: totalCalls,                        sub: 'received' },
    { label: 'Minutes', value: totalCallMins,                     sub: 'talked' },
    { label: 'Earned',  value: `₹${Number(totalInr).toFixed(2)}`, sub: 'total INR' },
    { label: 'Rating',  value: '⭐ 5.0',                          sub: 'top rated' },
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
            <Text style={styles.inrAmt}>₹{Number(totalInr).toFixed(0)}</Text>
            <Text style={styles.inrSub}>earned</Text>
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
          {STATS.map((s, i) => (
            <View key={i} style={styles.statBox}>
              <Text style={styles.statVal}>{s.value}</Text>
              <Text style={styles.statName}>{s.label}</Text>
              <Text style={styles.statSub}>{s.sub}</Text>
            </View>
          ))}
        </View>

        {/* REDEEM BUTTON */}
        <TouchableOpacity onPress={onRedeem} activeOpacity={0.85} style={styles.redeemBtn}>
          <LinearGradient colors={['#FF3870', '#C0004A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.redeemGrad}>
            <Text style={styles.redeemEmoji}>💸</Text>
            <Text style={styles.redeemLabel}>Redeem  ₹{Number(totalInr).toFixed(0)}</Text>
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
          const secs = call.duration_seconds || 0;
          const dur  = `${String(Math.floor(secs / 60)).padStart(2,'0')}:${String(secs % 60).padStart(2,'0')}`;
          const earned = Math.floor(Math.ceil((secs / 60) * 2) * 0.7);
          return (
            <View key={call.id || i} style={styles.row}>
              <View style={styles.rowIcon}>
                <Icon name="phone" size={18} color="#FF3870" />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>{call.other_user?.name || 'User'}</Text>
                <Text style={styles.rowMeta}>{dur} · {call.call_type || 'audio'}</Text>
              </View>
              <Text style={[styles.rowEarned, { color: earned > 0 ? '#22C55E' : '#94A3B8' }]}>
                {earned > 0 ? `+${earned} coins` : '—'}
              </Text>
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
  statBox: {
    width: '30%', flexGrow: 1,
    backgroundColor: '#fff', borderRadius: 18, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statVal: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  statName: { fontSize: 12, fontWeight: '700', color: '#64748B', marginTop: 3 },
  statSub: { fontSize: 10, color: '#CBD5E1', marginTop: 1 },

  /* Redeem */
  redeemBtn: { marginHorizontal: 6, marginBottom: 20, borderRadius: 98, overflow: 'hidden', },
  redeemGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 0 ,paddingHorizontal: 0,height: 48},
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
