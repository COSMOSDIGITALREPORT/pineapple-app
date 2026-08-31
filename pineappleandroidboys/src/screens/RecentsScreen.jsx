import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line } from 'react-native-svg';
import Icon from '../components/Icon';
import { Colors } from '../theme/colors';
import { getCallHistory } from '../services/api';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diff < 1)    return 'Just now';
  if (diff < 60)   return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

function PhoneArrowIcon({ missed }) {
  const color = missed ? '#FF3B30' : '#FFC72C';
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07C9.44 16.29 8.76 15.62 8 14.89m-3.5-3.07A19.79 19.79 0 0 1 1.43 3.2 2 2 0 0 1 3.41 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.39 8.91"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {missed && (
        <Line x1="22" y1="2" x2="2" y2="22" stroke={color} strokeWidth={2} strokeLinecap="round" />
      )}
    </Svg>
  );
}

export default function RecentsScreen({ onRandom, onBack, onDrawer, onCall }) {
  const insets = useSafeAreaInsets();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const data = await getCallHistory();
      setCalls(data || []);
    } catch {
      setCalls([]);
    }
  };

  useEffect(() => { fetchHistory().finally(() => setLoading(false)); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const missedCount = calls.filter(c => c.status === 'missed').length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack || onDrawer}
          style={styles.menuBtn}
          activeOpacity={0.7}>
          <Icon name={onBack ? 'arrow-left' : 'menu'} size={24} color={Colors.dark} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Recents</Text>
          {missedCount > 0 && (
            <View style={styles.missedPill}>
              <Text style={styles.missedPillText}>{missedCount} missed</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.randomBtn}
          onPress={onRandom}
          activeOpacity={0.85}>
          <LinearGradient
            colors={['#FF3870', '#C0004A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Icon name="phone" size={16} color="#fff" />
          <Text style={styles.randomBtnText}>Call</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.secondary}
          />
        }>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.secondary} style={{ marginTop: 60 }} />
        ) : calls.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Icon name="phone" size={32} color="rgba(255,90,122,0.4)" />
            </View>
            <Text style={styles.emptyTitle}>No calls yet</Text>
            <Text style={styles.emptySub}>Your call history will show up here</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>CALL HISTORY</Text>
            {calls.map((call) => {
              const missed = call.status === 'missed';
              const isVideo = call.type === 'video';
              const user = call.other_user || {};

              return (
                <View key={call.id} style={styles.card}>
                  {/* Avatar */}
                  <View style={styles.avatarWrap}>
                    {user.avatar_url ? (
                      <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <Icon name="user" size={22} color={Colors.primary} />
                      </View>
                    )}
                    <View style={[styles.onlineDot, { backgroundColor: user.is_online ? '#22C55E' : '#cbd5e1' }]} />
                  </View>

                  {/* Info */}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{user.name || 'Unknown'}</Text>
                    <View style={styles.cardMeta}>
                      <PhoneArrowIcon missed={missed} />
                      <Text style={[styles.cardStatus, missed && styles.cardStatusMissed]}>
                        {missed ? 'Missed' : 'Completed'}
                      </Text>
                      <Text style={styles.metaDot}>·</Text>
                      <Icon name={isVideo ? 'video' : 'phone'} size={12} color="#94a3b8" />
                      <Text style={styles.cardDuration}>{call.duration || '--:--'}</Text>
                    </View>
                    <Text style={styles.cardTime}>{timeAgo(call.created_at)}</Text>
                  </View>

                  {/* Call back button */}
                  <TouchableOpacity
                    style={[styles.callBackBtn, missed && styles.callBackBtnMissed]}
                    activeOpacity={0.8}
                    onPress={() => onCall && onCall(user)}>
                    {missed ? (
                      <>
                        <LinearGradient
                          colors={['#FF3870', '#C0004A']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <Icon name="phone" size={18} color="#fff" />
                      </>
                    ) : (
                      <Icon name="phone" size={18} color={Colors.secondary} />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {/* Meet someone new card */}
        <View style={styles.discoverCard}>
          <LinearGradient
            colors={['#FF3870', '#C0004A', '#8B1030']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.discoverBlob1} />
          <View style={styles.discoverBlob2} />
          <Text style={styles.discoverTitle}>Meet someone new?</Text>
          <Text style={styles.discoverSub}>
            Random match karo aur nayi dost banana
          </Text>
          <TouchableOpacity style={styles.discoverBtn} onPress={onRandom} activeOpacity={0.85}>
            <Text style={styles.discoverBtnText}>Start Matching ✨</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FB' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  menuBtn: { padding: 4 },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark,
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  missedPill: {
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  missedPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF3B30',
    includeFontPadding: false,
  },
  randomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  randomBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    includeFontPadding: false,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
    gap: 10,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginBottom: 4,
    marginLeft: 4,
    includeFontPadding: false,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  avatarFallback: {
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },

  cardInfo: { flex: 1, gap: 3 },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    includeFontPadding: false,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF3870',
    includeFontPadding: false,
  },
  cardStatusMissed: { color: '#FF3B30' },
  metaDot: { fontSize: 12, color: '#cbd5e1' },
  cardDuration: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    includeFontPadding: false,
  },
  cardTime: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    includeFontPadding: false,
  },

  callBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F9FB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  callBackBtnMissed: { backgroundColor: 'transparent' },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,90,122,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark,
    includeFontPadding: false,
  },
  emptySub: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    includeFontPadding: false,
  },

  discoverCard: {
    borderRadius: 28,
    padding: 28,
    overflow: 'hidden',
    marginTop: 8,
    minHeight: 200,
  },
  discoverBlob1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  discoverBlob2: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  discoverTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 8,
    includeFontPadding: false,
  },
  discoverSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginBottom: 24,
    lineHeight: 20,
    includeFontPadding: false,
  },
  discoverBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  discoverBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.secondary,
    includeFontPadding: false,
  },
});
