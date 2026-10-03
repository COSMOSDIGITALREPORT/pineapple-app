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
  Modal,
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

const POPULAR = [
  { id: 'hi', label: 'Hindi',   native: 'हिंदी',    flag: '🇮🇳' },
  { id: 'en', label: 'English', native: 'English',   flag: '🇬🇧' },
  { id: 'bn', label: 'Bengali', native: 'বাংলা',     flag: '🇮🇳' },
  { id: 'ta', label: 'Tamil',   native: 'தமிழ்',     flag: '🇮🇳' },
  { id: 'te', label: 'Telugu',  native: 'తెలుగు',    flag: '🇮🇳' },
  { id: 'mr', label: 'Marathi', native: 'मराठी',     flag: '🇮🇳' },
];

const REGIONAL = [
  { id: 'gu',  label: 'Gujarati',      native: 'ગુજરાતી',    flag: '🇮🇳' },
  { id: 'kn',  label: 'Kannada',       native: 'ಕನ್ನಡ',      flag: '🇮🇳' },
  { id: 'ml',  label: 'Malayalam',     native: 'മലയാളം',     flag: '🇮🇳' },
  { id: 'pa',  label: 'Punjabi',       native: 'ਪੰਜਾਬੀ',     flag: '🇮🇳' },
  { id: 'ur',  label: 'Urdu',          native: 'اردو',        flag: '🇮🇳' },
  { id: 'bh',  label: 'Bhojpuri',      native: 'भोजपुरी',    flag: '🇮🇳' },
  { id: 'or',  label: 'Odia',          native: 'ଓଡ଼ିଆ',       flag: '🇮🇳' },
  { id: 'as',  label: 'Assamese',      native: 'অসমীয়া',    flag: '🇮🇳' },
  { id: 'raj', label: 'Rajasthani',    native: 'राजस्थानी',   flag: '🇮🇳' },
  { id: 'har', label: 'Haryanvi',      native: 'हरयाणवी',    flag: '🇮🇳' },
  { id: 'mai', label: 'Maithili',      native: 'मैथिली',     flag: '🇮🇳' },
  { id: 'ne',  label: 'Nepali',        native: 'नेपाली',     flag: '🇳🇵' },
  { id: 'ks',  label: 'Kashmiri',      native: 'کٲشُر',      flag: '🇮🇳' },
  { id: 'sd',  label: 'Sindhi',        native: 'سنڌي',       flag: '🇮🇳' },
  { id: 'doi', label: 'Dogri',         native: 'डोगरी',      flag: '🇮🇳' },
  { id: 'kok', label: 'Konkani',       native: 'कोंकणी',     flag: '🇮🇳' },
  { id: 'sat', label: 'Santali',       native: 'ᱥᱟᱱᱛᱟᱲᱤ',   flag: '🇮🇳' },
  { id: 'mni', label: 'Manipuri',      native: 'মৈতৈলোন্',  flag: '🇮🇳' },
  { id: 'brx', label: 'Bodo',          native: 'बड़ो',        flag: '🇮🇳' },
  { id: 'cha', label: 'Chhattisgarhi', native: 'छत्तीसगढ़ी', flag: '🇮🇳' },
  { id: 'awa', label: 'Awadhi',        native: 'अवधी',       flag: '🇮🇳' },
  { id: 'sa',  label: 'Sanskrit',      native: 'संस्कृत',    flag: '🇮🇳' },
  { id: 'ar',  label: 'Arabic',        native: 'العربية',    flag: '🇸🇦' },
];

const ALL_LANGS = [...POPULAR, ...REGIONAL];

