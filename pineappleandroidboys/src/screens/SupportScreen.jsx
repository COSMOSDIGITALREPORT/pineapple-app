import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';

const BOT_RESPONSES = {
  default: "Hi! I'm Pineapple Bot 🍍\nHow can I help you today?\n\nYou can ask me about:\n• Calling minutes & plans\n• Sending gifts\n• Fortune Wheel\n• Account issues",
  coins: "You can earn minutes by purchasing a plan from Go Premium. The ₹500 plan gives you 700 minutes — best value! 🎯",
  gift: "To send a gift during a call, tap the 🎁 Gift button. Win gifts by spinning the Fortune Wheel first!",
  spin: "Go to the Fortune Wheel from the drawer menu. The Premium plan unlocks the spin feature! 🎰",
  call: "Tap on any girl's profile in the Connect screen and press the call button. First 5 minutes are free! 📞",
  premium: "Our Premium plan is ₹500 for 700 minutes + Fortune Wheel access. One-time purchase, no expiry! 👑",
  refund: "For refund queries, email us at support@pineapple.app and we'll respond within 24 hours. 🙏",
  account: "To edit your profile, go to Profile tab → Edit Profile. You can update your name, city, and language.",
};

const QUICK_REPLIES = ['How to earn minutes?', 'Send gifts during call', 'Fortune Wheel help', 'Refund query'];

function getBotReply(text) {
  const t = text.toLowerCase();
  if (t.includes('coin') || t.includes('minute') || t.includes('earn')) return BOT_RESPONSES.coins;
  if (t.includes('gift') || t.includes('send')) return BOT_RESPONSES.gift;
  if (t.includes('spin') || t.includes('wheel') || t.includes('fortune')) return BOT_RESPONSES.spin;
  if (t.includes('call')) return BOT_RESPONSES.call;
  if (t.includes('premium') || t.includes('plan') || t.includes('₹500')) return BOT_RESPONSES.premium;
  if (t.includes('refund') || t.includes('money')) return BOT_RESPONSES.refund;
  if (t.includes('account') || t.includes('profile') || t.includes('edit')) return BOT_RESPONSES.account;
  return "Thanks for your message! Our team will get back to you shortly. For urgent queries, email support@pineapple.app 🍍";
}

export default function SupportScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([
    { id: 1, from: 'bot', text: BOT_RESPONSES.default }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  const sendMessage = (text) => {
    const msgText = (text || input).trim();
    if (!msgText) return;
    const userMsg = { id: Date.now(), from: 'user', text: msgText };
    const botMsg = { id: Date.now() + 1, from: 'bot', text: getBotReply(msgText) };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
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

      {/* Chat area */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatScroll}
        contentContainerStyle={[styles.chatContent, { paddingBottom: 12 }]}
        showsVerticalScrollIndicator={false}>
        {messages.map((msg) => (
          <View key={msg.id} style={[styles.msgRow, msg.from === 'user' && styles.msgRowUser]}>
            {msg.from === 'bot' && (
              <View style={styles.botBubbleAvatar}>
                <Text style={{ fontSize: 16 }}>🤖</Text>
              </View>
            )}
            <View style={[styles.bubble, msg.from === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
              {msg.from === 'user' ? (
                <LinearGradient
                  colors={['#FF3870', '#C0004A']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <Text style={[styles.bubbleText, msg.from === 'user' && styles.bubbleTextUser]}>
                {msg.text}
              </Text>
            </View>
          </View>
        ))}

        {/* Quick reply chips */}
        <View style={styles.quickRow}>
          {QUICK_REPLIES.map((q) => (
            <TouchableOpacity key={q} style={styles.chip} onPress={() => sendMessage(q)} activeOpacity={0.75}>
              <Text style={styles.chipText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 12 }]}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask anything…"
          placeholderTextColor="#94a3b8"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
          multiline={false}
        />
        <TouchableOpacity onPress={() => sendMessage()} style={styles.sendBtn} activeOpacity={0.85}>
          <View style={styles.sendBtnInner}>
            <LinearGradient
              colors={['#FF3870', '#C0004A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Icon name="send" size={18} color="#fff" />
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
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,90,122,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 18,
    overflow: 'hidden',
  },
  bubbleBot: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
    backgroundColor: 'transparent',
  },
  bubbleText: { fontSize: 14, color: '#1e293b', lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
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
