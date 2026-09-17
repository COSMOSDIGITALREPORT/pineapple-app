import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  Pressable } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';
import { getEarnings } from '../services/api';

const SCREEN_W = Dimensions.get('window').width;
const DRAWER_W = Math.min(SCREEN_W * 0.85, 340);
const LOGO = require('../image/pineapple_logo.png');

const NAV_ITEMS = [
  { label: 'Transactions',   icon: 'list' },
  { label: 'Settings',       icon: 'settings' },
  { label: 'Privacy Policy', icon: 'lock' },
  { label: 'Terms of Service', icon: 'file-text' },
];

export default function DrawerMenu({
  visible,
  onClose,
  onTransactions,
  onSettings,
  onPrivacyPolicy,
  onTermsOfService,
  onSupport,
  onLanguage,
  onWallet,
  onLeaderboard,
  onLogout,
}) {
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.user);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const slideAnim = useRef(new Animated.Value(-DRAWER_W)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      getEarnings().then((data) => {
        if (data?.summary) {
          const coins = parseFloat(data.summary.total_coins || data.summary.total_mins || 0);
          setEarnedCoins(coins);
        }
      }).catch(() => {});

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 12,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_W,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const displayCoins = earnedCoins > 0
    ? (Number.isInteger(earnedCoins) ? earnedCoins.toString() : earnedCoins.toFixed(1))
    : '0';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          { width: DRAWER_W, paddingTop: insets.top + 16 },
          { transform: [{ translateX: slideAnim }] },
        ]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Header close button */}
          <View style={styles.drawerHeader}>
            <View style={styles.drawerLogoWrap}>
              <Image source={LOGO} style={styles.drawerLogo} resizeMode="contain" />
              <Text style={styles.drawerBrand}>Pineapple</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Icon name="x" size={20} color={Colors.dark} />
            </TouchableOpacity>
          </View>

          {/* Profile */}
          <View style={styles.profileSection}>
            <View style={styles.avatarWrap}>
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Icon name="user" size={28} color={Colors.primary} />
                </View>
              )}
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.brandText}>{user.name || 'Pineapple'}</Text>
              <Text style={styles.memberText}>Verified Host</Text>
            </View>
          </View>

          {/* Earnings card */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              setTimeout(() => {
                if (onTransactions) onTransactions();
                else if (onWallet) onWallet();
              }, 250);
            }}
            activeOpacity={0.9}
            style={styles.walletWrap}>
            <LinearGradient
              colors={Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.walletCard}>
              <View style={styles.walletTopRow}>
                <View style={styles.walletBalanceBadge}>
                  <Text style={styles.walletBalanceBadgeText}>💰 EARNINGS</Text>
                </View>
                <TouchableOpacity
                  style={styles.walletTopUpBtn}
                  onPress={() => {
                    onClose();
                    setTimeout(() => {
                      if (onTransactions) onTransactions();
                      else if (onWallet) onWallet();
                    }, 250);
                  }}>
                  <Text style={styles.walletTopUpText}>Redeem</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.walletAmountRow}>
                <Text style={styles.walletCoinEmoji}>🪙</Text>
                <Text style={styles.walletAmount}>{displayCoins}</Text>
              </View>
              <Text style={styles.walletSubText}>coins earned · tap to redeem</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Top Girls leaderboard entry */}
          {!!onLeaderboard && (
            <TouchableOpacity
              style={styles.spinItem}
              onPress={() => { onClose(); setTimeout(onLeaderboard, 250); }}
              activeOpacity={0.85}>
              <LinearGradient
                colors={['#3A0068', '#C0003A']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.spinItemGrad}>
                <View style={styles.spinItemLeft}>
                  <View style={styles.zapIconWrap}>
                    <Text style={{ fontSize: 16 }}>⭐</Text>
                  </View>
                  <Text style={styles.spinItemText}>Top Girls</Text>
                </View>
                <Icon name="chevron-right" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Nav section 1 */}
          <View style={styles.navSection}>
            {NAV_ITEMS.map((item, i) =>
              <TouchableOpacity
                key={i}
                style={[styles.navItem, item.active && styles.navItemActive]}
                activeOpacity={0.6}
                onPress={() => {
                  onClose();
                  setTimeout(() => {
                    if (item.label === 'Transactions' && (onTransactions || onWallet)) {
                      (onTransactions || onWallet)();
                    } else if (item.label === 'Settings' && onSettings) {
                      onSettings();
                    } else if (item.label === 'Privacy Policy' && onPrivacyPolicy) {
                      onPrivacyPolicy();
                    } else if (item.label === 'Terms of Service' && onTermsOfService) {
                      onTermsOfService();
                    }
                  }, 250);
                }}>
                <View style={styles.navIconWrap}>
                  <Icon name={item.icon} size={20} color={item.active ? Colors.secondary : '#64748b'} />
                </View>
                <Text style={[styles.navLabel, item.active && styles.navLabelActive]}>
                  {item.label}
                </Text>
                <Icon name="chevron-right" size={16} color="#cbd5e1" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          {/* Nav section 2 */}
          <View style={styles.navSection}>
            {/* Language */}
            <TouchableOpacity
              style={styles.navItem}
              activeOpacity={0.6}
              onPress={() => { onClose(); setTimeout(onLanguage, 250); }}>
              <View style={styles.navIconWrap}>
                <Icon name="globe" size={20} color="#64748b" />
              </View>
              <Text style={styles.navLabel}>Language</Text>
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>English</Text>
              </View>
            </TouchableOpacity>

            {/* Support — chatbot style */}
            <TouchableOpacity
              style={styles.supportRow}
              activeOpacity={0.8}
              onPress={() => { onClose(); setTimeout(onSupport, 250); }}>
              <View style={styles.botIconWrap}>
                <LinearGradient
                  colors={['#FF3870', '#C0004A']}
                  start={{x:0,y:0}} end={{x:1,y:1}}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={{ fontSize: 20 }}>🤖</Text>
              </View>
              <View style={styles.supportInfo}>
                <Text style={styles.supportTitle}>Support</Text>
                <View style={styles.supportStatus}>
                  <View style={styles.supportDot} />
                  <Text style={styles.supportStatusText}>AI chatbot · Online</Text>
                </View>
              </View>
              <View style={styles.chatBubble}>
                <Icon name="send" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={() => { onClose(); setTimeout(() => onLogout?.(), 250); }}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  drawer: {
    flex: 1,
    backgroundColor: '#FFF5F8',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 15,
    elevation: 20
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
    marginTop: 8
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.secondary
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: '#FFF5F8',
  },
  profileInfo: { marginLeft: 16 },
  brandText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.dark
  },
  memberText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
    fontWeight: '600'
  },
  walletWrap: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  walletCard: {
    borderRadius: 20,
    paddingHorizontal: 1,
    padding: 9,
    paddingVertical: 1,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  walletTopRow: {padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  walletBalanceBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,padding: 9,
  },
  walletBalanceBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  walletTopUpBtn: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  walletTopUpText: {
    color: '#FF3870',
    fontSize: 11,
    fontWeight: '800',
  },
  walletAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,padding: 9,
  },
  walletCoinEmoji: {
    fontSize: 22,
  },
  walletAmount: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  walletSubText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,padding: 9,
  },
  spinItem: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  spinItemGrad: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  spinItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zapIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  spinItemText: {
    color: '#fff',fontSize: 16,fontWeight: 'bold'
  },
  navSection: { paddingHorizontal: 16 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 2,
  },
  navItemActive: { backgroundColor: Colors.secondary + '12' },
  navIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  navLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
    lineHeight: 22,
  },
  navLabelActive: { color: Colors.secondary },
  divider: {
    height: 1,backgroundColor: '#f1f5f9',marginVertical: 12,marginHorizontal: 24
  },
  navBadge: {
    backgroundColor: '#FFE8EF',paddingHorizontal: 10,paddingVertical: 4,borderRadius: 8
  },
  navBadgeText: {
    fontSize: 11,color: Colors.textLight,fontWeight: '700'
  },
  premiumBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
  },
  premiumInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
  },
  premiumIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  premiumInfo: { flex: 1 },
  premiumTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  premiumSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  supportRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 16, marginBottom: 4,
    backgroundColor: 'rgba(255,90,122,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,90,122,0.15)',
  },
  botIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, overflow: 'hidden',
    shadowColor: '#FF5A7A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  supportInfo: { flex: 1 },
  supportTitle: { fontSize: 15, fontWeight: '700', color: Colors.dark },
  supportStatus: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  supportDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  supportStatusText: { fontSize: 11, color: '#22C55E', fontWeight: '600' },
  chatBubble: {
    backgroundColor: '#FF3870', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    minWidth: 36, alignItems: 'center',
  },
  chatBubbleText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 3 },

  drawerHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16,
  },
  drawerLogoWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  drawerLogo: { width: 34, height: 34 },
  drawerBrand: { fontSize: 20, fontWeight: '900', color: Colors.dark, letterSpacing: -0.3 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  logoutBtn: {
    marginTop: 24,paddingHorizontal: 32,paddingVertical: 12
  },
  logoutText: {
    fontSize: 14,fontWeight: '700',color: '#ef4444'
  }
});
