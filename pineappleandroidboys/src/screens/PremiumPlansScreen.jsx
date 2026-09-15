import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, Animated, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { addCoins, setProfile } from '../store/slices/userSlice';
import Icon from '../components/Icon';
import { createPaymentOrder, verifyPayment } from '../services/api';
import RazorpayCheckout from 'react-native-razorpay';

const { width } = Dimensions.get('window');

const INTRO_PLAN = {
  id: 'intro',
  packId: 'pack_9',
  name: 'Intro Trial',
  price: '₹9',
  priceNum: 9,
  mins: 15,
  emoji: '🎁',
  badge: '🎁 ONE-TIME ONLY',
  cta: 'Buy Now',
  colors: ['#FFB6D9', '#FF2E7E'],
  badgeColors: ['#FFB6D9', '#FF2E7E'],
  features: ['15 Coins (15 audio or 7.5 video mins)', 'One-time only for new users', 'Try voice & video calls'],
};

const PLANS = [
  {
    id: 'basic',
    packId: 'pack_100',
    name: 'Basic',
    price: '₹100',
    priceNum: 100,
    mins: 120,
    emoji: '📞',
    cta: 'Buy Now',
    colors: ['#FF2E7E', '#E91E63'],
    features: ['120 Coins (2 hrs Audio / 1 hr Video)', 'Instant voice & video calling', 'Standard profile'],
  },
  {
    id: 'standard',
    packId: 'pack_200',
    name: 'Standard',
    price: '₹200',
    priceNum: 200,
    mins: 240,
    emoji: '⚡',
    badge: '⭐ MOST POPULAR',
    cta: 'Upgrade Now',
    colors: ['#E91E63', '#B0005A'],
    badgeColors: ['#FF2E7E', '#E91E63'],
    features: ['240 Coins (4 hrs Audio / 2 hrs Video)', 'Verified badge', 'Priority matching', 'Voice & video calls'],
  },
  {
    id: 'premium',
    packId: 'pack_500',
    name: 'Premium',
    price: '₹500',
    priceNum: 500,
    mins: 700,
    emoji: '👑',
    badge: '🔥 BEST VALUE',
    cta: 'Unlock Premium',
    colors: ['#FFD700', '#FFA500'],
    badgeColors: ['#FFD700', '#FFA500'],
    isGold: true,
    features: ['700 Coins (11.6 hrs Audio / 5.8 hrs Video)', 'Lucky Spin Unlocked (Spin daily)', 'Premium VIP crown badge', 'Win gifts up to ₹10,000', 'Top priority matching', 'VIP support'],
  },
];

