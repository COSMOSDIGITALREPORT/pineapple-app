import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { reportUser, blockUser, getBlockedUsers, getUserReviews, getLiveUsers, getTopGirls } from '../services/api';
import { getSocket } from '../services/socket';
import Icon from '../components/Icon';

const { width } = Dimensions.get('window');

/* Floating bobbing background heart */
function FloatingHeartBg({ left, top, size, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: -18, duration: 3500, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0,   duration: 3500, useNativeDriver: true }),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.Text style={[stHeart.base, { fontSize: size, left, top, transform: [{ translateY: anim }] }]}>♥</Animated.Text>
  );
}
const stHeart = { base: { position: 'absolute', color: 'rgba(255,255,255,0.18)' } };

const FILTERS = [
  { key: 'All',       label: 'All',     icon: '✨' },
  { key: '🔴 Live',   label: 'Live',    icon: '' },
  { key: 'Hindi',     label: 'Hindi',   icon: '🇮🇳' },
  { key: 'English',   label: 'English', icon: '🌐' },
  { key: 'New',       label: 'New',     icon: '🆕' },
];

function parseContentPrefs(raw) {
  if (!raw) return { noInappropriate: true, topics: [] };
  if (typeof raw === 'object') {
    return {
      noInappropriate: raw.noInappropriate !== false,
      topics: Array.isArray(raw.topics) ? raw.topics : [],
    };
  }
  try {
    const p = JSON.parse(raw);
    return {
      noInappropriate: p.noInappropriate !== false,
      topics: Array.isArray(p.topics) ? p.topics : [],
    };
  } catch {
    return { noInappropriate: true, topics: [] };
  }
}

const DUMMY_REVIEWS = [
  { stars: 5, reviewer_name: 'Rahul', review_text: 'Very sweet and friendly! Loved talking to her ❤️' },
  { stars: 5, reviewer_name: 'Aman', review_text: 'Great conversation, felt very comfortable.' },
  { stars: 4, reviewer_name: 'Vikas', review_text: 'Nice voice and polite. Recommended!' },
];

const BUBBLE_SIZE = 58;
const DRIFT_DUR  = 18000;
const END_X      = -100;
const START_X    = width + 80;
const TOTAL      = START_X - END_X;

/*
  Organic right-to-left floating layout:
  - Staggered vertical heights (upar-niche) across the whole stage
  - Consistent uniform bubble size across all profiles
  - Staggered horizontal phases to ensure zero overlapping
  - Gentle sinusoidal upar-niche floating bobbing
*/
const ORGANIC_BUBBLES = [
  { topRatio: 0.04, phase: 0.00, bobRange: 8, bobDur: 3200, delay: 0 },
  { topRatio: 0.48, phase: 0.17, bobRange: 6, bobDur: 2800, delay: 300 },
  { topRatio: 0.22, phase: 0.34, bobRange: 7, bobDur: 3500, delay: 600 },
  { topRatio: 0.70, phase: 0.51, bobRange: 8, bobDur: 3000, delay: 200 },
  { topRatio: 0.35, phase: 0.68, bobRange: 6, bobDur: 3400, delay: 500 },
  { topRatio: 0.58, phase: 0.85, bobRange: 7, bobDur: 3100, delay: 400 },
];

const POSITIONS = ORGANIC_BUBBLES.map((cfg) => ({
  topRatio: cfg.topRatio,
  initialX: START_X - TOTAL * cfg.phase,
  duration: DRIFT_DUR,
  size: BUBBLE_SIZE,
  bobRange: cfg.bobRange,
  bobDur: cfg.bobDur,
  delay: cfg.delay,
}));

