import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Modal,
  StatusBar,
  Dimensions } from 'react-native';
import { Svg, Path, G, Circle, Text as SvgText } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Colors, Gradients } from '../theme/colors';
import { addGift, setProfile } from '../store/slices/userSlice';
import { spin as spinApi, getSpinStatus } from '../services/api';

const SCREEN_W = Dimensions.get('window').width;
const WHEEL_SIZE = Math.min(SCREEN_W - 48, 310);
const WHEEL_TOTAL = WHEEL_SIZE + 32;
const SPIN_BTN_SIZE = 72;
const SPIN_BTN_OFFSET = (WHEEL_TOTAL - SPIN_BTN_SIZE) / 2;
const CX = WHEEL_SIZE / 2;
const CY = WHEEL_SIZE / 2;
const OUTER_R = CX - 8;
const SEG_COUNT = 10;
const SEG_DEG = 360 / SEG_COUNT;

const PRIZES = [
{ label: 'Rose',       value: '₹10',  emoji: '🌹', isLoss: false, rupeeValue: 10    },
{ label: 'Chocolate',  value: '₹20',  emoji: '🍫', isLoss: false, rupeeValue: 20    },
{ label: 'Luck!',      value: 'Try',  emoji: '🍀', isLoss: true,  rupeeValue: 0     },
{ label: 'Pastry',     value: '₹50',  emoji: '🍰', isLoss: false, rupeeValue: 50    },
{ label: 'Pineapple',  value: '₹100', emoji: '🍍', isLoss: false, rupeeValue: 100   },
{ label: 'Luck!',      value: 'Try',  emoji: '🍀', isLoss: true,  rupeeValue: 0     },
{ label: 'Heart',      value: '₹200', emoji: '❤️', isLoss: false, rupeeValue: 200   },
{ label: 'Perfume',    value: '₹500', emoji: '🌸', isLoss: false, rupeeValue: 500   },
{ label: 'Crown',      value: '₹5K',  emoji: '👑', isLoss: false, rupeeValue: 5000  },
{ label: 'Diamond',    value: '₹10K', emoji: '💎', isLoss: false, rupeeValue: 10000 }];

const SEG_COLORS = [
'#FFF0F5', '#FFE4EF', '#FFF0F5', '#FFE4EF', '#FFF0F5',
'#FFE4EF', '#FFF0F5', '#FFE4EF', '#FFF0F5', '#FFE4EF'];

const toRad = (deg) => (deg - 90) * (Math.PI / 180);
const pt = (r, deg) => ({
  x: CX + r * Math.cos(toRad(deg)),
  y: CY + r * Math.sin(toRad(deg))
});
const arcPath = (startDeg, endDeg) => {
  const s = pt(OUTER_R, startDeg);
  const e = pt(OUTER_R, endDeg);
  return `M ${CX} ${CY} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${OUTER_R} ${OUTER_R} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`;
};

