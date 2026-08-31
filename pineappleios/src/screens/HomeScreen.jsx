import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '../components/Icon';
import { Colors } from '../theme/colors';
import { getRandomUser } from '../services/api';
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

      socket.on('call:ended', () => {
        setCurrentSubScreen(null);
        setIncomingCall(null);
      });
    };

    initSocket();
    return () => disconnectSocket();
  }, []);

  const goHome = () => { setAcceptedCallData(null); setCurrentSubScreen(null); };
  const openDrawer = () => setShowDrawer(true);
  const handleHangup = (dur) => {
    setCallDuration(dur || '00:00');
    setCurrentSubScreen('callDuration');
  };

  const handleAcceptCall = () => {
    const call = incomingCallRef.current;
    if (!call) return;
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
    setCurrentSubScreen(call.type === 'video' ? 'videoCall' : 'audioCall');
  };

  const handleRejectCall = () => {
    const call = incomingCallRef.current;
    if (call) {
      getSocket()?.emit('call:rejected', { callerId: call.callerId });
    }
    setIncomingCall(null);
    incomingCallRef.current = null;
  };

  const handleRandomCall = async () => {
    try {
      const user = await getRandomUser();
      setSelectedUser(user);
      setCurrentSubScreen('audioCall');
    } catch (e) {
      if (e.message === 'No one is online') {
        Alert.alert('No One Online', 'No girls are available right now. Please try again later.');
      } else {
        Alert.alert('Error', 'Could not find a match. Check your connection.');
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

  if (currentSubScreen === 'luckySpin')    return <LuckySpinScreen onBack={goHome} onPremium={() => setCurrentSubScreen('premium')} />;
  if (currentSubScreen === 'videoCall')    return <VideoCallScreen callerUser={selectedUser} onBack={goHome} onHangup={handleHangup} incomingCallData={acceptedCallData} />;
  if (currentSubScreen === 'audioCall')    return <AudioCallScreen callerUser={selectedUser} onBack={goHome} onHangup={handleHangup} incomingCallData={acceptedCallData} />;
  if (currentSubScreen === 'callDuration') return <CallDurationScreen duration={callDuration} callerUser={selectedUser} onRate={() => setCurrentSubScreen('callReview')} onSkip={goHome} />;
  if (currentSubScreen === 'callReview')   return <CallReviewScreen callerName={selectedUser?.name || 'User'} callerAvatar={selectedUser?.avatar_url} callerUserId={selectedUser?.id} callId={acceptedCallData?.callId} onSubmit={goHome} onBack={() => setCurrentSubScreen('callDuration')} />;
  if (currentSubScreen === 'liveRoom')     return <LiveRoomScreen onBack={goHome} />;
  if (currentSubScreen === 'redeem')       return <GirlsRedeemScreen onBack={goHome} />;
  if (currentSubScreen === 'wallet')       return <WalletScreen onBack={goHome} />;
  if (currentSubScreen === 'settings')     return <SettingsScreen onBack={goHome} onLogout={onLogout} />;
  if (currentSubScreen === 'premium')      return <PremiumPlansScreen onBack={goHome} />;
  if (currentSubScreen === 'editProfile')  return <EditProfileScreen onBack={goHome} />;
  if (currentSubScreen === 'safety')       return <SafetyScreen onBack={goHome} onAccept={goHome} />;
  if (currentSubScreen === 'language')     return <LanguageScreen onBack={goHome} />;
  if (currentSubScreen === 'support')      return <SupportScreen onBack={goHome} />;
  if (currentSubScreen === 'leaderboard')  return <LeaderboardScreen onBack={goHome} onCallUser={(u) => { setSelectedUser(u); setCurrentSubScreen('audioCall'); }} />;
  if (currentSubScreen === 'blockedUsers') return <BlockedUsersScreen onBack={goHome} />;

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
            onAudioCall={(u) => { setSelectedUser(u); setCurrentSubScreen('audioCall'); }}
            onVideoCall={(u) => { setSelectedUser(u); setCurrentSubScreen('videoCall'); }}
            onJoinRoom={() => setCurrentSubScreen('liveRoom')}
            onDrawer={openDrawer}
            onBuyCoins={() => setCurrentSubScreen('premium')}
            onRandomCall={handleRandomCall}
          />
        )}
        {!isGirl && activeTab === 'calls' && (
          <RecentsScreen
            onRandom={() => setCurrentSubScreen('audioCall')}
            onDrawer={openDrawer}
            onCall={(u) => { setSelectedUser(u); setCurrentSubScreen('audioCall'); }}
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
