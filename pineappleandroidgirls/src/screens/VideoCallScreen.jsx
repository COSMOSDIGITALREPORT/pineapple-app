import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  StatusBar, Animated, PermissionsAndroid, Platform, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Icon from '../components/Icon';
import { Colors } from '../theme/colors';
import { initiateCall, endCall, getReceiverToken } from '../services/api';
import { getSocket } from '../services/socket';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  RtcTextureView,
} from 'react-native-agora';

const RenderView = Platform.OS === 'android' ? RtcTextureView : RtcSurfaceView;

export default function VideoCallScreen({ onBack, onHangup, callerUser, incomingCallData }) {
  const insets = useSafeAreaInsets();
  const myName = useSelector((s) => s.user.name);
  const myAvatar = useSelector((s) => s.user.avatar_url);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [callStatus, setCallStatus] = useState('Connecting…');
  const [remoteUid, setRemoteUid] = useState(null);
  const [remoteVideoOn, setRemoteVideoOn] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const engineRef = useRef(null);
  const callRef = useRef(null);
  const cleanupRef = useRef(false);

  const otherUserId = incomingCallData ? incomingCallData.callerId : callerUser?.id;

  const startTimer = () => {
    if (callRef.current?._started) return;
    if (!callRef.current) callRef.current = {};
    callRef.current._started = true;
    setCallStatus('Connected');
    const t = setInterval(() => {
      setSeconds((s) => {
        callRef.current._secs = (callRef.current._secs || 0) + 1;
        return s + 1;
      });
    }, 1000);
    callRef.current._timer = t;
  };

  const cleanupCall = async () => {
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
    if (callRef.current?.id) {
      try { await endCall(callRef.current.id, callRef.current._secs || 0); } catch {}
    }
    const s = callRef.current?._secs || 0;
    const ts = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
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
        socket.on('call:accepted', handlers.accepted);
      }
      handlers.ended = () => cleanupCall();
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
      if (socket) {
        socket.off('call:accepted', handlers.accepted);
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

    try {
      let token, channelName, appId;

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

      setTimeout(() => {
        if (!cleanupRef.current && callRef.current && !callRef.current._started) {
          Alert.alert('No Answer', 'Could not connect the call. Please try again.');
          cleanupCall();
        }
      }, 60000);

    } catch (e) {
      console.warn('Agora error:', e.message);
      if (!callRef.current) callRef.current = { _secs: 0 };
      if (incomingCallData) startTimer();
      else (onHangup || onBack)('00:00');
    }
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
    getSocket()?.emit('call:ended', { otherUserId });
    cleanupCall();
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
                {(callerUser?.name || incomingCallData?.callerName || 'U')[0].toUpperCase()}
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
          <Text style={styles.callerName}>{callerUser?.name || 'User'}</Text>
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

        </View>

        <TouchableOpacity onPress={handleHangupPress} style={styles.hangup} activeOpacity={0.85}>
          <Icon name="phone-off" size={28} color="#fff" />
        </TouchableOpacity>
      </View>


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

  hangup: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: '#FF3B30',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
    shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6, shadowRadius: 16, elevation: 10,
  },

});
