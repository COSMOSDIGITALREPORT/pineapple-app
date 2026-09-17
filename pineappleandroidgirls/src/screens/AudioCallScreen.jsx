import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  StatusBar, Animated, Alert, PermissionsAndroid, Platform,
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
} from 'react-native-agora';

export default function AudioCallScreen({ onBack, onHangup, callerUser, incomingCallData }) {
  const insets = useSafeAreaInsets();
  const myName = useSelector((s) => s.user.name);
  const myAvatar = useSelector((s) => s.user.avatar_url);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulse2Anim = useRef(new Animated.Value(1)).current;
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [callStatus, setCallStatus] = useState('Connecting…');
  const engineRef = useRef(null);
  const callRef = useRef(null);

  // other user's id — needed to emit call:ended
  const otherUserId = incomingCallData ? incomingCallData.callerId : callerUser?.id;

  const startTimer = () => {
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
          getSocket()?.emit('call:ended', { otherUserId, duration: res.duration, formattedDuration: res.formattedDuration, callType: 'audio' });
        }
      } catch {}
    }
    if (!ts) {
      const s = callRef.current?._secs || 0;
      ts = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      getSocket()?.emit('call:ended', { otherUserId, duration: s, formattedDuration: ts, callType: 'audio' });
    }
    if (typeof onHangup === 'function') onHangup(ts);
    else if (typeof onBack === 'function') onBack(ts);
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
      socket.on('call:ended', (data) => cleanupCall(data?.formattedDuration));
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
      socket?.off('call:accepted');
      socket?.off('call:ended');
    };
  }, []);

  const startAgoraCall = async () => {
    if (Platform.OS === 'android') {
      const perms = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
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

      engine.initialize({
        appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      engine.registerEventHandler({
        onJoinChannelSuccess: () => {
          try { engine.setEnableSpeakerphone(true); } catch {}
          if (incomingCallData) startTimer();
        },
        onUserJoined: () => { if (!incomingCallData) startTimer(); },
        onError: (err) => {
          console.warn('[Agora] error:', err);
        },
      });

      try { engine.enableAudio(); } catch {}
      try { engine.setEnableSpeakerphone(true); } catch {}

      const uid = incomingCallData ? 2 : 1;
      await engine.joinChannel(token, channelName, uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        autoSubscribeAudio: true,
      });

      if (incomingCallData) {
        startTimer();
      }

      setTimeout(() => {
        if (callRef.current && !callRef.current._started) {
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

  const handleMute = async () => {
    setMuted(!muted);
    engineRef.current?.muteLocalAudioStream(!muted);
  };

  const handleSpeaker = async () => {
    setSpeakerOn(!speakerOn);
    engineRef.current?.setEnableSpeakerphone(!speakerOn);
  };

  const handleHangupPress = async () => {
    cleanupCall();
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
        <TouchableOpacity onPress={handleHangupPress} style={styles.topBtn}>
          <Icon name="arrow-left" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.callerName}>{callerUser?.name || incomingCallData?.callerName || 'User'}</Text>
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
        </View>

        {/* Hangup */}
        <TouchableOpacity onPress={handleHangupPress} style={styles.hangup} activeOpacity={0.85}>
          <Icon name="phone-off" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

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

  hangup: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FF3B30',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 10,
  },

});
