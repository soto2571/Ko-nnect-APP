import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Switch, Modal, KeyboardAvoidingView, Platform,
  Dimensions, FlatList, PanResponder, Animated, Linking, AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import { DEFAULT_PRIMARY_COLOR } from '@/constants';

const PRESET_COLORS = ['#4F46E5','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6'];
const RADIUS_MIN = 50; const RADIUS_MAX = 500;
const MAP_H = 230;    // must match s.mapContainer height
const CIRCLE_PX = 70; // pixel radius of the fixed overlay circle

const STEPS = Array.from({ length: 19 }, (_, i) => 50 + i * 25); // 50,75,...,500

function RadiusSlider({ value, onChange, color, radiusRef, dragBaseRef, onDragStart, onDragEnd }: {
  value: number; onChange: (v: number) => void; color: string;
  radiusRef: React.MutableRefObject<number>; dragBaseRef: React.MutableRefObject<number>;
  onDragStart: () => void; onDragEnd: () => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);          // ref so the PanResponder closure always reads fresh
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef   = useRef(onDragEnd);
  const onChangeRef    = useRef(onChange);
  useEffect(() => { onDragStartRef.current = onDragStart; }, [onDragStart]);
  useEffect(() => { onDragEndRef.current   = onDragEnd;   }, [onDragEnd]);
  useEffect(() => { onChangeRef.current    = onChange;    }, [onChange]);

  const activeIdx = Math.round((value - RADIUS_MIN) / 25);
  const thumbPct  = (value - RADIUS_MIN) / (RADIUS_MAX - RADIUS_MIN);
  const thumbX    = trackWidth > 0 ? thumbPct * trackWidth : 0;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder:         () => true,
      onMoveShouldSetPanResponderCapture:  () => true,
      onPanResponderGrant: () => {
        dragBaseRef.current = radiusRef.current;
        onDragStartRef.current();
      },
      onPanResponderMove: (_, g) => {
        const tw = trackWidthRef.current;
        if (tw === 0) return;
        const basePct = (dragBaseRef.current - RADIUS_MIN) / (RADIUS_MAX - RADIUS_MIN);
        const newPct  = Math.max(0, Math.min(1, basePct + g.dx / tw));
        const raw     = RADIUS_MIN + newPct * (RADIUS_MAX - RADIUS_MIN);
        onChangeRef.current(Math.round(raw / 25) * 25);
      },
      onPanResponderRelease:   () => onDragEndRef.current(),
      onPanResponderTerminate: () => onDragEndRef.current(),
    })
  ).current;

  return (
    <View style={rs.wrap}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={rs.label}>Radio de zona</Text>
        <View style={[rs.valuePill, { backgroundColor: color + '18', borderColor: color + '40' }]}>
          <Text style={[rs.valueText, { color }]}>{value}m</Text>
        </View>
      </View>

      {/* Dot track + thumb */}
      <View
        style={rs.trackWrap}
        onLayout={(e: any) => {
          const w = e.nativeEvent.layout.width - 28;
          trackWidthRef.current = w;
          setTrackWidth(w);
        }}
      >
        {/* Dot row */}
        <View style={rs.dotRow}>
          {STEPS.map((step, i) => {
            const active = i <= activeIdx;
            return (
              <View
                key={step}
                style={[
                  rs.dot,
                  active
                    ? { backgroundColor: color, width: 8, height: 8, borderRadius: 4 }
                    : { backgroundColor: '#D1D5DB', width: 6, height: 6, borderRadius: 3 },
                ]}
              />
            );
          })}
        </View>

        {/* Thumb — draggable */}
        <View
          style={[rs.thumbHitbox, { left: thumbX }]}
          {...pan.panHandlers}
        >
          <View style={[rs.thumb, { borderColor: color, shadowColor: color }]}>
            <View style={[rs.thumbDot, { backgroundColor: color }]} />
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={rs.rangeLabel}>50m</Text>
        <Text style={rs.rangeLabel}>500m</Text>
      </View>
    </View>
  );
}

