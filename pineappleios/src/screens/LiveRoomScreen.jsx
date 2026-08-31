import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';

const { width, height } = Dimensions.get('window');

const PARTICIPANT_IMG = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80';
const USER_SELFIE = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80';

export default function LiveRoomScreen({ onBack }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Video Feed */}
      <View style={styles.videoContainer}>
        <Image
          source={{ uri: PARTICIPANT_IMG }}
          style={styles.mainVideo}
          resizeMode="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.6)']}
          style={StyleSheet.absoluteFill} />
      </View>

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.hostName}>Emily, 26</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Icon name="users" size={20} color="#fff" />
            <Text style={styles.viewerCount}>1.2k</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, styles.closeBtn]} onPress={onBack}>
            <Icon name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* PIP - User Camera */}
      <View style={[styles.pipContainer, { top: insets.top + 80 }]}>
        <Image source={{ uri: USER_SELFIE }} style={styles.pipImage} />
        <View style={styles.pipBorder} />
      </View>

      {/* Interaction Layer */}
      <View style={styles.interactionLayer}>
        <ScrollView style={styles.chatList} showsVerticalScrollIndicator={false}>
          <ChatItem user="Alex" message="You look amazing! 🔥" />
          <ChatItem user="Sarah" message="Love the vibe today" />
          <ChatItem user="Mike" message="Sent a heart!" isGift />
        </ScrollView>
      </View>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.actionBtn}>
          <Icon name="mic" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Icon name="video" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.inputPlaceholder}>
          <Text style={styles.placeholderText}>Say something...</Text>
        </View>
        <TouchableOpacity style={styles.giftBtn}>
          <LinearGradient
            colors={Gradients.primary}
            style={styles.giftGradient}>
            <Icon name="gift" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>);
}

function ChatItem({ user, message, isGift }) {
  return (
    <View style={styles.chatItem}>
      <Text style={styles.chatUser}>{user}: </Text>
      <Text style={[styles.chatMessage, isGift && styles.giftMessage]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000'
  },
  videoContainer: {
    ...StyleSheet.absoluteFill,
  },
  mainVideo: {
    ...StyleSheet.absoluteFill
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerInfo: {
    gap: 2,
  },
  hostName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 8,
    borderRadius: 20,
    gap: 4,
  },
  viewerCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  pipContainer: {
    position: 'absolute',
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 10,
  },
  pipImage: {
    width: '100%',
    height: '100%',
  },
  pipBorder: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 16,
  },
  interactionLayer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    height: 200,
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  chatUser: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  chatMessage: {
    color: '#fff',
  },
  giftMessage: {
    color: Colors.secondary,
    fontWeight: 'bold',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputPlaceholder: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  placeholderText: {
    color: '#fff',
    opacity: 0.8,
  },
  giftBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  giftGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }
});