import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  AppState,
} from 'react-native';
import Constants from 'expo-constants';
import { RepTrip, RepTripStop, RepTripStopReason, getMyTrips, startTrip, endTrip, osrmRouteKm, googleRouteKm, addStop } from '../lib/api';
import {
  saveActiveTripId,
  getActiveTripId,
  getActiveTripStart,
  clearActiveTripId,
  getWaypoints,
  clearWaypoints,
  saveActiveTripMethod,
  getActiveTripMethod,
  savePlannedEndAddress,
  getPlannedEndAddress,
} from '../lib/storage';
import {
  requestLocationPermissions,
  startLocationTracking,
  stopLocationTracking,
  startForegroundTracking,
  stopForegroundTracking,
  getCurrentLocation,
  reverseGeocode,
  calculateTotalKm,
} from '../lib/gps';

// Expo Go blocks background location on Android — use foreground polling instead
const IS_EXPO_GO = Constants.appOwnership === 'expo';

interface Props {
  onLogout: () => void;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TripsScreen({ onLogout }: Props) {
  const [trips, setTrips] = useState<RepTrip[]>([]);
  const [activeTripId, setActiveTripId] = useState<number | null>(null);
  const [activeTripStart, setActiveTripStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [waypointCount, setWaypointCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [endingTrip, setEndingTrip] = useState(false);
  const [startingTrip, setStartingTrip] = useState(false);

  // Purpose modal
  const [purposeModalVisible, setPurposeModalVisible] = useState(false);
  const [purposeInput, setPurposeInput] = useState('');
  const [distanceMethod, setDistanceMethod] = useState<'GPS' | 'OSRM' | 'GOOGLE'>('OSRM');
  const [startAddrInput, setStartAddrInput] = useState('');
  const [startAddrLoading, setStartAddrLoading] = useState(false);
  const [startLat, setStartLat] = useState<number | null>(null);
  const [startLng, setStartLng] = useState<number | null>(null);
  const [destInput, setDestInput] = useState('');

  // End trip confirmation modal
  const [endConfirmVisible, setEndConfirmVisible] = useState(false);
  const [endAddrInput, setEndAddrInput] = useState('');
  const [endConfirmLoading, setEndConfirmLoading] = useState(false);
  type PendingEnd = { lat: number; lng: number; waypoints: import('../lib/storage').Waypoint[]; method: string };
  const [pendingEnd, setPendingEnd] = useState<PendingEnd | null>(null);

  // Add stop modal
  const [stopModalVisible, setStopModalVisible] = useState(false);
  const [stopReason, setStopReason] = useState<RepTripStopReason>('CLIENT');
  const [stopAddress, setStopAddress] = useState('');
  const [stopNotes, setStopNotes] = useState('');
  const [stopAddrLoading, setStopAddrLoading] = useState(false);
  const [stopLat, setStopLat] = useState<number | null>(null);
  const [stopLng, setStopLng] = useState<number | null>(null);
  const [savingStop, setSavingStop] = useState(false);
  const [activeStops, setActiveStops] = useState<RepTripStop[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waypointRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Load initial state ───────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [fetchedTrips, storedTripId, storedStart] = await Promise.all([
        getMyTrips(),
        getActiveTripId(),
        getActiveTripStart(),
      ]);
      setTrips(fetchedTrips);
      setActiveTripId(storedTripId);
      setActiveTripStart(storedStart);
      if (storedTripId && storedStart) {
        setElapsed(Date.now() - storedStart);
        const wps = await getWaypoints(storedTripId);
        setWaypointCount(wps.length);
      }
    } catch (err: any) {
      const detail = err?.message ?? String(err);
      Alert.alert('Erreur réseau', `Impossible de charger les trajets.\n\n${detail}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Refresh data when app comes back to foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadData();
    });
    return () => sub.remove();
  }, [loadData]);

  // ─── Elapsed timer ────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTripStart) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - activeTripStart);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTripStart]);

  // ─── Waypoint count refresh ───────────────────────────────────────────────

  useEffect(() => {
    if (activeTripId) {
      waypointRefreshRef.current = setInterval(async () => {
        const wps = await getWaypoints(activeTripId);
        setWaypointCount(wps.length);
      }, 15_000);
    } else {
      if (waypointRefreshRef.current) clearInterval(waypointRefreshRef.current);
    }
    return () => {
      if (waypointRefreshRef.current) clearInterval(waypointRefreshRef.current);
    };
  }, [activeTripId]);

  // ─── Start trip flow ──────────────────────────────────────────────────────

  async function handleStartTrip(
    purpose: string,
    prefetchedLat?: number,
    prefetchedLng?: number,
    overrideAddress?: string,
    plannedDest?: string,
  ) {
    setStartingTrip(true);
    try {
      const granted = await requestLocationPermissions();
      if (!granted) {
        Alert.alert(
          'Permission requise',
          'Autorisez la localisation en arrière-plan pour enregistrer votre trajet.'
        );
        return;
      }

      let lat: number;
      let lng: number;
      if (prefetchedLat != null && prefetchedLng != null) {
        lat = prefetchedLat;
        lng = prefetchedLng;
      } else {
        const loc = await getCurrentLocation();
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }
      const address = overrideAddress || await reverseGeocode(lat, lng);

      const trip = await startTrip({ startLat: lat, startLng: lng, startAddress: address, purpose, distanceMethod });
      await saveActiveTripId(trip.id);
      await saveActiveTripMethod(distanceMethod);
      if (plannedDest) await savePlannedEndAddress(plannedDest);
      if (IS_EXPO_GO) {
        await startForegroundTracking(trip.id);
      } else {
        await startLocationTracking();
      }

      const now = Date.now();
      setActiveTripId(trip.id);
      setActiveTripStart(now);
      setElapsed(0);
      setWaypointCount(0);
      setTrips((prev) => [trip, ...prev]);
    } catch (err: any) {
      const detail = err?.response?.data?.message ?? err?.message ?? String(err);
      const msg = err?.response?.status === 403
        ? 'Accès refusé. Votre compte n\'a pas accès aux trajets.'
        : `Erreur lors du démarrage du trajet.\n\n${detail}`;
      Alert.alert('Erreur', msg);
    } finally {
      setStartingTrip(false);
    }
  }

  function openStartModal() {
    setPurposeInput('');
    setDistanceMethod('OSRM');
    setDestInput('');
    setStartAddrInput('');
    setStartLat(null);
    setStartLng(null);
    setStartAddrLoading(true);
    setPurposeModalVisible(true);
    // Fetch GPS in background while modal is open
    getCurrentLocation()
      .then(async (loc) => {
        const la = loc.coords.latitude;
        const lo = loc.coords.longitude;
        setStartLat(la);
        setStartLng(lo);
        const addr = await reverseGeocode(la, lo);
        setStartAddrInput(addr);
      })
      .catch(() => {})
      .finally(() => setStartAddrLoading(false));
  }

  function confirmStartTrip() {
    setPurposeModalVisible(false);
    handleStartTrip(
      purposeInput.trim(),
      startLat ?? undefined,
      startLng ?? undefined,
      startAddrInput.trim() || undefined,
      destInput.trim() || undefined,
    );
  }

  // ─── Add stop flow ────────────────────────────────────────────────────────

  function openStopModal() {
    setStopReason('CLIENT');
    setStopNotes('');
    setStopAddress('');
    setStopLat(null);
    setStopLng(null);
    setStopAddrLoading(true);
    setStopModalVisible(true);
    getCurrentLocation()
      .then(async (loc) => {
        const la = loc.coords.latitude;
        const lo = loc.coords.longitude;
        setStopLat(la);
        setStopLng(lo);
        const addr = await reverseGeocode(la, lo);
        setStopAddress(addr);
      })
      .catch(() => {})
      .finally(() => setStopAddrLoading(false));
  }

  async function confirmAddStop() {
    if (!activeTripId) return;
    setSavingStop(true);
    try {
      const stop = await addStop(activeTripId, {
        reason: stopReason,
        address: stopAddress.trim() || undefined,
        lat: stopLat ?? undefined,
        lng: stopLng ?? undefined,
        notes: stopNotes.trim() || undefined,
      });
      setActiveStops((prev) => [...prev, stop]);
      setStopModalVisible(false);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'enregistrer l\'arrêt. Réessayez.');
    } finally {
      setSavingStop(false);
    }
  }

  // ─── End trip flow ────────────────────────────────────────────────────────

  async function handleEndTrip() {
    if (!activeTripId) return;
    doEndTrip();
  }

  async function doEndTrip() {
    if (!activeTripId) return;
    setEndingTrip(true);
    try {
      if (IS_EXPO_GO) {
        stopForegroundTracking();
      } else {
        await stopLocationTracking();
      }

      const [loc, waypoints, method, plannedDest] = await Promise.all([
        getCurrentLocation(),
        getWaypoints(activeTripId),
        getActiveTripMethod(),
        getPlannedEndAddress(),
      ]);
      const { latitude: lat, longitude: lng } = loc.coords;
      const gpsAddr = await reverseGeocode(lat, lng);

      setPendingEnd({ lat, lng, waypoints, method });
      setEndAddrInput(plannedDest || gpsAddr);
      setEndConfirmVisible(true);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'obtenir la position. Réessayez.');
    } finally {
      setEndingTrip(false);
    }
  }

  async function confirmEndTrip() {
    if (!pendingEnd || !activeTripId) return;
    setEndConfirmLoading(true);
    try {
      const { lat, lng, waypoints, method } = pendingEnd;

      let totalKm: number;
      if (method === 'OSRM') {
        const road = await osrmRouteKm(waypoints);
        totalKm = road ?? calculateTotalKm(waypoints);
      } else if (method === 'GOOGLE') {
        const road = await googleRouteKm(waypoints);
        totalKm = road ?? calculateTotalKm(waypoints);
      } else {
        totalKm = calculateTotalKm(waypoints);
      }

      const durationMinutes = activeTripStart
        ? Math.round((Date.now() - activeTripStart) / 60_000)
        : 0;

      const updated = await endTrip(activeTripId, lat, lng, endAddrInput.trim(), totalKm, durationMinutes, waypoints);

      await clearActiveTripId();
      await clearWaypoints(activeTripId);

      setEndConfirmVisible(false);
      setPendingEnd(null);
      setActiveTripId(null);
      setActiveTripStart(null);
      setElapsed(0);
      setWaypointCount(0);
      setActiveStops([]);
      setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      Alert.alert('Erreur', 'Impossible de terminer le trajet. Réessayez.');
    } finally {
      setEndConfirmLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1D4ED8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Trajets</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* Active trip banner */}
      {activeTripId ? (
        <View style={styles.activeBanner}>
          <View>
            <Text style={styles.activeBannerLabel}>🟢 Trajet en cours</Text>
            {IS_EXPO_GO && (
              <Text style={styles.activeBannerMode}>⚠️ Mode test — gardez l'app ouverte</Text>
            )}
            <Text style={styles.activeBannerTime}>{formatDuration(elapsed)}</Text>
            <Text style={styles.activeBannerPoints}>
              {waypointCount} point{waypointCount !== 1 ? 's' : ''} GPS enregistré
              {waypointCount !== 1 ? 's' : ''}
            </Text>
            {activeStops.length > 0 && (
              <Text style={styles.activeBannerPoints}>
                {activeStops.length} arrêt{activeStops.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
          <View style={{ gap: 8 }}>
            <TouchableOpacity style={styles.addStopButton} onPress={openStopModal}>
              <Text style={styles.addStopButtonText}>+ Arrêt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.endButton, endingTrip && styles.endButtonDisabled]}
              onPress={handleEndTrip}
              disabled={endingTrip}
            >
              {endingTrip ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.endButtonText}>Terminer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.startButton, startingTrip && styles.startButtonDisabled]}
          onPress={openStartModal}
          disabled={startingTrip}
        >
          {startingTrip ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.startButtonText}>+ Nouveau trajet</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Trip list */}
      <FlatList
        data={trips.filter((t) => t.status !== 'IN_PROGRESS')}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucun trajet complété.</Text>
        }
        renderItem={({ item }) => <TripCard trip={item} />}
      />

      {/* Start trip modal */}
      <Modal
        visible={purposeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPurposeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouveau trajet</Text>

            <Text style={styles.modalLabel}>Adresse de départ</Text>
            {startAddrLoading ? (
              <View style={[styles.modalInput, { justifyContent: 'center' }]}>
                <ActivityIndicator size="small" color="#6B7280" />
              </View>
            ) : (
              <TextInput
                style={styles.modalInput}
                placeholder="Adresse actuelle…"
                placeholderTextColor="#9CA3AF"
                value={startAddrInput}
                onChangeText={setStartAddrInput}
                returnKeyType="next"
              />
            )}

            <Text style={[styles.modalLabel, { marginTop: 12 }]}>Destination prévue (optionnel)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 123 Rue Principale, Montréal…"
              placeholderTextColor="#9CA3AF"
              value={destInput}
              onChangeText={setDestInput}
              returnKeyType="next"
            />

            <Text style={[styles.modalLabel, { marginTop: 12 }]}>Motif (optionnel)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Client ABC, réunion bureau…"
              placeholderTextColor="#9CA3AF"
              value={purposeInput}
              onChangeText={setPurposeInput}
              returnKeyType="done"
              onSubmitEditing={confirmStartTrip}
            />

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>Méthode de calcul</Text>
            <View style={styles.methodRow}>
              <TouchableOpacity
                style={[styles.methodCard, distanceMethod === 'GPS' && styles.methodCardActive]}
                onPress={() => setDistanceMethod('GPS')}
                activeOpacity={0.8}
              >
                <Text style={styles.methodIcon}>📍</Text>
                <Text style={[styles.methodName, distanceMethod === 'GPS' && styles.methodNameActive]}>GPS</Text>
                <Text style={styles.methodDesc}>Distance réelle{"\n"}(sommation)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodCard, distanceMethod === 'OSRM' && styles.methodCardActive]}
                onPress={() => setDistanceMethod('OSRM')}
                activeOpacity={0.8}
              >
                <Text style={styles.methodIcon}>🛣️</Text>
                <Text style={[styles.methodName, distanceMethod === 'OSRM' && styles.methodNameActive]}>OSRM</Text>
                <Text style={styles.methodDesc}>Routes réelles{"\n"}(carte routière)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.methodCard,
                  distanceMethod === 'GOOGLE' && styles.methodCardActive,
                ]}
                onPress={() => setDistanceMethod('GOOGLE')}
                activeOpacity={0.8}
              >
                <Text style={styles.methodIcon}>🗺️</Text>
                <Text style={[
                  styles.methodName,
                  distanceMethod === 'GOOGLE' && styles.methodNameActive,
                ]}>Google</Text>
                <Text style={styles.methodDesc}>Routes Google{"\n"}(précision max)</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setPurposeModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={confirmStartTrip}>
                <Text style={styles.modalConfirmText}>Démarrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* End trip confirmation modal */}
      <Modal
        visible={endConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !endConfirmLoading && setEndConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Terminer le trajet</Text>
            <Text style={styles.modalLabel}>Adresse d'arrivée</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Adresse finale…"
              placeholderTextColor="#9CA3AF"
              value={endAddrInput}
              onChangeText={setEndAddrInput}
              returnKeyType="done"
              multiline
            />
            <Text style={[styles.modalLabel, { marginTop: 4, fontSize: 11, color: '#9CA3AF' }]}>
              Modifiez si la détection automatique est inexacte.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setEndConfirmVisible(false)}
                disabled={endConfirmLoading}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, endConfirmLoading && { opacity: 0.6 }]}
                onPress={confirmEndTrip}
                disabled={endConfirmLoading}
              >
                {endConfirmLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalConfirmText}>Confirmer</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add stop modal */}
      <Modal
        visible={stopModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !savingStop && setStopModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ajouter un arrêt</Text>

            <Text style={styles.modalLabel}>Type d'arrêt</Text>
            <View style={styles.reasonRow}>
              {(['CLIENT','RESTAURANT','GAS','OFFICE','OTHER'] as RepTripStopReason[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.reasonChip, stopReason === r && styles.reasonChipActive]}
                  onPress={() => setStopReason(r)}
                >
                  <Text style={[styles.reasonChipText, stopReason === r && styles.reasonChipTextActive]}>
                    {r === 'CLIENT' ? '🤝 Client' : r === 'RESTAURANT' ? '🍽️ Resto' : r === 'GAS' ? '⛽ Essence' : r === 'OFFICE' ? '🏢 Bureau' : '📍 Autre'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { marginTop: 14 }]}>Adresse</Text>
            {stopAddrLoading ? (
              <View style={[styles.modalInput, { justifyContent: 'center' }]}>
                <ActivityIndicator size="small" color="#6B7280" />
              </View>
            ) : (
              <TextInput
                style={styles.modalInput}
                placeholder="Adresse de l'arrêt…"
                placeholderTextColor="#9CA3AF"
                value={stopAddress}
                onChangeText={setStopAddress}
              />
            )}

            <Text style={[styles.modalLabel, { marginTop: 12 }]}>Notes (optionnel)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Rencontre avec M. Tremblay…"
              placeholderTextColor="#9CA3AF"
              value={stopNotes}
              onChangeText={setStopNotes}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setStopModalVisible(false)}
                disabled={savingStop}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, savingStop && { opacity: 0.6 }]}
                onPress={confirmAddStop}
                disabled={savingStop}
              >
                {savingStop
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalConfirmText}>Enregistrer</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TripCard({ trip }: { trip: RepTrip }) {
  return (
    <View style={styles.tripCard}>
      <View style={styles.tripCardRow}>
        <Text style={styles.tripDate}>{formatDate(trip.date)}</Text>
        <Text style={styles.tripKm}>
          {trip.totalKm != null ? `${trip.totalKm} km` : '—'}
        </Text>
      </View>
      {trip.purpose ? (
        <Text style={styles.tripPurpose}>{trip.purpose}</Text>
      ) : null}
      <Text style={styles.tripAddress} numberOfLines={1}>
        {trip.startAddress ?? '—'} → {trip.endAddress ?? '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1D4ED8',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  logoutText: {
    color: '#BFDBFE',
    fontSize: 14,
  },
  activeBanner: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#16A34A',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  activeBannerLabel: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
    marginBottom: 2,
  },
  activeBannerMode: {
    fontSize: 11,
    color: '#D97706',
    marginBottom: 4,
  },
  activeBannerTime: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  activeBannerPoints: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  endButton: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 90,
    alignItems: 'center',
  },
  endButtonDisabled: {
    opacity: 0.6,
  },
  endButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  addStopButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1D4ED8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  addStopButtonText: {
    color: '#1D4ED8',
    fontWeight: '600',
    fontSize: 14,
  },
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  reasonChipActive: {
    borderColor: '#1D4ED8',
    backgroundColor: '#EFF6FF',
  },
  reasonChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  reasonChipTextActive: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#1D4ED8',
    margin: 16,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#1D4ED8',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 32,
    fontSize: 14,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tripCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tripDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  tripKm: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  tripPurpose: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 2,
  },
  tripAddress: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  modalConfirm: {
    flex: 1,
    backgroundColor: '#1D4ED8',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Method picker
  methodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  methodCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  methodCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  methodCardDisabled: {
    opacity: 0.45,
    backgroundColor: '#F1F5F9',
  },
  methodIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  methodName: {
    fontWeight: '700',
    fontSize: 13,
    color: '#374151',
    marginBottom: 2,
  },
  methodNameActive: {
    color: '#2563EB',
  },
  methodNameDisabled: {
    color: '#9CA3AF',
  },
  methodDesc: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 15,
  },
  methodDescDisabled: {
    color: '#CBD5E1',
  },
});
