import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';
import { setProfile } from '../store/slices/userSlice';
import { updateProfile } from '../services/api';

const { width } = Dimensions.get('window');

export default function GenderSelectionScreen({ onComplete }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const [name, setName] = useState('');
  const [gender, setGender] = useState(null);
  const [dob, setDob] = useState('');
  const [dobError, setDobError] = useState('');
  const [profileType, setProfileType] = useState('Select');
  const [loading, setLoading] = useState(false);

  const handleDobChange = (text) => {
    // strip non-digits
    const raw = text.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length > 2 && raw.length <= 4) formatted = raw.slice(0, 2) + '/' + raw.slice(2);
    else if (raw.length > 4) formatted = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4, 8);
    setDob(formatted);
    setDobError('');
  };

  const isAdult = (d) => {
    const parts = d.split('/');
    if (parts.length !== 3 || d.length !== 10) return false;
    const [dd, mm, yyyy] = parts.map(Number);
    const birth = new Date(yyyy, mm - 1, dd);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 18;
  };

  const isFormValid = name.trim().length > 0 && gender !== null && dob.length === 10;

  const handleSave = async () => {
    if (!isFormValid || loading) return;
    if (!isAdult(dob)) {
      setDobError('You must be 18 or older to use Pineapple');
      return;
    }
    setLoading(true);
    dispatch(setProfile({ name: name.trim(), gender, dob }));
    try {
      await updateProfile({ name: name.trim(), gender, dob });
    } catch {
      // backend not connected yet — silently skip, local state already saved
    } finally {
      setLoading(false);
      onComplete({ name, gender, dob });
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />
      
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: 20, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>
        
        <Text style={styles.headerTitle}>Set Profile</Text>

        {/* Name Input */}
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>Name</Text>
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#94a3b8" />
            
            {name.trim().length > 0 &&
            <View style={styles.validCircle}>
                <Icon name="check" size={12} color="#fff" />
              </View>
            }
          </View>
        </View>

        {/* Profile Type */}
        <TouchableOpacity style={styles.inputWrap} activeOpacity={0.7}>
          <Text style={styles.inputLabel}>Who are you?</Text>
          <View style={styles.textInputContainer}>
            <Text style={styles.placeholderText}>{profileType}</Text>
            <Icon name="chevron-right" size={20} color="#CCCCCC" />
          </View>
        </TouchableOpacity>

        {/* DOB Input */}
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>Date of Birth</Text>
          <View style={[styles.textInputContainer, dobError && { borderColor: Colors.secondary }]}>
            <TextInput
              style={styles.textInput}
              placeholder="DD/MM/YYYY"
              value={dob}
              onChangeText={handleDobChange}
              keyboardType="number-pad"
              maxLength={10}
              placeholderTextColor="#94a3b8" />
            <Icon name="calendar" size={24} color={dobError ? Colors.secondary : Colors.secondary} />
          </View>
          {dobError ? <Text style={styles.dobErrorText}>{dobError}</Text> : null}
        </View>

        <TouchableOpacity style={styles.referralBtn}>
          <Text style={styles.referralText}>I have referral code</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />

        {/* Gender Selection */}
        <View style={styles.genderSection}>
          <Text style={styles.genderTitle}>Select your true gender</Text>

          <View style={styles.genderRow}>
            {/* Girl Option */}
            <TouchableOpacity
              style={[
              styles.genderCard,
              gender === 'girl' && styles.genderCardActiveGirl]
              }
              onPress={() => setGender('girl')}
              activeOpacity={0.8}>
              
              <View style={[styles.avatarShape, styles.girlAvatar]}>
                <Icon name="user" size={40} color="#fff" />
              </View>
              <Text style={[styles.genderLabel, gender === 'girl' && styles.genderLabelActive]}>I am Girl</Text>
            </TouchableOpacity>

            {/* Boy Option */}
            <TouchableOpacity
              style={[
              styles.genderCard,
              gender === 'boy' && styles.genderCardActiveBoy]
              }
              onPress={() => setGender('boy')}
              activeOpacity={0.8}>
              
              <View style={[styles.avatarShape, styles.boyAvatar]}>
                <Icon name="user" size={40} color="#fff" />
              </View>
              <Text style={[styles.genderLabel, gender === 'boy' && styles.genderLabelActive]}>I am Boy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, (!isFormValid || loading) && styles.submitBtnDisabled]}
          onPress={handleSave}
          disabled={!isFormValid || loading}
          activeOpacity={0.8}>

          <LinearGradient
            colors={isFormValid ? Gradients.primary : ['#e2e8f0', '#cbd5e1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBtn}>

            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={[styles.submitText, !isFormValid && styles.submitTextDisabled]}>SAVE PROFILE</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>);

}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background
  },
  content: {
    paddingHorizontal: 20
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 32,
  },
  inputWrap: {
    marginBottom: 24
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.textLight,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  textInputContainer: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark,
    fontWeight: '600',
  },
  placeholderText: {
    flex: 1,
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
  validCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dobErrorText: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 4,
  },
  referralBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  referralText: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: 'bold',
  },
  spacer: {
    height: 40,
  },
  genderSection: {
    marginBottom: 40,
  },
  genderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 24,
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  genderCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  genderCardActiveGirl: {
    borderColor: Colors.secondary,
  },
  genderCardActiveBoy: {
    borderColor: Colors.primary,
  },
  avatarShape: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  girlAvatar: {
    backgroundColor: Colors.secondary,
  },
  boyAvatar: {
    backgroundColor: Colors.primary,
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  genderLabelActive: {
    color: Colors.dark,
  },
  submitBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 40,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  gradientBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  submitTextDisabled: {
    color: '#94a3b8',
  }
});