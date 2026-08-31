import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';
import { getLiveUsers, getRooms } from '../services/api';

const { width } = Dimensions.get('window');

const FloatingBubble = ({ user, size, left, top, delay }) => {
  const floatAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    let loop;
    const timeout = setTimeout(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -12,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2200,
            useNativeDriver: true,
          })
        ])
      );
      loop.start();
    }, delay);
    return () => {
      clearTimeout(timeout);
      if (loop) loop.stop();
    };
  }, [delay, floatAnim]);

  return (
    <Animated.View style={{
      position: 'absolute',
      left, top,
      width: size, height: size,
      borderRadius: size / 2,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.6)',
      overflow: 'hidden',
      transform: [{ translateY: floatAnim }]
    }}>
      {user?.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <View style={{ width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: size * 0.4 }}>{(user?.name || '?')[0].toUpperCase()}</Text>
        </View>
      )}
    </Animated.View>
  );
};

export default function MainHomeScreen({ onFindMatch, onRooms, onWallet, onPremium, onDrawer, onNotifications, onLuckySpin, onCallUser, onLeaderboard }) {
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.user);
  const [liveUsers, setLiveUsers] = useState([]);
  const [liveRooms, setLiveRooms] = useState([]);

  useEffect(() => {
    getLiveUsers().then(setLiveUsers).catch(() => {});
    getRooms().then(setLiveRooms).catch(() => {});
  }, []);

  const firstName = user.name ? user.name.split(' ')[0] : 'Friend';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <View style={styles.root}>
      {/* Gradient Header */}
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGrad, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onDrawer} style={styles.menuBtn}>
            <Icon name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerBrand}>Pineapple</Text>
          <TouchableOpacity onPress={onNotifications} style={styles.bellBtn}>
            <Icon name="bell" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerInfo}>
          <View>
            <Text style={styles.greetingText}>{greeting} 👋</Text>
            <Text style={styles.greetingName}>{firstName}</Text>
          </View>
          <TouchableOpacity style={styles.coinPill} onPress={onWallet}>
            <Text style={styles.coinEmoji}>⭐</Text>
            <Text style={styles.coinAmount}>{(user.coins || 0).toLocaleString('en-IN')}</Text>
            <Text style={styles.coinLabel}> coins</Text>
          </TouchableOpacity>
        </View>

        {/* Live stats */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <View style={styles.liveDot} />
            <Text style={styles.statChipText}>{liveUsers.length} online</Text>
          </View>
          <View style={styles.statChip}>
            <Icon name="users" size={12} color="#fff" />
            <Text style={styles.statChipText}>{liveRooms.length} rooms live</Text>
          </View>
          {user.isPremium && (
            <View style={[styles.statChip, styles.premiumChip]}>
              <Text style={styles.premiumChipText}>👑 Premium</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 110 }]}>

        {/* Big CTA */}
        <TouchableOpacity onPress={onFindMatch} activeOpacity={0.9} style={[styles.bigCta, { height: 190, overflow: 'hidden' }]}>
          <LinearGradient
            colors={['#FF3870', '#C0004A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bigCtaGrad, { height: '100%', flexDirection: 'column', justifyContent: 'center', padding: 0 }]}>
            
            {liveUsers.slice(0, 5).map((u, i) => {
              const positions = [
                { size: 54, left: 20, top: 20, delay: 0 },
                { size: 64, left: width - 110, top: 15, delay: 400 },
                { size: 48, left: width / 2 - 40, top: 10, delay: 800 },
                { size: 58, left: 30, top: 105, delay: 1200 },
                { size: 52, left: width - 90, top: 115, delay: 1600 }
              ];
              const pos = positions[i];
              if (!pos) return null;
              return <FloatingBubble key={u.id || i} user={u} {...pos} />;
            })}
            
            <View style={{ alignItems: 'center', justifyContent: 'center', zIndex: 10, flex: 1 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 0.5 }}>Find Match 💕</Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: 4 }}>
                  {liveUsers.length > 0 ? `${liveUsers.length} girls online now` : 'Tap to connect'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Online girls */}
        {liveUsers.length > 0 && (
          <View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Online Now</Text>
              <TouchableOpacity onPress={onFindMatch}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.usersScroll}>
              {liveUsers.slice(0, 8).map((u) => (
                <TouchableOpacity key={u.id} style={styles.userChip} onPress={onFindMatch} activeOpacity={0.85}>
                  {u.avatar_url ? (
                    <Image source={{ uri: u.avatar_url }} style={styles.userChipAvatar} />
                  ) : (
                    <View style={[styles.userChipAvatar, styles.userChipPlaceholder]}>
                      <Text style={styles.userChipInitial}>{(u.name || '?')[0].toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.userChipOnline} />
                  <Text style={styles.userChipName} numberOfLines={1}>{(u.name || 'User').split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.userChipMore} onPress={onFindMatch}>
                <View style={styles.userChipMoreCircle}>
                  <Icon name="plus" size={20} color={Colors.secondary} />
                </View>
                <Text style={styles.userChipName}>More</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Feature cards row */}
        <View style={styles.featureRow}>
          <TouchableOpacity style={styles.featureCardTall} onPress={onLuckySpin} activeOpacity={0.9}>
            <LinearGradient colors={['#FF3870', '#FF8A5B']} style={styles.featureCardGrad}>
              <Text style={styles.featureEmoji}>🎰</Text>
              <Text style={styles.featureTitle}>Lucky{'\n'}Spin</Text>
              <Text style={styles.featureSub}>Win daily</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.featureColRight}>
            <TouchableOpacity style={styles.featureCardSmall} onPress={onRooms} activeOpacity={0.9}>
              <LinearGradient colors={['#FF5A7A', '#C026D3']} style={styles.featureCardGrad}>
                <Text style={styles.featureEmoji}>🎙️</Text>
                <Text style={styles.featureTitle}>Live Rooms</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.featureCardSmall} onPress={onLeaderboard} activeOpacity={0.9}>
              <LinearGradient colors={['#F59E0B', '#FF3870']} style={styles.featureCardGrad}>
                <Text style={styles.featureEmoji}>⭐</Text>
                <Text style={styles.featureTitle}>Top{'\n'}Girls</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live rooms */}
        {liveRooms.length > 0 && (
          <View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Live Rooms 🔴</Text>
              <TouchableOpacity onPress={onRooms}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            {liveRooms.slice(0, 2).map((room) => (
              <TouchableOpacity key={room.id} style={styles.roomCard} onPress={onRooms} activeOpacity={0.85}>
                <View style={styles.roomLeft}>
                  <View style={styles.roomAvatar}>
                    <Icon name="user" size={20} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.roomName} numberOfLines={1}>{room.name}</Text>
                    <Text style={styles.roomMeta}>{room.listener_count || 0} listening · {room.language || 'HI'}</Text>
                  </View>
                </View>
                <View style={styles.joinPill}>
                  <Text style={styles.joinPillText}>Join</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Wallet card */}
        <TouchableOpacity onPress={onWallet} activeOpacity={0.9}>
          <LinearGradient colors={['#FF3870', '#8B1030']} style={styles.walletCard}>
            <View style={styles.walletLeft}>
              <Text style={styles.walletLabel}>Your Balance</Text>
              <Text style={styles.walletCoins}>⭐ {(user.coins || 0).toLocaleString('en-IN')} coins</Text>
              <Text style={styles.walletSub}>Tap to recharge or withdraw</Text>
            </View>
            <Icon name="arrow-right" size={20} color="rgba(255,255,255,0.4)" />
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  headerGrad: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  menuBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  bellBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerBrand: { fontSize: 20, fontWeight: '900', color: '#fff', fontFamily: 'Pacifico-Regular', letterSpacing: 0.5 },

  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  greetingName: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 2 },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  coinEmoji: { fontSize: 14 },
  coinAmount: { fontSize: 16, fontWeight: '900', color: '#fff', marginLeft: 4 },
  coinLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },

  statsRow: { flexDirection: 'row', gap: 8 },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  statChipText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  premiumChip: { backgroundColor: 'rgba(255,255,255,0.3)' },
  premiumChipText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  scroll: { padding: 16, gap: 20 },

  bigCta: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  bigCtaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 22,
  },
  bigCtaLeft: {},
  bigCtaTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  bigCtaSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  bigCtaArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.dark },
  seeAll: { fontSize: 13, fontWeight: '700', color: Colors.secondary },

  usersScroll: { paddingVertical: 4, gap: 12 },
  userChip: { alignItems: 'center', width: 64 },
  userChipAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2.5, borderColor: Colors.secondary },
  userChipPlaceholder: { backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  userChipInitial: { fontSize: 22, fontWeight: '900', color: Colors.primary },
  userChipOnline: {
    position: 'absolute',
    top: 2,
    right: 4,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userChipName: { fontSize: 11, fontWeight: '600', color: Colors.dark, marginTop: 5, textAlign: 'center' },
  userChipMore: { alignItems: 'center', width: 64 },
  userChipMoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  featureRow: { flexDirection: 'row', gap: 12, height: 200 },
  featureCardTall: { flex: 1, borderRadius: 24, overflow: 'hidden' },
  featureColRight: { flex: 1, gap: 12 },
  featureCardSmall: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  featureCardGrad: {
    flex: 1,
    padding: 18,
    justifyContent: 'flex-end',
  },
  featureEmoji: { fontSize: 28, marginBottom: 6 },
  featureTitle: { fontSize: 15, fontWeight: '900', color: '#fff', lineHeight: 20 },
  featureSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  roomLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  roomAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomName: { fontSize: 15, fontWeight: '700', color: Colors.dark },
  roomMeta: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  joinPill: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  joinPillText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 24,
    padding: 22,
  },
  walletLeft: {},
  walletLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 4 },
  walletCoins: { fontSize: 22, fontWeight: '900', color: '#fff' },
  walletSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
});
