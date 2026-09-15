import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  TextInput, ScrollView, Modal, FlatList, KeyboardAvoidingView,
  Platform, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { Colors, Gradients } from '../theme/colors';
import { updateProfile, uploadAvatar } from '../services/api';
import { setProfile } from '../store/slices/userSlice';

const DAYS   = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEARS  = Array.from({ length: 40 }, (_, i) => String(2007 - i));

function DatePickerModal({ visible, onConfirm, onCancel }) {
  const [day, setDay]     = useState('01');
  const [month, setMonth] = useState('Jan');
  const [year, setYear]   = useState('2000');

  const Column = ({ data, selected, onSelect }) => (
    <FlatList
      data={data}
      keyExtractor={(item) => item}
      showsVerticalScrollIndicator={false}
      style={styles.pickerCol}
      snapToInterval={44}
      decelerationRate="fast"
      initialScrollIndex={Math.max(0, data.indexOf(selected))}
      getItemLayout={(_, index) => ({ length: 44, offset: 44 * index, index })}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => onSelect(item)} style={styles.pickerItem}>
          <Text style={[styles.pickerItemText, item === selected && styles.pickerItemSelected]}>
            {item}
          </Text>
        </TouchableOpacity>
      )}
    />
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerCard}>
          <Text style={styles.pickerTitle}>Select Birthdate</Text>
          <View style={styles.pickerRow}>
            <Column data={DAYS}   selected={day}   onSelect={setDay}   />
            <Column data={MONTHS} selected={month} onSelect={setMonth} />
            <Column data={YEARS}  selected={year}  onSelect={setYear}  />
          </View>
          <View style={styles.pickerBtns}>
            <TouchableOpacity onPress={onCancel} style={styles.pickerCancel}>
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onConfirm(`${day} ${month} ${year}`)}
              style={styles.pickerConfirm}>
              <LinearGradient colors={Gradients.primary} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.pickerConfirmGrad}>
                <Text style={styles.pickerConfirmText}>Confirm</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileSetupScreen({ onComplete }) {
  const insets   = useSafeAreaInsets();
  const dispatch = useDispatch();

  const [name, setName]         = useState('');
  const [avatarUri, setAvatar]  = useState(null);
  const [birthdate, setBirth]   = useState('');
  const [gender, setGender]     = useState('boy');
  const [showPicker, setShow]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const pickPhoto = () => {
    Alert.alert('Profile Photo', 'Choose a photo', [
      {
        text: 'Camera',
        onPress: () => launchCamera({ mediaType: 'photo', quality: 0.8, cameraType: 'front' }, (res) => {
          if (!res.didCancel && res.assets?.[0]?.uri) setAvatar(res.assets[0].uri);
        }),
      },
      {
        text: 'Photo Library',
        onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 }, (res) => {
          if (!res.didCancel && res.assets?.[0]?.uri) setAvatar(res.assets[0].uri);
        }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!birthdate)   { setError('Please select your birthdate'); return; }
    setError('');
    setLoading(true);
    try {
      let finalAvatarUrl = avatarUri;
      if (avatarUri && avatarUri.startsWith('file://')) {
        finalAvatarUrl = await uploadAvatar(avatarUri);
      }
      await updateProfile({ name: name.trim(), dob: birthdate, birthdate, avatar_url: finalAvatarUrl, gender: 'boy' });
      dispatch(setProfile({ name: name.trim(), avatar_url: finalAvatarUrl, birthdate, gender: 'boy' }));
      onComplete();
    } catch (e) {
      setError(e.message || 'Failed to save. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={Gradients.primary} style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Set Up Profile</Text>
        <Text style={styles.headerSub}>Let others know who you are</Text>
      </LinearGradient>

      {/* Avatar overlapping header and body */}
      <View style={styles.avatarOverlapWrap}>
        <TouchableOpacity onPress={pickPhoto} style={styles.avatarWrap} activeOpacity={0.85}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarIcon}>📷</Text>
            </View>
          )}
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarBadgeText}>+</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Tap to add photo</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 80, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled">

        {/* Name */}
        <Text style={styles.label}>Your Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          placeholderTextColor="#bbb"
          value={name}
          onChangeText={(t) => { setName(t); setError(''); }}
          maxLength={30}
        />

        {/* Birthdate */}
        <Text style={styles.label}>Birthdate</Text>
        <TouchableOpacity onPress={() => setShow(true)} style={styles.dateBtn} activeOpacity={0.8}>
          <Text style={[styles.dateBtnText, !birthdate && { color: '#bbb' }]}>
            {birthdate || 'Select your birthdate'}
          </Text>
          <Text style={styles.dateIcon}>📅</Text>
        </TouchableOpacity>

        {/* Gender */}
        <Text style={styles.label}>I am a</Text>
        <View style={styles.genderRow}>
          <TouchableOpacity
            style={[styles.genderBtn, gender === 'boy' && styles.genderBtnActive]}
            onPress={() => setGender('boy')} activeOpacity={0.85}>
            <Text style={styles.genderEmoji}>👦</Text>
            <Text style={[styles.genderText, gender === 'boy' && styles.genderTextActive]}>Boy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderBtn, gender === 'girl' && styles.genderBtnActive]}
            onPress={() => setGender('girl')} activeOpacity={0.85}>
            <Text style={styles.genderEmoji}>👧</Text>
            <Text style={[styles.genderText, gender === 'girl' && styles.genderTextActive]}>Girl</Text>
          </TouchableOpacity>
        </View>

        {error.length > 0 && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity onPress={handleSave} activeOpacity={0.88} disabled={loading} style={styles.btnWrap}>
          <LinearGradient colors={Gradients.primary} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.btn}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Continue</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={onComplete} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>

      <DatePickerModal
        visible={showPicker}
        onConfirm={(d) => { setBirth(d); setShow(false); }}
        onCancel={() => setShow(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingBottom: 60,
  },
  headerTitle: {
    fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 4,
  },
  headerSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.85)',
  },

  avatarOverlapWrap: {
    alignItems: 'center',
    marginTop: -54,
    zIndex: 10,
  },
  avatarWrap: {
    width: 108, height: 108, borderRadius: 54,
    borderWidth: 4, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 10,
    backgroundColor: '#fff',
  },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#f5e6d3',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarIcon: { fontSize: 36 },
  avatarBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarBadgeText: { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: -2 },
  avatarHint: { fontSize: 12, color: Colors.textLight, marginTop: 8, fontWeight: '500' },

  body: { flex: 1, backgroundColor: Colors.background },

  label: { fontSize: 13, fontWeight: '700', color: Colors.textLight, marginBottom: 8, letterSpacing: 0.5 },
  input: {
    height: 56, backgroundColor: '#fff', borderRadius: 16,
    paddingHorizontal: 18, fontSize: 16, color: Colors.dark,
    marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  dateBtn: {
    height: 56, backgroundColor: '#fff', borderRadius: 16,
    paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  dateBtnText: { fontSize: 16, color: Colors.dark },
  dateIcon: { fontSize: 20 },

  genderRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  genderBtn: {
    flex: 1, height: 64, borderRadius: 16, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 2, borderColor: '#E2E8F0',
  },
  genderBtnActive: { borderColor: Colors.secondary, backgroundColor: Colors.secondary + '10' },
  genderEmoji: { fontSize: 24 },
  genderText: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  genderTextActive: { color: Colors.secondary },

  error: { fontSize: 13, color: Colors.secondary, fontWeight: '600', marginBottom: 12, textAlign: 'center' },

  btnWrap: { width: '100%', marginBottom: 16 },
  btn: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 18, fontWeight: '900', color: '#fff' },

  skipBtn: { alignSelf: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14, color: Colors.textLight, fontWeight: '600' },

  // Date picker modal
  pickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
  },
  pickerTitle: { fontSize: 18, fontWeight: '800', color: Colors.dark, textAlign: 'center', marginBottom: 20 },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between', height: 220 },
  pickerCol: { flex: 1, marginHorizontal: 4 },
  pickerItem: { height: 44, alignItems: 'center', justifyContent: 'center' },
  pickerItemText: { fontSize: 17, color: '#aaa', fontWeight: '500' },
  pickerItemSelected: { fontSize: 20, color: Colors.secondary, fontWeight: '800' },
  pickerBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  pickerCancel: {
    flex: 1, height: 52, borderRadius: 26, borderWidth: 1.5,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  pickerCancelText: { fontSize: 16, fontWeight: '700', color: Colors.textLight },
  pickerConfirm: { flex: 1, height: 52, borderRadius: 26, overflow: 'hidden' },
  pickerConfirmGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pickerConfirmText: { fontSize: 16, fontWeight: '900', color: '#fff' },
});
