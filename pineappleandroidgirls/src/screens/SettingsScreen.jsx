import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Switch,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import TermsOfServiceScreen from './TermsOfServiceScreen';
import BlockedUsersScreen from './BlockedUsersScreen';
import { deleteAccount, setOffline, getMe } from '../services/api';
import { resetUser, setProfile } from '../store/slices/userSlice';
import { getSocket } from '../services/socket';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';

const SECTIONS = [
  {
    title: 'Account',
    items: [
      { label: 'Phone Number', type: 'info', key: 'phone' },
      { label: 'Linked Accounts', sub: 'Google, Apple', type: 'info', key: 'linked' },
    ],
  },
  {
    title: 'Notifications',
    items: [
      { label: 'Push Notifications', type: 'toggle', key: 'push' },
      { label: 'Call Alerts', type: 'toggle', key: 'callAlerts' },
      { label: 'New Messages', type: 'toggle', key: 'messages' },
    ],
  },
  {
    title: 'Privacy',
    items: [
      { label: 'Block List', type: 'nav', key: 'blockList' },
      { label: 'Hide Online Status', type: 'toggle', key: 'hideOnline' },
    ],
  },
  {
    title: 'App Preferences',
    items: [
      { label: 'Language', sub: 'English', type: 'nav', key: 'language' },
    ],
  },
  {
    title: 'Support & Legal',
    items: [
      { label: 'Help & Support', type: 'nav', key: 'support' },
      { label: 'Privacy Policy', type: 'nav', key: 'privacy' },
      { label: 'Terms of Service', type: 'nav', key: 'terms' },
      { label: 'Community Guidelines', type: 'nav', key: 'guidelines' },
      { label: 'App Version', sub: '1.0.0', type: 'nav', key: 'version' },
    ],
  },
  {
    title: 'Danger Zone',
    items: [
      { label: 'Delete Account', type: 'danger', key: 'delete' },
    ],
  },
];

function ChevronIcon() {
  return (
    <Icon name="chevron-right" size={16} color="#CBD5E1" />
  );
}

export default function SettingsScreen({ onBack, onLogout, onBlockedUsers }) {
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.user);
  const dispatch = useDispatch();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [phoneNum, setPhoneNum] = useState(user.phone || '');
  const [toggles, setToggles] = useState({
    push: true,
    callAlerts: true,
    messages: true,
    hideOnline: false,
  });

  useEffect(() => {
    AsyncStorage.getItem('user_phone').then((p) => {
      if (p) setPhoneNum(p);
    });
    getMe().then((data) => {
      if (data?.phone) {
        setPhoneNum(data.phone);
        dispatch(setProfile(data));
      }
    }).catch(() => {});
  }, []);

  const flip = (key) => {
    setToggles((prev) => {
      const nextVal = !prev[key];
      if (key === 'hideOnline') {
        if (nextVal) {
          setOffline().catch(() => {});
          getSocket()?.emit('user:offline');
        } else {
          getSocket()?.emit('user:online');
          getMe().catch(() => {});
        }
      }
      return { ...prev, [key]: nextVal };
    });
  };

  const handleNavPress = (key) => {
    if (key === 'blockList') {
      if (onBlockedUsers) onBlockedUsers();
      else setShowBlocked(true);
      return;
    }
    if (key === 'privacy')    { setShowPrivacy(true); return; }
    if (key === 'terms')      { setShowTerms(true); return; }
    if (key === 'guidelines') { Alert.alert('Community Guidelines', 'Be respectful. No abuse, spam or fake profiles.'); return; }
    if (key === 'support')    { Alert.alert('Help & Support', 'Email us at support@pineappleapp.in'); return; }
    if (key === 'version')    { Alert.alert('App Version', 'Version 1.0.0'); return; }
    if (key === 'language')   { onBack?.(); return; }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['auth_token', 'user_id', 'user_session', 'gender', 'warning_accepted']);
          dispatch(resetUser());
          onLogout?.();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              await AsyncStorage.multiRemove(['auth_token', 'user_id', 'user_session', 'gender', 'warning_accepted']);
              dispatch(resetUser());
              onLogout?.();
            } catch {
              Alert.alert('Error', 'Could not delete account. Try again.');
            }
          },
        },
      ]
    );
  };

  if (showPrivacy) return <PrivacyPolicyScreen onBack={() => setShowPrivacy(false)} />;
  if (showTerms)   return <TermsOfServiceScreen onBack={() => setShowTerms(false)} />;
  if (showBlocked) return <BlockedUsersScreen onBack={() => setShowBlocked(false)} />;

  const displayPhone = user.phone || phoneNum;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>

        {/* Profile banner */}
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileBanner}>
          <View style={styles.bannerAvatar}>
            {user.avatarUrl
              ? <Image source={{ uri: user.avatarUrl }} style={styles.bannerImg} />
              : <Icon name="user" size={32} color={Colors.secondary} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerName}>{user.name || 'Pineapple User'}</Text>
            <Text style={styles.bannerSub}>{displayPhone ? `+91 ${displayPhone}` : 'Edit your profile →'}</Text>
          </View>
        </LinearGradient>

        {SECTIONS.map((section) =>
        <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, i) =>
            <View key={item.key}>
                  {i > 0 && <View style={styles.divider} />}
                  <TouchableOpacity
                activeOpacity={item.type === 'toggle' || item.type === 'info' ? 1 : 0.7}
                onPress={
                  item.key === 'delete' ? handleDeleteAccount :
                  item.type === 'nav'   ? () => handleNavPress(item.key) :
                  undefined
                }
                style={styles.row}>
                    <View style={styles.rowLeft}>
                      <Text style={[styles.rowLabel, item.type === 'danger' && styles.rowLabelDanger]}>
                        {item.label}
                      </Text>
                      <Text style={styles.rowSub}>
                        {item.key === 'phone'
                          ? (displayPhone ? `+91 ${displayPhone}` : 'Not set')
                          : item.sub || ''}
                      </Text>
                    </View>
                    {item.type === 'toggle' ?
                <Switch
                  value={toggles[item.key] ?? false}
                  onValueChange={() => flip(item.key)}
                  trackColor={{ false: '#E2E8F0', true: Colors.secondary }}
                  thumbColor="#fff"
                  ios_backgroundColor="#E2E8F0" /> :
                item.type === 'nav' ? <ChevronIcon /> :
                null}
                  </TouchableOpacity>
                </View>
            )}
            </View>
          </View>
        )}

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} activeOpacity={0.8} onPress={handleSignOut}>
          <Icon name="log-out" size={20} color={Colors.secondary} />
          <Text style={styles.signOutText}>Sign Out</Text>
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
  scroll: { padding: 24, gap: 20 },

  profileBanner: {
    borderRadius: 32,
    padding: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 8
  },
  bannerImg: { width: '100%', height: '100%', borderRadius: 32 },
  bannerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4
  },
  bannerName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: 4 },

  section: { gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: Colors.textLight, letterSpacing: 1, textTransform: 'uppercase', paddingLeft: 4 },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18
  },
  rowLeft: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: Colors.dark },
  rowLabelDanger: { color: '#ef4444' },
  rowSub: { fontSize: 12, color: Colors.textLight, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#f1f5f9' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    height: 56,
    borderRadius: 20,
    gap: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  signOutText: { fontSize: 16, fontWeight: 'bold', color: Colors.secondary }
});