import { useState, useCallback } from 'react'
import {
  View, Text, Pressable, StyleSheet, FlatList,
  ActivityIndicator, Linking, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { STEADY } from '@repo/ui'

const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? ''

// ─── Epilepsy-related specialties ────────────────────────────────────────────
const SPECIALTIES = [
  { id: 'all',            label: 'All',                    query: 'epilepsy neurology clinic' },
  { id: 'epileptologist', label: 'Epileptologist',         query: 'epileptologist' },
  { id: 'neurologist',    label: 'Neurologist',            query: 'neurologist' },
  { id: 'pedia_neuro',    label: 'Pediatric Neurologist',  query: 'pediatric neurologist child neurology' },
  { id: 'neurosurgeon',   label: 'Neurosurgeon',           query: 'neurosurgeon' },
  { id: 'dev_pedia',      label: 'Developmental Pedia',    query: 'developmental pediatrician' },
  { id: 'neuropsych',     label: 'Neuropsychologist',      query: 'neuropsychologist' },
  { id: 'epilepsy_ctr',   label: 'Epilepsy Center',        query: 'epilepsy center hospital' },
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

  const handleSearch = useCallback(async () => {
    if (!PLACES_KEY) {
      Alert.alert(
        'Setup Required',
        'A Google Places API key is needed. Add EXPO_PUBLIC_GOOGLE_PLACES_KEY to your EAS secrets.',
      )
      return
    }

    setLoading(true)
    setPlaces([])
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Location needed', 'Please allow location access to find nearby doctors.')
        return
      }
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
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
      } else if (data.status === 'ZERO_RESULTS') {
        setPlaces([])
      } else {
        Alert.alert('Search error', `Places API: ${data.status}`)
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not search nearby doctors.')
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }, [specialty, radius])

  const openMaps = (place: Place) => {
    const { lat, lng } = place.geometry.location
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`
    Linking.openURL(url)
  }

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.headerRow}>
        <Text style={s.eyebrow}>Find a specialist</Text>
        <Text style={s.title}>Nearby Doctors</Text>
      </View>

      {/* Specialty pills */}
      <FlatList
        data={SPECIALTIES}
        horizontal
        keyExtractor={(i) => i.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.pillRow}
        renderItem={({ item }) => (
          <Pressable
            style={[s.pill, specialty.id === item.id && s.pillActive]}
            onPress={() => setSpecialty(item)}
          >
            <Text style={[s.pillText, specialty.id === item.id && s.pillTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        )}
      />

      {/* Radius selector */}
      <View style={s.radiusRow}>
        <Text style={s.radiusLabel}>Within</Text>
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

      {/* Search button */}
      <Pressable style={[s.searchBtn, loading && s.searchBtnDisabled]} onPress={handleSearch} disabled={loading}>
        {loading
          ? <ActivityIndicator size="small" color="#fff" />
          : <Ionicons name="search-outline" size={16} color="#fff" />
        }
        <Text style={s.searchBtnText}>{loading ? 'Searching…' : 'Search nearby'}</Text>
      </Pressable>

      {/* Results */}
      {searched && places.length === 0 && !loading && (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>🔍</Text>
          <Text style={s.emptyTitle}>No results found</Text>
          <Text style={s.emptySub}>Try a different specialty or increase the search radius.</Text>
        </View>
      )}

      <FlatList
        data={places}
        keyExtractor={(item) => item.place_id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const dist = userLoc
            ? distanceKm(userLoc.lat, userLoc.lon, item.geometry.location.lat, item.geometry.location.lng)
            : null
          const isOpen = item.opening_hours?.open_now
          return (
            <Pressable style={s.card} onPress={() => openMaps(item)}>
              <View style={s.cardLeft}>
                <View style={s.cardIcon}>
                  <Ionicons name="medical-outline" size={18} color={STEADY.accent.base} />
                </View>
              </View>
              <View style={s.cardBody}>
                <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
                <Text style={s.cardAddress} numberOfLines={1}>{item.vicinity}</Text>
                <View style={s.cardMeta}>
                  {dist != null && (
                    <Text style={s.cardDist}>{dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)} km`}</Text>
                  )}
                  {item.rating != null && (
                    <Text style={s.cardRating}>⭐ {item.rating.toFixed(1)} ({item.user_ratings_total ?? 0})</Text>
                  )}
                  {item.opening_hours != null && (
                    <Text style={[s.cardOpen, isOpen ? s.cardOpenYes : s.cardOpenNo]}>
                      {isOpen ? 'Open now' : 'Closed'}
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={STEADY.ink.tertiary} />
            </Pressable>
          )
        }}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: STEADY.bg.light },
  headerRow:      { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  eyebrow:        { fontSize: 13, color: STEADY.ink.secondary },
  title:          { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, color: STEADY.ink.primary },
  pillRow:        { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  pill:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: STEADY.r.pill, borderWidth: 1, borderColor: STEADY.border.light, backgroundColor: '#fff' },
  pillActive:     { backgroundColor: STEADY.accent.base, borderColor: STEADY.accent.base },
  pillText:       { fontSize: 13, fontWeight: '500', color: STEADY.ink.secondary },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  radiusRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  radiusLabel:    { fontSize: 13, color: STEADY.ink.secondary, marginRight: 4 },
  radiusBtn:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: STEADY.r.pill, borderWidth: 1, borderColor: STEADY.border.light, backgroundColor: '#fff' },
  radiusBtnActive:{ backgroundColor: STEADY.accent.soft, borderColor: STEADY.accent.base },
  radiusBtnText:  { fontSize: 12, fontWeight: '500', color: STEADY.ink.secondary },
  radiusBtnTextActive: { color: STEADY.accent.deep, fontWeight: '600' },
  searchBtn:      { marginHorizontal: 16, marginBottom: 16, height: 50, borderRadius: STEADY.r.lg, backgroundColor: STEADY.accent.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  searchBtnDisabled: { opacity: 0.7 },
  searchBtnText:  { fontSize: 15, fontWeight: '700', color: '#fff' },
  list:           { paddingHorizontal: 16, paddingBottom: 24 },
  emptyState:     { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon:      { fontSize: 36 },
  emptyTitle:     { fontSize: 16, fontWeight: '600', color: STEADY.ink.primary },
  emptySub:       { fontSize: 13, color: STEADY.ink.secondary, textAlign: 'center', maxWidth: 260 },
  card:           { backgroundColor: '#fff', borderRadius: STEADY.r.md, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: STEADY.border.light, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardLeft:       { },
  cardIcon:       { width: 40, height: 40, borderRadius: 20, backgroundColor: STEADY.accent.soft, alignItems: 'center', justifyContent: 'center' },
  cardBody:       { flex: 1, gap: 2 },
  cardName:       { fontSize: 14, fontWeight: '600', color: STEADY.ink.primary, lineHeight: 19 },
  cardAddress:    { fontSize: 12, color: STEADY.ink.secondary },
  cardMeta:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  cardDist:       { fontSize: 11, fontWeight: '600', color: STEADY.accent.deep },
  cardRating:     { fontSize: 11, color: STEADY.ink.tertiary },
  cardOpen:       { fontSize: 11, fontWeight: '600' },
  cardOpenYes:    { color: '#16a34a' },
  cardOpenNo:     { color: STEADY.emergency.base },
})
