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
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line } from 'react-native-svg';
import Icon from '../components/Icon';
import { Colors } from '../theme/colors';
import { getCallHistory, blockUser, reportUser } from '../services/api';

const REPORT_REASONS = [
  'Inappropriate Behavior / Abusive Language',
  'Harassment or Threats',
  'Fake Profile / Impersonation / Scam',
  'Underage Caller',
  'Nudity or Offensive Content',
  'Other Policy Violation',
];

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diff < 1)    return 'Just now';
  if (diff < 60)   return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

function PhoneArrowIcon({ missed }) {
  const color = missed ? '#FF3B30' : '#FF3870';
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
  const [selectedCaller, setSelectedCaller] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

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

  const handleCallerPress = (item) => {
    if (!item) return;
    const cid = item?.other_user_id || item?.other_user?.id || item?.caller_id || item?.receiver_id || item?.id;
    const cname = item?.other_user_name || item?.caller_name || item?.other_user?.name || item?.name || 'Caller';
    const cavatar = item?.other_user_avatar || item?.caller_avatar || item?.other_user?.avatar_url || item?.avatar_url || null;

    setSelectedCaller({
      id: cid,
      name: cname,
      avatar_url: cavatar,
    });
    setShowActionModal(true);
  };

  const handleConfirmBlock = () => {
    if (!selectedCaller?.id) {
      Alert.alert('Error', 'Caller ID not found.');
      return;
    }
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${selectedCaller.name || 'this caller'}? They will no longer be able to see your profile or call you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: async () => {
            setSubmittingAction(true);
            try {
              await blockUser(selectedCaller.id);
              setShowActionModal(false);
              Alert.alert('User Blocked', `${selectedCaller.name || 'User'} has been blocked successfully.`);
              await fetchHistory();
            } catch (err) {
              Alert.alert('Error', 'Failed to block user. Please try again.');
            } finally {
              setSubmittingAction(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenReport = () => {
    setShowActionModal(false);
    setSelectedReason(REPORT_REASONS[0]);
    setCustomReason('');
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!selectedCaller?.id) {
      Alert.alert('Error', 'Caller ID not found.');
      return;
    }
    const finalReason = customReason.trim() ? `${selectedReason}: ${customReason.trim()}` : selectedReason;
    setSubmittingAction(true);
    try {
      await reportUser(selectedCaller.id, finalReason);
      setShowReportModal(false);
      Alert.alert(
        'Report Submitted',
        'Thank you for reporting. Our moderation team and Admin Panel have received this case for review.'
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmittingAction(false);
    }
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
            <Text style={styles.sectionLabel}>CALL HISTORY (TAP TO REPORT / BLOCK)</Text>
            {calls.map((call) => {
              const missed = call.status === 'missed';
              const isVideo = call.type === 'video';
              const otherUser = call.other_user || {
                id: call.other_user_id || call.caller_id,
                name: call.other_user_name || call.caller_name || 'User',
                avatar_url: call.other_user_avatar || call.caller_avatar,
              };

              return (
                <TouchableOpacity
                  key={call.id}
                  style={styles.card}
                  activeOpacity={0.7}
                  onPress={() => handleCallerPress(call)}>
                  {/* Avatar */}
                  <View style={styles.avatarWrap}>
                    {otherUser.avatar_url ? (
                      <Image source={{ uri: otherUser.avatar_url }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <Icon name="user" size={22} color={Colors.primary} />
                      </View>
                    )}
                    <View style={[styles.onlineDot, { backgroundColor: otherUser.is_online ? '#22C55E' : '#cbd5e1' }]} />
                  </View>

                  {/* Info */}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={1} ellipsizeMode="tail">{otherUser.name || 'Unknown'}</Text>
                    <View style={styles.cardMeta}>
                      <PhoneArrowIcon missed={missed} />
                      <Text style={[styles.cardStatus, missed && styles.cardStatusMissed]} numberOfLines={1}>
                        {missed ? 'Missed' : 'Completed'}
                      </Text>
                      <Text style={styles.metaDot}>·</Text>
                      <Icon name={isVideo ? 'video' : 'phone'} size={12} color="#94a3b8" />
                      <Text style={styles.cardDuration}>{call.duration || '--:--'}</Text>
                    </View>
                    <Text style={styles.cardTime}>{timeAgo(call.created_at)}</Text>
                  </View>

                  {/* Manage action pill */}
                  <TouchableOpacity
                    style={styles.actionPillWrap}
                    activeOpacity={0.8}
                    onPress={() => handleCallerPress(call)}>
                    <Text style={styles.actionPillText}>⋮ Manage</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </>
        )}

      </ScrollView>

      {/* USER ACTION BOTTOM SHEET / MODAL */}
      <Modal visible={showActionModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.actionSheetCard}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetAvatarWrap}>
                {selectedCaller?.avatar_url ? (
                  <Image source={{ uri: selectedCaller.avatar_url }} style={styles.sheetAvatar} />
                ) : (
                  <View style={[styles.sheetAvatar, styles.avatarFallback]}>
                    <Icon name="user" size={26} color={Colors.primary} />
                  </View>
                )}
              </View>
              <Text style={styles.sheetCallerName}>{selectedCaller?.name || 'Caller'}</Text>
              <Text style={styles.sheetCallerSub}>Select an action for this user</Text>
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.sheetActionBtn}
                activeOpacity={0.7}
                onPress={handleOpenReport}>
                <View style={[styles.sheetActionIconWrap, { backgroundColor: '#FEF2F2' }]}>
                  <Text style={{ fontSize: 18 }}>🚨</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetActionLabel, { color: '#DC2626' }]}>Report User</Text>
                  <Text style={styles.sheetActionSub}>Report harassment, abuse, or policy violation to Admin</Text>
                </View>
                <Icon name="chevron-right" size={18} color="#94a3b8" />
              </TouchableOpacity>

              <View style={styles.sheetDivider} />

              <TouchableOpacity
                style={styles.sheetActionBtn}
                activeOpacity={0.7}
                disabled={submittingAction}
                onPress={handleConfirmBlock}>
                <View style={[styles.sheetActionIconWrap, { backgroundColor: '#FFF1F2' }]}>
                  <Text style={{ fontSize: 18 }}>🚫</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetActionLabel, { color: '#E11D48' }]}>Block User</Text>
                  <Text style={styles.sheetActionSub}>Block from viewing profile or placing calls</Text>
                </View>
                <Icon name="chevron-right" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.sheetCancelBtn}
              activeOpacity={0.8}
              onPress={() => setShowActionModal(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* REPORT SUBMISSION MODAL */}
      <Modal visible={showReportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.reportModalCard}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>🚨 Report User</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)} style={styles.reportCloseBtn}>
                <Icon name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.reportSub}>
              Reporting <Text style={{ fontWeight: '700', color: Colors.dark }}>{selectedCaller?.name || 'User'}</Text>. Please select a reason:
            </Text>

            <ScrollView style={{ maxHeight: 240, marginVertical: 10 }}>
              {REPORT_REASONS.map((r, i) => {
                const isSelected = selectedReason === r;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.reasonRow, isSelected && styles.reasonRowActive]}
                    activeOpacity={0.7}
                    onPress={() => setSelectedReason(r)}>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.reasonText, isSelected && styles.reasonTextActive]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TextInput
              style={styles.reasonInput}
              placeholder="Additional details (optional)..."
              placeholderTextColor="#94A3B8"
              value={customReason}
              onChangeText={setCustomReason}
              multiline
              numberOfLines={2}
            />

            <View style={styles.reportActionsRow}>
              <TouchableOpacity
                style={styles.reportCancelBtn}
                onPress={() => setShowReportModal(false)}>
                <Text style={styles.reportCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reportSubmitBtn}
                disabled={submittingAction}
                onPress={handleSubmitReport}>
                {submittingAction ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.reportSubmitText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  actionPillWrap: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFF0F4',
    borderWidth: 1,
    borderColor: '#FFE0EB',
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF3870',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  actionSheetCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetAvatarWrap: {
    marginBottom: 10,
  },
  sheetAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFE0EB',
  },
  sheetCallerName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1E293B',
  },
  sheetCallerSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  sheetActions: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
  },
  sheetActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  sheetActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActionLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  sheetActionSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  sheetCancelBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },

  reportModalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  reportCloseBtn: {
    padding: 6,
  },
  reportSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  reasonRowActive: {
    backgroundColor: '#FFF0F4',
    borderColor: '#FF3870',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#FF3870',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3870',
  },
  reasonText: {
    fontSize: 13.5,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  reasonTextActive: {
    color: '#BE123C',
    fontWeight: '700',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  reportActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  reportCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  reportCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  reportSubmitBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#FF3870',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
