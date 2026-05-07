import { useState, useCallback, useRef } from 'react'
import {
  View, Text, Pressable, StyleSheet, FlatList,
  ActivityIndicator, Linking, Alert, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { STEADY } from '@repo/ui'

const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? ''

const SPECIALTIES = [
  { id: 'all',            label: 'All Specialists',         query: 'epilepsy neurology clinic',              emoji: '🏥' },
  { id: 'epileptologist', label: 'Epileptologist',          query: 'epileptologist',                         emoji: '🧠' },
  { id: 'neurologist',    label: 'Neurologist',             query: 'neurologist',                            emoji: '🔬' },
  { id: 'pedia_neuro',    label: 'Pediatric Neurologist',   query: 'pediatric neurologist child neurology',  emoji: '👶' },
  { id: 'neurosurgeon',   label: 'Neurosurgeon',            query: 'neurosurgeon',                           emoji: '⚕️' },
  { id: 'dev_pedia',      label: 'Developmental Pedia',     query: 'developmental pediatrician',             emoji: '🌱' },
  { id: 'neuropsych',     label: 'Neuropsychologist',       query: 'neuropsychologist',                      emoji: '💭' },
  { id: 'epilepsy_ctr',   label: 'Epilepsy Center',         query: 'epilepsy center hospital',               emoji: '🏨' },
]

const RADIUS_OPTIONS = [
  { label: '1 km',  value: 1000 },
  { label: '3 km',  value: 3000 },
  { label: '5 km',  value: 5000 },
  { label: '10 km', value: 10000 },
]

interface Place {
  place_id: string
  name: string
  vicinity: string
  rating?: number
  user_ratings_total?: number
  opening_hours?: { open_now?: boolean }
  geometry: { location: { lat: number; lng: number } }
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function NearbyDoctors() {
  const [specialty, setSpecialty] = useState(SPECIALTIES[0])
  const [radius, setRadius] = useState(RADIUS_OPTIONS[1])
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(false)
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null)
  const [searched, setSearched] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const mapRef = useRef<MapView>(null)

  const handleSearch = useCallback(async () => {
    if (!PLACES_KEY) {
      Alert.alert('Setup Required', 'A Google Places API key is needed. Add EXPO_PUBLIC_GOOGLE_PLACES_KEY to your EAS secrets.')
      return
    }
    setLoading(true)
    setPlaces([])
    setSelectedPlace(null)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Location needed', 'Please allow location access to find nearby doctors.')
        return
      }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      setUserLoc({ lat: coords.latitude, lon: coords.longitude })

      const url =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
        `?location=${coords.latitude},${coords.longitude}` +
        `&radius=${radius.value}` +
        `&keyword=${encodeURIComponent(specialty.query)}` +
        `&type=doctor|hospital|health` +
        `&key=${PLACES_KEY}`

      const res = await fetch(url)
      const data = await res.json()

      if (data.status === 'OK') {
        setPlaces(data.results ?? [])
        // If map is visible, fit to all markers
        if (viewMode === 'map' && data.results?.length > 0) {
          setTimeout(() => {
            mapRef.current?.fitToSuppliedMarkers(
              data.results.map((p: Place) => p.place_id),
              { edgePadding: { top: 80, right: 40, bottom: 80, left: 40 }, animated: true }
            )
          }, 600)
        }
      } else if (data.status !== 'ZERO_RESULTS') {
        Alert.alert('Search error', `Places API: ${data.status}`)
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not search nearby doctors.')
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }, [specialty, radius, viewMode])

  const openMaps = (place: Place) => {
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`
    )
  }

  const Controls = (
    <View>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerIcon}>
          <Ionicons name="medical" size={20} color={STEADY.accent.base} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>Find a specialist</Text>
          <Text style={s.title}>Nearby Doctors</Text>
        </View>
        {/* View mode toggle */}
        {searched && places.length > 0 && (
          <View style={s.viewToggle}>
            <Pressable
              style={[s.viewToggleBtn, viewMode === 'list' && s.viewToggleBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? '#fff' : STEADY.ink.secondary} />
            </Pressable>
            <Pressable
              style={[s.viewToggleBtn, viewMode === 'map' && s.viewToggleBtnActive]}
              onPress={() => setViewMode('map')}
            >
              <Ionicons name="map-outline" size={16} color={viewMode === 'map' ? '#fff' : STEADY.ink.secondary} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Specialty grid */}
      <View style={s.grid}>
        {SPECIALTIES.map((item) => {
          const active = specialty.id === item.id
          return (
            <Pressable
              key={item.id}
              style={[s.gridCard, active && s.gridCardActive]}
              onPress={() => setSpecialty(item)}
            >
              <Text style={s.gridEmoji}>{item.emoji}</Text>
              <Text style={[s.gridLabel, active && s.gridLabelActive]} numberOfLines={2}>
                {item.label}
              </Text>
              {active && (
                <View style={s.gridCheck}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
            </Pressable>
          )
        })}
      </View>

      {/* Divider */}
      <View style={s.divider} />

      {/* Radius + Search row */}
      <View style={s.controlRow}>
        <View style={s.radiusGroup}>
          <Text style={s.radiusLabel}>Radius</Text>
          <View style={s.radiusBtns}>
            {RADIUS_OPTIONS.map((r) => (
              <Pressable
                key={r.value}
                style={[s.radiusBtn, radius.value === r.value && s.radiusBtnActive]}
                onPress={() => setRadius(r)}
              >
                <Text style={[s.radiusBtnText, radius.value === r.value && s.radiusBtnTextActive]}>
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <Pressable
        style={[s.searchBtn, loading && s.searchBtnDisabled]}
        onPress={handleSearch}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator size="small" color="#fff" />
          : <Ionicons name="search" size={16} color="#fff" />
        }
        <Text style={s.searchBtnText}>
          {loading ? `Searching ${specialty.label}…` : `Search ${specialty.label}`}
        </Text>
      </Pressable>

      {/* Results header */}
      {searched && places.length > 0 && (
        <View style={s.resultsHeader}>
          <Text style={s.resultsCount}>{places.length} results</Text>
          <Text style={s.resultsSub}>
            within {radius.label} · {viewMode === 'map' ? 'tap pin for details' : 'tap to open in Maps'}
          </Text>
        </View>
      )}

      {searched && places.length === 0 && !loading && (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>🔍</Text>
          <Text style={s.emptyTitle}>No results found</Text>
          <Text style={s.emptySub}>Try a different specialty or increase the radius.</Text>
        </View>
      )}
    </View>
  )

  return (
    <SafeAreaView style={s.root}>
      {viewMode === 'map' && searched && places.length > 0 ? (
        // ── MAP VIEW ──────────────────────────────────────────────────
        <View style={{ flex: 1 }}>
          <ScrollView style={s.mapControlsScroll} showsVerticalScrollIndicator={false}>
            {Controls}
          </ScrollView>

          {/* Map */}
          <View style={s.mapContainer}>
            <MapView
              ref={mapRef}
              style={s.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={userLoc ? {
                latitude: userLoc.lat,
                longitude: userLoc.lon,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              } : undefined}
              showsUserLocation
              showsMyLocationButton
            >
              {places.map((place, idx) => (
                <Marker
                  key={place.place_id}
                  identifier={place.place_id}
                  coordinate={{
                    latitude: place.geometry.location.lat,
                    longitude: place.geometry.location.lng,
                  }}
                  title={place.name}
                  description={place.vicinity}
                  pinColor={selectedPlace?.place_id === place.place_id ? '#C8312B' : STEADY.accent.base}
                  onPress={() => setSelectedPlace(place)}
                >
                </Marker>
              ))}
            </MapView>

            {/* Selected place card */}
            {selectedPlace && (
              <View style={s.mapCard}>
                <View style={s.mapCardBody}>
                  <Text style={s.mapCardName} numberOfLines={1}>{selectedPlace.name}</Text>
                  <Text style={s.mapCardAddress} numberOfLines={1}>{selectedPlace.vicinity}</Text>
                  {selectedPlace.rating != null && (
                    <Text style={s.mapCardRating}>⭐ {selectedPlace.rating.toFixed(1)}</Text>
                  )}
                  {selectedPlace.opening_hours?.open_now != null && (
                    <Text style={[
                      s.mapCardStatus,
                      { color: selectedPlace.opening_hours.open_now ? '#16a34a' : '#dc2626' }
                    ]}>
                      {selectedPlace.opening_hours.open_now ? 'Open now' : 'Closed now'}
                    </Text>
                  )}
                </View>
                <Pressable style={s.mapCardBtn} onPress={() => openMaps(selectedPlace)}>
                  <Ionicons name="navigate" size={16} color="#fff" />
                  <Text style={s.mapCardBtnText}>Directions</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      ) : (
        // ── LIST VIEW ─────────────────────────────────────────────────
        <FlatList
          data={places}
          keyExtractor={(item) => item.place_id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={Controls}
          renderItem={({ item, index }) => {
            const dist = userLoc
              ? distanceKm(userLoc.lat, userLoc.lon, item.geometry.location.lat, item.geometry.location.lng)
              : null
            const isOpen = item.opening_hours?.open_now
            const distLabel = dist != null
              ? (dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`)
              : null

            return (
              <Pressable style={s.card} onPress={() => openMaps(item)}>
                <View style={s.rankBadge}>
                  <Text style={s.rankText}>{index + 1}</Text>
                </View>

                <View style={s.cardBody}>
                  <View style={s.cardTopRow}>
                    <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
                    {isOpen != null && (
                      <View style={[s.openBadge, isOpen ? s.openBadgeYes : s.openBadgeNo]}>
                        <Text style={[s.openBadgeText, isOpen ? s.openBadgeTextYes : s.openBadgeTextNo]}>
                          {isOpen ? 'Open' : 'Closed'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={s.cardAddress} numberOfLines={2}>
                    <Ionicons name="location-outline" size={11} color={STEADY.ink.tertiary} /> {item.vicinity}
                  </Text>

                  <View style={s.cardFooter}>
                    {distLabel && (
                      <View style={s.distBadge}>
                        <Ionicons name="navigate-outline" size={11} color={STEADY.accent.base} />
                        <Text style={s.distText}>{distLabel}</Text>
                      </View>
                    )}
                    {item.rating != null && (
                      <Text style={s.ratingText}>
                        ⭐ {item.rating.toFixed(1)}
                        <Text style={s.ratingCount}> ({item.user_ratings_total ?? 0})</Text>
                      </Text>
                    )}
                    <View style={s.mapsBtn}>
                      <Ionicons name="map-outline" size={11} color={STEADY.accent.deep} />
                      <Text style={s.mapsBtnText}>Maps</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: STEADY.bg.light },
  listContent:      { paddingBottom: 32 },

  // Header
  header:           { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerIcon:       { width: 44, height: 44, borderRadius: 22, backgroundColor: STEADY.accent.soft, alignItems: 'center', justifyContent: 'center' },
  eyebrow:          { fontSize: 12, color: STEADY.ink.secondary },
  title:            { fontSize: 24, fontWeight: '700', letterSpacing: -0.4, color: STEADY.ink.primary },

  // View toggle
  viewToggle:       { flexDirection: 'row', borderRadius: STEADY.r.md, overflow: 'hidden', borderWidth: 1, borderColor: STEADY.border.light },
  viewToggleBtn:    { paddingHorizontal: 10, paddingVertical: 7 },
  viewToggleBtnActive: { backgroundColor: STEADY.accent.base },

  // Specialty grid (4 per row)
  grid:             { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  gridCard:         {
    width: '22.5%', aspectRatio: 1,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: STEADY.border.light,
    alignItems: 'center', justifyContent: 'center',
    padding: 6, position: 'relative',
  },
  gridCardActive:   { borderColor: STEADY.accent.base, backgroundColor: STEADY.accent.soft },
  gridEmoji:        { fontSize: 22, marginBottom: 4 },
  gridLabel:        { fontSize: 9, fontWeight: '600', color: STEADY.ink.secondary, textAlign: 'center', lineHeight: 12 },
  gridLabelActive:  { color: STEADY.accent.deep },
  gridCheck:        {
    position: 'absolute', top: 5, right: 5,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: STEADY.accent.base,
    alignItems: 'center', justifyContent: 'center',
  },

  divider:          { height: 1, backgroundColor: STEADY.border.light, marginHorizontal: 16, marginVertical: 14 },

  // Radius + Search
  controlRow:       { paddingHorizontal: 16, marginBottom: 12 },
  radiusGroup:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radiusLabel:      { fontSize: 13, fontWeight: '600', color: STEADY.ink.secondary },
  radiusBtns:       { flexDirection: 'row', gap: 6 },
  radiusBtn:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: STEADY.r.pill, borderWidth: 1, borderColor: STEADY.border.light, backgroundColor: '#fff' },
  radiusBtnActive:  { backgroundColor: STEADY.accent.soft, borderColor: STEADY.accent.base },
  radiusBtnText:    { fontSize: 12, fontWeight: '500', color: STEADY.ink.secondary },
  radiusBtnTextActive: { color: STEADY.accent.deep, fontWeight: '700' },

  searchBtn:        { marginHorizontal: 16, marginBottom: 16, height: 52, borderRadius: STEADY.r.lg, backgroundColor: STEADY.accent.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: STEADY.accent.base, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  searchBtnDisabled:{ opacity: 0.7 },
  searchBtnText:    { fontSize: 15, fontWeight: '700', color: '#fff' },

  resultsHeader:    { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  resultsCount:     { fontSize: 15, fontWeight: '700', color: STEADY.ink.primary },
  resultsSub:       { fontSize: 12, color: STEADY.ink.tertiary },

  emptyState:       { alignItems: 'center', paddingTop: 48, gap: 8 },
  emptyIcon:        { fontSize: 36 },
  emptyTitle:       { fontSize: 16, fontWeight: '600', color: STEADY.ink.primary },
  emptySub:         { fontSize: 13, color: STEADY.ink.secondary, textAlign: 'center', maxWidth: 260, lineHeight: 19 },

  // Map view
  mapControlsScroll:{ maxHeight: 280 },
  mapContainer:     { flex: 1, position: 'relative' },
  map:              { flex: 1 },
  mapCard:          {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    backgroundColor: '#fff', borderRadius: STEADY.r.lg,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 4 },
    elevation: 8, borderWidth: 1, borderColor: STEADY.border.light,
  },
  mapCardBody:      { flex: 1 },
  mapCardName:      { fontSize: 14, fontWeight: '700', color: STEADY.ink.primary },
  mapCardAddress:   { fontSize: 12, color: STEADY.ink.secondary, marginTop: 2 },
  mapCardRating:    { fontSize: 11, color: STEADY.ink.primary, marginTop: 2 },
  mapCardStatus:    { fontSize: 11, fontWeight: '600', marginTop: 1 },
  mapCardBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: STEADY.accent.base, paddingHorizontal: 14, paddingVertical: 10, borderRadius: STEADY.r.md },
  mapCardBtnText:   { fontSize: 13, fontWeight: '700', color: '#fff' },

  // List result cards
  card:             { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: STEADY.border.light },
  rankBadge:        { width: 28, height: 28, borderRadius: 14, backgroundColor: STEADY.bg.sunken, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  rankText:         { fontSize: 12, fontWeight: '700', color: STEADY.ink.secondary },
  cardBody:         { flex: 1, gap: 4 },
  cardTopRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardName:         { flex: 1, fontSize: 14, fontWeight: '700', color: STEADY.ink.primary, lineHeight: 19 },
  openBadge:        { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  openBadgeYes:     { backgroundColor: '#dcfce7' },
  openBadgeNo:      { backgroundColor: '#fee2e2' },
  openBadgeText:    { fontSize: 10, fontWeight: '700' },
  openBadgeTextYes: { color: '#16a34a' },
  openBadgeTextNo:  { color: '#dc2626' },
  cardAddress:      { fontSize: 12, color: STEADY.ink.secondary, lineHeight: 17 },
  cardFooter:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  distBadge:        { flexDirection: 'row', alignItems: 'center', gap: 3 },
  distText:         { fontSize: 11, fontWeight: '700', color: STEADY.accent.base },
  ratingText:       { fontSize: 11, color: STEADY.ink.primary, fontWeight: '600' },
  ratingCount:      { fontWeight: '400', color: STEADY.ink.tertiary },
  mapsBtn:          { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  mapsBtnText:      { fontSize: 11, fontWeight: '600', color: STEADY.accent.deep },
})
