import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '../components/Icon';
import { Colors } from '../theme/colors';
import { updateProfile, uploadAvatar } from '../services/api';
import { setProfile } from '../store/slices/userSlice';

export default function EditProfileScreen({ onBack, onPremium }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.user);

  const [displayName, setDisplayName]   = useState(user.name || '');
  const [bio, setBio]                   = useState(user.bio || '');
  const [language, setLanguage]         = useState(user.language || '');
  const [city, setCity]                 = useState(user.city || '');
  const [avatarUri, setAvatarUri]       = useState(user.avatarUrl || null);
  const [loading, setLoading]           = useState(false);
  const [saved, setSaved]               = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    setDisplayName(user.name || '');
    setBio(user.bio || '');
    setLanguage(user.language || '');
    setCity(user.city || '');
    setAvatarUri(user.avatarUrl || null);
  }, [user.name, user.bio, user.language, user.city, user.avatarUrl]);

  const handlePickPhoto = () => {
    Alert.alert('Profile Photo', 'Choose a photo', [
      {
        text: 'Camera',
        onPress: () =>
          launchCamera({ mediaType: 'photo', quality: 0.8, cameraType: 'front' }, (res) => {
            if (!res.didCancel && !res.errorCode && res.assets?.[0]?.uri) {
              setAvatarUri(res.assets[0].uri);
            }
          }),
      },
      {
        text: 'Photo Library',
        onPress: () =>
          launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 }, (res) => {
            if (!res.didCancel && !res.errorCode && res.assets?.[0]?.uri) {
              setAvatarUri(res.assets[0].uri);
            }
          }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!displayName.trim()) { setError('Name cannot be empty'); return; }
    setLoading(true);
    setError('');
    try {
      let finalAvatarUrl = avatarUri;
      if (avatarUri && avatarUri.startsWith('file://')) {
        finalAvatarUrl = await uploadAvatar(avatarUri);
      }
      const updated = await updateProfile({
        name:       displayName.trim(),
        bio:        bio.trim(),
        language:   language.trim(),
        city:       city.trim(),
        gender:     'boy',
        avatar_url: finalAvatarUrl,
      });
      dispatch(setProfile(updated));
      // Update stored session so photo persists after app restart
      try {
        const raw = await AsyncStorage.getItem('user_session');
        if (raw) {
          const session = JSON.parse(raw);
          session.user = { ...session.user, ...updated };
          await AsyncStorage.setItem('user_session', JSON.stringify(session));
        }
      } catch (_) {}
      setSaved(true);
      setTimeout(() => { setSaved(false); onBack(); }, 800);
    } catch (e) {
      setError(e.message || 'Failed to save. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.doneBtn}>
          <Text style={[styles.doneText, loading && { opacity: 0.4 }]}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={handlePickPhoto}
            activeOpacity={0.85}
            style={styles.avatarTouchable}>
            <View style={styles.avatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Icon name="user" size={52} color={Colors.primary} />
                </View>
              )}
              {/* Edit badge — View + absoluteFill to avoid LinearGradient-as-container bug */}
              <View style={styles.editBadge}>
                <LinearGradient
                  colors={['#FF3870', '#C0004A']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Icon name="edit-2" size={15} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <FieldGroup label="DISPLAY NAME">
            <TextInput
              style={styles.textInput}
              value={displayName}
              onChangeText={(t) => { setDisplayName(t); setError(''); }}
              placeholder="Your name"
              placeholderTextColor="#aaa"
            />
          </FieldGroup>

          <FieldGroup label="BIO">
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself..."
              multiline
              numberOfLines={4}
              placeholderTextColor="#aaa"
              textAlignVertical="top"
            />
          </FieldGroup>

          <FieldGroup label="CITY">
            <TextInput
              style={styles.textInput}
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Delhi, Mumbai"
              placeholderTextColor="#aaa"
            />
          </FieldGroup>

          <FieldGroup label="LANGUAGE">
            <TextInput
              style={styles.textInput}
              value={language}
              onChangeText={setLanguage}
              placeholder="e.g. Hindi, English"
              placeholderTextColor="#aaa"
            />
          </FieldGroup>
        </View>

        {error.length > 0 && <Text style={styles.errorText}>{error}</Text>}

        {/* Save button — View + absoluteFill to fix LinearGradient container bug */}
        <TouchableOpacity
          style={styles.saveBtn}
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={loading}>
          <LinearGradient
            colors={saved ? ['#22C55E', '#16A34A'] : ['#FF3870', '#C0004A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>{saved ? '✓  Saved' : 'Save Changes'}</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

function FieldGroup({ label, children }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FB' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.dark, includeFontPadding: false },
  doneBtn: { padding: 8 },
  doneText: { fontSize: 16, fontWeight: '800', color: Colors.secondary, includeFontPadding: false },

  scrollContent: { paddingHorizontal: 20, paddingTop: 28 },

  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarTouchable: { marginBottom: 10 },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarHint: {
    fontSize: 13,
    color: Colors.secondary,
    fontWeight: '700',
    includeFontPadding: false,
  },

  formSection: { gap: 14, marginBottom: 16 },
  fieldGroup: { gap: 7 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.2,
    marginLeft: 4,
    includeFontPadding: false,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 18,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    includeFontPadding: false,
  },
  textArea: {
    height: 96,
    paddingTop: 14,
    paddingBottom: 14,
  },

  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    includeFontPadding: false,
  },

  bentoSection: { gap: 12, marginBottom: 28, marginTop: 8 },
  bentoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  bentoLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bentoIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bentoTitle: { fontSize: 15, fontWeight: '700', color: Colors.dark, includeFontPadding: false },
  bentoSub: { fontSize: 12, color: '#94a3b8', marginTop: 2, includeFontPadding: false },

  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#E2E8F0', padding: 2 },
  toggleActive: { backgroundColor: Colors.secondary },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleKnobActive: { alignSelf: 'flex-end' },

  saveBtn: {
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    includeFontPadding: false,
  },
});
