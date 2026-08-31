import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch } from 'react-redux';
import { addCoins } from '../store/slices/userSlice';
import { rateUser } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';

const TAGS = ['Sweet Voice', 'Pro Expert', 'Amazing Talker', 'Entertainer', 'Problem Solver'];

export default function CallReviewScreen({
  callerName = 'User',
  callerAvatar,
  callerUserId,
  callId,
  onSubmit,
  onBack
}) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
    prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating > 0 && callerUserId) {
      try { await rateUser(callerUserId, rating, callId, review, selectedTags); } catch {}
      dispatch(addCoins(rating * 10));
    }
    onSubmit();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#1d1b20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Your Call</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Caller info */}
        <View style={styles.callerSection}>
          <LinearGradient colors={Gradients.primary} style={styles.avatarBorder}>
            {callerAvatar ? (
              <Image source={{ uri: callerAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{(callerName || 'U')[0].toUpperCase()}</Text>
              </View>
            )}
          </LinearGradient>
          <Text style={styles.callerQuestion}>How was {callerName}?</Text>
          <Text style={styles.callerSub}>Your feedback helps us improve the community</Text>
        </View>

        {/* Stars */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((i) =>
          <TouchableOpacity key={i} onPress={() => setRating(i)} activeOpacity={0.7}>
              <Icon
              name={i <= rating ? 'star-filled' : 'star'}
              size={44}
              color={i <= rating ? '#F59E0B' : '#CBD5E1'} />
            
            </TouchableOpacity>
          )}
        </View>

        {rating > 0 &&
        <Text style={styles.ratingLabel}>
            {['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing!'][rating]}
          </Text>
        }

        {/* Text input */}
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            multiline
            placeholder="Share your experience..."
            placeholderTextColor="#94a3b8"
            value={review}
            onChangeText={(t) => setReview(t.slice(0, 500))}
            maxLength={500} />
          
          <Text style={styles.charCount}>
            Character Limit: {review.length}/500
          </Text>
        </View>

        {/* Tags */}
        <View style={styles.tagsWrap}>
          {TAGS.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag)}
                activeOpacity={0.8}
                style={[styles.tag, active && styles.tagActive]}>
                <Text style={[styles.tagText, active && styles.tagTextActive]}>
                  {tag}
                </Text>
              </TouchableOpacity>);

          })}
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          activeOpacity={rating > 0 ? 0.85 : 1}
          style={[styles.btnWrap, { marginBottom: insets.bottom + 40 }]}>
          <LinearGradient
            colors={rating > 0 ? Gradients.primary : ['#E2E8F0', '#CBD5E1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}>
            <Text style={[styles.btnText, rating === 0 && styles.btnTextOff]}>
              Submit Review
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>);

}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF5F8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#fff',
    zIndex: 10
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#1d1b20', includeFontPadding: false },
  scroll: { padding: 20, gap: 24 },
  callerSection: { alignItems: 'center', gap: 12 },
  avatarBorder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: '#fff'
  },
  avatarFallback: { backgroundColor: '#C0004A', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 44, color: '#fff', fontWeight: '900' },
  callerQuestion: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1d1b20',
    letterSpacing: -1,
    includeFontPadding: false
  },
  callerSub: { fontSize: 15, color: '#64748b', fontWeight: '600', includeFontPadding: false },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: '#F59E0B',
    marginTop: -10,
    includeFontPadding: false
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2
  },
  input: {
    fontSize: 16,
    color: '#1d1b20',
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 24,
    fontWeight: '600',
    includeFontPadding: false
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 10,
    fontWeight: '700',
    includeFontPadding: false
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: {
    paddingHorizontal: 22,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tagActive: {
    backgroundColor: '#FF3870',
    borderColor: '#FF3870'
  },
  tagText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#64748b',
    includeFontPadding: false
  },
  tagTextActive: { color: '#fff' },
  btnWrap: {
    borderRadius: 36,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden'
  },
  btn: {
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    includeFontPadding: false
  },
  btnTextOff: { color: '#94a3b8' }
});