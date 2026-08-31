import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Dimensions,
  StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';

const { width } = Dimensions.get('window');

const USER_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-ohWi2umjAf_YM364Wb6oqHmcyx63iVyHbA1t1m95UsTjRvYY5U12mKYM8mqJzptYzOenTbW8M5PhTOMPFHVrqBUM0S15ckK_vV2RB83xJfExB_f6giVR8gu389W8f9DVbK1BRPYEcYfH6ZqlvGzOqWBZNwiXJejb2yRHg-e_eLYI74nhtjqVEKpGu7ItHsYXFVkkZTyenrVZSv3d2fU0fXh7inHAiiYT7XdgRh0EHx53YMlq3sZ_3opIeD1ChGb3KxuRrn1TvLrH';

const REVIEW_TAGS = [
'Sweet Voice',
'Pro Expert',
'Amazing Talker',
'Entertainer',
'Problem Solver',
'Good Listener'];

export default function CallSummaryScreen({ duration, userName, onComplete }) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [review, setReview] = useState('');

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} />
      
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: 20, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>
        
        {/* Close Button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onComplete}>
          <Icon name="x" size={24} color="#1d1b20" />
        </TouchableOpacity>

        {/* User Profile */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: USER_AVATAR }} style={styles.avatar} />
          </View>
          <TouchableOpacity style={styles.followBtn}>
            <Icon name="plus" size={16} color="#fff" />
            <Text style={styles.followText}>Follow</Text>
          </TouchableOpacity>
          <Text style={styles.questionText}>How was {userName}?</Text>
          
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>Duration: {duration}</Text>
          </View>
        </View>

        {/* Star Rating */}
        <View style={styles.ratingSection}>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) =>
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              activeOpacity={0.7}>
              
                <Icon
                name={star <= rating ? 'star-filled' : 'star'}
                size={40}
                color={star <= rating ? '#f59e0b' : '#f1f5f9'} />
              
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Review Input */}
        <View style={styles.reviewSection}>
          <View style={styles.reviewInputContainer}>
            <TextInput
              style={styles.reviewInput}
              placeholder="Write your review here..."
              multiline
              value={review}
              onChangeText={setReview}
              maxLength={500}
              placeholderTextColor="#94a3b8" />
            
            <Text style={styles.charLimit}>{review.length}/500</Text>
          </View>
        </View>

        {/* Tags */}
        <View style={styles.tagsSection}>
          <View style={styles.tagsContainer}>
            {REVIEW_TAGS.map((tag) =>
            <TouchableOpacity
              key={tag}
              style={[
              styles.tagBtn,
              selectedTags.includes(tag) && styles.tagBtnActive]
              }
              onPress={() => toggleTag(tag)}
              activeOpacity={0.7}>
              
                <Text style={[
              styles.tagText,
              selectedTags.includes(tag) && styles.tagTextActive]
              }>{tag}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={onComplete}
          activeOpacity={0.8}>
          
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBtn}>
            
            <Text style={styles.submitText}>Submit</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>);

}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff'
  },
  content: {
    paddingHorizontal: 24
  },
  closeBtn: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeIconShape: {
    width: 20,
    height: 2,
    backgroundColor: '#1d1b20',
    transform: [{ rotate: '45deg' }],
    position: 'relative'
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 20
  },
  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#f8fafc',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4
  },
  avatar: {
    width: '100%',
    height: '100%'
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: -20,
    zIndex: 10,
    gap: 6
  },
  plusIconShape: {
    width: 12,
    height: 2,
    backgroundColor: '#fff'
  },
  followText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14
  },
  questionText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1d1b20',
    marginTop: 24,
    textAlign: 'center'
  },
  durationBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8
  },
  durationText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700'
  },
  ratingSection: {
    marginTop: 32,
    alignItems: 'center'
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 24
  },
  reviewSection: {
    marginTop: 32
  },
  reviewInputContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    height: 160
  },
  reviewInput: {
    flex: 1,
    fontSize: 16,
    color: '#1d1b20',
    fontWeight: '500',
    textAlignVertical: 'top'
  },
  charLimit: {
    alignSelf: 'flex-end',
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600'
  },
  tagsSection: {
    marginTop: 24
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center'
  },
  tagBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  tagBtnActive: {
    backgroundColor: '#1d1b20',
    borderColor: '#1d1b20'
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b'
  },
  tagTextActive: {
    color: '#fff'
  },
  submitBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 40
  },
  gradientBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1
  }
});