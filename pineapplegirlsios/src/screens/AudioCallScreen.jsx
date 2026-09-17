import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  StatusBar, Animated, Modal, ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { redeemGift } from '../store/slices/userSlice';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';
import { initiateCall, endCall, getReceiverToken } from '../services/api';
import { getSocket } from '../services/socket';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
} from 'react-native-agora';

export default function AudioCallScreen({ onBack, onHangup, callerUser, incomingCallData }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const gifts = useSelector((s) => s.user.gifts.filter((g) => g.status === 'pending'), shallowEqual);
  const myName = useSelector((s) => s.user.name);
  const myAvatar = useSelector((s) => s.user.avatar_url);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulse2Anim = useRef(new Animated.Value(1)).current;
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [sentGift, setSentGift] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [callStatus, setCallStatus] = useState('Connecting…');
  const engineRef = useRef(null);
  const callRef = useRef(null);

  // other user's id — needed to emit call:ended
  const otherUserId = incomingCallData ? incomingCallData.callerId : callerUser?.id;

  const startTimer = () => {
    if (callRef.current?._started || callRef.current?._timer) return;
    if (!callRef.current) callRef.current = {};
    callRef.current._started = true;
    setCallStatus('Connected');
    const startTime = Date.now();
    const t = setInterval(() => {
      const elapsed = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
      callRef.current._secs = elapsed;
      setSeconds(elapsed);
    }, 1000);
    callRef.current._timer = t;
  };

  const cleanupCall = async (dur) => {
    clearInterval(callRef.current?._timer);
    engineRef.current?.leaveChannel();
    engineRef.current?.release();
    if (callRef.current?.id) {
      try { await endCall(callRef.current.id, callRef.current._secs || 0); } catch {}
    }
    const s = callRef.current?._secs || 0;
    const ts = dur || `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    (onHangup || onBack)(ts);
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse2Anim, { toValue: 1.35, duration: 2400, useNativeDriver: true }),
        Animated.timing(pulse2Anim, { toValue: 1, duration: 2400, useNativeDriver: true }),
      ])
    ).start();

    startAgoraCall();

    // Socket: when other person accepts (caller side) → start timer
    const socket = getSocket();
    if (socket) {
      if (!incomingCallData) {
        socket.on('call:accepted', () => startTimer());
      }
      // Both sides: when other person ends call → auto cleanup
      socket.on('call:ended', () => cleanupCall());
    }

    return () => {
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
      clearInterval(callRef.current?._timer);
      socket?.off('call:accepted');
      socket?.off('call:ended');
    };
  }, []);

  const startAgoraCall = async () => {
    try {
      let token, channelName, appId;

      if (incomingCallData) {
        const data = await getReceiverToken(incomingCallData.callId);
        token = data.receiverToken;
        channelName = data.channelName;
        appId = data.appId;
        callRef.current = { id: incomingCallData.callId, _secs: 0 };
      } else {
        const data = await initiateCall(callerUser?.id, 'audio');
        callRef.current = { id: data.callId, _secs: 0 };
        token = data.callerToken;
        channelName = data.channelName;
        appId = data.appId;

        getSocket()?.emit('call:ring', {
          receiverId:   callerUser?.id,
          callId:       data.callId,
          callerName:   myName || 'Unknown',
          callerAvatar: myAvatar || null,
          channelName:  data.channelName,
          type:         'audio',
        });
      }

      const engine = createAgoraRtcEngine();
      engineRef.current = engine;
      engine.registerEventHandler({
        onJoinChannelSuccess: () => { if (incomingCallData) startTimer(); },
        onUserJoined: () => { if (!incomingCallData) startTimer(); },
        onError: (err) => console.warn('[Agora] error:', err),
      });
      await engine.initialize({ appId });
      engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
      engine.enableAudio();
      engine.setEnableSpeakerphone(true);
      engine.setAudioProfile(1, 3);

      const uid = incomingCallData ? 2 : 1;
      await engine.joinChannel(token, channelName, uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        autoSubscribeAudio: true,
      });

    } catch (e) {
      console.warn('Agora error:', e.message);
      if (!callRef.current) callRef.current = { _secs: 0 };
      if (incomingCallData) startTimer();
    }
  };

  const timeStr = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const handleMute = async () => {
    setMuted(!muted);
    engineRef.current?.muteLocalAudioStream(!muted);
  };

  const handleSpeaker = async () => {
    setSpeakerOn(!speakerOn);
    engineRef.current?.setEnableSpeakerphone(!speakerOn);
  };

  const handleHangupPress = async () => {
    // Tell other person call ended
    getSocket()?.emit('call:ended', { otherUserId });
    cleanupCall();
  };

  const handleSendGift = (gift) => {
    dispatch(redeemGift({ id: gift.id, action: 'gift' }));
    setSentGift(gift);
    setShowGiftPanel(false);
    setTimeout(() => setSentGift(null), 3000);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Subtle gradient bg */}
      <LinearGradient
        colors={['#3A0068', '#7B0050', '#C0003A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onBack} style={styles.topBtn}>
          <Icon name="arrow-left" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.callerName}>{callerUser?.name || incomingCallData?.callerName || 'Ishani'}</Text>
          <Text style={styles.timer}>{callStatus === 'Connected' ? timeStr : callStatus}</Text>
        </View>
        <TouchableOpacity style={styles.topBtn}>
          <Icon name="shield" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Avatar with pulse rings */}
      <View style={styles.avatarSection}>
        <Animated.View style={[styles.ring2, { transform: [{ scale: pulse2Anim }] }]} />
        <Animated.View style={[styles.ring1, { transform: [{ scale: pulseAnim }] }]} />
        <View style={styles.avatarBorder}>
          {callerUser?.avatar_url || incomingCallData?.callerAvatar ? (
            <Image
              source={{ uri: callerUser?.avatar_url || incomingCallData?.callerAvatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }]}>
              <Icon name="user" size={44} color="rgba(255,255,255,0.6)" />
            </View>
          )}
        </View>

        {/* Gift toast */}
        {sentGift && (
          <View style={styles.giftToast}>
            <Text style={styles.giftToastText}>{sentGift.emoji} {sentGift.label} sent!</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 32 }]}>
        {/* Secondary row */}
        <View style={styles.secRow}>
          <CtrlBtn
            icon={muted ? 'mic-off' : 'mic'}
            label={muted ? 'Unmute' : 'Mute'}
            onPress={handleMute}
            active={muted}
          />
          <CtrlBtn
            icon="volume-2"
            label="Speaker"
            onPress={handleSpeaker}
            active={speakerOn}
            activeColor={Colors.primary}
          />
          <CtrlBtn icon="keypad" label="Keypad" />
          <TouchableOpacity style={styles.ctrlItem} onPress={() => setShowGiftPanel(true)}>
            <View style={styles.giftBtn}>
              <LinearGradient
                colors={['#FF3870', '#C0004A']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={{ fontSize: 22 }}>🎁</Text>
              {gifts.length > 0 && (
                <View style={styles.giftBadge}>
                  <Text style={styles.giftBadgeText}>{gifts.length}</Text>
                </View>
              )}
            </View>
            <Text style={styles.ctrlLabel}>Gift</Text>
          </TouchableOpacity>
        </View>

        {/* Hangup */}
        <TouchableOpacity onPress={handleHangupPress} style={styles.hangup} activeOpacity={0.85}>
          <Icon name="phone-off" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Gift Panel */}
      <Modal visible={showGiftPanel} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowGiftPanel(false)} />
        <View style={[styles.giftPanel, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.panelHandle} />
          <Text style={styles.panelTitle}>Send a Gift 🎁</Text>
          <Text style={styles.panelSub}>{callerUser?.name || 'Ishani'} can redeem it for real money</Text>
          {gifts.length === 0 ? (
            <View style={styles.noGifts}>
              <Text style={{ fontSize: 36 }}>🎰</Text>
              <Text style={styles.noGiftsText}>No gifts yet</Text>
              <Text style={styles.noGiftsSub}>Spin the Fortune Wheel to win!</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.giftScroll}>
              {gifts.map((g) => (
                <TouchableOpacity key={g.id} style={styles.giftItem} onPress={() => handleSendGift(g)} activeOpacity={0.8}>
                  <View style={styles.giftItemCircle}>
                    <LinearGradient colors={Gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    <Text style={{ fontSize: 28 }}>{g.emoji}</Text>
                  </View>
                  <Text style={styles.giftItemLabel}>{g.label}</Text>
                  <Text style={styles.giftItemWorth}>₹{g.value}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

function CtrlBtn({ icon, label, onPress, active, activeColor }) {
  const col = active ? (activeColor || Colors.secondary) : 'rgba(255,255,255,0.75)';
  return (
    <TouchableOpacity style={styles.ctrlItem} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.ctrlCircle, active && { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
        <Icon name={icon} size={22} color={col} />
      </View>
      <Text style={[styles.ctrlLabel, active && { color: col }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 8,
  },
  topBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topCenter: { flex: 1, alignItems: 'center' },
  callerName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  timer: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2, fontWeight: '600' },

  avatarSection: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  ring2: {
    position: 'absolute',
    width: 260, height: 260, borderRadius: 130,
    borderWidth: 1, borderColor: 'rgba(255,56,112,0.2)',
  },
  ring1: {
    position: 'absolute',
    width: 210, height: 210, borderRadius: 105,
    borderWidth: 1.5, borderColor: 'rgba(255,56,112,0.4)',
  },
  avatarBorder: {
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 3, borderColor: Colors.primary,
    overflow: 'hidden',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 12,
  },
  avatar: { width: '100%', height: '100%' },

  giftToast: {
    marginTop: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  giftToastText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  controls: { paddingHorizontal: 20, paddingTop: 16 },

  secRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    marginBottom: 36,
  },
  ctrlItem: { alignItems: 'center', width: 72 },
  ctrlCircle: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  ctrlLabel: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },

  giftBtn: {
    width: 58, height: 58, borderRadius: 29,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  giftBadge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: '#fff', width: 17, height: 17,
    borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  giftBadgeText: { fontSize: 9, fontWeight: '900', color: Colors.secondary },

  hangup: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FF3B30',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 10,
  },

  overlay: { flex: 1 },
  giftPanel: {
    backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 20, paddingTop: 16, minHeight: 280,
  },
  panelHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  panelTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b', textAlign: 'center' },
  panelSub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 4, marginBottom: 24 },
  noGifts: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  noGiftsText: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  noGiftsSub: { fontSize: 13, color: '#94a3b8' },
  giftScroll: { paddingBottom: 8, gap: 14, paddingHorizontal: 4 },
  giftItem: { alignItems: 'center', width: 80 },
  giftItemCircle: {
    width: 64, height: 64, borderRadius: 32,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  giftItemLabel: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  giftItemWorth: { fontSize: 11, fontWeight: '600', color: Colors.secondary },
});
