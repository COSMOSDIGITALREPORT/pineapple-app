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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { reportUser, blockUser, getUserReviews, getLiveUsers, getTopGirls, getMe } from '../services/api';
import { setProfile } from '../store/slices/userSlice';
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
  { key: '🔴 Live',  label: 'Live',    icon: '🔴' },
  { key: 'Hindi',    label: 'Hindi',   icon: '🇮🇳' },
  { key: 'English',  label: 'English', icon: '🌎' },
  { key: 'New',      label: 'New',     icon: '💫' },
];

const DUMMY_REVIEWS = [
  { stars: 5, reviewer_name: 'Anonymous', review_text: 'Sweet and fun to talk to!' },
  { stars: 4, reviewer_name: 'Anonymous', review_text: 'Great conversation, would call again.' },
];

function parseContentPrefs(raw) {
  if (!raw) return { topics: [], noInappropriate: true };
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return { topics: [], noInappropriate: true }; }
}




const BUBBLE_SIZE = 62;
const ROW_DUR  = 16000;
const END_X    = -(BUBBLE_SIZE + 20);
const START_X  = width + BUBBLE_SIZE + 20;
const TOTAL    = START_X - END_X;

/*
  9 bubbles across 3 rows, interleaved so no two bubbles from different rows
  ever share the same horizontal position. Phase for bubble (rowIdx, bubIdx):
    phase = (bubIdx * 3 + rowIdx) / 9
  → all 9 phases are 0, 1/9, 2/9, … 8/9 — perfectly distributed.
  Each row also gets a slight random vertical jitter so they don't look grid-like.
*/
const ROWS = [0.06, 0.40, 0.74];
const ROW_SPEEDS = [ROW_DUR, ROW_DUR * 1.15, ROW_DUR * 0.88]; // vary speed per row
const POSITIONS = ROWS.flatMap((topRatio, rowIdx) =>
  [0, 1, 2].map((bubIdx) => {
    const phase = (bubIdx * ROWS.length + rowIdx) / (ROWS.length * 3);
    return {
      topRatio: topRatio + (rowIdx % 2 === 0 ? 0 : 0.03), // tiny vertical stagger on odd rows
      initialX: START_X - TOTAL * phase,
      duration: ROW_SPEEDS[rowIdx],
      size: BUBBLE_SIZE,
    };
  })
);

