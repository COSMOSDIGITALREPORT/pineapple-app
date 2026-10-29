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
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import TermsOfServiceScreen from './TermsOfServiceScreen';
import BlockedUsersScreen from './BlockedUsersScreen';
import { deleteAccount, getMe } from '../services/api';
import { resetUser, setProfile } from '../store/slices/userSlice';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';

const DELETE_REASONS = [
  "Don't like the app",
  "Bored / Not interested",
  "Too expensive / High coin rates",
  "No matching / Connection issues",
  "Privacy concerns",
  "Something else",
];

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
    ],
  },
  {
    title: 'Privacy',
    items: [
      { label: 'Block List', type: 'nav', key: 'blockList' },
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
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [toggles, setToggles] = useState({
    push: true,
    callAlerts: true,
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

  const flip = (key) => setToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleReason = (reason) => {
    if (selectedReasons.includes(reason)) {
      setSelectedReasons(selectedReasons.filter((r) => r !== reason));
    } else {
      setSelectedReasons([...selectedReasons, reason]);
    }
  };

  const handleNavPress = (key) => {
    if (key === 'blockList' || key === 'blockedUsers') {
      setShowBlocked(true);
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
    setSelectedReasons([]);
    setCustomMessage('');
    setDeleteModalVisible(true);
  };

  const confirmDeleteAccount = async () => {
    if (selectedReasons.length === 0 && !customMessage.trim()) {
      Alert.alert('Please Select a Reason', 'Please select at least one reason or provide feedback to let us know why you are leaving.');
      return;
    }

    setDeleting(true);
    try {
      await deleteAccount({
        reason: selectedReasons.length > 0 ? selectedReasons.join(', ') : 'Custom feedback provided',
        customFeedback: customMessage.trim(),
      });
      await AsyncStorage.multiRemove(['auth_token', 'user_id', 'user_session', 'gender', 'warning_accepted']);
      dispatch(resetUser());
      setDeleteModalVisible(false);
      onLogout?.();
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
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

      {/* Delete Account Survey Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !deleting && setDeleteModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => !deleting && setDeleteModalVisible(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Text style={{ fontSize: 22 }}>🗑️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Delete Account</Text>
                <Text style={styles.modalSub}>
                  We're sad to see you go! Help us improve:
                </Text>
              </View>
              <TouchableOpacity
                disabled={deleting}
                onPress={() => setDeleteModalVisible(false)}
                style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 330 }}>
              <Text style={styles.modalQuestion}>Please tell us why you are leaving:</Text>

              {DELETE_REASONS.map((reason) => {
                const isSelected = selectedReasons.includes(reason);
                return (
                  <TouchableOpacity
                    key={reason}
                    activeOpacity={0.7}
                    onPress={() => toggleReason(reason)}
                    style={[styles.reasonRow, isSelected && styles.reasonRowSelected]}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.modalQuestion, { marginTop: 14 }]}>
                Tell us more (Optional):
              </Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder="Type your feedback or custom message..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={customMessage}
                onChangeText={setCustomMessage}
              />

              {/* Anti-Abuse Notice */}
              <View style={styles.antiAbuseNotice}>
                <Text style={styles.antiAbuseIcon}>⚠️</Text>
                <Text style={styles.antiAbuseText}>
                  Notice: Once deleted, this number will not be eligible for new user welcome bonus coins if you sign up again in the future.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                disabled={deleting}
                style={styles.modalCancelBtn}
                onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={deleting}
                style={[styles.modalConfirmBtn, deleting && { opacity: 0.7 }]}
                onPress={confirmDeleteAccount}>
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Delete Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
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
  signOutText: { fontSize: 16, fontWeight: 'bold', color: Colors.secondary },

  /* Delete Account Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  modalQuestion: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonRowSelected: {
    backgroundColor: '#FFF0F4',
    borderColor: '#FF3870',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  checkboxActive: {
    backgroundColor: '#FF3870',
    borderColor: '#FF3870',
  },
  checkMark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  reasonText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: '#FF3870',
    fontWeight: '700',
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
    minHeight: 64,
  },
  antiAbuseNotice: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  antiAbuseIcon: {
    fontSize: 14,
  },
  antiAbuseText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  modalConfirmBtn: {
    flex: 1.3,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