function FloatingBubble({
  user,
  topRatio,
  initialX,
  duration,
  stageH,
  onPress,
  size = BUBBLE_SIZE,
  bobRange = 7,
  bobDur = 3000,
  delay = 0,
}) {
  const effectiveStageH = Math.max(stageH, 360);
  const top = Math.max(4, (effectiveStageH - 96) * topRatio);
  const animX = useRef(new Animated.Value(initialX)).current;
  const bobY  = useRef(new Animated.Value(0)).current;

  const hasRating = user?.rating && parseFloat(user.rating) > 0;
  const isPremium = user?.is_premium;

  useEffect(() => {
    let isMounted = true;
    const loopX = () => {
      if (!isMounted) return;
      animX.setValue(START_X);
      Animated.timing(animX, {
        toValue: END_X,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && isMounted) loopX();
      });
    };

    const firstDistance = Math.max(0, initialX - END_X);
    const firstDur = Math.max(0, (duration * firstDistance) / TOTAL);

    Animated.timing(animX, {
      toValue: END_X,
      duration: firstDur,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && isMounted) loopX();
    });

    let bobLoop;
    const timer = setTimeout(() => {
      if (!isMounted) return;
      bobLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(bobY, {
            toValue: -bobRange,
            duration: bobDur / 2,
            useNativeDriver: true,
          }),
          Animated.timing(bobY, {
            toValue: bobRange,
            duration: bobDur / 2,
            useNativeDriver: true,
          }),
        ])
      );
      bobLoop.start();
    }, delay);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      bobLoop?.stop();
    };
  }, []);

  return (
    <Animated.View
      style={[
        bStyles.wrap,
        {
          top,
          left: 0,
          transform: [
            { translateX: animX },
            { translateY: bobY },
          ],
        },
      ]}>
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={bStyles.touchWrap}>
        {/* Gradient glow ring — gold for top, pink for others */}
        <LinearGradient
          colors={isPremium
            ? ['#FFD700', '#FFA500', '#FFD700']
            : ['#FF3870', '#C0004A', '#FF3870']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[bStyles.glowRing, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]}
        />

        {/* Rating badge — top left */}
        {hasRating && (
          <View style={bStyles.ratingBadge}>
            <Text style={bStyles.ratingText}>⭐{parseFloat(user.rating).toFixed(1)}</Text>
          </View>
        )}

        {/* Crown for premium */}
        {isPremium && (
          <View style={bStyles.crownBadge}>
            <Text style={{ fontSize: 12 }}>👑</Text>
          </View>
        )}

        {/* Green online dot — strictly when girl is actually online */}
        {!!(user?.is_online === 1 || user?.is_online === true) && (
          <View style={bStyles.dot} />
        )}

        {/* Avatar circle */}
        <View style={[bStyles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={bStyles.img} />
          ) : (
            <LinearGradient
              colors={['#FF3870', '#C0004A']}
              style={[bStyles.initial, { width: size, height: size, borderRadius: size / 2 }]}>
              <Text style={[bStyles.initialText, { fontSize: size * 0.38 }]}>
                {(user?.name || '?')[0].toUpperCase()}
              </Text>
            </LinearGradient>
          )}
        </View>

        {/* Language chip */}
        <View style={bStyles.langBadge}>
          <Text style={bStyles.langText}>{user?.language || 'HI'}</Text>
        </View>

        {/* Name — location removed to prevent clutter/overlap */}
        <Text style={bStyles.name} numberOfLines={1}>{(user?.name || '').split(' ')[0]}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function StarRating({ rating = 0, count = 0 }) {
  rating = parseFloat(rating) || 0;
  const stars = Math.round(rating);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Icon key={s} name="star" size={13} color={s <= stars ? '#FFC72C' : '#CBD5E1'} filled={s <= stars} />
      ))}
      {count > 0 && (
        <Text style={{ fontSize: 11, color: '#94A3B8', marginLeft: 2, fontWeight: '600' }}>
          {rating.toFixed(1)} ({count})
        </Text>
      )}
    </View>
  );
}