function FloatingBubble({ user, topRatio, initialX, duration, stageH, onPress, size = BUBBLE_SIZE }) {
  const top  = stageH * topRatio;
  const anim = useRef(new Animated.Value(initialX)).current;
  const hasRating = user?.rating && parseFloat(user.rating) > 0;
  const isPremium = user?.is_premium;

  useEffect(() => {
    const loop = () => {
      anim.setValue(START_X);
      Animated.timing(anim, { toValue: END_X, duration, useNativeDriver: true })
        .start(({ finished }) => { if (finished) loop(); });
    };
    const firstDur = duration * (initialX - END_X) / TOTAL;
    Animated.timing(anim, { toValue: END_X, duration: firstDur, useNativeDriver: true })
      .start(({ finished }) => { if (finished) loop(); });
  }, []);

  return (
    <Animated.View style={[bStyles.wrap, { top, left: 0, transform: [{ translateX: anim }] }]}>
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
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

        {/* Green online dot */}
        <View style={bStyles.dot} />

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

        {/* Name */}
        <Text style={bStyles.name} numberOfLines={1}>{user?.name || '—'}</Text>
        {!!user?.city && (
          <Text style={bStyles.city} numberOfLines={1}>📍 {user.city}</Text>
        )}
        {hasRating && (
          <Text style={bStyles.ratingRow}>⭐ {parseFloat(user.rating).toFixed(1)}</Text>
        )}
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
  const dispatch = useDispatch();
  const { coins } = useSelector((s) => s.user);
  const [activeFilter, setActiveFilter] = useState('All');
  const [users, setUsers] = useState([]);
  const [callPickerUser, setCallPickerUser] = useState(null);
  const [userReviews, setUserReviews] = useState([]);
  const [, setLoadingReviews] = useState(false);
  const [stageH, setStageH] = useState(400);
  const [showCoinsModal, setShowCoinsModal] = useState(false);
  const [topGirls, setTopGirls] = useState([]);
  const coinSpinAnim = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getMe().then((d) => {
      if (d) dispatch(setProfile(d));
    }).catch(() => {});
  }, []);

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
    if (coins < 1) {
      setShowCoinsModal(true);
      return;
    }
    setCallPickerUser(user);
  };

  const fetchUsers = async () => {
    try {
      const data = await getLiveUsers();
      // deduplicate by id
      const seen = new Set();
      const unique = (data || []).filter((u) => {
        if (seen.has(u.id)) return false;
        seen.add(u.id);
        return true;
      });
      setUsers(unique);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    getTopGirls().then((data) => setTopGirls((data || []).slice(0, 8))).catch(() => {});
  }, []);

  const visibleUsers = users.filter((u) => {
    if (activeFilter === '🔴 Live') return u.is_online;
    if (activeFilter === 'Hindi')   return (u.language || '').toLowerCase().includes('hindi') || u.language === 'HI';
    if (activeFilter === 'English') return (u.language || '').toLowerCase().includes('english') || u.language === 'EN';
    if (activeFilter === 'New')     return !u.is_online;
    return true;
  });

  return (
    <View style={styles.root}>
      {/* ── Hero Header ── */}
      <LinearGradient
        colors={['#7B0050', '#C0003A', '#8B1030']}
        start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
        style={styles.headerSection}>

        {/* Top row: menu + brand + coins */}
        <View style={[styles.headerTopRow, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onDrawer} style={styles.menuBtn}>
            <Icon name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerBrand}>Pineapple</Text>
            <Text style={styles.headerSub}>Meet New People</Text>
          </View>
          <View style={styles.coinBadge}>
            <Icon name="star" size={13} color="#FFD700" filled />
            <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
          </View>
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

        {/* ── Top Rated Girls strip ── */}
        {topGirls.length > 0 && (
          <View style={styles.topRatedSection}>
            <View style={styles.topRatedHeader}>
              <Text style={styles.topRatedLabel}>⭐ Top Rated</Text>
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
                    {girl.is_online && <View style={styles.topRatedOnline} />}
                  </View>
                  <Text style={styles.topRatedName} numberOfLines={1}>{(girl.name||'').split(' ')[0]}</Text>
                  {girl.rating > 0 && (
                    <Text style={styles.topRatedRating}>⭐{parseFloat(girl.rating).toFixed(1)}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </LinearGradient>

      {/* ── Stage ── */}
      <View
        style={styles.stage}
        onLayout={(e) => setStageH(e.nativeEvent.layout.height)}>
        {/* Purple bottom-left → crimson top-right gradient */}
        <LinearGradient
          colors={['#3A0068', '#7B0050', '#C0003A']}
          start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Floating background hearts */}
        <FloatingHeartBg left={-40}       top={-20}  size={200} delay={0}    />
        <FloatingHeartBg left={width-100} top={20}   size={160} delay={600}  />
        <FloatingHeartBg left={20}        top={180}  size={120} delay={1200} />
        <FloatingHeartBg left={width-80}  top={260}  size={100} delay={400}  />
        <FloatingHeartBg left={width/2-60} top={80}  size={90}  delay={800}  />
        <FloatingHeartBg left={-30}       top={320}  size={140} delay={1600} />

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
                colors={['#FF3870', '#C0004A']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.emptyBtnInner}>
                <Text style={styles.emptyBtnText}>⚡ Try Random Match</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          POSITIONS.map((pos, i) => {
            const u = visibleUsers[i % visibleUsers.length];
            return (
              <FloatingBubble
                key={i}
                user={u}
                stageH={stageH}
                onPress={() => checkCoinsAndCall(u)}
                topRatio={pos.topRatio}
                initialX={pos.initialX}
                duration={pos.duration}
                size={pos.size}
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
              colors={['#FF3870', '#C0004A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.randomBtnInner}>
              <Text style={styles.randomLightning}>⚡</Text>
              <Text style={styles.randomLabel}>Start Matching</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ── Profile + Call type picker ── */}
      <Modal visible={!!callPickerUser} transparent animationType="fade">
        <TouchableOpacity style={pStyles.overlay} activeOpacity={1} onPress={() => setCallPickerUser(null)} />
        <View style={pStyles.container}>
          <View style={pStyles.card}>
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
                        <Icon name="user" size={36} color="rgba(255,255,255,0.5)" />
                      </View>
                    )}
                  </View>
                  <View style={pStyles.previewInfo}>
                    <Text style={pStyles.previewName}>
                      {callPickerUser?.name}{callPickerUser?.age ? `, ${callPickerUser.age}` : ''}
                    </Text>
                    {callPickerUser?.city && (
                      <Text style={pStyles.previewSub}>📍 {callPickerUser.city}</Text>
                    )}
                    <StarRating rating={callPickerUser?.rating || 0} count={callPickerUser?.rating_count || 0} />
                    <View style={pStyles.previewBadges}>
                      <View style={pStyles.langBadgePreview}>
                        <Text style={pStyles.langBadgePreviewText}>{callPickerUser?.language || 'HI'}</Text>
                      </View>
                      {callPickerUser?.is_online && (
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
                  <Text style={pStyles.previewBio}>"{callPickerUser.bio}"</Text>
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

                {/* Reviews section — falls back to sample reviews when there are none yet */}
                {(() => {
                  const showingDummy = userReviews.length === 0;
                  const list = showingDummy ? DUMMY_REVIEWS : userReviews;
                  return (
                    <View style={pStyles.reviewsSection}>
                      <Text style={pStyles.reviewsTitle}>★ What people say</Text>
                      {list.slice(0, 3).map((rv, i) => (
                        <View key={i} style={pStyles.reviewItem}>
                          <View style={pStyles.reviewHeader}>
                            <Text style={pStyles.reviewStars}>{'★'.repeat(rv.stars)}{'☆'.repeat(5 - rv.stars)}</Text>
                            <Text style={pStyles.reviewerName}>— {rv.reviewer_name}</Text>
                          </View>
                          <Text style={pStyles.reviewText}>"{rv.review_text}"</Text>
                        </View>
                      ))}
                      {!showingDummy && userReviews.length > 3 && (
                        <Text style={pStyles.reviewsMore}>+{userReviews.length - 3} more reviews</Text>
                      )}
                    </View>
                  );
                })()}
              </>
            )}
            <View style={pStyles.btnRow}>
              <TouchableOpacity style={pStyles.btn} activeOpacity={0.85} onPress={() => { const u = callPickerUser; setCallPickerUser(null); onAudioCall(u); }}>
                <View style={pStyles.btnInner}>
                  <LinearGradient colors={['#FF3870','#C0004A']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
                  <Icon name="phone" size={32} color="#fff" />
                  <Text style={pStyles.btnLabel}>Audio Call</Text>
                  <Text style={pStyles.btnSub}>Voice only</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={pStyles.btn} activeOpacity={0.85} onPress={() => { const u = callPickerUser; setCallPickerUser(null); onVideoCall(u); }}>
                <View style={pStyles.btnInner}>
                  <LinearGradient colors={['#FF3870','#C0004A']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
                  <Icon name="video" size={32} color="#fff" />
                  <Text style={pStyles.btnLabel}>Video Call</Text>
                  <Text style={pStyles.btnSub}>Face to face</Text>
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
                    { text: 'Block', style: 'destructive', onPress: () => { blockUser(u.id); setCallPickerUser(null); Alert.alert('Blocked', `${u.name} has been blocked.`); }},
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}>
                  <Text style={pStyles.blockText}>🚫 Block</Text>
                </TouchableOpacity>
              </View>
            )}
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
  wrap: { position: 'absolute', alignItems: 'center' },
  dot: {
    position: 'absolute', top: 6, right: 0,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#fff', zIndex: 5,
  },
  circle: {
    overflow: 'hidden', backgroundColor: '#C0004A',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  glowRing: {
    position: 'absolute', top: -4, left: -4,
    shadowColor: '#FF3870',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 12,
  },
  img: { width: '100%', height: '100%' },
  initial: { alignItems: 'center', justifyContent: 'center' },
  initialText: { color: '#fff', fontWeight: '900' },
  ratingBadge: {
    position: 'absolute', top: -10, left: -6, zIndex: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,215,0,0.4)',
  },
  ratingText: { color: '#FFD700', fontSize: 9, fontWeight: '900' },
  crownBadge: {
    position: 'absolute', top: -14, alignSelf: 'center', zIndex: 6,
  },
  langBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, marginTop: 5, alignSelf: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  langText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  name: {
    color: '#fff', fontSize: 12, fontWeight: '900', marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
    textAlign: 'center', maxWidth: 90,
  },
  city: {
    color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '500',
    textAlign: 'center', maxWidth: 90, marginTop: 1,
  },
  ratingRow: {
    color: '#FFD700', fontSize: 10, fontWeight: '800',
    textAlign: 'center', marginTop: 1,
  },
});

/* ─── Picker styles ─── */
const pStyles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  safetyRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 16 },
  safetyBtn: { paddingVertical: 6, paddingHorizontal: 14 },
  reportText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  blockText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 20,
  },
  title: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center' },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 6, marginBottom: 22, fontWeight: '600' },
  previewBio: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: -14, marginBottom: 18, lineHeight: 17, fontStyle: 'italic', paddingHorizontal: 8 },
  prefsSection: { alignItems: 'center', marginTop: -8, marginBottom: 18 },
  prefsTopicsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 8 },
  prefsTopicTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  prefsTopicTagText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  prefsBoundary: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  prefsBoundaryText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  btnRow: { flexDirection: 'row', gap: 14 },
  btn: {
    flex: 1, borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  btnInner: { paddingVertical: 28, alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnLabel: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  btnSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  profilePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  previewAvatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  previewAvatar: { width: '100%', height: '100%' },
  previewAvatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: { flex: 1, gap: 4 },
  previewName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.3,
  },
  previewSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  previewBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  langBadgePreview: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  langBadgePreviewText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.2)',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  onlineBadgeText: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '700',
  },
  reviewsSection: {
    marginTop: 12,
    marginBottom: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  reviewsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFD700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewItem: {
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    padding: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  reviewStars: {
    fontSize: 11,
    color: '#FFD700',
    fontWeight: '700',
  },
  reviewerName: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  reviewText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  reviewsMore: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
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
  root: { flex: 1, backgroundColor: '#8B1030' },

  headerSection: { paddingBottom: 8 },
  headerTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 4,
  },
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerBrand: { textAlign: 'center', fontSize: 26, fontWeight: '900', color: '#fff', fontFamily: 'Pacifico-Regular', letterSpacing: 0.5 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginTop: 2, textAlign: 'center', letterSpacing: 0.5 },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  coinText: { fontSize: 13, fontWeight: '900', color: '#fff' },
  filterBar: { backgroundColor: 'transparent', maxHeight: 58 },
  filterBarContent: { paddingHorizontal: 20, paddingVertical: 7, gap: 8, flexDirection: 'row' },

  liveDotChip: {
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: '#FF2D2D',
    shadowColor: '#FF2D2D', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 5,
  },

  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  filterTabActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  filterIcon: { fontSize: 13 },
  filterText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  filterTextActive: { color: '#FF3870', fontWeight: '900' },

  stage: { flex: 1, overflow: 'hidden' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 52, marginBottom: 4 },
  emptyText: { fontSize: 20, fontWeight: '900', color: '#fff', textAlign: 'center' },
  emptySub: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', fontWeight: '500', lineHeight: 20 },
  emptyBtn: { marginTop: 16, borderRadius: 30, overflow: 'hidden', height: 52, width: 220 },
  emptyBtnInner: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 30 },
  emptyBtnText: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },

  bottomBar: {
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#1A0028',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,56,112,0.15)',
  },
  randomBtnWrap: {
    height: 64, borderRadius: 32, overflow: 'hidden',
    shadowColor: '#FF3870', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.85, shadowRadius: 28, elevation: 20,
  },
  randomBtnInner: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, borderRadius: 32,
  },
  randomLightning: { fontSize: 22 },
  randomLabel: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },

  /* ── Top Rated strip ── */
  topRatedSection: { paddingBottom: 12, paddingTop: 4 },
  topRatedHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  topRatedLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 0.8, textTransform: 'uppercase' },
  topRatedDivider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginLeft: 10 },
  topRatedList: { paddingHorizontal: 16, paddingTop: 12, gap: 16 },
  topRatedItem: { alignItems: 'center', width: 60 },
  topRatedAvatarWrap: { position: 'relative', marginBottom: 5, overflow: 'visible' },
  topRatedAvatar: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  topRatedInitial: { fontSize: 20, fontWeight: '900', color: '#fff' },
  topRatedOnline: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: 'rgba(139,16,48,1)',
  },
  topRatedCrown: { position: 'absolute', top: -6, left: '50%', marginLeft: -8, zIndex: 5 },
  topRatedCrownText: { fontSize: 14 },
  topRatedName: { fontSize: 11, fontWeight: '700', color: '#fff', textAlign: 'center', maxWidth: 58 },
  topRatedRating: { fontSize: 10, color: '#FFD700', fontWeight: '700', marginTop: 1 },
});
