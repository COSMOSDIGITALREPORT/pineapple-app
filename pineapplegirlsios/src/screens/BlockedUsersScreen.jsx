import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  Image, TouchableOpacity, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { Colors } from '../theme/colors';
import { getBlockedUsers, unblockUser } from '../services/api';

export default function BlockedUsersScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState(null);

  useEffect(() => {
    getBlockedUsers()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUnblock = (user) => {
    Alert.alert(
      'Unblock User',
      `Unblock ${user.name}? They will be able to call you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock', style: 'destructive',
          onPress: async () => {
            setUnblocking(user.id);
            try {
              await unblockUser(user.id);
              setUsers((prev) => prev.filter((u) => u.id !== user.id));
            } catch {
              Alert.alert('Error', 'Could not unblock. Try again.');
            } finally {
              setUnblocking(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#3A0068" translucent={false} />

      <LinearGradient
        colors={['#3A0068', '#C0003A']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Blocked Users</Text>
          <Text style={styles.headerSub}>{users.length} blocked</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🙌</Text>
          <Text style={styles.emptyTitle}>No Blocked Users</Text>
          <Text style={styles.emptySub}>You haven't blocked anyone yet.</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
              ) : (
                <LinearGradient colors={['#FF3870', '#C0004A']} style={styles.avatarFallback}>
                  <Text style={styles.avatarLetter}>{(item.name || '?')[0].toUpperCase()}</Text>
                </LinearGradient>
              )}
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{item.name || 'Unknown'}</Text>
                <Text style={styles.meta}>{item.city || item.language || item.gender || '—'}</Text>
              </View>
              <TouchableOpacity
                style={styles.unblockBtn}
                activeOpacity={0.8}
                disabled={unblocking === item.id}
                onPress={() => handleUnblock(item)}>
                {unblocking === item.id
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <Text style={styles.unblockText}>Unblock</Text>}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF5F8' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingBottom: 20, gap: 12,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40 },
  emptyIcon: { fontSize: 52, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.dark },
  emptySub: { fontSize: 14, color: Colors.textLight, textAlign: 'center' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 18, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 22, fontWeight: '900', color: '#fff' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.dark },
  meta: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  unblockBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: Colors.primary,
    minWidth: 80, alignItems: 'center',
  },
  unblockText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});
