import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  NativeModules,
  AppState,
  PermissionsAndroid,
} from 'react-native';

const { RingtoneModule } = NativeModules;

export default function CallPermissionSetup() {
  const [perms, setPerms] = useState({
    postNotifications: true,
    fullScreenIntent: true,
    canDrawOverlays: true,
    ignoringBatteryOptimizations: true,
    manufacturer: '',
    allGranted: true,
  });
  const [expanded, setExpanded] = useState(false);

  const checkPermissions = useCallback(async () => {
    if (Platform.OS !== 'android' || !RingtoneModule?.checkCallPermissions) return;
    try {
      const res = await RingtoneModule.checkCallPermissions();
      if (res) {
        setPerms(res);
        // If anything is missing, keep expanded so user can see what to fix
        if (!res.allGranted) {
          setExpanded(true);
        }
      }
    } catch (e) {
      console.warn('[CallPermissionSetup] Check permissions error:', e);
    }
  }, []);

  useEffect(() => {
    checkPermissions();

    // Re-check automatically whenever user returns to the app from Settings
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPermissions();
      }
    });

    return () => subscription.remove();
  }, [checkPermissions]);

  if (Platform.OS !== 'android') return null;

  const handleRequestNotifications = async () => {
    try {
      if (Platform.Version >= 33) {
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (res !== PermissionsAndroid.RESULTS.GRANTED) {
          RingtoneModule?.openNotificationSettings?.();
        }
      } else {
        RingtoneModule?.openNotificationSettings?.();
      }
    } catch (_) {
      RingtoneModule?.openNotificationSettings?.();
    }
    setTimeout(checkPermissions, 800);
  };

  const handleRequestFullScreen = () => {
    RingtoneModule?.requestFullScreenIntentPermission?.();
  };

  const handleRequestOverlay = () => {
    RingtoneModule?.requestOverlayPermission?.();
  };

  const handleRequestBattery = () => {
    RingtoneModule?.requestBatteryOptimization?.();
  };

  const handleOpenAutostart = () => {
    RingtoneModule?.openAutostartSettings?.();
  };

  const items = [
    {
      id: 'notifications',
      title: 'Call Notifications',
      desc: 'Receive alerts when someone calls you',
      granted: perms.postNotifications,
      onPress: handleRequestNotifications,
    },
    {
      id: 'fullscreen',
      title: 'Full-Screen Call UI',
      desc: 'Wake screen and show WhatsApp-style call screen',
      granted: perms.fullScreenIntent,
      onPress: handleRequestFullScreen,
    },
    {
      id: 'overlay',
      title: 'Display Over Other Apps',
      desc: 'Show incoming call banner while using other apps',
      granted: perms.canDrawOverlays,
      onPress: handleRequestOverlay,
    },
    {
      id: 'battery',
      title: 'Unrestricted Battery',
      desc: 'Allow phone to ring when app is closed / asleep',
      granted: perms.ignoringBatteryOptimizations,
      onPress: handleRequestBattery,
    },
    {
      id: 'autostart',
      title: 'Background Auto-start',
      desc: perms.manufacturer
        ? `Enable autostart for ${perms.manufacturer.toUpperCase()}`
        : 'Keep background call receiver alive',
      granted: null, // OEM specific, user must toggle
      onPress: handleOpenAutostart,
    },
  ];

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setExpanded(!expanded)}
        style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>📞 Call Permission Setup</Text>
          <Text style={styles.headerSub}>
            {perms.allGranted
              ? 'All permissions active — calls will ring properly'
              : 'Setup needed so calls ring when app is closed'}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: perms.allGranted ? '#E8F5E9' : '#FFF3E0' },
          ]}>
          <Text
            style={[
              styles.statusText,
              { color: perms.allGranted ? '#2E7D32' : '#E65100' },
            ]}>
            {perms.allGranted ? '✓ Ready' : '⚠️ Action'}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.itemList}>
          <Text style={styles.note}>
            Tap each item below to grant permissions so your phone wakes and rings when a call arrives:
          </Text>
          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemDesc}>{item.desc}</Text>
              </View>
              {item.granted === true ? (
                <View style={styles.grantedBadge}>
                  <Text style={styles.grantedText}>✓ Allowed</Text>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={item.onPress}
                  style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>
                    {item.granted === false ? 'Enable' : 'Open'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0E6F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1E2D',
  },
  headerSub: {
    fontSize: 11,
    color: '#7E8299',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F7',
    paddingTop: 10,
  },
  note: {
    fontSize: 11,
    color: '#888888',
    marginBottom: 8,
    lineHeight: 15,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FAFAFA',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2B36',
  },
  itemDesc: {
    fontSize: 10,
    color: '#8A8A9E',
    marginTop: 1,
  },
  grantedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  grantedText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '700',
  },
  actionBtn: {
    backgroundColor: '#FF3870',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

