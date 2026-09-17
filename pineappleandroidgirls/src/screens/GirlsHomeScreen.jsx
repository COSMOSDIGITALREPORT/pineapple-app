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
import { connectSocket, getSocket, disconnectSocket } from '../services/socket';
import DrawerMenu from './DrawerMenu';
import ProfileScreen from './ProfileScreen';
import AudioCallScreen from './AudioCallScreen';
import CallDurationScreen from './CallDurationScreen';
import CallReviewScreen from './CallReviewScreen';
import SettingsScreen from './SettingsScreen';
import EditProfileScreen from './EditProfileScreen';
import LanguageScreen from './LanguageScreen';
import SupportScreen from './SupportScreen';
import SafetyScreen from './SafetyScreen';
import RecentsScreen from './RecentsScreen';
import IncomingCallScreen from './IncomingCallScreen';
import VideoCallScreen from './VideoCallScreen';
import GirlsEarningsScreen from './GirlsEarningsScreen';
import GirlsRedeemScreen from './GirlsRedeemScreen';
import BlockedUsersScreen from './BlockedUsersScreen';

function TabItem({ active, icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress}>
      <Icon name={icon} size={24} color={active ? Colors.secondary : '#CCCCCC'} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function GirlsHomeScreen({ onLogout }) {
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.user);
  const isGirl = true;
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

      socket.on('gift:received', (data) => {
        Alert.alert(
          '🎁 Gift Received!',
          `Someone sent you ${data.giftType} worth ₹${data.coinsCost}! 💰`,
        );
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

  if (currentSubScreen === 'videoCall')    return <VideoCallScreen callerUser={selectedUser} onBack={() => { setLastCallType('video'); handleHangup(callDuration); }} onHangup={(d) => { setLastCallType('video'); handleHangup(d); }} incomingCallData={acceptedCallData} />;
  if (currentSubScreen === 'audioCall')    return <AudioCallScreen callerUser={selectedUser} onBack={() => { setLastCallType('audio'); handleHangup(callDuration); }} onHangup={(d) => { setLastCallType('audio'); handleHangup(d); }} incomingCallData={acceptedCallData} />;
  if (currentSubScreen === 'callDuration') return <CallDurationScreen duration={callDuration} callerUser={selectedUser} callType={lastCallType} onRate={() => setCurrentSubScreen('callReview')} onSkip={goHome} />;
  if (currentSubScreen === 'callReview')   return <CallReviewScreen callerName={selectedUser?.name || 'User'} callerAvatar={selectedUser?.avatar_url} callerUserId={selectedUser?.id} callId={acceptedCallData?.callId} onSubmit={goHome} onBack={() => setCurrentSubScreen('callDuration')} />;
  if (currentSubScreen === 'redeem')       return <GirlsRedeemScreen onBack={goHome} />;
  if (currentSubScreen === 'settings')     return <SettingsScreen onBack={goHome} onLogout={onLogout} />;
  if (currentSubScreen === 'editProfile')  return <EditProfileScreen onBack={goHome} />;
  if (currentSubScreen === 'language')     return <LanguageScreen onBack={goHome} />;
  if (currentSubScreen === 'support')      return <SupportScreen onBack={goHome} />;
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
            onPremiumPlans={null}
            onWallet={() => setCurrentSubScreen('redeem')}
            onSettings={() => setCurrentSubScreen('settings')}
            onSafety={() => setCurrentSubScreen('safety')}
            onBlockedUsers={() => setCurrentSubScreen('blockedUsers')}
            onDrawer={openDrawer}
            onLogout={onLogout}
          />
        )}
        {currentSubScreen === 'safety' && <SafetyScreen onBack={goHome} />}
      </View>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 10 }]}>
        <TabItem active={activeTab === 'matches'} icon={isGirl ? 'star' : 'heart'} label={isGirl ? 'Earnings' : 'Matches'} onPress={() => setActiveTab('matches')} />
        <TabItem active={activeTab === 'calls'}   icon="phone"  label="Calls"   onPress={() => setActiveTab('calls')} />
        <TabItem active={activeTab === 'profile'} icon="user"   label="Profile" onPress={() => setActiveTab('profile')} />
      </View>

      <DrawerMenu
        visible={showDrawer}
        onClose={() => setShowDrawer(false)}
        isGirl={true}
        onLuckySpin={null}
        onWallet={() => setCurrentSubScreen('redeem')}
        onSettings={() => setCurrentSubScreen('settings')}
        onPremium={null}
        onLanguage={() => setCurrentSubScreen('language')}
        onSupport={() => setCurrentSubScreen('support')}
        onSafety={null}
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
    borderTopColor: '#EEEEEE',
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 4 },
  tabLabel: { fontSize: 10, fontWeight: '600', color: '#AAAAAA' },
  tabLabelActive: { color: '#FF3870' },
});
