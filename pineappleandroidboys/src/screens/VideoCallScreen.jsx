import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  StatusBar, Animated, Modal, ScrollView, Dimensions, Alert,
  PermissionsAndroid, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { redeemGift, deductCoins } from '../store/slices/userSlice';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';

const GIFT_CATALOG = [
  { label: 'Rose',      value: 10,  emoji: '🌹' },
  { label: 'Chocolate', value: 20,  emoji: '🍫' },
  { label: 'Pastry',    value: 50,  emoji: '🍰' },
  { label: 'Pineapple', value: 100, emoji: '🍍' },
  { label: 'Heart',     value: 200, emoji: '❤️' },
  { label: 'Perfume',   value: 500, emoji: '🌸' },
  { label: 'Crown',     value: 5000, emoji: '👑' },
];
import { initiateCall, endCall, getReceiverToken, sendGift } from '../services/api';
import { getSocket } from '../services/socket';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  RtcTextureView,
} from 'react-native-agora';

const RenderView = Platform.OS === 'android' ? RtcTextureView : RtcSurfaceView;

const { height } = Dimensions.get('window');

export default function VideoCallScreen({ onBack, onHangup, callerUser, incomingCallData }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const gifts = useSelector((s) => s.user.gifts.filter((g) => g.status === 'pending'));
  const myCoins = useSelector((s) => s.user.coins);
  const myName = useSelector((s) => s.user.name);
  const myAvatar = useSelector((s) => s.user.avatar_url);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [sentGift, setSentGift] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [callStatus, setCallStatus] = useState('Connecting…');
  const [remoteUid, setRemoteUid] = useState(null);
  const [remoteVideoOn, setRemoteVideoOn] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const engineRef = useRef(null);
  const callRef = useRef(null);

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

  const cleanupRef = useRef(false);
  const cleanupCall = async (dur) => {
    if (cleanupRef.current) return;
    cleanupRef.current = true;
    clearInterval(callRef.current?._timer);
    try {
      if (engineRef.current) {
        try { engineRef.current.unregisterEventHandler(); } catch {}
        try { engineRef.current.leaveChannel(); } catch {}
        try { engineRef.current.release(); } catch {}
        engineRef.current = null;
      }
    } catch {}
    let ts = dur;
    if (callRef.current?.id) {
      try {
        const res = await endCall(callRef.current.id, callRef.current._secs || 0);
        if (res?.formattedDuration) {
          ts = res.formattedDuration;
          getSocket()?.emit('call:ended', { otherUserId, duration: res.duration, formattedDuration: res.formattedDuration });
        }
      } catch {}
    }
    if (!ts) {
      const s = callRef.current?._secs || 0;
      ts = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      getSocket()?.emit('call:ended', { otherUserId, duration: s, formattedDuration: ts });
    }
    if (typeof onHangup === 'function') onHangup(ts);
    else if (typeof onBack === 'function') onBack(ts);
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.03, duration: 3000, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
      ])
    ).start();

    startAgoraCall();

    const socket = getSocket();
    const handlers = {};
    if (socket) {
      if (!incomingCallData) {
        handlers.accepted = () => startTimer();
        handlers.rejected = () => {
          Alert.alert('Call Declined', 'The other person declined your call.');
          (onHangup || onBack)('00:00');
        };
        handlers.unavailable = () => {
          Alert.alert('Offline', 'User is not available right now.');
          (onHangup || onBack)('00:00');
        };
        socket.on('call:accepted',    handlers.accepted);
        socket.on('call:rejected',    handlers.rejected);
        socket.on('call:unavailable', handlers.unavailable);
      }
      handlers.ended = (data) => cleanupCall(data?.formattedDuration);
      socket.on('call:ended', handlers.ended);
    }

    return () => {
      clearInterval(callRef.current?._timer);
      try {
        if (engineRef.current) {
          try { engineRef.current.unregisterEventHandler(); } catch {}
          try { engineRef.current.leaveChannel(); } catch {}
          try { engineRef.current.release(); } catch {}
          engineRef.current = null;
        }
      } catch {}
      if (socket && handlers) {
        socket.off('call:accepted', handlers.accepted);
        socket.off('call:rejected', handlers.rejected);
        socket.off('call:unavailable', handlers.unavailable);
        socket.off('call:ended', handlers.ended);
      }
    };
  }, []);

  const startAgoraCall = async () => {
    if (Platform.OS === 'android') {
      const perms = [
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ];
      if (Platform.Version >= 31 && PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
        perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
      }
      try {
        await PermissionsAndroid.requestMultiple(perms);
      } catch (err) {
        console.warn('Permission request error:', err);
      }
    }

    let token, channelName, appId;

    try {
      if (incomingCallData) {
        const data = await getReceiverToken(incomingCallData.callId);
        token = data.receiverToken;
        channelName = data.channelName;
        appId = data.appId;
        callRef.current = { id: incomingCallData.callId, _secs: 0 };
      } else {
        const data = await initiateCall(callerUser?.id, 'video');
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
          type:         'video',
        });
      }
    } catch (e) {
      console.warn('API error during call setup:', e.message);
      Alert.alert('Call Error', e.message);
      if (!callRef.current) callRef.current = { _secs: 0 };
      setTimeout(() => { if (!callRef.current?._secs) startTimer(); }, 2000);
      return;
    }

    try {
      const engine = createAgoraRtcEngine();
      engineRef.current = engine;

      engine.initialize({
        appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      engine.registerEventHandler({
        onJoinChannelSuccess: () => {
          setEngineReady(true);
          try { engine.setEnableSpeakerphone(true); } catch {}
          if (incomingCallData) startTimer();
        },
        onUserJoined: (_connection, uid) => {
          setRemoteUid(uid);
          if (!incomingCallData) startTimer();
        },
        onUserOffline: () => setRemoteUid(null),
        onError: (err) => {
          console.warn('[Agora] error:', err);
        },
      });

      try { await engine.enableVideo(); } catch {}
      try { await engine.enableAudio(); } catch {}
      try { engine.startPreview(); } catch {}
      try { engine.setEnableSpeakerphone(true); } catch {}

      const uid = incomingCallData ? 2 : 1;
      await engine.joinChannel(token, channelName, uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        publishCameraTrack: true,
        autoSubscribeAudio: true,
        autoSubscribeVideo: true,
      });

      if (incomingCallData) {
        startTimer();
      }
    } catch (e) {
      console.warn('Agora init error:', e.message);
      if (!callRef.current) callRef.current = { _secs: 0 };
      if (incomingCallData) startTimer();
      else setTimeout(() => { if (!callRef.current?._secs) startTimer(); }, 2000);
    }
    setEngineReady(true);
  };

  const timeStr = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const handleMute = () => {
    setMuted(!muted);
    engineRef.current?.muteLocalAudioStream(!muted);
  };

  const handleCamToggle = () => {
    setCamOff(!camOff);
    engineRef.current?.muteLocalVideoStream(!camOff);
  };

  const handleFlip = () => engineRef.current?.switchCamera();

  const handleHangupPress = () => {
    cleanupCall();
  };

  const handleSendGift = async (gift) => {
    try {
      await sendGift(otherUserId, gift.label, gift.value);
    } catch (_) {}
    dispatch(redeemGift({ id: gift.id, action: 'gift' }));
    setSentGift(gift);
    setShowGiftPanel(false);
    setTimeout(() => setSentGift(null), 3000);
  };

  const handleBuyGift = async (item) => {
    if (myCoins < item.value) {
      Alert.alert('Not Enough Coins', `You need ${item.value} coins to send ${item.emoji} ${item.label}.`);
      return;
    }
    try {
      await sendGift(otherUserId, item.label, item.value);
      dispatch(deductCoins(item.value));
      setSentGift(item);
      setShowGiftPanel(false);
      setTimeout(() => setSentGift(null), 3000);
    } catch (_) {}
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Remote full screen video */}
      {engineReady && remoteUid ? (
        <RenderView canvas={{ uid: remoteUid, renderMode: 1 }} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.connectingBg]}>
          <View style={styles.connectingAvatar}>
            {(callerUser?.avatar_url || incomingCallData?.callerAvatar) ? (
              <Image source={{ uri: callerUser?.avatar_url || incomingCallData?.callerAvatar }} style={styles.connectingAvatarImg} />
            ) : (
              <Text style={styles.connectingInitial}>
                {(callerUser?.name || incomingCallData?.callerName || '?')[0].toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.connectingText}>Connecting…</Text>
        </View>
      )}

      {/* Dark gradient overlay bottom */}
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(0,0,0,0.85)']}
        style={StyleSheet.absoluteFill}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onBack} style={styles.topBtn}>
          <View style={styles.topBtnBg}>
            <Icon name="arrow-left" size={20} color="#fff" />
          </View>
        </TouchableOpacity>

        <View style={styles.topCenter}>
          <Text style={styles.callerName}>{callerUser?.name || incomingCallData?.callerName || 'Unknown'}</Text>
          <Text style={styles.timer}>{callStatus === 'Connected' ? timeStr : callStatus}</Text>
        </View>

        <TouchableOpacity style={styles.topBtn}>
          <View style={styles.topBtnBg}>
            <Icon name="shield" size={18} color={Colors.primary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Self PiP */}
      <View style={[styles.pip, { top: insets.top + 70 }]}>
        {camOff || !engineReady ? (
          <View style={[StyleSheet.absoluteFill, styles.pipOff]}>
            <Icon name="video-off" size={18} color="rgba(255,255,255,0.6)" />
          </View>
        ) : (
          <RenderView canvas={{ uid: 0, renderMode: 2 }} style={StyleSheet.absoluteFill} />
        )}
      </View>

      {/* Gift toast */}
      {sentGift && (
        <View style={styles.giftToast}>
          <Text style={styles.giftToastText}>{sentGift.emoji} {sentGift.label} sent!</Text>
        </View>
      )}

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.ctrlRow}>
          <CtrlBtn
            icon={muted ? 'mic-off' : 'mic'}
            label={muted ? 'Unmute' : 'Mute'}
            onPress={handleMute}
            active={muted}
          />
          <CtrlBtn
            icon={camOff ? 'video-off' : 'video'}
            label={camOff ? 'Cam On' : 'Cam Off'}
            onPress={handleCamToggle}
            active={camOff}
          />
          <CtrlBtn icon="flip-camera" label="Flip" onPress={handleFlip} />
          <TouchableOpacity style={styles.ctrlItem} onPress={() => setShowGiftPanel(true)}>
            <View style={styles.giftBtn}>
              <LinearGradient
                colors={['#FF5A7A', '#FF8A5B']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={{ fontSize: 20 }}>🎁</Text>
              {gifts.length > 0 && (
                <View style={styles.giftBadge}>
                  <Text style={styles.giftBadgeText}>{gifts.length}</Text>
                </View>
              )}
            </View>
            <Text style={styles.ctrlLabel}>Gift</Text>
          </TouchableOpacity>
        </View>

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
          <Text style={styles.panelSub}>Balance: 🍍 {myCoins.toLocaleString()} coins</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
            {gifts.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Your Gifts</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.giftScroll}>
                  {gifts.map((g) => (
                    <TouchableOpacity key={g.id} style={styles.giftItem} onPress={() => handleSendGift(g)} activeOpacity={0.8}>
                      <View style={styles.giftItemCircle}>
                        <LinearGradient colors={Gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                        <Text style={{ fontSize: 26 }}>{g.emoji}</Text>
                      </View>
                      <Text style={styles.giftItemLabel}>{g.label}</Text>
                      <Text style={styles.giftItemWorth}>₹{g.value}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={styles.sectionLabel}>Gift Shop</Text>
            <View style={styles.shopGrid}>
              {GIFT_CATALOG.map((item, i) => {
                const canAfford = myCoins >= item.value;
                return (
                  <TouchableOpacity key={i} style={[styles.shopItem, !canAfford && styles.shopItemDisabled]} onPress={() => handleBuyGift(item)} activeOpacity={0.8}>
                    <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
                    <Text style={styles.shopItemLabel}>{item.label}</Text>
                    <Text style={[styles.shopItemPrice, canAfford ? styles.shopItemPriceAfford : styles.shopItemPricePoor]}>{canAfford ? 'Send' : `₹${item.value}`}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function CtrlBtn({ icon, label, onPress, active }) {
  return (
    <TouchableOpacity style={styles.ctrlItem} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.ctrlCircle, active && styles.ctrlCircleActive]}>
        <Icon name={icon} size={22} color={active ? Colors.secondary : '#fff'} />
      </View>
      <Text style={[styles.ctrlLabel, active && { color: Colors.secondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  connectingBg: { backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  connectingAvatar: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  connectingAvatarImg: { width: 100, height: 100 },
  connectingInitial: { fontSize: 40, color: '#fff', fontWeight: '700' },
  connectingText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
  },
  topBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBtnBg: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  topCenter: { flex: 1, alignItems: 'center' },
  callerName: { fontSize: 17, fontWeight: '800', color: '#fff' },
  timer: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontWeight: '600' },

  pip: {
    position: 'absolute', right: 16,
    width: 86, height: 124, borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  pipOff: { backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },

  giftToast: {
    position: 'absolute', top: '42%', alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20,
    paddingVertical: 10, borderRadius: 20,
  },
  giftToastText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 16,
  },
  ctrlRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    marginBottom: 28,
  },
  ctrlItem: { alignItems: 'center', width: 72 },
  ctrlCircle: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 7,
  },
  ctrlCircleActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  ctrlLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },

  giftBtn: {
    width: 54, height: 54, borderRadius: 27,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', marginBottom: 7,
  },
  giftBadge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: '#fff', width: 16, height: 16,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  giftBadgeText: { fontSize: 9, fontWeight: '900', color: Colors.secondary },

  hangup: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: '#FF3B30',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
    shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6, shadowRadius: 16, elevation: 10,
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
    width: 62, height: 62, borderRadius: 31,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  giftItemLabel: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  giftItemWorth: { fontSize: 11, fontWeight: '600', color: Colors.secondary },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 12, marginTop: 8 },
  shopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 4 },
  shopItem: { width: '30%', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, paddingVertical: 14, gap: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  shopItemDisabled: { opacity: 0.45 },
  shopItemLabel: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  shopItemPrice: { fontSize: 11, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  shopItemPriceAfford: { color: '#fff', backgroundColor: Colors.secondary },
  shopItemPricePoor: { color: '#94a3b8', backgroundColor: '#F1F5F9' },
});