export default function EditProfileScreen({ onBack, onPremium }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.user);

  const TOPIC_OPTIONS = ['Music', 'Movies', 'Travel', 'Food', 'Fitness', 'Books', 'Gaming', 'Fashion', 'Business', 'Sports'];

  const parsePrefs = (raw) => {
    if (!raw) return { topics: [], noInappropriate: true };
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return { topics: [], noInappropriate: true }; }
  };

  const [displayName, setDisplayName]   = useState(user.name || '');
  const [bio, setBio]                   = useState(user.bio || '');
  const [language, setLanguage]         = useState(user.language || 'Hindi');
  const [city, setCity]                 = useState(user.city || '');
  const [avatarUri, setAvatarUri]       = useState(user.avatarUrl || null);
  const [loading, setLoading]           = useState(false);
  const [saved, setSaved]               = useState(false);
  const [error, setError]               = useState('');
  const [selTopics, setSelTopics]       = useState(parsePrefs(user.content_prefs).topics || []);
  const [noInappropriate, setNoInappropriate] = useState(parsePrefs(user.content_prefs).noInappropriate !== false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [langSearch, setLangSearch]     = useState('');

  const currentLangObj = ALL_LANGS.find(l => l.label.toLowerCase() === (language || 'Hindi').toLowerCase()) || POPULAR[0];

  const toggleTopic = (t) => setSelTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  useEffect(() => {
    setDisplayName(user.name || '');
    setBio(user.bio || '');
    setLanguage(user.language || 'Hindi');
    setCity(user.city || '');
    setAvatarUri(user.avatarUrl || null);
    const p = parsePrefs(user.content_prefs);
    setSelTopics(p.topics || []);
    setNoInappropriate(p.noInappropriate !== false);
  }, [user.name, user.bio, user.language, user.city, user.avatarUrl, user.content_prefs]);

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
        name:          displayName.trim(),
        bio:           bio.trim(),
        language:      language.trim(),
        city:          city.trim(),
        gender:        'girl',
        avatar_url:    finalAvatarUrl,
        content_prefs: { topics: selTopics, noInappropriate },
      });
      dispatch(setProfile(updated));
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
              {/* Edit badge */}
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
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowLangModal(true)}
              style={styles.langPickerField}>
              <View style={styles.langFieldLeft}>
                <Text style={styles.langFlagText}>{currentLangObj.flag}</Text>
                <View>
                  <Text style={styles.langLabelText}>{currentLangObj.label}</Text>
                  <Text style={styles.langNativeText}>{currentLangObj.native}</Text>
                </View>
              </View>
              <View style={styles.langChangePill}>
                <Text style={styles.langChangeText}>Select</Text>
                <Icon name="chevron-down" size={14} color={Colors.secondary} />
              </View>
            </TouchableOpacity>
          </FieldGroup>
        </View>

        {/* Content Preferences */}
        <View style={styles.formSection}>
          <Text style={styles.prefsHeading}>Conversation Preferences</Text>
          <Text style={styles.prefsSub}>Boys will see what topics you're comfortable with</Text>
          <View style={styles.topicsWrap}>
            {TOPIC_OPTIONS.map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => toggleTopic(t)}
                style={[styles.topicTag, selTopics.includes(t) && styles.topicTagActive]}>
                <Text style={[styles.topicTagText, selTopics.includes(t) && styles.topicTagTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.boundaryRow} onPress={() => setNoInappropriate(!noInappropriate)} activeOpacity={0.8}>
            <View style={[styles.checkbox, noInappropriate && styles.checkboxActive]}>
              {noInappropriate && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.boundaryTitle}>🚫 No inappropriate conversations</Text>
              <Text style={styles.boundarySub}>This will be visible on your profile card</Text>
            </View>
          </TouchableOpacity>
        </View>

        {error.length > 0 && <Text style={styles.errorText}>{error}</Text>}

        {/* Save button */}
        <TouchableOpacity
          style={styles.saveBtn}
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={loading}>
          <LinearGradient
            colors={saved ? ['#22c55e', '#16a34a'] : ['#FFC72C', '#FF8A5B', '#FF5A7A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>{saved ? '✓  Saved' : 'Save Changes'}</Text>
          }
        </TouchableOpacity>

      </ScrollView>

      {/* Language Picker Bottom Sheet Modal */}
      <Modal
        visible={showLangModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLangModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowLangModal(false)}
          />
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setShowLangModal(false)} style={styles.modalCloseBtn}>
                <Icon name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search box */}
            <View style={styles.modalSearchBox}>
              <Icon name="search" size={16} color="#94A3B8" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search language..."
                placeholderTextColor="#94A3B8"
                value={langSearch}
                onChangeText={setLangSearch}
              />
              {langSearch.length > 0 ? (
                <TouchableOpacity onPress={() => setLangSearch('')}>
                  <Icon name="x" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalList}>
              <View style={styles.langGrid}>
                {ALL_LANGS.filter(l =>
                  l.label.toLowerCase().includes(langSearch.toLowerCase()) ||
                  l.native.toLowerCase().includes(langSearch.toLowerCase())
                ).map((item) => {
                  const isSel = (language || '').toLowerCase() === item.label.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.langGridItem, isSel && styles.langGridItemSel]}
                      activeOpacity={0.75}
                      onPress={() => {
                        setLanguage(item.label);
                        setShowLangModal(false);
                        setLangSearch('');
                      }}>
                      <Text style={styles.gridFlag}>{item.flag}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.gridLabel, isSel && styles.gridLabelSel]}>{item.label}</Text>
                        <Text style={[styles.gridNative, isSel && styles.gridNativeSel]}>{item.native}</Text>
                      </View>
                      {isSel ? <Icon name="check" size={16} color={Colors.secondary} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  prefsHeading: { fontSize: 15, fontWeight: '800', color: Colors.dark, marginBottom: 4 },
  prefsSub: { fontSize: 12, color: '#94A3B8', marginBottom: 12 },
  topicsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  topicTag: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  topicTagActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  topicTagText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  topicTagTextActive: { color: Colors.primary },
  boundaryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', padding: 14, borderRadius: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  boundaryTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  boundarySub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    includeFontPadding: false,
  },

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

  langPickerField: {
    backgroundColor: '#fff',
    borderRadius: 16,
    height: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  langFieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langFlagText: { fontSize: 24 },
  langLabelText: { fontSize: 16, fontWeight: '700', color: Colors.dark },
  langNativeText: { fontSize: 12, color: '#94A3B8', fontWeight: '500', marginTop: 1 },
  langChangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  langChangeText: { fontSize: 12, fontWeight: '800', color: Colors.secondary },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.dark },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    paddingVertical: 0,
  },
  modalList: { maxHeight: 380 },
  langGrid: { gap: 8, paddingBottom: 16 },
  langGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  langGridItemSel: {
    backgroundColor: '#FFF0F5',
    borderColor: '#FFD1DC',
  },
  gridFlag: { fontSize: 22 },
  gridLabel: { fontSize: 15, fontWeight: '700', color: Colors.dark },
  gridLabelSel: { color: Colors.secondary },
  gridNative: { fontSize: 12, color: '#94A3B8', fontWeight: '500', marginTop: 1 },
  gridNativeSel: { color: '#E11D48' },
});
