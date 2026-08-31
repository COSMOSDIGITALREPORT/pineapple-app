import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, Image, Switch,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Icon from '../components/Icon';
import { Colors } from '../theme/colors';
import { getCallHistory } from '../services/api';
import { getSocket } from '../services/socket';

export default function GirlsEarningsScreen({ onDrawer, onRedeem }) {
  const insets = useSafeAreaInsets();
  const { name, avatarUrl, coins } = useSelector((s) => s.user);
  const [calls, setCalls] = useState([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    getCallHistory().then((d) => setCalls(d || [])).catch(() => {});
  }, []);

  const toggleLive = (val) => {
    setIsLive(val);
    // notify backend via socket
    getSocket()?.emit(val ? 'user:online' : 'user:offline');
  };

  const totalEarned = calls.reduce((sum, c) => sum + (c.coins_earned || 0), 0);
  const totalCalls  = calls.length;
  const totalMins   = calls.reduce((sum, c) => sum + Math.floor((c.duration_seconds || 0) / 60), 0);
  const todayEarned = calls
    .filter(c => new Date(c.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, c) => sum + (c.coins_earned || 0), 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Gradient Header */}
      <LinearGradient
        colors={['#FF5A7A', '#FF8A5B']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}>
        <TouchableOpacity onPress={onDrawer} style={styles.menuBtn}>
          <Icon name="menu" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Profile */}
        <View style={styles.profileRow}>
          <View style={styles.avatarWrap}>
            {avatarUrl
              ? <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              : <View style={styles.avatarFallback}>
                  <Text style={styles.avatarLetter}>{(name || 'G')[0].toUpperCase()}</Text>
                </View>
            }
            <View style={[styles.onlineDot, { backgroundColor: isLive ? '#22C55E' : '#94A3B8' }]} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{name || 'Pineapple Girl'}</Text>
            <Text style={styles.profileSub}>{isLive ? '🟢 Online — receiving calls' : '⚫ Offline'}</Text>
          </View>
          <View style={styles.coinsBadge}>
            <Icon name="star" size={14} color="#FFC72C" filled />
            <Text style={styles.coinsText}>{coins}</Text>
          </View>
        </View>

        {/* Go Live toggle */}
        <View style={styles.liveToggleRow}>
          <Text style={styles.liveLabel}>{isLive ? 'You are LIVE 🔴' : 'Go Live to receive calls'}</Text>
          <Switch
            value={isLive}
            onValueChange={toggleLive}
            trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#22C55E' }}
            thumbColor="#fff"
          />
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>

        {/* Today's earnings */}
        <View style={styles.todayRow}>
          <View style={styles.todayCard}>
            <Text style={styles.todayLabel}>Today</Text>
            <View style={styles.todayAmtRow}>
              <Icon name="star" size={16} color={Colors.primary} filled />
              <Text style={styles.todayAmt}>{todayEarned}</Text>
            </View>
            <Text style={styles.todaySub}>coins earned</Text>
          </View>
          <View style={styles.todayCard}>
            <Text style={styles.todayLabel}>Total</Text>
            <View style={styles.todayAmtRow}>
              <Icon name="star" size={16} color={Colors.primary} filled />
              <Text style={styles.todayAmt}>{totalEarned}</Text>
            </View>
            <Text style={styles.todaySub}>all time</Text>
          </View>
          <TouchableOpacity style={[styles.todayCard, styles.redeemCard]} onPress={onRedeem} activeOpacity={0.85}>
            <Text style={styles.redeemIcon}>💸</Text>
            <Text style={styles.redeemCardLabel}>Redeem</Text>
            <Text style={styles.redeemCardSub}>Get paid</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{totalCalls}</Text>
            <Text style={styles.statLabel}>Calls</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{totalMins}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>⭐</Text>
            <Text style={styles.statLabel}>Top Rated</Text>
          </View>
        </View>

        {/* Call history */}
        <Text style={styles.sectionTitle}>Recent Calls</Text>
        {calls.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📞</Text>
            <Text style={styles.emptyText}>No calls yet</Text>
            <Text style={styles.emptySub}>Stay online to receive calls from boys</Text>
          </View>
        ) : (
          calls.slice(0, 10).map((call, i) => (
            <View key={call.id || i} style={styles.callRow}>
              <View style={styles.callIconWrap}>
                <Icon name="phone" size={18} color={Colors.secondary} />
              </View>
              <View style={styles.callInfo}>
                <Text style={styles.callName}>{call.caller_name || 'User'}</Text>
                <Text style={styles.callMeta}>{Math.floor((call.duration_seconds || 0) / 60)} mins · {call.type || 'audio'}</Text>
              </View>
              <View style={styles.callEarned}>
                <Icon name="star" size={12} color={Colors.primary} filled />
                <Text style={styles.callCoins}>+{call.coins_earned || 0}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  header: { paddingHorizontal: 16, paddingBottom: 20 },
  menuBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#fff' },
  avatarFallback: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarLetter: { fontSize: 24, fontWeight: '900', color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: '#FF5A7A',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '900', color: '#fff', lineHeight: 24 },
  profileSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2, lineHeight: 18 },
  coinsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    minWidth: 60,
  },
  coinsText: { fontSize: 14, fontWeight: '900', color: '#fff', lineHeight: 18 },

  liveToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
  },
  liveLabel: { fontSize: 15, fontWeight: '800', color: '#fff' },

  todayRow: { flexDirection: 'row', gap: 10, margin: 16 },
  todayCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  redeemCard: { backgroundColor: Colors.secondary },
  todayLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', marginBottom: 6 },
  todayAmtRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  todayAmt: { fontSize: 22, fontWeight: '900', color: Colors.dark },
  todaySub: { fontSize: 10, color: '#94A3B8', marginTop: 3 },
  redeemIcon: { fontSize: 22 },
  redeemCardLabel: { fontSize: 14, fontWeight: '900', color: '#fff', marginTop: 4 },
  redeemCardSub: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  statsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statNum: { fontSize: 20, fontWeight: '900', color: Colors.dark },
  statLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 4 },

  tipsCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#FFF7ED', borderRadius: 16, padding: 16,
    borderLeftWidth: 4, borderLeftColor: '#FFC72C',
  },
  tipsTitle: { fontSize: 14, fontWeight: '800', color: Colors.dark, marginBottom: 8 },
  tipItem: { fontSize: 13, color: '#64748B', lineHeight: 22 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.dark, marginHorizontal: 16, marginBottom: 10 },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#94A3B8' },
  emptySub: { fontSize: 13, color: '#CBD5E1' },

  callRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  callIconWrap: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.secondary + '15',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  callInfo: { flex: 1 },
  callName: { fontSize: 15, fontWeight: '700', color: Colors.dark },
  callMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  callEarned: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  callCoins: { fontSize: 15, fontWeight: '800', color: Colors.primary },
});