export default function ConnectScreen({ onVideoCall, onAudioCall, onDrawer, onBuyCoins, onRandomCall }) {
  const insets = useSafeAreaInsets();
  const { coins } = useSelector((s) => s.user);
  const [activeFilter, setActiveFilter] = useState('All');
  const [users, setUsers] = useState([]);
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [callPickerUser, setCallPickerUser] = useState(null);
  const [userReviews, setUserReviews] = useState([]);
  const [, setLoadingReviews] = useState(false);
  const [stageH, setStageH] = useState(400);
  const [showCoinsModal, setShowCoinsModal] = useState(false);
  const [topGirls, setTopGirls] = useState([]);
  const coinSpinAnim = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(coinSpinAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(coinSpinAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (callPickerUser?.id) {
      setLoadingReviews(true);
      getUserReviews(callPickerUser.id)
        .then(setUserReviews)
        .catch(() => setUserReviews([]))
        .finally(() => setLoadingReviews(false));
    } else {
      setUserReviews([]);
    }
  }, [callPickerUser?.id]);

  const checkCoinsAndCall = (user) => {
    if (user?.id && blockedIds.has(user.id)) {
      Alert.alert('User Blocked', 'You have blocked this user. Unblock them from Settings > Block List to make calls.');
      return;
    }
    if (coins < 1) {
      setShowCoinsModal(true);
      return;
    }
    setCallPickerUser(user);
  };

  const fetchUsers = async () => {
    try {
      let bIds = blockedIds;
      try {
        const blist = await getBlockedUsers();
        if (Array.isArray(blist)) {
          bIds = new Set(blist.map((b) => b.id));
          setBlockedIds(bIds);
        }
      } catch (_) {}

      const data = await getLiveUsers();
      // deduplicate by id and filter out blocked users
      const seen = new Set();
      const unique = (data || []).filter((u) => {
        if (!u.id || seen.has(u.id) || bIds.has(u.id)) return false;
        seen.add(u.id);
        return true;
      });
      setUsers(unique);
    } catch {
      setUsers([]);
    }
  };

  const fetchTopGirls = async () => {
    try {
      const data = await getTopGirls();
      const seen = new Set();
      const filtered = (data || []).filter((g) => {
        if (!g.id || seen.has(g.id) || blockedIds.has(g.id)) return false;
        seen.add(g.id);
        return true;
      }).slice(0, 8);
      setTopGirls(filtered);
    } catch (_) {}
  };

  useEffect(() => {
    fetchUsers();
    fetchTopGirls();
    const interval = setInterval(fetchUsers, 10000);

    const socket = getSocket();
    const handleStatusChanged = ({ userId, is_online }) => {
      const onlineVal = (is_online === 1 || is_online === true) ? 1 : 0;
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_online: onlineVal } : u))
      );
      setTopGirls((prev) =>
        prev.map((g) => (g.id === userId ? { ...g, is_online: onlineVal } : g))
      );
    };

    socket?.on('user:status_changed', handleStatusChanged);

    return () => {
      clearInterval(interval);
      socket?.off('user:status_changed', handleStatusChanged);
    };
  }, []);

  const visibleUsers = users.filter((u) => {
    if (activeFilter === '🔴 Live') return u.is_online === 1 || u.is_online === true;
    if (activeFilter === 'Hindi')   return (u.language || '').toLowerCase().includes('hindi') || u.language === 'HI';
    if (activeFilter === 'English') return (u.language || '').toLowerCase().includes('english') || u.language === 'EN';
    if (activeFilter === 'New')     return !u.is_online;
    return true;
  });

  return (
    <View style={styles.root}>
      {/* ── Hero Header ── */}
      <LinearGradient
        colors={['#180024', '#3E002C', '#6E0035']}
        start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
        style={styles.headerSection}>

        {/* Top row: menu + brand + coins */}
        <View style={[styles.headerTopRow, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onDrawer} style={styles.menuBtn} activeOpacity={0.75}>
            <View style={styles.glassIconBtn}>
              <Icon name="menu" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerBrand}>Pineapple</Text>
            <Text style={styles.headerSub}>Meet New People 💕</Text>
          </View>
          <TouchableOpacity onPress={onBuyCoins} activeOpacity={0.8} style={styles.coinBadge}>
            <Icon name="star" size={13} color="#FFD700" filled />
            <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterBarContent}>
          {FILTERS.map((f) => {
            const isAct = activeFilter === f.key;
            const isLive = f.key === '🔴 Live';
            return (
              <TouchableOpacity
                key={f.key}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(f.key)}
                style={[styles.filterTab, isAct && styles.filterTabActive]}>
                {isLive ? (
                  <View style={styles.liveDotChip} />
                ) : (
                  <Text style={styles.filterIcon}>{f.icon}</Text>
                )}
                <Text style={[styles.filterText, isAct && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Top Rated Girls Glass Strip ── */}
        {topGirls.length > 0 && (
          <View style={styles.topRatedSection}>
            <View style={styles.topRatedGlassCard}>
              <View style={styles.topRatedHeader}>
                <View style={styles.topRatedBadge}>
                  <Text style={styles.topRatedLabel}>⭐ TOP RATED</Text>
                </View>
                <View style={styles.topRatedDivider} />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.topRatedList}>
                {topGirls.map((girl, i) => (
                  <TouchableOpacity
                    key={girl.id}
                    style={styles.topRatedItem}
                    activeOpacity={0.8}
                    onPress={() => checkCoinsAndCall(girl)}>
                    <View style={styles.topRatedAvatarWrap}>
                      {i < 3 && (
                        <View style={styles.topRatedCrown}>
                          <Text style={styles.topRatedCrownText}>{['🥇','🥈','🥉'][i]}</Text>
                        </View>
                      )}
                      {girl.avatar_url ? (
                        <Image source={{ uri: girl.avatar_url }} style={styles.topRatedAvatar} />
                      ) : (
                        <LinearGradient colors={['#FF3870','#C0004A']} style={styles.topRatedAvatar}>
                          <Text style={styles.topRatedInitial}>{(girl.name||'?')[0].toUpperCase()}</Text>
                        </LinearGradient>
                      )}
                      {!!girl.is_online && <View style={styles.topRatedOnline} />}
                    </View>
                    <Text style={styles.topRatedName} numberOfLines={1}>{(girl.name||'').split(' ')[0]}</Text>
                    {girl.rating > 0 && (
                      <View style={styles.ratingPill}>
                        <Text style={styles.topRatedRating}>⭐ {parseFloat(girl.rating).toFixed(1)}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* ── Stage ── */}
      <View
        style={styles.stage}
        onLayout={(e) => setStageH(e.nativeEvent.layout.height)}>
        {/* Deep romantic luxury gradient */}
        <LinearGradient
          colors={['#10001D', '#2B0028', '#540030', '#7E0038']}
          start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Ambient background glow orbs */}
        <View style={styles.ambientOrb1} />
        <View style={styles.ambientOrb2} />

        {/* Floating background hearts */}
        <FloatingHeartBg left={-30}       top={-10}  size={190} delay={0}    />
        <FloatingHeartBg left={width-110} top={20}   size={150} delay={600}  />
        <FloatingHeartBg left={20}        top={170}  size={110} delay={1200} />
        <FloatingHeartBg left={width-85}  top={250}  size={95}  delay={400}  />
        <FloatingHeartBg left={width/2-55} top={75}  size={85}  delay={800}  />
        <FloatingHeartBg left={-20}       top={310}  size={130} delay={1600} />

        {visibleUsers.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💫</Text>
            <Text style={styles.emptyText}>Girls are getting ready...</Text>
            <Text style={styles.emptySub}>Check back in a moment or try Random Match!</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              activeOpacity={0.85}
              onPress={() => { if (onRandomCall) onRandomCall(); }}>
              <LinearGradient
                colors={['#FF2A6D', '#C0004A']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.emptyBtnInner}>
                <Text style={styles.emptyBtnText}>⚡ Try Random Match</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          visibleUsers.slice(0, POSITIONS.length).map((u, i) => {
            const pos = POSITIONS[i];
            return (
              <FloatingBubble
                key={u?.id || `u-${i}`}
                user={u}
                stageH={stageH}
                onPress={() => checkCoinsAndCall(u)}
                topRatio={pos.topRatio}
                initialX={pos.initialX}
                duration={pos.duration}
                size={pos.size}
                bobRange={pos.bobRange}
                bobDur={pos.bobDur}
                delay={pos.delay}
              />
            );
          })
        )}
      </View>

      {/* ── Bottom bar ── */}
      <View style={styles.bottomBar}>
        <Animated.View style={[styles.randomBtnWrap, { transform: [{ scale: glowAnim }] }]}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => { if (onRandomCall) onRandomCall(); else checkCoinsAndCall({ name: 'Random' }); }}
            style={{ flex: 1 }}>
            <LinearGradient
              colors={['#FF2A6D', '#FF0055', '#C0004A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.randomBtnInner}>
              <View style={styles.btnGlossHighlight} />
              <Text style={styles.randomLightning}>⚡</Text>
              <Text style={styles.randomLabel}>Start Matching</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ── Profile + Call type picker ── */}
      <Modal visible={!!callPickerUser} transparent animationType="fade" onRequestClose={() => setCallPickerUser(null)}>
        <TouchableOpacity style={pStyles.overlay} activeOpacity={1} onPress={() => setCallPickerUser(null)} />
        <View style={pStyles.container} pointerEvents="box-none">
          <View style={pStyles.card}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={pStyles.cardScroll}>
              {callPickerUser?.name === 'Random' ? (
                <>
                  <Text style={pStyles.title}>Random Match</Text>
                  <Text style={pStyles.sub}>Choose how you want to connect</Text>
                </>
              ) : (
                <>
                  {/* Profile preview */}
                  <View style={pStyles.profilePreview}>
                    <View style={pStyles.previewAvatarWrap}>
                      {callPickerUser?.avatar_url ? (
                        <Image source={{ uri: callPickerUser.avatar_url }} style={pStyles.previewAvatar} />
                      ) : (
                        <View style={[pStyles.previewAvatar, pStyles.previewAvatarPlaceholder]}>
                          <Icon name="user" size={30} color="rgba(255,255,255,0.5)" />
                        </View>
                      )}
                    </View>
                    <View style={pStyles.previewInfo}>
                      <Text style={pStyles.previewName} numberOfLines={1}>
                        {callPickerUser?.name}{callPickerUser?.age ? `, ${callPickerUser.age}` : ''}
                      </Text>
                      {!!callPickerUser?.city && (
                        <Text style={pStyles.previewSub} numberOfLines={1}>📍 {callPickerUser.city}</Text>
                      )}
                      <StarRating rating={callPickerUser?.rating || 0} count={callPickerUser?.rating_count || 0} />
                      <View style={pStyles.previewBadges}>
                        <View style={pStyles.langBadgePreview}>
                          <Text style={pStyles.langBadgePreviewText}>{callPickerUser?.language || 'HI'}</Text>
                        </View>
                        {!!callPickerUser?.is_online && (
                          <View style={pStyles.onlineBadge}>
                            <View style={pStyles.onlineDot} />
                            <Text style={pStyles.onlineBadgeText}>Online</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <Text style={pStyles.sub}>Connect with {callPickerUser?.name}</Text>
                  {!!callPickerUser?.bio && (
                    <Text style={pStyles.previewBio} numberOfLines={2}>"{callPickerUser.bio.trim()}"</Text>
                  )}

                  {/* Conversation preferences — topics she's comfortable with + boundary */}
                  {(() => {
                    const prefs = parseContentPrefs(callPickerUser?.content_prefs);
                    if (!prefs.topics?.length && prefs.noInappropriate === false) return null;
                    return (
                      <View style={pStyles.prefsSection}>
                        {!!prefs.topics?.length && (
                          <View style={pStyles.prefsTopicsWrap}>
                            {prefs.topics.map(t => (
                              <View key={t} style={pStyles.prefsTopicTag}>
                                <Text style={pStyles.prefsTopicTagText}>{t}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {prefs.noInappropriate !== false && (
                          <View style={pStyles.prefsBoundary}>
                            <Text style={pStyles.prefsBoundaryText}>🚫 No inappropriate conversations</Text>
                          </View>
                        )}
                      </View>
                    );
                  })()}

                  {/* Reviews section — compact, only shows last 2 reviews + (+N more reviews) */}
                  {(() => {
                    const validReviews = (userReviews || [])
                      .map(r => ({ ...r, review_text: (r.review_text || '').replace(/\s+/g, ' ').trim() }))
                      .filter(r => r.review_text.length > 0);
                    
                    const showingDummy = validReviews.length === 0;
                    const list = showingDummy ? DUMMY_REVIEWS.slice(0, 2) : validReviews.slice(0, 2);
                    const totalCount = showingDummy ? 0 : userReviews.length;
                    const remainingReviews = Math.max(0, totalCount - 2);

                    return (
                      <View style={pStyles.reviewsSection}>
                        <View style={pStyles.reviewsHeaderRow}>
                          <Text style={pStyles.reviewsTitle}>★ What people say</Text>
                          {remainingReviews > 0 && (
                            <Text style={pStyles.reviewsCountBadge}>+{remainingReviews} more</Text>
                          )}
                        </View>
                        {list.map((rv, i) => (
                          <View key={i} style={pStyles.reviewItem}>
                            <View style={pStyles.reviewHeader}>
                              <Text style={pStyles.reviewStars}>{'★'.repeat(Math.min(5, Math.max(1, rv.stars || 5)))}{'☆'.repeat(Math.max(0, 5 - (rv.stars || 5)))}</Text>
                              <Text style={pStyles.reviewerName}>— {rv.reviewer_name || 'Him'}</Text>
                            </View>
                            <Text style={pStyles.reviewText} numberOfLines={2} ellipsizeMode="tail">"{rv.review_text}"</Text>
                          </View>
                        ))}
                        {remainingReviews > 0 && (
                          <Text style={pStyles.reviewsMore}>+{remainingReviews} more reviews</Text>
                        )}
                      </View>
                    );
                  })()}
                </>
              )}
              <View style={pStyles.btnRow}>
                <TouchableOpacity
                  style={pStyles.btn}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (callPickerUser?.id && blockedIds.has(callPickerUser.id)) {
                      Alert.alert('User Blocked', 'You cannot call a blocked user. Unblock them from Settings > Block List first.');
                      return;
                    }
                    if ((coins || 0) < 1) {
                      Alert.alert(
                        'Insufficient Coins',
                        'Audio calls cost 1 coin/min. Please recharge your wallet to continue.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Get Coins', onPress: () => { setCallPickerUser(null); setShowCoinsModal(true); } },
                        ]
                      );
                      return;
                    }
                    const u = callPickerUser;
                    setCallPickerUser(null);
                    onAudioCall(u);
                  }}>
                  <View style={pStyles.btnInner}>
                    <LinearGradient colors={['#FF3870','#C0004A']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
                    <Icon name="phone" size={26} color="#fff" />
                    <Text style={pStyles.btnLabel}>Audio Call</Text>
                    <Text style={pStyles.btnSub}>1 coin/min</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={pStyles.btn}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (callPickerUser?.id && blockedIds.has(callPickerUser.id)) {
                      Alert.alert('User Blocked', 'You cannot call a blocked user. Unblock them from Settings > Block List first.');
                      return;
                    }
                    if ((coins || 0) < 2) {
                      Alert.alert(
                        'Insufficient Coins',
                        `Video calls cost 2 coins/min. You have ${coins || 0} coin${coins === 1 ? '' : 's'}.\n\nYou need at least 2 coins to start a video call.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Get Coins', onPress: () => { setCallPickerUser(null); setShowCoinsModal(true); } },
                        ]
                      );
                      return;
                    }
                    const u = callPickerUser;
                    setCallPickerUser(null);
                    onVideoCall(u);
                  }}>
                  <View style={pStyles.btnInner}>
                    <LinearGradient colors={['#FF3870','#C0004A']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
                    <Icon name="video" size={26} color="#fff" />
                    <Text style={pStyles.btnLabel}>Video Call</Text>
                    <Text style={pStyles.btnSub}>2 coins/min</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Report / Block */}
              {callPickerUser?.name !== 'Random' && callPickerUser?.id && (
                <View style={pStyles.safetyRow}>
                  <TouchableOpacity style={pStyles.safetyBtn} onPress={() => {
                    const u = callPickerUser;
                    Alert.alert('Report User', 'Why are you reporting this user?', [
                      { text: 'Inappropriate behaviour', onPress: () => { reportUser(u.id, 'inappropriate'); setCallPickerUser(null); Alert.alert('Reported', 'Thank you. We will review this.'); }},
                      { text: 'Fake profile', onPress: () => { reportUser(u.id, 'fake'); setCallPickerUser(null); Alert.alert('Reported', 'Thank you. We will review this.'); }},
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  }}>
                    <Text style={pStyles.reportText}>⚑ Report</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={pStyles.safetyBtn} onPress={() => {
                    const u = callPickerUser;
                    Alert.alert('Block User', `Block ${u.name}? They won't be able to contact you.`, [
                      {
                        text: 'Block',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await blockUser(u.id);
                            setBlockedIds((prev) => new Set([...prev, u.id]));
                            setUsers((prev) => prev.filter((item) => item.id !== u.id));
                            setTopGirls((prev) => prev.filter((item) => item.id !== u.id));
                            setCallPickerUser(null);
                            Alert.alert('Blocked', `${u.name} has been blocked.`);
                          } catch (_) {
                            setCallPickerUser(null);
                            Alert.alert('Blocked', `${u.name} has been blocked.`);
                          }
                        },
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  }}>
                    <Text style={pStyles.blockText}>🚫 Block</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Not Enough Coins Modal ── */}
      <Modal visible={showCoinsModal} transparent animationType="fade">
        <TouchableOpacity style={pStyles.overlay} activeOpacity={1} onPress={() => setShowCoinsModal(false)} />
        <View style={pStyles.container}>
          <View style={pStyles.coinsCard}>
            <LinearGradient
              colors={['#3A0068', '#7B0050', '#C0003A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
            />
            <Animated.Text style={[pStyles.coinEmoji, {
              transform: [{
                scaleX: coinSpinAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.1, 1] }),
              }],
            }]}>💰</Animated.Text>
            <Text style={pStyles.coinsTitle}>Need More Coins!</Text>
            <Text style={pStyles.coinsSub}>Girls are waiting. Get coins and start connecting now!</Text>

            <View style={pStyles.coinsBenefits}>
              {['⚡ Instant calls', '💬 Voice & Video', '🎁 Send Gifts'].map((b) => (
                <View key={b} style={pStyles.benefitRow}>
                  <Text style={pStyles.benefitText}>{b}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={pStyles.buyBtn}
              activeOpacity={0.85}
              onPress={() => { setShowCoinsModal(false); onBuyCoins?.(); }}>
              <LinearGradient
                colors={['#FFD700', '#FFA500', '#FF8C00']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={pStyles.buyBtnInner}>
                <Text style={pStyles.buyBtnText}>👑 Get Coins Now</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowCoinsModal(false)} style={pStyles.laterBtn}>
              <Text style={pStyles.laterText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── Bubble styles ─── */
const bStyles = StyleSheet.create({
  wrap: { position: 'absolute' },
  touchWrap: { alignItems: 'center', width: 80 },
  dot: {
    position: 'absolute', top: 4, right: 6,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#fff', zIndex: 5,
  },
  circle: {
    overflow: 'hidden', backgroundColor: '#C0004A',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  glowRing: {
/* ─── Bubble styles ─── */
const bStyles = StyleSheet.create({
  wrap: { position: 'absolute' },
  touchWrap: { alignItems: 'center', width: 84 },
  dot: {
    position: 'absolute', top: 3, right: 8,
    width: 13, height: 13, borderRadius: 6.5,
    backgroundColor: '#22C55E', borderWidth: 2.5, borderColor: '#fff', zIndex: 5,
    shadowColor: '#22C55E', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 6, elevation: 4,
  },
  circle: {
    overflow: 'hidden', backgroundColor: '#7A0035',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  glowRing: {
    position: 'absolute', top: -4, alignSelf: 'center',
    shadowColor: '#FF2A6D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 14,
    elevation: 12,
  },
  img: { width: '100%', height: '100%' },
  initial: { alignItems: 'center', justifyContent: 'center' },
  initialText: { color: '#fff', fontWeight: '900' },
  ratingBadge: {
    position: 'absolute', top: -7, left: 2, zIndex: 6,
    backgroundColor: 'rgba(18,0,28,0.92)',
    paddingHorizontal: 6, paddingVertical: 1.5,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,215,0,0.55)',
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 3,
  },
  ratingText: { color: '#FFD700', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.2 },
  crownBadge: {
    position: 'absolute', top: -14, alignSelf: 'center', zIndex: 6,
  },
  langBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, marginTop: 4, alignSelf: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
  },
  langText: { color: '#fff', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.3 },
  name: {
    color: '#fff', fontSize: 11.5, fontWeight: '800', marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.85)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
    textAlign: 'center', maxWidth: 80, letterSpacing: 0.2,
  },
});

/* ─── Picker styles ─── */
const pStyles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  card: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: 'rgba(22, 0, 36, 0.96)',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#FF2A6D',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
    elevation: 20,
    overflow: 'hidden',
  },
  cardScroll: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  title: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: -0.3 },
  sub: { fontSize: 12.5, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 2, marginBottom: 8, fontWeight: '600' },
  previewBio: { fontSize: 11.5, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: -4, marginBottom: 8, lineHeight: 16, fontStyle: 'italic', paddingHorizontal: 6 },
  prefsSection: { alignItems: 'center', marginTop: 0, marginBottom: 8 },
  prefsTopicsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 6 },
  prefsTopicTag: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  prefsTopicTagText: { fontSize: 10.5, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  prefsBoundary: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  prefsBoundaryText: { fontSize: 10.5, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  
  profilePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  previewAvatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.6)',
    overflow: 'hidden',
  },
  previewAvatar: { width: '100%', height: '100%' },
  previewAvatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: { flex: 1, gap: 2 },
  previewName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.2,
  },
  previewSub: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  previewBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  langBadgePreview: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  langBadgePreviewText: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: '800',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(34,197,94,0.2)',
  },
  onlineDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  onlineBadgeText: {
    color: '#22C55E',
    fontSize: 10.5,
    fontWeight: '700',
  },

  reviewsSection: {
    marginTop: 4,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  reviewsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFD700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewsCountBadge: {
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
  },
  reviewItem: {
    marginBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 1,
  },
  reviewStars: {
    fontSize: 10,
    color: '#FFD700',
    fontWeight: '700',
  },
  reviewerName: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  reviewText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    lineHeight: 15,
    fontStyle: 'italic',
  },
  reviewsMore: {
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },

  btnRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  btn: {
    flex: 1, borderRadius: 18, overflow: 'hidden',
    shadowColor: '#FF2A6D', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  btnInner: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 4 },
  btnLabel: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  btnSub: { fontSize: 10.5, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  safetyRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10, paddingTop: 4 },
  safetyBtn: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  reportText: { fontSize: 11.5, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  blockText: { fontSize: 11.5, color: 'rgba(255,100,100,0.8)', fontWeight: '600' },
  coinsCard: {
    width: '100%',
    borderRadius: 32,
    padding: 28,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#FF3870',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  coinEmoji: { fontSize: 64, marginBottom: 12 },
  coinsTitle: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: -0.5 },
  coinsSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 8, marginBottom: 20, fontWeight: '600', lineHeight: 20 },
  coinsBenefits: { width: '100%', gap: 8, marginBottom: 24 },
  benefitRow: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  benefitText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  buyBtn: {
    width: '100%', borderRadius: 20, overflow: 'hidden',
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 10,
    marginBottom: 14,
  },
  buyBtnInner: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  buyBtnText: { fontSize: 18, fontWeight: '900', color: '#1A0028', letterSpacing: 0.3 },
  laterBtn: { paddingVertical: 8 },
  laterText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
});

/* ─── Main styles ─── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#10001D' },

  headerSection: { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  headerTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 4,
  },
  menuBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  glassIconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerBrand: { textAlign: 'center', fontSize: 27, fontWeight: '900', color: '#fff', letterSpacing: 0.8 },
  headerSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2, textAlign: 'center', letterSpacing: 0.4 },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,215,0,0.12)',
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1.2, borderColor: 'rgba(255,215,0,0.38)',
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  coinText: { fontSize: 13.5, fontWeight: '900', color: '#FFD700', letterSpacing: 0.3 },
  filterBar: { backgroundColor: 'transparent', maxHeight: 58 },
  filterBarContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row' },

  liveDotChip: {
    width: 9, height: 9, borderRadius: 4.5,
    backgroundColor: '#FF2D2D',
    shadowColor: '#FF2D2D', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 6, elevation: 3,
  },

  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.18)',
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    shadowColor: '#FF2E7E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  filterIcon: { fontSize: 13 },
  filterText: { fontSize: 12.5, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  filterTextActive: { color: '#FF2E7E', fontWeight: '900' },

  stage: { flex: 1, overflow: 'hidden' },

  ambientOrb1: {
    position: 'absolute', top: 20, left: -40,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,42,109,0.12)',
  },
  ambientOrb2: {
    position: 'absolute', bottom: 40, right: -40,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(157,0,224,0.12)',
  },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 52, marginBottom: 4 },
  emptyText: { fontSize: 20, fontWeight: '900', color: '#fff', textAlign: 'center' },
  emptySub: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', fontWeight: '500', lineHeight: 20 },
  emptyBtn: { marginTop: 16, borderRadius: 30, overflow: 'hidden', height: 52, width: 220 },
  emptyBtnInner: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 30 },
  emptyBtnText: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },

  bottomBar: {
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: 'rgba(16,0,29,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,56,112,0.22)',
  },
  randomBtnWrap: {
    height: 64, borderRadius: 32, overflow: 'hidden',
    shadowColor: '#FF2A6D', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.85, shadowRadius: 24, elevation: 18,
  },
  randomBtnInner: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, borderRadius: 32,
    position: 'relative', overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  btnGlossHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
  },
  randomLightning: { fontSize: 22 },
  randomLabel: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },

  /* ── Top Rated glass strip ── */
  topRatedSection: { paddingTop: 6, paddingBottom: 2 },
  topRatedGlassCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  topRatedHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 8 },
  topRatedBadge: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.28)',
  },
  topRatedLabel: { fontSize: 10.5, fontWeight: '800', color: '#FFD700', letterSpacing: 0.6 },
  topRatedDivider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginLeft: 10 },
  topRatedList: { paddingHorizontal: 14, paddingTop: 6, gap: 16 },
  topRatedItem: { alignItems: 'center', width: 62 },
  topRatedAvatarWrap: { position: 'relative', marginBottom: 5, overflow: 'visible' },
  topRatedAvatar: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderColor: 'rgba(255,215,0,0.65)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowColor: '#FF2E7E', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6, shadowRadius: 6,
  },
  topRatedInitial: { fontSize: 20, fontWeight: '900', color: '#fff' },
  topRatedOnline: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#180024',
  },
  topRatedCrown: { position: 'absolute', top: -7, left: '50%', marginLeft: -8, zIndex: 5 },
  topRatedCrownText: { fontSize: 14 },
  topRatedName: { fontSize: 11.5, fontWeight: '700', color: '#fff', textAlign: 'center', maxWidth: 60 },
  ratingPill: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 6, paddingVertical: 1.5,
    borderRadius: 7, marginTop: 2,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
  },
  topRatedRating: { fontSize: 9.5, color: '#FFD700', fontWeight: '800' },
});
