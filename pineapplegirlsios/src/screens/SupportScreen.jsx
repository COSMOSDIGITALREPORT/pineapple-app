import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { Colors } from '../theme/colors';
import { getSupportMessages, sendSupportMessage } from '../services/api';
import { getSocket } from '../services/socket';

const BOT_RESPONSES = {
  default: "Hi! I'm Pineapple Bot 🍍\nHow can I help you today?\n\nYou can ask me about:\n• Calling minutes & plans\n• Sending gifts\n• Fortune Wheel\n• Account issues",
  coins: "To get calling minutes, purchase coin packages from the Wallet / Coin store. Packages start from just ₹9! You can also win bonus coins and gifts on the Fortune Wheel! 🎯",
  gift: "To send a gift during a call, tap the 🎁 Gift icon at the bottom of the call screen. Choose from Roses, Diamonds, Crowns, Cars, or Castles to send them instantly! ✨",
  spin: "Go to the Fortune Wheel from the side menu (Lucky Spin). Spin to win exciting gifts, coin bonuses, and special rewards! 🎡",
  refund: "For payment and refund inquiries, our support team will review your account details. If you experienced a failed transaction, it is usually refunded within 24-48 hours. You can also chat with admin here! 💬",
  autoAck: "Thanks for your message! 🍍 Your question has been forwarded to our support team. An admin will review and reply directly to you right here.",
};

const QUICK_REPLIES = [
  'How to earn minutes?',
  'Send gifts during call',
  'Fortune Wheel help',
  'Refund query',
];

function getLocalBotReply(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('coin') || t.includes('minute') || t.includes('earn') || t.includes('how to earn minutes')) return BOT_RESPONSES.coins;
  if (t.includes('gift') || t.includes('send') || t.includes('send gifts during call')) return BOT_RESPONSES.gift;
  if (t.includes('spin') || t.includes('wheel') || t.includes('fortune') || t.includes('fortune wheel help')) return BOT_RESPONSES.spin;
  if (t.includes('refund') || t.includes('money') || t.includes('refund query')) return BOT_RESPONSES.refund;
  return BOT_RESPONSES.autoAck;
}