const rs = StyleSheet.create({
  wrap:  { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  valuePill: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  valueText: { fontSize: 14, fontWeight: '800' },

  trackWrap: {
    height: 52, justifyContent: 'center',
    paddingHorizontal: 14, position: 'relative',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute', left: 14, right: 14,
  },
  dot: { borderRadius: 4 },

  thumbHitbox: {
    position: 'absolute',
    width: 48, height: 52,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: -10,
  },
  thumb: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#fff', borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  thumbDot: { width: 10, height: 10, borderRadius: 5 },
  rangeLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
});

export default function SettingsScreen() {
  const { user, business, logout, setBusiness, primaryColor } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName]       = useState(business?.name ?? '');
  const [color, setColor]     = useState(business?.color ?? DEFAULT_PRIMARY_COLOR);
  const [payPeriodType, setPayPeriodType]           = useState<'weekly'|'biweekly'|'semi-monthly'>(business?.payPeriodType ?? 'weekly');
  const [payPeriodStartDay, setPayPeriodStartDay]   = useState(business?.payPeriodStartDay ?? 0);
  const [payPeriodAnchorDate, setPayPeriodAnchorDate] = useState(business?.payPeriodAnchorDate ?? '');
  const [openDays, setOpenDays]                   = useState<number[]>(business?.openDays ?? [0,1,2,3,4,5,6]);
  const [maxHoursPerDay, setMaxHoursPerDay]       = useState(business?.maxHoursPerDay ?? 0);
  const [autoClockOut, setAutoClockOut]           = useState(business?.autoClockOut ?? false);
  const [autoClockOutMinutes, setAutoClockOutMinutes] = useState(business?.autoClockOutMinutes ?? 30);
  const [schedulingWeeks, setSchedulingWeeks]     = useState(business?.schedulingWeeks ?? 6);
  const [notifyClockIn,  setNotifyClockIn]  = useState(business?.notifyClockIn  ?? true);
  const [notifyBreak,    setNotifyBreak]    = useState(business?.notifyBreak    ?? false);
  const [notifyClockOut, setNotifyClockOut] = useState(business?.notifyClockOut ?? true);
  const [notifyLate,     setNotifyLate]     = useState(business?.notifyLate     ?? true);
  const [pushPermission, setPushPermission] = useState<string>('undetermined');
  const [geofenceEnabled, setGeofenceEnabled] = useState(business?.geofenceEnabled ?? false);
  const [geofenceLat, setGeofenceLat]         = useState(business?.geofenceLat ?? null as number | null);
  const [geofenceLng, setGeofenceLng]         = useState(business?.geofenceLng ?? null as number | null);
  const [geofenceRadiusM, setGeofenceRadiusM] = useState(business?.geofenceRadiusM ?? 100);
  const [geofencePin, setGeofencePin]         = useState(business?.geofencePin ?? '');
  const [showPinRaw, setShowPinRaw]           = useState(false);
  const [locating, setLocating]               = useState(false);
  const [searchQuery, setSearchQuery]         = useState('');
  const [searchResults, setSearchResults]     = useState<{ place_id: number; display_name: string; lat: string; lon: string }[]>([]);
  const [searching, setSearching]             = useState(false);
  const mapRef = useRef<MapView>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragBaseRef        = useRef(geofenceRadiusM);
  const radiusRef          = useRef(geofenceRadiusM);
  const isProgrammaticZoom = useRef(false);
  useEffect(() => { radiusRef.current = geofenceRadiusM; }, [geofenceRadiusM]);
  const scrollRef  = useRef<ScrollView>(null);
  const pinRef     = useRef<View>(null);
  const pinFlash   = useRef(new Animated.Value(0)).current;
  const setScrollEnabled = (v: boolean) =>
    scrollRef.current?.setNativeProps({ scrollEnabled: v });

  const scrollAndFlashPin = () => {
    const screenH = Dimensions.get('window').height;
    pinRef.current?.measureLayout(
      scrollRef.current as any,
      (_x, y, _w, h) => {
        const target = y - screenH / 2 + h / 2;
        scrollRef.current?.scrollTo({ y: Math.max(0, target), animated: true });
      },
      () => {}
    );
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(pinFlash, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(pinFlash, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]).start();
    }, 350);
  };

  const [saving, setSaving]   = useState(false);
  const [isNew, setIsNew]     = useState(!business);
  const isGoogleUser = user?.provider === 'google';

  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [deletingBiz, setDeletingBiz] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => setPushPermission(status));
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        Notifications.getPermissionsAsync().then(({ status }) => setPushPermission(status));
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (business) {
      setName(business.name);
      setColor(business.color);
      setPayPeriodType(business.payPeriodType ?? 'weekly');
      setPayPeriodStartDay(business.payPeriodStartDay ?? 0);
      setPayPeriodAnchorDate(business.payPeriodAnchorDate ?? '');
      setOpenDays(business.openDays ?? [0,1,2,3,4,5,6]);
      setMaxHoursPerDay(business.maxHoursPerDay ?? 0);
      setAutoClockOut(business.autoClockOut ?? false);
      setAutoClockOutMinutes(business.autoClockOutMinutes ?? 30);
      setSchedulingWeeks(business.schedulingWeeks ?? 6);
      setGeofenceEnabled(business.geofenceEnabled ?? false);
      setGeofenceLat(business.geofenceLat ?? null);
      setGeofenceLng(business.geofenceLng ?? null);
      setGeofenceRadiusM(business.geofenceRadiusM ?? 100);
      setGeofencePin(business.geofencePin ?? '');
      setIsNew(false);
    }
  }, [business]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error','El nombre del negocio es requerido.'); return; }
    setSaving(true);
    try {
      let updated;
      if (geofenceEnabled && (!geofenceLat || !geofenceLng)) {
        Alert.alert('Zona de Ponche', 'Debes marcar la ubicación del negocio en el mapa antes de activar la zona.'); setSaving(false); return;
      }
      if (geofenceEnabled && geofencePin.length < 4) {
        setSaving(false);
        scrollAndFlashPin();
        return;
      }
      const payload = {
        name: name.trim(), color, payPeriodType, payPeriodStartDay,
        payPeriodAnchorDate: payPeriodAnchorDate || undefined,
        openDays, maxHoursPerDay,
        autoClockOut, autoClockOutMinutes: autoClockOut ? autoClockOutMinutes : 30,
        schedulingWeeks,
        geofenceEnabled,
        geofenceLat: geofenceEnabled ? geofenceLat : null,
        geofenceLng: geofenceEnabled ? geofenceLng : null,
        geofenceRadiusM,
        geofencePin: geofenceEnabled && geofencePin.length >= 4 ? geofencePin : null,
        notifyClockIn, notifyBreak, notifyClockOut, notifyLate,
      };
      if (isNew) {
        updated = await api.createBusiness(payload);
      } else {
        updated = await api.updateBusiness(business!.businessId, payload);
      }
      setBusiness(updated); setIsNew(false);
      Alert.alert('Guardado','Perfil del negocio actualizado.');
    } catch(err:any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDeleteBusiness = () => {
    if (!business) return;
    Alert.alert(
      'Eliminar negocio',
      `Esto borrará permanentemente "${business.name}", todos los empleados, turnos y registros de tiempo. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            setDeleteConfirmText('');
            setShowDeleteModal(true);
          },
        },
      ],
    );
  };

  const handleConfirmDelete = async () => {
    setDeletingBiz(true);
    try {
      await api.deleteBusiness(business!.businessId);
      setShowDeleteModal(false);
      logout();
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setDeletingBiz(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { Alert.alert('Error','Por favor llena todos los campos de contraseña.'); return; }
    if (newPw !== confirmPw) { Alert.alert('Error','Las contraseñas nuevas no coinciden.'); return; }
    if (newPw.length < 6) { Alert.alert('Error','La nueva contraseña debe tener al menos 6 caracteres.'); return; }
    setChangingPw(true);
    try {
      await api.changePassword({ currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      Alert.alert('Éxito','Contraseña actualizada correctamente.');
    } catch(err:any) { Alert.alert('Error', err.message); }
    finally { setChangingPw(false); }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!text.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&addressdetails=0`,
          { headers: { 'Accept-Language': 'es', 'User-Agent': 'KonnectaApp/1.0' } }
        );
        const data = await res.json();
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const radiusToDelta = (r: number) => r * MAP_H / (CIRCLE_PX * 111320);

  const handleRadiusChange = (newRadius: number) => {
    setGeofenceRadiusM(newRadius);
    const lat = geofenceLat ?? 18.4655;
    const lng = geofenceLng ?? -66.1057;
    const delta = radiusToDelta(newRadius);
    isProgrammaticZoom.current = true;
    mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta }, 400);
    setTimeout(() => { isProgrammaticZoom.current = false; }, 600);
  };

  const handleRegionChangeComplete = (region: Region) => {
    setGeofenceLat(region.latitude);
    setGeofenceLng(region.longitude);
    if (!isProgrammaticZoom.current) {
      const raw = CIRCLE_PX * region.latitudeDelta * 111320 / MAP_H;
      const snapped = Math.max(RADIUS_MIN, Math.min(RADIUS_MAX, Math.round(raw / 25) * 25));
      setGeofenceRadiusM(snapped);
    }
  };

  const handlePickResult = (result: { lat: string; lon: string; display_name: string }) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setGeofenceLat(lat);
    setGeofenceLng(lng);
    setSearchQuery(result.display_name.split(',').slice(0, 2).join(','));
    setSearchResults([]);
    const delta = radiusToDelta(geofenceRadiusM);
    isProgrammaticZoom.current = true;
    mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta }, 600);
    setTimeout(() => { isProgrammaticZoom.current = false; }, 800);
  };

  const handleUseMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitas permitir el acceso a tu ubicación para usar esta función.');
        return;
      }

      const flyTo = (lat: number, lng: number) => {
        setGeofenceLat(lat);
        setGeofenceLng(lng);
        const delta = radiusToDelta(radiusRef.current);
        isProgrammaticZoom.current = true;
        mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta }, 600);
        setTimeout(() => { isProgrammaticZoom.current = false; }, 800);
      };

      // 1. Try cached location first — instant if OS has a recent fix
      const last = await Location.getLastKnownPositionAsync({ maxAge: 30_000 });
      if (last) {
        flyTo(last.coords.latitude, last.coords.longitude);
        setLocating(false);
        // Silently refine in background with fresh GPS
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          .then(fresh => flyTo(fresh.coords.latitude, fresh.coords.longitude))
          .catch(() => {});
        return;
      }

      // 2. No cached fix — request fresh but with Balanced (cell+WiFi+GPS)
      //    Balanced: ~1-3s vs High: ~6-10s. Accuracy ±20-30m, fine for a 50-500m zone.
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      flyTo(loc.coords.latitude, loc.coords.longitude);
    } catch {
      Alert.alert('Error', 'No se pudo obtener tu ubicación.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />

      <AnimatedBackground primaryColor={primaryColor} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: insets.bottom + 80, paddingTop: insets.top + 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Page title */}
        <Text style={s.pageTitle}>Ajustes</Text>

        {/* 1 — Business Name */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Nombre del Negocio</Text>
          <TextInput
            style={s.input}
            placeholder="Nombre de tu negocio"
            placeholderTextColor="#C4C4CE"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* 2 — Geo-fence */}
        <View style={[s.card, geofenceEnabled && { borderColor: color + '40', borderWidth: 1.5 }]}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[s.geoIconWrap, { backgroundColor: geofenceEnabled ? color + '18' : '#F3F4F6' }]}>
              <Ionicons name="map-outline" size={20} color={geofenceEnabled ? color : '#9CA3AF'} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.cardLabel}>Zona de Ponche</Text>
              <Text style={s.geoSubtitle}>Limita el área donde pueden ponchar</Text>
            </View>
            <Switch
              value={geofenceEnabled}
              onValueChange={setGeofenceEnabled}
              trackColor={{ false: '#E5E7EB', true: color }}
              thumbColor="#fff"
            />
          </View>

          {/* Inactive preview — looks like a blurred map card */}
          {!geofenceEnabled && (
            <View style={s.mapPreview}>
              {/* Grid lines simulating a map */}
              {[0,1,2,3].map(i => (
                <View key={`h${i}`} style={[s.gridLine, s.gridLineH, { top: `${20 + i * 20}%` as any }]} />
              ))}
              {[0,1,2,3].map(i => (
                <View key={`v${i}`} style={[s.gridLine, s.gridLineV, { left: `${15 + i * 23}%` as any }]} />
              ))}
              {/* Center circle preview */}
              <View style={s.previewCircle} />
              <View style={s.previewPin}>
                <Ionicons name="location" size={28} color="#9CA3AF" />
              </View>
              {/* Overlay label */}
              <View style={s.previewOverlay}>
                <Text style={s.previewText}>Activa para configurar la zona</Text>
              </View>
            </View>
          )}

          {geofenceEnabled && (
            <>
              <View style={s.thinDivider} />

              {/* Search bar */}
              <View style={s.searchContainer}>
                <View style={[s.searchBar, { borderColor: color + '50', backgroundColor: color + '08' }]}>
                  <Ionicons name="search-outline" size={17} color={color} />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Buscar dirección o lugar..."
                    placeholderTextColor="#A0A0B0"
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                  />
                  {searching
                    ? <ActivityIndicator size="small" color={color} />
                    : <Ionicons name="chevron-forward" size={14} color={color + '80'} />
                  }
                </View>
                {searchResults.length > 0 && (
                  <View style={s.searchDropdown}>
                    {searchResults.map(r => (
                      <TouchableOpacity
                        key={r.place_id}
                        style={s.searchResultRow}
                        onPress={() => handlePickResult(r)}
                      >
                        <Ionicons name="location-outline" size={15} color={color} style={{ marginTop: 1 }} />
                        <Text style={s.searchResultText} numberOfLines={2}>{r.display_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Map */}
              <View style={[s.mapContainer, { borderColor: color + '40' }]}>
                <MapView
                  ref={mapRef}
                  style={s.map}
                  initialRegion={{
                    latitude:  geofenceLat ?? 18.4655,
                    longitude: geofenceLng ?? -66.1057,
                    latitudeDelta:  radiusToDelta(geofenceRadiusM),
                    longitudeDelta: radiusToDelta(geofenceRadiusM),
                  }}
                  onRegionChangeComplete={handleRegionChangeComplete}
                  showsUserLocation
                  showsCompass={false}
                  showsScale={false}
                  toolbarEnabled={false}
                />
                {/* Fixed circle overlay — always centered, crosshair-style picker */}
                <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, s.geoOverlayWrap]}>
                  <View style={[s.geoOverlayCircle, { borderColor: color, backgroundColor: color + '18' }]}>
                    <View style={[s.geoOverlayCenterDot, { backgroundColor: color }]} />
                  </View>
                </View>
                <TouchableOpacity
                  style={[s.myLocBtn, { backgroundColor: color }]}
                  onPress={handleUseMyLocation}
                  disabled={locating}
                >
                  {locating
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Ionicons name="locate" size={18} color="#fff" />
                  }
                </TouchableOpacity>
              </View>

              <View style={s.hintRow}>
                <Ionicons name="information-circle-outline" size={14} color={color} />
                <Text style={[s.hintText, { color: color + 'CC' }]}>Mueve el mapa para centrar la zona. Haz zoom para ajustar el radio, o usa el control de abajo.</Text>
              </View>

              {/* Radius slider */}
              <RadiusSlider
                value={geofenceRadiusM}
                onChange={handleRadiusChange}
                color={color}
                radiusRef={radiusRef}
                dragBaseRef={dragBaseRef}
                onDragStart={() => setScrollEnabled(false)}
                onDragEnd={() => setScrollEnabled(true)}
              />

              <View style={s.thinDivider} />

              {/* PIN */}
              <Animated.View
                ref={pinRef as any}
                style={[
                  s.pinSection,
                  {
                    backgroundColor: pinFlash.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['transparent', '#FEF3C780'],
                    }),
                    borderColor: pinFlash.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['transparent', '#F59E0B'],
                    }),
                  },
                ]}
              >
                <Text style={s.sublabel}>PIN de acceso sin GPS</Text>
                <Text style={s.geoSubtitle}>Empleados sin permiso de ubicación usarán este PIN</Text>
                <View style={s.pinRow}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="4–6 dígitos"
                    placeholderTextColor="#C4C4CE"
                    value={geofencePin}
                    onChangeText={t => setGeofencePin(t.replace(/[^0-9]/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    secureTextEntry={!showPinRaw}
                    maxLength={6}
                  />
                  <TouchableOpacity
                    style={s.pinToggle}
                    onPress={() => setShowPinRaw(v => !v)}
                  >
                    <Ionicons name={showPinRaw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </>
          )}
        </View>

        {/* 3 — Pay Period */}

        <View style={s.card}>
          <Text style={s.cardLabel}>Período de Pago</Text>
          <View style={s.segRow}>
            {(['weekly','biweekly','semi-monthly'] as const).map(t => (
              <TouchableOpacity key={t}
                style={[s.seg, payPeriodType===t && { backgroundColor: color, borderColor: color }]}
                onPress={() => setPayPeriodType(t)}>
                <Text style={[s.segText, payPeriodType===t && { color:'#fff' }]}>
                  {t==='semi-monthly' ? 'Quincenal' : t==='weekly' ? 'Semanal' : 'Bisemanal'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {(payPeriodType==='weekly' || payPeriodType==='biweekly') && (
            <>
              <Text style={s.sublabel}>La semana empieza el</Text>
              <View style={s.segRow}>
                {['Do','Lu','Ma','Mi','Ju','Vi','Sa'].map((d,i) => (
                  <TouchableOpacity key={i}
                    style={[s.dayBtn, payPeriodStartDay===i && { backgroundColor: color, borderColor: color }]}
                    onPress={() => {
                      setPayPeriodStartDay(i);
                      // Reset anchor so the user must pick the correct period start for the new day
                      setPayPeriodAnchorDate('');
                    }}>
                    <Text style={[s.dayBtnText, payPeriodStartDay===i && { color:'#fff' }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {payPeriodType==='biweekly' && (() => {
            const today = new Date(); today.setHours(0,0,0,0);
            const diff  = (today.getDay() - payPeriodStartDay + 7) % 7;
            const last  = new Date(today); last.setDate(today.getDate() - diff);
            const prev  = new Date(last);  prev.setDate(last.getDate() - 14);
            const fmt      = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const fmtLabel = (d: Date) => d.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' });
            return (
              <>
                <Text style={s.sublabel}>¿Cuándo comenzó tu período actual?</Text>
                <View style={s.anchorRow}>
                  {[last, prev].map(d => {
                    const val = fmt(d);
                    return (
                      <TouchableOpacity key={val}
                        style={[s.anchorBtn, payPeriodAnchorDate===val && { backgroundColor: color, borderColor: color }]}
                        onPress={() => setPayPeriodAnchorDate(val)}>
                        <Text style={[s.anchorBtnText, payPeriodAnchorDate===val && { color:'#fff' }]}>{fmtLabel(d)}</Text>
                        {payPeriodAnchorDate===val && <Text style={[s.anchorBtnSub, { color:'rgba(255,255,255,0.9)' }]}>Período actual</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={s.hintRow}>
                  <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" />
                  <Text style={s.hintText}>Selecciona el día en que comenzó tu período de pago más reciente.</Text>
                </View>
              </>
            );
          })()}

          {payPeriodType==='semi-monthly' && (
            <View style={s.hintRow}>
              <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" />
              <Text style={s.hintText}>Períodos de pago: 1–15 y 16–fin de mes</Text>
            </View>
          )}
        </View>

        {/* 3 — Scheduling Rules */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Reglas de Horario</Text>

          <Text style={s.sublabel}>Horas Máx. por Día</Text>
          <View style={s.stepperRow}>
            <TouchableOpacity style={s.stepperBtn} onPress={() => setMaxHoursPerDay(Math.max(0, maxHoursPerDay - 1))}>
              <Ionicons name="remove" size={18} color="#374151" />
            </TouchableOpacity>
            <Text style={s.stepperVal}>{maxHoursPerDay === 0 ? 'Sin límite' : `${maxHoursPerDay}h`}</Text>
            <TouchableOpacity style={s.stepperBtn} onPress={() => setMaxHoursPerDay(Math.min(24, maxHoursPerDay + 1))}>
              <Ionicons name="add" size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={s.thinDivider} />

          <Text style={s.sublabel}>Ventana de Horario</Text>
          <Text style={s.hint}>Semanas hacia adelante que puedes programar</Text>
          <View style={s.stepperRow}>
            <TouchableOpacity style={s.stepperBtn} onPress={() => setSchedulingWeeks(Math.max(1, schedulingWeeks - 1))}>
              <Ionicons name="remove" size={18} color="#374151" />
            </TouchableOpacity>
            <Text style={s.stepperVal}>{schedulingWeeks} {schedulingWeeks === 1 ? 'semana' : 'semanas'}</Text>
            <TouchableOpacity style={s.stepperBtn} onPress={() => setSchedulingWeeks(Math.min(26, schedulingWeeks + 1))}>
              <Ionicons name="add" size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={s.thinDivider} />

          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.switchLabel}>Salida Automática</Text>
              <Text style={s.switchSub}>Marca salida tras fin del turno</Text>
            </View>
            <Switch
              value={autoClockOut}
              onValueChange={setAutoClockOut}
              trackColor={{ false: '#E5E7EB', true: color }}
              thumbColor="#fff"
            />
          </View>

          {autoClockOut && (
            <>
              <Text style={s.sublabel}>Minutos después del turno</Text>
              <View style={s.stepperRow}>
                <TouchableOpacity style={s.stepperBtn} onPress={() => setAutoClockOutMinutes(Math.max(5, autoClockOutMinutes - 5))}>
                  <Ionicons name="remove" size={18} color="#374151" />
                </TouchableOpacity>
                <Text style={s.stepperVal}>{autoClockOutMinutes} min</Text>
                <TouchableOpacity style={s.stepperBtn} onPress={() => setAutoClockOutMinutes(Math.min(240, autoClockOutMinutes + 5))}>
                  <Ionicons name="add" size={18} color="#374151" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* 5 — Color */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Color del Negocio</Text>
          <View style={s.colorRow}>
            {PRESET_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[s.swatch, { backgroundColor: c }, color===c && { borderWidth: 3, borderColor: '#111827' }]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>
        </View>

        {/* 5 — Push Notifications */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Notificaciones</Text>
          <Text style={[s.hintText, { marginBottom: 8 }]}>Recibe alertas en tu telefono cuando tus empleados ponchen.</Text>
          {pushPermission !== 'granted' && (
            <View style={s.permissionBanner}>
              <Ionicons name="notifications-off-outline" size={18} color="#B45309" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.permissionBannerText}>
                  Las notificaciones estan desactivadas en este dispositivo. Activalas en Ajustes para recibir alertas.
                </Text>
                <TouchableOpacity onPress={() => Linking.openSettings()} style={s.permissionBtn}>
                  <Text style={s.permissionBtnText}>Abrir Ajustes</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {[
            { label: 'Entrada al turno',      value: notifyClockIn,  set: setNotifyClockIn },
            { label: 'Inicio y fin de break', value: notifyBreak,    set: setNotifyBreak },
            { label: 'Salida del turno',      value: notifyClockOut, set: setNotifyClockOut },
            { label: 'Llego tarde (+5 min)',   value: notifyLate,     set: setNotifyLate },
          ].map(({ label, value, set }) => (
            <View key={label} style={s.notifRow}>
              <Text style={[s.notifLabel, pushPermission !== 'granted' && { color: '#D1D5DB' }]}>{label}</Text>
              <Switch
                value={pushPermission === 'granted' ? value : false}
                onValueChange={pushPermission === 'granted' ? set : undefined}
                disabled={pushPermission !== 'granted'}
                trackColor={{ false: '#E5E7EB', true: color }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        {/* 6 — Account */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Cuenta</Text>

          <View style={s.accountRow}>
            <Ionicons name="mail-outline" size={16} color="#9CA3AF" />
            <Text style={s.accountValue}>{user?.email}</Text>
          </View>

          <View style={s.accountRow}>
            <Ionicons name="shield-outline" size={16} color="#9CA3AF" />
            <Text style={s.accountValue}>Rol: {user?.role === 'owner' ? 'Dueño' : user?.role}</Text>
          </View>

          <TouchableOpacity style={s.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={17} color="#EF4444" />
            <Text style={s.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>

        {/* 7 — Change Password (not for Google users) */}
        {!isGoogleUser && (
          <View style={s.card}>
            <Text style={s.cardLabel}>Cambiar Contraseña</Text>
            <TextInput style={s.input} placeholder="Contraseña actual" placeholderTextColor="#C4C4CE"
              value={currentPw} onChangeText={setCurrentPw} secureTextEntry />
            <TextInput style={s.input} placeholder="Nueva contraseña (mín. 6 caracteres)" placeholderTextColor="#C4C4CE"
              value={newPw} onChangeText={setNewPw} secureTextEntry />
            <TextInput style={s.input} placeholder="Confirmar nueva contraseña" placeholderTextColor="#C4C4CE"
              value={confirmPw} onChangeText={setConfirmPw} secureTextEntry />
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: primaryColor }]} onPress={handleChangePassword} disabled={changingPw}>
              {changingPw
                ? <ActivityIndicator color="#fff"/>
                : <Text style={s.saveBtnText}>Actualizar Contraseña</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* 7 — Danger Zone */}
        {business && (
          <View style={[s.card, s.dangerCard]}>
            <View style={s.dangerHeader}>
              <Ionicons name="warning-outline" size={16} color="#B91C1C" />
              <Text style={s.dangerLabel}>Zona de Peligro</Text>
            </View>
            <Text style={s.dangerHint}>
              Eliminar el negocio borra permanentemente todos los datos: empleados, turnos e historial de tiempo. Esta acción no tiene vuelta atrás.
            </Text>
            <TouchableOpacity
              style={[s.deleteBtn, deletingBiz && { opacity: 0.5 }]}
              onPress={handleDeleteBusiness}
              disabled={deletingBiz}
            >
              {deletingBiz
                ? <ActivityIndicator color="#B91C1C" />
                : <>
                    <Ionicons name="trash-outline" size={16} color="#B91C1C" />
                    <Text style={s.deleteBtnText}>Eliminar negocio</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Fixed save button */}
      <View style={[s.fixedBottom, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={[s.saveBtn, { backgroundColor: color }]} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff"/>
            : <Text style={s.saveBtnText}>{isNew ? 'Crear Negocio' : 'Guardar Cambios'}</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Delete confirmation modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="warning" size={20} color="#B91C1C" />
              <Text style={s.modalTitle}>Confirmación final</Text>
            </View>
            <Text style={s.modalBody}>
              Escribe <Text style={{ fontWeight: '700', color: '#B91C1C' }}>BORRAR</Text> para confirmar que deseas eliminar el negocio permanentemente.
            </Text>
            <TextInput
              style={[s.input, s.modalInput]}
              placeholder="Escribe BORRAR"
              placeholderTextColor="#C4C4CE"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setShowDeleteModal(false)}
                disabled={deletingBiz}
              >
                <Text style={s.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalDeleteBtn, deleteConfirmText.toLowerCase() !== 'borrar' && { opacity: 0.35 }]}
                onPress={handleConfirmDelete}
                disabled={deleteConfirmText.toLowerCase() !== 'borrar' || deletingBiz}
              >
                {deletingBiz
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.modalDeleteText}>Eliminar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  pageTitle: {
    fontSize: 26, fontWeight: '800', color: '#111827',
    letterSpacing: -0.5,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20, padding: 18, gap: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },

  cardLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },

  sublabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: -6 },

  thinDivider: { height: 1, backgroundColor: '#F3F4F6' },

  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5, borderColor: '#F3F4F6',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111827',
  },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: { width: 38, height: 38, borderRadius: 19 },

  segRow: { flexDirection: 'row', gap: 6 },
  seg: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6',
  },
  segText: { fontSize: 12, fontWeight: '600', color: '#374151' },

  dayBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6',
  },
  dayBtnText: { fontSize: 11, fontWeight: '600', color: '#374151' },

  anchorRow: { flexDirection: 'row', gap: 10 },
  anchorBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#F3F4F6', gap: 2,
  },
  anchorBtnText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  anchorBtnSub:  { fontSize: 11, fontWeight: '600' },

  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  hintText: { flex: 1, fontSize: 12, color: '#9CA3AF', lineHeight: 16 },

  fixedBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)',
  },
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accountValue: { fontSize: 14, fontWeight: '500', color: '#374151' },

  notifRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  notifLabel: { fontSize: 14, color: '#374151', fontWeight: '500', flex: 1 },
  permissionBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 12,
  },
  permissionBannerText: { fontSize: 13, color: '#92400E', lineHeight: 18 },
  permissionBtn: { marginTop: 8, alignSelf: 'flex-start' },
  permissionBtnText: { fontSize: 13, fontWeight: '700', color: '#B45309', textDecorationLine: 'underline' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4,
    padding: 12, borderRadius: 12, backgroundColor: '#FEF2F2',
    borderWidth: 1, borderColor: '#FECACA',
  },
  logoutText: { color: '#EF4444', fontWeight: '600', fontSize: 15 },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  stepperVal: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#111827' },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  switchSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  geoIconWrap: {
    width: 44, height: 44, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  geoSubtitle: { fontSize: 12, color: '#9CA3AF' },

  mapPreview: {
    height: 130, borderRadius: 14, overflow: 'hidden',
    backgroundColor: '#E8EDF2', position: 'relative',
    alignItems: 'center', justifyContent: 'center',
  },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.55)' },
  gridLineH: { left: 0, right: 0, height: 1 },
  gridLineV: { top: 0, bottom: 0, width: 1 },
  previewCircle: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2, borderColor: '#9CA3AF',
    backgroundColor: 'rgba(156,163,175,0.15)',
    position: 'absolute',
  },
  previewPin: { position: 'absolute' },
  previewOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.28)', paddingVertical: 8, alignItems: 'center',
  },
  previewText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  searchContainer: { zIndex: 10 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  searchDropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    backgroundColor: '#fff', borderRadius: 12, marginTop: 4,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 5 },
    elevation: 10, overflow: 'hidden',
  },
  searchResultRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  searchResultText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },

  mapContainer: {
    borderRadius: 16, overflow: 'hidden', height: MAP_H,
    borderWidth: 1.5, position: 'relative',
  },
  map: { flex: 1 },
  geoOverlayWrap: { alignItems: 'center', justifyContent: 'center' },
  geoOverlayCircle: {
    width: CIRCLE_PX * 2, height: CIRCLE_PX * 2, borderRadius: CIRCLE_PX,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  geoOverlayCenterDot: { width: 6, height: 6, borderRadius: 3 },
  myLocBtn: {
    position: 'absolute', bottom: 12, right: 12,
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },


  pinSection: {
    gap: 8, borderRadius: 14, borderWidth: 2,
    padding: 10, marginHorizontal: -10,
  },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinToggle: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#F3F4F6',
  },

  dangerCard: {
    borderColor: '#FECACA', borderWidth: 1.5,
    backgroundColor: '#FFF5F5',
  },
  dangerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dangerLabel: { fontSize: 14, fontWeight: '700', color: '#B91C1C' },
  dangerHint: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  deleteBtnText: { fontSize: 15, fontWeight: '700', color: '#B91C1C' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, gap: 16,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  modalBody: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  modalInput: { borderColor: '#FECACA' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  modalDeleteBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#B91C1C',
  },
  modalDeleteText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
