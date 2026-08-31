import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from '../components/Icon';
import { Colors, Gradients } from '../theme/colors';
import { setRooms, setRoomsLoading } from '../store/slices/roomsSlice';
import { getRooms } from '../services/api';

export default function RoomsScreen({ onJoinRoom, onDrawer }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { list: rooms, loading } = useSelector((s) => s.rooms);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchRooms = async () => {
    dispatch(setRoomsLoading(true));
    try {
      const data = await getRooms();
      dispatch(setRooms(data || []));
    } catch {
      dispatch(setRooms([]));
    }
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRooms();
    setRefreshing(false);
  };

  const filtered = rooms.filter((r) =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.topic?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.roomsHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onDrawer} style={styles.roomsMenuBtn}>
          <Icon name="menu" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.roomsHeaderTitle}>Rooms</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.secondary} />}>

        {/* hero */}
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <Text style={styles.heroTitle}>Live Rooms 🎙️</Text>
          <Text style={styles.heroSub}>Discover live conversations & make new friends</Text>
        </LinearGradient>

        {/* promo */}
        <View style={styles.promoBanner}>
          <View style={styles.promoIcon}>
            <Icon name="users" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.promoText}>Experts will make your FRND in 5 min</Text>
        </View>

        {/* search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Icon name="search" size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Find a room..."
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch} />
          </View>
          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
            <Icon name="list" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* room cards */}
        {loading ? (
          <ActivityIndicator size="large" color={Colors.secondary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="users" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No rooms live right now</Text>
            <Text style={styles.emptySub}>Check back later for live rooms</Text>
          </View>
        ) : (
          filtered.map((room) =>
          <View key={room.id} style={styles.roomCard}>
              <View style={styles.roomCardTop}>
                <View style={styles.hostWrap}>
                  <View style={[styles.hostAvatar, { backgroundColor: Colors.primary + '33', alignItems: 'center', justifyContent: 'center' }]}>
                    <Icon name="user" size={24} color={Colors.primary} />
                  </View>
                  <View style={[styles.hostOnlineDot, { backgroundColor: room.is_live ? Colors.success : '#cbd5e1' }]} />
                </View>
                <View style={styles.roomMeta}>
                  <Text style={styles.roomTitle}>{room.name}</Text>
                  <View style={styles.roomTagRow}>
                    <View style={styles.langBadge}>
                      <Text style={styles.langBadgeText}>{room.language || 'HI'}</Text>
                    </View>
                    <View style={styles.ratingRow}>
                      <Icon name="users" size={12} color={Colors.secondary} />
                      <Text style={styles.ratingText}>{room.listener_count || 0} listening</Text>
                    </View>
                  </View>
                </View>
              </View>

              {room.topic ? <Text style={styles.roomDesc} numberOfLines={2}>{room.topic}</Text> : null}

              <View style={styles.roomCardBottom}>
                <View style={styles.participantRow}>
                  <View style={[styles.participantAv, styles.extraCount]}>
                    <Text style={styles.extraCountText}>{room.listener_count || 0}</Text>
                  </View>
                </View>

                <TouchableOpacity activeOpacity={0.85} style={styles.joinBtnWrap} onPress={() => onJoinRoom(room.id)}>
                  <LinearGradient
                  colors={Gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.joinBtn}>
                    <Text style={styles.joinBtnText}>Join Now</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )
        )}
      </ScrollView>

    </View>);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  roomsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  roomsMenuBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  roomsHeaderTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.dark },
  roomsBellBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100, gap: 16 },

  hero: {
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 20,
    overflow: 'hidden',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 8,
    minHeight: 100,
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.64, marginBottom: 6 },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.95)', lineHeight: 22 },

  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.primary + '22',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '33'
  },
  promoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  promoText: { fontSize: 12, fontWeight: '700', color: Colors.dark, flex: 1 },

  searchRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, height: 52, gap: 12 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.dark },
  filterBtn: { width: 52, height: 52, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  roomCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 2
  },
  roomCardTop: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  hostWrap: { width: 56, height: 56, position: 'relative' },
  hostAvatar: { width: '100%', height: '100%', borderRadius: 28, borderWidth: 2, borderColor: '#fff' },
  hostOnlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  roomMeta: { flex: 1, justifyContent: 'center' },
  roomTitle: { fontSize: 20, fontWeight: '900', color: Colors.dark, marginBottom: 4 },
  roomTagRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  langBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  langBadgeText: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '800', color: Colors.secondary },
  roomDesc: { fontSize: 15, color: '#64748b', lineHeight: 22, marginVertical: 8 },
  roomCardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  participantRow: { flexDirection: 'row', alignItems: 'center' },
  participantAv: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#fff' },
  extraCount: { backgroundColor: Colors.primary + '22', alignItems: 'center', justifyContent: 'center' },
  extraCountText: { fontSize: 11, fontWeight: '900', color: Colors.primary },
  joinBtnWrap: { borderRadius: 20, overflow: 'hidden', shadowColor: Colors.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  joinBtn: { height: 44, paddingHorizontal: 0, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  joinBtnText: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.5, margin: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.dark },
  emptySub: { fontSize: 14, color: Colors.textLight },

});
