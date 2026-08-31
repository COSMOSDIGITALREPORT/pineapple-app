import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Image, TouchableOpacity, StatusBar, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';
import { getTopGirls } from '../services/api';

function formatCalls(n) {
  const num = Number(n) || 0;
  return num >= 1000 ? `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}k` : `${num}`;
}

export default function LeaderboardScreen({ onBack, onCallUser }) {
  const insets = useSafeAreaInsets();
  const [girls, setGirls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTopGirls()
      .then(setGirls)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const champion = girls[0];
  const rest = girls.slice(1);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F8" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="arrow-left" size={22} color={Colors.dark} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🏆 Top Girls</Text>
          <Text style={styles.headerSub}>Highest rated this week</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : girls.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyText}>No ratings yet</Text>
          <Text style={styles.emptySub}>Start calling girls to see the leaderboard! 💕</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Champion hero card */}
          {champion && (
            <TouchableOpacity
              style={styles.heroCard}
              activeOpacity={0.9}
              onPress={() => onCallUser?.(champion)}>
              <LinearGradient
                colors={['#FFF0F6', '#FFE0EC']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroCrownWrap}>
                <Text style={styles.heroCrown}>👑</Text>
              </View>
              <View style={styles.heroAvatarWrap}>
                {champion.avatar_url ? (
                  <Image source={{ uri: champion.avatar_url }} style={styles.heroAvatar} />
                ) : (
                  <LinearGradient colors={Gradients.primary} style={[styles.heroAvatar, styles.heroAvatarCenter]}>
                    <Text style={styles.heroAvatarInitial}>{(champion.name || '?')[0].toUpperCase()}</Text>
                  </LinearGradient>
                )}
                {champion.is_online ? <View style={styles.heroOnlineDot} /> : null}
              </View>
              <Text style={styles.heroName}>{champion.name}</Text>
              <View style={styles.heroStarsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Text key={s} style={{ fontSize: 16, color: s <= Math.round(champion.rating) ? '#F59E0B' : '#F0D0DC' }}>★</Text>
                ))}
                <Text style={styles.heroRatingNum}>{parseFloat(champion.rating || 0).toFixed(1)}</Text>
              </View>
              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatPill}>
                  <Icon name="phone" size={12} color={Colors.secondary} />
                  <Text style={styles.heroStatText}>{formatCalls(champion.calls_count)} Calls</Text>
                </View>
                {!!champion.city && (
                  <View style={styles.heroStatPill}>
                    <Text style={styles.heroStatText}>📍 {champion.city}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}

          {/* Ranking list */}
          {rest.length > 0 && (
            <View style={styles.listSection}>
              <Text style={styles.listSectionTitle}>Top {Math.min(girls.length, 10)}</Text>
              {rest.slice(0, 9).map((girl, i) => (
                <TouchableOpacity
                  key={girl.id}
                  style={styles.listRow}
                  activeOpacity={0.85}
                  onPress={() => onCallUser?.(girl)}>
                  <Text style={styles.listRank}>#{i + 2}</Text>
                  {girl.avatar_url ? (
                    <Image source={{ uri: girl.avatar_url }} style={styles.listAvatar} />
                  ) : (
                    <View style={[styles.listAvatar, styles.listAvatarPlaceholder]}>
                      <Text style={styles.listAvatarInitial}>{(girl.name || '?')[0].toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.listInfo}>
                    <Text style={styles.listName}>{girl.name}</Text>
                    <Text style={styles.listCity}>
                      {formatCalls(girl.calls_count)} calls{girl.city ? ` · ${girl.city}` : ''}
                    </Text>
                  </View>
                  <View style={styles.listRight}>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Text key={s} style={{ fontSize: 11, color: s <= Math.round(girl.rating) ? '#F59E0B' : '#E2E8F0' }}>★</Text>
                      ))}
                    </View>
                    <Text style={styles.listRating}>{parseFloat(girl.rating || 0).toFixed(1)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF5F8' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 14, gap: 8,
    backgroundColor: '#FFF5F8',
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: Colors.dark, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: '#8B5A70', marginTop: 2 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyIcon: { fontSize: 52 },
  emptyText: { fontSize: 18, fontWeight: '800', color: '#1C0012', textAlign: 'center' },
  emptySub: { fontSize: 14, color: '#8B5A70', textAlign: 'center' },

  heroCard: {
    marginHorizontal: 20, marginTop: 20, marginBottom: 8,
    borderRadius: 28, paddingTop: 36, paddingBottom: 24, paddingHorizontal: 20,
    alignItems: 'center', overflow: 'hidden',
    shadowColor: '#FF3870', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 8,
  },
  heroCrownWrap: {
    position: 'absolute', top: 12, alignSelf: 'center',
  },
  heroCrown: { fontSize: 30 },
  heroAvatarWrap: { position: 'relative', marginBottom: 12 },
  heroAvatar: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: '#fff',
  },
  heroAvatarCenter: { alignItems: 'center', justifyContent: 'center' },
  heroAvatarInitial: { fontSize: 36, fontWeight: '900', color: '#fff' },
  heroOnlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#22C55E', borderWidth: 3, borderColor: '#fff',
  },
  heroName: { fontSize: 22, fontWeight: '900', color: '#1C0012', marginBottom: 6 },
  heroStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 14 },
  heroRatingNum: { fontSize: 15, fontWeight: '800', color: '#1C0012', marginLeft: 6 },
  heroStatsRow: { flexDirection: 'row', gap: 10 },
  heroStatPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  heroStatText: { fontSize: 12, fontWeight: '700', color: Colors.secondary },

  listSection: { paddingHorizontal: 20, gap: 10, marginTop: 12 },
  listSectionTitle: { fontSize: 13, fontWeight: '800', color: '#8B5A70', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  listRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    padding: 12, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  listRank: { fontSize: 14, fontWeight: '800', color: Colors.textLight, width: 28 },
  listAvatar: { width: 48, height: 48, borderRadius: 24 },
  listAvatarPlaceholder: { backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  listAvatarInitial: { fontSize: 20, fontWeight: '900', color: Colors.primary },
  listInfo: { flex: 1 },
  listName: { fontSize: 15, fontWeight: '700', color: Colors.dark },
  listCity: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  listRight: { alignItems: 'flex-end', gap: 3 },
  starsRow: { flexDirection: 'row', gap: 1 },
  listRating: { fontSize: 13, fontWeight: '800', color: '#F59E0B' },
});