export default function SupportScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([
    { id: 'welcome', sender_type: 'bot', message: BOT_RESPONSES.default, created_at: new Date().toISOString() }
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);

  const fetchHistory = async () => {
    try {
      const history = await getSupportMessages();
      if (history && history.length > 0) {
        setMessages([
          { id: 'welcome', sender_type: 'bot', message: BOT_RESPONSES.default, created_at: history[0]?.created_at || new Date().toISOString() },
          ...history,
        ]);
      }
    } catch (e) {
      console.log('Error loading support messages:', e.message);
    }
  };

  useEffect(() => {
    fetchHistory();

    const socket = getSocket();
    const handleReply = (newMsg) => {
      if (!newMsg) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    };

    socket?.on('support:reply', handleReply);
    socket?.on('support:message', handleReply);

    const interval = setInterval(fetchHistory, 5000);

    return () => {
      socket?.off('support:reply', handleReply);
      socket?.off('support:message', handleReply);
      clearInterval(interval);
    };
  }, []);

  const sendMessage = async (presetText) => {
    const msgText = (presetText || input).trim();
    if (!msgText || isSending) return;

    const isQuickFaq = QUICK_REPLIES.includes(msgText);
    const tempUserId = 'temp_' + Date.now();
    const tempBotId = 'temp_bot_' + Date.now();

    const optimisticUserMsg = {
      id: tempUserId,
      sender_type: 'user',
      message: msgText,
      status: isQuickFaq ? 'replied' : 'pending',
      created_at: new Date().toISOString(),
    };

    const optimisticBotMsg = {
      id: tempBotId,
      sender_type: 'bot',
      message: getLocalBotReply(msgText),
      status: isQuickFaq ? 'replied' : 'pending',
      created_at: new Date(Date.now() + 500).toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg, optimisticBotMsg]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      setIsSending(true);
      const res = await sendSupportMessage(msgText, isQuickFaq);
      if (res?.userMessage && res?.botMessage) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === tempUserId) return res.userMessage;
            if (m.id === tempBotId) return res.botMessage;
            return m;
          })
        );
      }
    } catch (e) {
      console.log('Error sending support message:', e.message);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F8" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="arrow-left" size={22} color={Colors.dark} />
        </TouchableOpacity>

        <View style={styles.botInfo}>
          <View style={styles.botAvatarWrap}>
            <View style={styles.botAvatar}>
              <LinearGradient
                colors={['#FF3870', '#C0004A']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={{ fontSize: 26 }}>🤖</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.botName}>Pineapple Bot</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>AI chatbot · Online</Text>
            </View>
          </View>
        </View>

        <View style={{ width: 40 }} />
      </View>
      <View style={styles.headerDivider} />

      {/* Chat scroll area */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatScroll}
        contentContainerStyle={[styles.chatContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}>
        {messages.map((msg) => {
          const isUser = msg.sender_type === 'user' || msg.from === 'user';
          const isAdmin = msg.sender_type === 'admin';
          const isBot = !isUser && !isAdmin;

          return (
            <View key={msg.id} style={[styles.msgRow, isUser && styles.msgRowUser]}>
              {!isUser && (
                <View style={[styles.botBubbleAvatar, isAdmin && styles.adminBubbleAvatar]}>
                  <Text style={{ fontSize: 16 }}>{isAdmin ? '🍍' : '🤖'}</Text>
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  isUser && styles.bubbleUser,
                  isBot && styles.bubbleBot,
                  isAdmin && styles.bubbleAdmin,
                ]}>
                {isUser && (
                  <LinearGradient
                    colors={['#FF3870', '#C0004A']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                {isAdmin && (
                  <LinearGradient
                    colors={['#3A0068', '#7B0050']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}

                {isAdmin && (
                  <View style={styles.adminHeaderRow}>
                    <Text style={styles.adminHeaderTag}>👑 Pineapple Support [Admin]</Text>
                  </View>
                )}

                <Text
                  style={[
                    styles.bubbleText,
                    (isUser || isAdmin) && styles.bubbleTextWhite,
                  ]}>
                  {msg.message || msg.text}
                </Text>

                <View style={styles.msgTimeRow}>
                  <Text style={[styles.msgTimeText, (isUser || isAdmin) && styles.msgTimeTextWhite]}>
                    {formatTime(msg.created_at)}
                  </Text>
                  {isUser && msg.status === 'pending' && (
                    <Text style={styles.pendingBadge}>⏳ Sent to Admin</Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {/* Quick reply chips */}
        <View style={styles.quickSection}>
          <Text style={styles.quickTitle}>Quick Questions:</Text>
          <View style={styles.quickRow}>
            {QUICK_REPLIES.map((q) => (
              <TouchableOpacity key={q} style={styles.chip} onPress={() => sendMessage(q)} activeOpacity={0.75}>
                <Text style={styles.chipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 12 }]}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask anything..."
          placeholderTextColor="#94a3b8"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
          multiline={false}
        />
        <TouchableOpacity
          onPress={() => sendMessage()}
          style={styles.sendBtn}
          activeOpacity={0.85}
          disabled={isSending}>
          <View style={styles.sendBtnInner}>
            <LinearGradient
              colors={['#FF3870', '#C0004A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="send" size={18} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF5F8' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
    backgroundColor: '#FFF5F8',
  },
  headerDivider: { height: 1, backgroundColor: '#F0D8E2' },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  botInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center' },
  botAvatarWrap: { position: 'relative' },
  botAvatar: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#FF3870', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  onlineDot: {
    position: 'absolute', bottom: 0, right: -2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2, borderColor: '#FFF5F8',
  },
  botName: { fontSize: 16, fontWeight: '800', color: Colors.dark },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  statusText: { fontSize: 11, color: '#8B5A70', fontWeight: '600' },

  chatScroll: { flex: 1 },
  chatContent: { paddingHorizontal: 16, paddingTop: 20, gap: 14 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser: { flexDirection: 'row-reverse' },

  botBubbleAvatar: {
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: 'rgba(255,90,122,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FFE0EA',
  },
  adminBubbleAvatar: {
    backgroundColor: '#EDE9FE',
    borderColor: '#DDD6FE',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 18,
    overflow: 'hidden',
  },
  bubbleBot: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: '#FFE8EF',
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
    backgroundColor: 'transparent',
    shadowColor: '#FF3870', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 2,
  },
  bubbleAdmin: {
    borderBottomLeftRadius: 4,
    backgroundColor: 'transparent',
    shadowColor: '#3A0068', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  adminHeaderRow: {
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    paddingBottom: 3,
  },
  adminHeaderTag: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFE4EC',
    letterSpacing: 0.2,
  },
  bubbleText: { fontSize: 14, color: '#1e293b', lineHeight: 21 },
  bubbleTextWhite: { color: '#fff' },

  msgTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 4,
  },
  msgTimeText: { fontSize: 10, color: '#94a3b8' },
  msgTimeTextWhite: { color: 'rgba(255,255,255,0.75)' },
  pendingBadge: { fontSize: 9.5, color: '#FFE4EC', fontWeight: '700' },

  quickSection: { marginTop: 6, gap: 8 },
  quickTitle: { fontSize: 11, fontWeight: '700', color: '#8B5A70', textTransform: 'uppercase', letterSpacing: 0.5 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,90,122,0.3)',
    shadowColor: '#FF3870', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  chipText: { fontSize: 12, color: '#FF3870', fontWeight: '700' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#FFE4EC',
    gap: 10,
  },
  textInput: {
    flex: 1, height: 48,
    backgroundColor: '#FFF5F8',
    borderRadius: 24,
    paddingHorizontal: 18,
    fontSize: 15, color: '#1e293b',
    borderWidth: 1, borderColor: 'rgba(255,90,122,0.2)',
  },
  sendBtn: { width: 48, height: 48 },
  sendBtnInner: {
    flex: 1, borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
});
