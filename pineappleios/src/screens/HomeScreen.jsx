import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  StatusBar,
  Alert,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '../components/Icon';
import { Colors } from '../theme/colors';
import { getRandomUser, getBlockedUsers } from '../services/api';
import { connectSocket, getSocket, disconnectSocket } from '../services/socket';
import LinearGradient from 'react-native-linear-gradient';
import DrawerMenu from './DrawerMenu';
import LuckySpinScreen from './LuckySpinScreen';
import ProfileScreen from './ProfileScreen';
import AudioCallScreen from './AudioCallScreen';
import CallDurationScreen from './CallDurationScreen';
import CallReviewScreen from './CallReviewScreen';
import LiveRoomScreen from './LiveRoomScreen';
import WalletScreen from './WalletScreen';
import SettingsScreen from './SettingsScreen';
import PremiumPlansScreen from './PremiumPlansScreen';
import EditProfileScreen from './EditProfileScreen';
import SafetyScreen from './SafetyScreen';
import LanguageScreen from './LanguageScreen';
import SupportScreen from './SupportScreen';
import ConnectScreen from './ConnectScreen';
import LeaderboardScreen from './LeaderboardScreen';
import RecentsScreen from './RecentsScreen';
import VideoCallScreen from './VideoCallScreen';
import IncomingCallScreen from './IncomingCallScreen';
import GirlsEarningsScreen from './GirlsEarningsScreen';
import GirlsRedeemScreen from './GirlsRedeemScreen';
import BlockedUsersScreen from './BlockedUsersScreen';
import TransactionsScreen from './TransactionsScreen';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import TermsOfServiceScreen from './TermsOfServiceScreen';