export default function LuckySpinScreen({ onBack, onPremium }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { coins } = useSelector((s) => s.user);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const currentRot = useRef(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [error, setError] = useState('');
  const [spinAvailable, setSpinAvailable] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  React.useEffect(() => {
    getSpinStatus()
      .then(d => setSpinAvailable(!!d.spinAvailable))
      .catch(() => setSpinAvailable(false))
      .finally(() => setStatusLoading(false));
  }, []);

  const spinDeg = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1deg'],
    extrapolate: 'extend'
  });

  const doSpin = async () => {
    if (isSpinning || !spinAvailable) return;
    setIsSpinning(true);
    setShowResult(false);
    setError('');

    let serverPrize;
    try {
      const res = await spinApi();
      serverPrize = res;
      setSpinAvailable(false);
      if (res.coins !== undefined) dispatch(setProfile({ coins: res.coins }));
    } catch (err) {
      setError(err.message || 'Buy premium to spin!');
      setIsSpinning(false);
      return;
    }

    // Use backend-determined prize index (not random)
    const winIndex = serverPrize.prizeIndex;
    const prize = PRIZES[winIndex];

    // When wheel rotates clockwise by R, pointer sees local angle (360-R).
    // To land winIndex at pointer: target = 360 - midAngle
    const midAngle = (winIndex + 0.5) * SEG_DEG;
    const targetRotation = 360 - midAngle;
    const currentMod = currentRot.current % 360;
    let diff = targetRotation - currentMod;
    if (diff <= 0) diff += 360;
    const newValue = currentRot.current + 5 * 360 + diff;
    currentRot.current = newValue;

    Animated.timing(spinAnim, {
      toValue: newValue,
      duration: 4000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        const reward = prize.isLoss
          ? { type: 'loss', label: 'Better Luck!', emoji: '🍀', value: 0 }
          : { type: 'gift', label: prize.label, emoji: prize.emoji, value: prize.rupeeValue };

        if (reward.type === 'gift') {
          dispatch(addGift({ type: 'gift', label: reward.label, emoji: reward.emoji, value: reward.value }));
        }
        setResultData(reward);
        setIsSpinning(false);
        setTimeout(() => setShowResult(true), 400);
      }
    });
  };

  const rewardLabel = resultData ? getRewardLabel(resultData) : '';
  const isWin = resultData?.type === 'gift';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="arrow-left" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <View style={styles.coinBadge}>
          <Icon name="star" size={16} color={Colors.primary} />
          <Text style={styles.coinText}>{coins.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>Fortune Wheel</Text>
          <Text style={styles.subtitle}>Spin to win exclusive rewards</Text>
        </View>

        {error.length > 0 && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Wheel area */}
        <View style={[styles.wheelArea, { width: WHEEL_TOTAL, height: WHEEL_TOTAL }]}>
          {/* Fixed pointer at top */}
          <View style={styles.pointerContainer}>
            <View style={styles.pointer} />
          </View>

          {/* Animated wheel */}
          <View style={[styles.wheelRing, { width: WHEEL_SIZE + 24, height: WHEEL_SIZE + 24 }]}>
            <Animated.View
              style={[
              styles.wheelWrap,
              { width: WHEEL_SIZE, height: WHEEL_SIZE },
              { transform: [{ rotate: spinDeg }] }]
              }>
              <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                <Circle cx={CX} cy={CY} r={OUTER_R} fill="white" />
                {PRIZES.map((p, i) => {
                  const startDeg = i * SEG_DEG;
                  const endDeg = (i + 1) * SEG_DEG;
                  const midDeg = startDeg + SEG_DEG / 2;
                  const emojiPt = pt(OUTER_R * 0.72, midDeg);
                  const labelPt = pt(OUTER_R * 0.48, midDeg);
                  const textRotation = midDeg > 90 && midDeg < 270 ? midDeg + 180 : midDeg;
                  return (
                    <G key={i}>
                      <Path
                        d={arcPath(startDeg, endDeg)}
                        fill={SEG_COLORS[i]}
                        stroke="#EEEEEE"
                        strokeWidth={1} />
                      <G rotation={textRotation} originX={emojiPt.x} originY={emojiPt.y}>
                        <SvgText
                          x={emojiPt.x}
                          y={emojiPt.y + 6}
                          textAnchor="middle"
                          fontSize="16">
                          {p.emoji}
                        </SvgText>
                      </G>
                      <G rotation={textRotation} originX={labelPt.x} originY={labelPt.y}>
                        <SvgText
                          x={labelPt.x}
                          y={labelPt.y + 4}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="900"
                          fill={p.isLoss ? '#94a3b8' : Colors.dark}>
                          {p.value === 'Try' ? 'LUCK' : p.value}
                        </SvgText>
                      </G>
                    </G>);
                })}
                <Circle cx={CX} cy={CY} r={42} fill="white" />
                <Circle cx={CX} cy={CY} r={36} fill="rgba(0,0,0,0.03)" />
              </Svg>
            </Animated.View>
          </View>

          {/* Center SPIN button */}
          <TouchableOpacity
            style={[styles.spinBtnWrap, { top: SPIN_BTN_OFFSET, left: SPIN_BTN_OFFSET }]}
            onPress={spinAvailable ? doSpin : onPremium}
            disabled={isSpinning || statusLoading}
            activeOpacity={0.9}>
            <LinearGradient
              colors={spinAvailable ? Gradients.primary : ['#94A3B8', '#64748B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.spinBtn}>
              {statusLoading ? (
                <Text style={styles.spinBtnText}>...</Text>
              ) : spinAvailable ? (
                <Text style={styles.spinBtnText}>SPIN</Text>
              ) : (
                <Icon name="lock" size={28} color="#fff" />
              )}
            </LinearGradient>
          </TouchableOpacity>

          {!spinAvailable && !statusLoading && (
            <TouchableOpacity style={styles.premiumLockBanner} onPress={onPremium} activeOpacity={0.85}>
              <Text style={styles.premiumLockText}>🔒 Buy Premium (₹500) to unlock spin</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Result Modal */}
      <Modal visible={showResult} transparent animationType="fade">
        <View style={styles.modalRoot}>
          {/* Blurred overlay */}
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowResult(false)} />

          <View style={styles.modalCard}>
            {/* Floating emoji bubble */}
            <View style={styles.emojiBubbleWrap}>
              <LinearGradient
                colors={isWin ? Gradients.primary : ['#94a3b8', '#cbd5e1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emojiBubble}>
                <Text style={styles.emojiBubbleText}>
                  {isWin ? resultData?.emoji : '🍀'}
                </Text>
              </LinearGradient>
            </View>

            {/* Card content */}
            <View style={styles.modalBody}>
              <Text style={styles.modalStatus}>
                {isWin ? 'You Won! 🎉' : 'Better Luck!'}
              </Text>
              <Text style={styles.modalPrize}>{rewardLabel}</Text>
              {isWin && (
                <View style={styles.worthBadge}>
                  <Text style={styles.worthText}>Worth ₹{resultData?.value?.toLocaleString('en-IN')}</Text>
                </View>
              )}
              <Text style={styles.modalSub}>
                {isWin
                  ? 'Send as a gift during a call or redeem from Wallet'
                  : "Spin again to win big rewards!"}
              </Text>
              <TouchableOpacity
                style={styles.claimBtn}
                onPress={() => setShowResult(false)}
                activeOpacity={0.85}>
                <LinearGradient
                  colors={isWin ? Gradients.primary : ['#64748b', '#94a3b8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.claimBtnGrad}>
                  <Text style={styles.claimBtnText}>
                    {isWin ? 'CLAIM REWARD' : 'TRY AGAIN'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>);
}

function getRewardLabel(reward) {
  if (!reward) return '';
  if (reward.type === 'gift') return `${reward.emoji} ${reward.label}`;
  return 'Better Luck Next Time!';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  premiumLockBanner: {
    position: 'absolute', bottom: 16, left: 24, right: 24,
    backgroundColor: '#FF3870', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 16,
    alignItems: 'center',
  },
  premiumLockText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 56
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2
  },
  coinText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.dark
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24
  },
  titleGroup: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.dark
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4
  },
  errorBanner: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    fontSize: 13,
    color: Colors.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  wheelArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32
  },
  pointerContainer: {
    position: 'absolute',
    top: -10,
    zIndex: 10,
    alignItems: 'center'
  },
  pointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.secondary,
    transform: [{ rotate: '180deg' }]
  },
  wheelRing: {
    borderRadius: 200,
    backgroundColor: '#FFFFFF',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFD0E0',
    shadowColor: '#FF3870',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10
  },
  wheelWrap: {
    borderRadius: 200,
    overflow: 'hidden'
  },
  spinBtnWrap: {
    position: 'absolute',
    width: SPIN_BTN_SIZE,
    height: SPIN_BTN_SIZE,
    borderRadius: SPIN_BTN_SIZE / 2,
    backgroundColor: '#fff',
    padding: 6,
    zIndex: 20,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10
  },
  spinBtn: {
    flex: 1,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center'
  },
  spinBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(15,15,25,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  modalCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 36,
    overflow: 'visible',
    paddingTop: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 20,
  },
  emojiBubbleWrap: {
    position: 'absolute',
    top: -48,
    alignSelf: 'center',
    zIndex: 10,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  emojiBubble: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  emojiBubbleText: {
    fontSize: 44,
  },
  modalBody: {
    paddingHorizontal: 28,
    paddingBottom: 32,
    alignItems: 'center',
  },
  modalStatus: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  modalPrize: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.secondary,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  worthBadge: {
    backgroundColor: Colors.secondary + '18',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  worthText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.secondary,
  },
  modalSub: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  claimBtn: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
  },
  claimBtnGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  }
});