function BenefitRow({ icon, text }) {
  return (
    <View style={styles.benefitRow}>
      <Text style={styles.benefitIcon}>{icon}</Text>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

export default function PremiumPlansScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.user);
  const showIntro = !user?.intro_9_used;
  const allPlans = showIntro ? [INTRO_PLAN, ...PLANS] : PLANS;
  const [selected, setSelected] = useState(showIntro ? 'intro' : 'premium');
  const [paying, setPaying] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const crownAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(crownAnim, { toValue: 1.1, duration: 1400, useNativeDriver: true }),
        Animated.timing(crownAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!successMsg) return;
    Animated.sequence([
      Animated.timing(bannerOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(bannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setSuccessMsg(null));
  }, [successMsg]);

  const handleBuy = async (plan) => {
    if (paying) return;
    setPaying(true);
    try {
      const order = await createPaymentOrder(plan.packId);
      const options = {
        description: `${plan.name} Plan — ${plan.mins} mins`,
        currency: 'INR',
        key: order.keyId,
        amount: order.amount,
        order_id: order.orderId,
        name: 'Pineapple',
        image: order.logoUrl || '',
        prefill: { contact: '', email: '' },
        theme: { color: '#FF2E7E', backdrop_color: '#0D0014' },
      };
      const data = await RazorpayCheckout.open(options);
      const result = await verifyPayment({
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
        packageId: plan.packId,
      });
      dispatch(addCoins(result.minsAdded));
      dispatch(setProfile({ isPremium: result.isPremium, planId: result.planId, hasSpun: result.spinReset ? false : undefined }));
      setSuccessMsg(`${plan.name} activated! ${result.minsAdded} mins added.`);
    } catch (err) {
      if (err?.code !== 0) { /* cancelled */ }
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0014" />

      <LinearGradient
        colors={['#0D0014', '#1A0028', '#0A000F']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.glowBlob, { opacity: glowAnim }]} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="arrow-left" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={styles.coinsPill}>
          <Text style={{ fontSize: 13 }}>🪙</Text>
          <Text style={styles.coinsText}>{(user?.coins || 0).toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Animated.Text style={[styles.crownEmoji, { transform: [{ scale: crownAnim }] }]}>👑</Animated.Text>
        <Text style={styles.heroTitle}>Go Premium</Text>
        <Text style={styles.heroSub}>Unlock the full Pineapple experience</Text>
        <View style={styles.benefitsList}>
          <BenefitRow icon="⚡" text="Unlimited matches & instant minutes" />
          <BenefitRow icon="🎥" text="Voice & video calls with girls" />
          <BenefitRow icon="💬" text="Unlimited chat, no limits" />
          <BenefitRow icon="🎰" text="Daily Fortune Wheel spins" />
          <BenefitRow icon="👑" text="Gold badge & priority profile" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 140 }]}>

        {allPlans.map((plan) => {
          const isSelected = selected === plan.id;
          const isGold = !!plan.isGold;
          return (
            <TouchableOpacity
              key={plan.id}
              onPress={() => setSelected(plan.id)}
              activeOpacity={0.92}
              style={styles.cardOuter}>

              <LinearGradient
                colors={isSelected ? plan.colors : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.08)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[styles.cardBorder, isSelected && styles.cardBorderSelected]}>

                <View style={[styles.card, isGold && isSelected && styles.cardGold]}>

                  {/* Badge + Selected chip — inline inside the card, never clipped by scroll */}
                  {(plan.badge || isSelected) && (
                    <View style={styles.badgeRow}>
                      {plan.badge ? (
                        <LinearGradient
                          colors={plan.badgeColors || plan.colors}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={styles.bestBadge}>
                          <Text style={[styles.bestBadgeText, isGold && { color: '#1a0a00' }]}>{plan.badge}</Text>
                        </LinearGradient>
                      ) : <View />}
                      {isSelected && (
                        <View style={styles.selectedChip}>
                          <Icon name="check" size={11} color={isGold ? '#1a0a00' : '#fff'} />
                          <Text style={[styles.selectedChipText, isGold && { color: '#1a0a00' }]}>Selected</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Top row: emoji + name/mins | price */}
                  <View style={styles.cardHead}>
                    <View style={styles.cardLeft}>
                      <Text style={styles.planEmoji}>{plan.emoji}</Text>
                      <View>
                        <Text style={[styles.planName, isGold && styles.planNameGold]}>{plan.name}</Text>
                        <Text style={styles.planMins}>{plan.mins} Coins</Text>
                      </View>
                    </View>
                    <View style={styles.cardRight}>
                      <Text style={[
                        styles.planPrice,
                        isSelected && { color: isGold ? '#FFD700' : (plan.id === 'intro' ? '#fff' : '#FF6FA5') },
                      ]}>
                        {plan.price}
                      </Text>
                      <Text style={[styles.planPer, isSelected && plan.id === 'intro' && { color: 'rgba(255,255,255,0.85)' }]}>one-time</Text>
                    </View>
                  </View>

                  {/* Gold callout */}
                  {isGold && isSelected && (
                    <LinearGradient
                      colors={['rgba(255,215,0,0.15)', 'rgba(255,140,0,0.05)']}
                      style={styles.goldCallout}>
                      <Text style={{ fontSize: 22 }}>🎰</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.goldCalloutTitle}>Fortune Wheel Unlocked!</Text>
                        <Text style={styles.goldCalloutSub}>Spin daily · Win up to ₹10,000</Text>
                      </View>
                    </LinearGradient>
                  )}

                  {/* Features */}
                  <View style={styles.featureList}>
                    {plan.features.map((f, i) => (
                      <View key={i} style={styles.featureRow}>
                        <LinearGradient
                          colors={isGold ? ['#FFD700', '#FFA500'] : plan.colors}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={styles.checkCircle}>
                          <Text style={{ fontSize: 9, color: isGold ? '#1a0a00' : '#fff', fontWeight: '900' }}>✓</Text>
                        </LinearGradient>
                        <Text style={[
                          styles.featureText,
                          isGold && isSelected && styles.featureTextGold,
                        ]}>{f}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Per-card CTA */}
                  <TouchableOpacity
                    activeOpacity={0.88}
                    disabled={paying}
                    onPress={() => { setSelected(plan.id); handleBuy(plan); }}
                    style={[styles.cardCta, { shadowColor: isGold ? '#FFA500' : plan.colors[1] }]}>
                    <LinearGradient
                      colors={isGold ? ['#FFD700', '#FFA500'] : plan.colors}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.cardCtaInner}>
                      <Text style={[styles.cardCtaText, isGold && { color: '#1a0a00' }]}>
                        {paying && isSelected ? 'Opening…' : `${plan.cta} · ${plan.price}`}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Success banner */}
      {successMsg && (
        <Animated.View style={[styles.successBanner, { opacity: bannerOpacity }]}>
          <LinearGradient colors={['#FF2E7E', '#B0005A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          <Icon name="check" size={16} color="#fff" />
          <Text style={styles.successText}>{successMsg}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0014' },

  glowBlob: {
    position: 'absolute', top: -60, left: width / 2 - 150,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,46,126,0.18)',
    shadowColor: '#FF2E7E', shadowRadius: 80, shadowOpacity: 1,
  },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24, paddingBottom: 8,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  coinsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  coinsText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  hero: { alignItems: 'center', paddingTop: 4, paddingBottom: 14, paddingHorizontal: 24 },
  crownEmoji: { fontSize: 38, marginBottom: 4 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: '500', textAlign: 'center' },

  benefitsList: { marginTop: 10, width: '100%', gap: 6 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  benefitText: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  scroll: { paddingHorizontal: 20, paddingTop: 12 },

  cardOuter: { marginBottom: 20 },
  cardBorder: {
    borderRadius: 22, padding: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
  cardBorderSelected: {
    shadowOpacity: 0.45, shadowRadius: 18, elevation: 12,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 21, padding: 20, minHeight: 220,
  },
  cardGold: { backgroundColor: '#1C0800' },

  badgeRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  bestBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  bestBadgeText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 0.4 },
  selectedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  selectedChipText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  cardHead: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 16,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planEmoji: { fontSize: 28 },
  planName: { fontSize: 18, fontWeight: '900', color: '#fff', lineHeight: 24 },
  planNameGold: { color: '#FFD700' },
  planMins: { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 2, fontWeight: '600' },
  cardRight: { alignItems: 'flex-end' },
  planPrice: { fontSize: 28, fontWeight: '900', color: 'rgba(255,255,255,0.7)', lineHeight: 34 },
  planPer: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },

  goldCallout: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
  },
  goldCalloutTitle: { fontSize: 13, fontWeight: '900', color: '#FFD700' },
  goldCalloutSub: { fontSize: 11, color: 'rgba(255,215,0,0.65)', marginTop: 2, fontWeight: '600' },

  featureList: { gap: 11 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkCircle: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featureText: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500', flex: 1, lineHeight: 19 },
  featureTextGold: { color: '#fff', fontWeight: '600' },

  cardCta: {
    marginTop: 16, borderRadius: 14,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  cardCtaInner: { height: 46, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cardCtaText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.3 },

  successBanner: {
    position: 'absolute', bottom: 40, left: 20, right: 20, zIndex: 100,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14,
    overflow: 'hidden',
    shadowColor: '#FF2E7E', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  successText: { color: '#fff', fontSize: 14, fontWeight: '800', flex: 1 },
});
