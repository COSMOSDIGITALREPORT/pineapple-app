import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';
import { getMe, logout } from '../services/api';
import { setProfile, resetUser } from '../store/slices/userSlice';

export default function ProfileScreen({ onEditProfile, onPremiumPlans, onWallet, onSettings, onSafety, onBlockedUsers, onDrawer, onLogout }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.user);

  useEffect(() => {
    getMe().then((data) => {
      dispatch(setProfile(data));
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    dispatch(resetUser());
    if (onLogout) onLogout();
  };

  const displayName = user.name ? `${user.name}${user.dob ? ', ' + getAge(user.dob) : ''}` : 'Your Profile';
  const avatarUri = user.avatarUrl;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F8" translucent={false} />

      {/* Floating hearts background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {[
          { top: 80,  left: 20,  size: 22, opacity: 0.08 },
          { top: 120, left: 340, size: 18, opacity: 0.07 },
          { top: 260, left: 10,  size: 16, opacity: 0.07 },
          { top: 320, left: 350, size: 20, opacity: 0.08 },
          { top: 500, left: 30,  size: 18, opacity: 0.07 },
          { top: 560, left: 340, size: 14, opacity: 0.06 },
        ].map((h, i) => (
          <Text key={i} style={{ position: 'absolute', top: h.top, left: h.left, fontSize: h.size, opacity: h.opacity, color: '#FF3870' }}>♥</Text>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onDrawer} style={styles.headerMenuBtn}>
            <Icon name="menu" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={onSettings}>
            <Icon name="settings" size={24} color={Colors.dark} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={Gradients.primary}
              style={styles.avatarGradient}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.mainAvatar} />
              ) : (
                <View style={[styles.mainAvatar, styles.avatarPlaceholder]}>
                  <Icon name="user" size={44} color={Colors.primary} />
                </View>
              )}
            </LinearGradient>
            <TouchableOpacity style={styles.editBtn} onPress={onEditProfile}>
              <Icon name="edit-2" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{displayName}</Text>
          {user.phone ? <Text style={styles.userPhone}>+91 {user.phone}</Text> : null}
          {user.city ? <Text style={styles.userRole}>📍 {user.city}</Text> : null}
          {user.bio ? (
            <View style={styles.bioCard}>
              <Text style={styles.bioText}>"{user.bio}"</Text>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.coins ?? 0}</Text>
              <Text style={styles.statLabel}>Coins</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.language || 'English'}</Text>
              <Text style={styles.statLabel}>Language</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.city || 'India'}</Text>
              <Text style={styles.statLabel}>Location</Text>
            </View>
          </View>
        </View>

        {/* Menu Links */}
        <View style={styles.menuContainer}>
          <MenuItem
            icon="user"
            label="Edit Profile"
            onPress={onEditProfile}
          />
          <MenuItem
            icon="wallet"
            label="Wallet"
            onPress={onWallet}
          />
          <MenuItem
            icon="slash"
            label="Blocked Users"
            onPress={onBlockedUsers}
          />
          <MenuItem
            icon="shield"
            label="Safety Center"
            onPress={onSafety}
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Icon name="log-out" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>);
}

function getAge(dob) {
  if (!dob) return '';
  const parts = dob.split('/');
  if (parts.length !== 3) return '';
  const birth = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function MenuItem({ icon, label, onPress, color = Colors.secondary, hasBadge }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <View style={[styles.menuIconWrap, { backgroundColor: color + '15' }]}>
          <Icon name={icon} size={20} color={color} />
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <View style={styles.menuRight}>
        {hasBadge && <View style={styles.badge} />}
        <Icon name="chevron-right" size={18} color="#CCCCCC" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 4,
  },
  headerMenuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark,
    letterSpacing: -0.3,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 5,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
  },
  mainAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark,
    letterSpacing: -0.3,
    marginTop: 4,
  },
  userPhone: {
    fontSize: 13,
    color: Colors.secondary,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  userRole: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
    marginBottom: 6,
    lineHeight: 18,
  },
  bioCard: {
    backgroundColor: Colors.primary + '0D',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 20,
    width: '100%',
  },
  bioText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.dark,
    textAlign: 'center',
    lineHeight: 19,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingTop: 24,
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#F5F5F5',
  },
  menuContainer: {
    gap: 10,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    lineHeight: 22,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
  }
});