function TabItem({ active, icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
        {active && (
          <LinearGradient
            colors={['rgba(255,56,112,0.15)', 'rgba(192,0,74,0.08)']}
            style={StyleSheet.absoluteFill}
          />
        )}
        <Icon name={icon} size={22} color={active ? '#FF3870' : '#BBBBBB'} />
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ onLogout }) {
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.user);
  const isGirl = ['girl', 'female'].includes((user.gender || '').toLowerCase());
  const [activeTab, setActiveTab] = useState('matches');
  const [showDrawer, setShowDrawer] = useState(false);
  const [currentSubScreen, setCurrentSubScreen] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [callDuration, setCallDuration] = useState('00:00');
  const [lastCallType, setLastCallType] = useState('audio');
  const [incomingCall, setIncomingCall] = useState(null);
  const [acceptedCallData, setAcceptedCallData] = useState(null);
  const incomingCallRef = useRef(null);

  // Connect socket when HomeScreen mounts
  useEffect(() => {
    const initSocket = async () => {
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) return;

      const socket = connectSocket(userId);

      socket.on('call:incoming', (data) => {
        incomingCallRef.current = data;
        setIncomingCall(data);
      });

      socket.on('call:ended', (data) => {
        const dur = data?.formattedDuration || '00:00';
        setCallDuration(dur);
        if (data?.callType) setLastCallType(data.callType);
        setCurrentSubScreen((prev) => {
          if (prev === 'audioCall' || prev === 'videoCall' || incomingCallRef.current) {
            return 'callDuration';
          }
          return prev;
        });
        setIncomingCall(null);
        incomingCallRef.current = null;
      });
    };

    initSocket();
    return () => disconnectSocket();
  }, []);

  // Back button handler
  useEffect(() => {
    const onBackPress = () => {
      if (showDrawer) {
        setShowDrawer(false);
        return true;
      }
      if (incomingCall) {
        handleRejectCall();
        return true;
      }
      if (currentSubScreen) {
        if (currentSubScreen === 'callReview') {
          setCurrentSubScreen('callDuration');
          return true;
        }
        goHome();
        return true;
      }
      if (activeTab !== 'matches') {
        setActiveTab('matches');
        return true;
      }
      return false;
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, [showDrawer, incomingCall, currentSubScreen, activeTab]);

  const goHome = () => { setAcceptedCallData(null); setCurrentSubScreen(null); };
  const openDrawer = () => setShowDrawer(true);
  const handleHangup = (dur) => {
    setCallDuration(dur || '00:00');
    setCurrentSubScreen('callDuration');
  };

  const handleAcceptCall = () => {
    const call = incomingCallRef.current;
    if (!call) return;
    const cType = call.type === 'video' ? 'video' : 'audio';
    setLastCallType(cType);
    getSocket()?.emit('call:accepted', {
      callerId: call.callerId,
      channelName: call.channelName,
    });
    setSelectedUser({
      id: call.callerId,
      name: call.callerName,
      avatar_url: call.callerAvatar,
    });
    setAcceptedCallData({ callId: call.callId, channelName: call.channelName, callerId: call.callerId });
    setIncomingCall(null);
    setCurrentSubScreen(cType === 'video' ? 'videoCall' : 'audioCall');
  };

  const handleRejectCall = () => {
    const call = incomingCallRef.current;
    if (call) {
      getSocket()?.emit('call:rejected', { callerId: call.callerId });
    }
    setIncomingCall(null);
    incomingCallRef.current = null;
  };

  const handleStartAudioCall = async (u) => {
    if (u?.id) {
      try {
        const blist = await getBlockedUsers();
        if (Array.isArray(blist) && blist.some((b) => b.id === u.id)) {
          Alert.alert('User Blocked', 'You have blocked this user. Unblock them from Settings > Block List to make calls.');
          return;
        }
      } catch (_) {}
    }
    if ((user?.coins || 0) < 1) {
      Alert.alert(
        'Insufficient Coins',
        'Audio calls cost 1 coin/min. Please recharge your wallet to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get Coins', onPress: () => setCurrentSubScreen('premium') },
        ]
      );
      return;
    }
    setSelectedUser(u);
    setCurrentSubScreen('audioCall');
  };

  const handleStartVideoCall = async (u) => {
    if (u?.id) {
      try {
        const blist = await getBlockedUsers();
        if (Array.isArray(blist) && blist.some((b) => b.id === u.id)) {
          Alert.alert('User Blocked', 'You have blocked this user. Unblock them from Settings > Block List to make calls.');
          return;
        }
      } catch (_) {}
    }
    if ((user?.coins || 0) < 2) {
      Alert.alert(
        'Insufficient Coins',
        `Video calls cost 2 coins/min. You have ${user?.coins || 0} coin${user?.coins === 1 ? '' : 's'}.\n\nYou need at least 2 coins to start a video call.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get Coins', onPress: () => setCurrentSubScreen('premium') },
        ]
      );
      return;
    }
    setSelectedUser(u);
    setCurrentSubScreen('videoCall');
  };

  const handleRandomCall = async () => {
    if ((user?.coins || 0) < 1) {
      Alert.alert(
        'Insufficient Coins',
        'Audio calls cost 1 coin/min. Please recharge your wallet to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get Coins', onPress: () => setCurrentSubScreen('premium') },
        ]
      );
      return;
    }
    try {
      const u = await getRandomUser();
      setSelectedUser(u);
      setLastCallType('audio');
      setCurrentSubScreen('audioCall');
    } catch (e) {
      if (e.message === 'No one is online') {
        Alert.alert('No One Online', 'No girls are available right now. Please try again later.');
      } else {
        Alert.alert('Error', e.message || 'Could not connect. Please check your internet.');
      }
    }
  };

  // Incoming call overlay — shows on top of everything
  if (incomingCall) {
    return (
      <IncomingCallScreen
        callData={incomingCall}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />
    );
  }

  if (currentSubScreen === 'luckySpin')       return <LuckySpinScreen onBack={goHome} onPremium={() => setCurrentSubScreen('premium')} />;
  if (currentSubScreen === 'videoCall')       return <VideoCallScreen callerUser={selectedUser} onBack={() => { setLastCallType('video'); handleHangup(callDuration); }} onHangup={(d) => { setLastCallType('video'); handleHangup(d); }} incomingCallData={acceptedCallData} />;
  if (currentSubScreen === 'audioCall')       return <AudioCallScreen callerUser={selectedUser} onBack={() => { setLastCallType('audio'); handleHangup(callDuration); }} onHangup={(d) => { setLastCallType('audio'); handleHangup(d); }} incomingCallData={acceptedCallData} />;
  if (currentSubScreen === 'callDuration')    return <CallDurationScreen duration={callDuration} callerUser={selectedUser} callType={lastCallType} onRate={() => setCurrentSubScreen('callReview')} onSkip={goHome} />;
  if (currentSubScreen === 'callReview')      return <CallReviewScreen callerName={selectedUser?.name || 'User'} callerAvatar={selectedUser?.avatar_url} callerUserId={selectedUser?.id} callId={acceptedCallData?.callId} onSubmit={goHome} onBack={() => setCurrentSubScreen('callDuration')} />;
  if (currentSubScreen === 'liveRoom')        return <LiveRoomScreen onBack={goHome} />;
  if (currentSubScreen === 'redeem')          return <GirlsRedeemScreen onBack={goHome} />;
  if (currentSubScreen === 'wallet')          return <WalletScreen onBack={goHome} />;
  if (currentSubScreen === 'transactions')    return <TransactionsScreen onBack={goHome} onBuyCoins={() => setCurrentSubScreen('premium')} />;
  if (currentSubScreen === 'privacyPolicy')   return <PrivacyPolicyScreen onBack={goHome} />;
  if (currentSubScreen === 'termsOfService')  return <TermsOfServiceScreen onBack={goHome} />;
  if (currentSubScreen === 'settings')        return <SettingsScreen onBack={goHome} onLogout={onLogout} onBlockedUsers={() => setCurrentSubScreen('blockedUsers')} onPrivacyPolicy={() => setCurrentSubScreen('privacyPolicy')} onTermsOfService={() => setCurrentSubScreen('termsOfService')} />;
  if (currentSubScreen === 'premium')         return <PremiumPlansScreen onBack={goHome} />;
  if (currentSubScreen === 'editProfile')     return <EditProfileScreen onBack={goHome} />;
  if (currentSubScreen === 'safety')          return <SafetyScreen onBack={goHome} onAccept={goHome} />;
  if (currentSubScreen === 'language')        return <LanguageScreen onBack={goHome} />;
  if (currentSubScreen === 'support')         return <SupportScreen onBack={goHome} />;
  if (currentSubScreen === 'leaderboard')     return <LeaderboardScreen onBack={goHome} onCallUser={handleStartAudioCall} />;
  if (currentSubScreen === 'blockedUsers')    return <BlockedUsersScreen onBack={goHome} />;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <View style={styles.content}>
        {/* ── GIRLS UI ── */}
        {isGirl && activeTab === 'matches' && (
          <GirlsEarningsScreen
            onDrawer={openDrawer}
            onRedeem={() => setCurrentSubScreen('redeem')}
          />
        )}
        {isGirl && activeTab === 'calls' && (
          <RecentsScreen
            onDrawer={openDrawer}
            onCall={null}
            onRandom={null}
            girlMode
          />
        )}

        {/* ── BOYS UI ── */}
        {!isGirl && activeTab === 'matches' && (
          <ConnectScreen
            onAudioCall={handleStartAudioCall}
            onVideoCall={handleStartVideoCall}
            onJoinRoom={() => setCurrentSubScreen('liveRoom')}
            onDrawer={openDrawer}
            onBuyCoins={() => setCurrentSubScreen('premium')}
            onRandomCall={handleRandomCall}
          />
        )}
        {!isGirl && activeTab === 'calls' && (
          <RecentsScreen
            onRandom={handleRandomCall}
            onDrawer={openDrawer}
            onCall={handleStartAudioCall}
          />
        )}

        {/* ── COMMON ── */}
        {activeTab === 'profile' && (
          <ProfileScreen
            onEditProfile={() => setCurrentSubScreen('editProfile')}
            onPremiumPlans={isGirl ? null : () => setCurrentSubScreen('premium')}
            onWallet={isGirl ? () => setCurrentSubScreen('redeem') : () => setCurrentSubScreen('wallet')}
            onSettings={() => setCurrentSubScreen('settings')}
            onSafety={() => setCurrentSubScreen('safety')}
            onBlockedUsers={() => setCurrentSubScreen('blockedUsers')}
            onDrawer={openDrawer}
            onLogout={onLogout}
          />
        )}
      </View>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 10 }]}>
        <TabItem active={activeTab === 'matches'} icon={isGirl ? 'star' : 'heart'} label={isGirl ? 'Earnings' : 'Matches'} onPress={() => setActiveTab('matches')} />
        <TabItem active={activeTab === 'calls'}   icon="phone"  label="Calls"   onPress={() => setActiveTab('calls')} />
        <TabItem active={activeTab === 'profile'} icon="user"   label="Profile" onPress={() => setActiveTab('profile')} />
      </View>

      <DrawerMenu
        visible={showDrawer}
        onClose={() => setShowDrawer(false)}
        onLuckySpin={isGirl ? null : () => setCurrentSubScreen('luckySpin')}
        onWallet={isGirl ? () => setCurrentSubScreen('redeem') : () => setCurrentSubScreen('wallet')}
        onTransactions={() => setCurrentSubScreen('transactions')}
        onPrivacyPolicy={() => setCurrentSubScreen('privacyPolicy')}
        onTermsOfService={() => setCurrentSubScreen('termsOfService')}
        onSettings={() => setCurrentSubScreen('settings')}
        onPremium={isGirl ? null : () => setCurrentSubScreen('premium')}
        onLanguage={() => setCurrentSubScreen('language')}
        onSupport={() => setCurrentSubScreen('support')}
        onSafety={() => setCurrentSubScreen('safety')}
        onLeaderboard={() => setCurrentSubScreen('leaderboard')}
        onLogout={onLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 12,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 4, paddingBottom: 2 },
  tabIconWrap: {
    width: 48, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  tabIconWrapActive: {
    shadowColor: '#FF3870', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  tabLabel: { fontSize: 10, fontWeight: '600', color: '#BBBBBB', opacity: 0.5 },
  tabLabelActive: { color: '#FF3870', fontWeight: '800', opacity: 1 },
});
