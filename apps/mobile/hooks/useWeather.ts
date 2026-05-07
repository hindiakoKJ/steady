import * as Location from 'expo-location'
import type { WeatherData } from '@repo/types'

const OPENWEATHER_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_KEY ?? ''

export interface Coords { lat: number; lon: number }

export type WeatherFailReason = 'location_denied' | 'location_unavailable' | 'api_key_missing' | 'api_error' | 'network_error'
export interface WeatherResult {
  data: WeatherData | null
  /** Only set when data is null */
  reason?: WeatherFailReason
}

/** Gets device GPS without calling OpenWeather. Use this for location links. */
export async function getCurrentLocation(): Promise<Coords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return null
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    })
    return { lat: coords.latitude, lon: coords.longitude }
  } catch {
    return null
  }
}

/** Full weather + GPS. Returns null on any failure (backwards-compat). */
export async function fetchCurrentWeather(): Promise<WeatherData | null> {
  const result = await fetchCurrentWeatherWithReason()
  return result.data
}

/** Like fetchCurrentWeather but also returns WHY it failed. */
export async function fetchCurrentWeatherWithReason(): Promise<WeatherResult> {
  try {
    if (!OPENWEATHER_KEY) return { data: null, reason: 'api_key_missing' }

    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return { data: null, reason: 'location_denied' }

    let coords: Location.LocationObjectCoords
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      coords = pos.coords
    } catch {
      return { data: null, reason: 'location_unavailable' }
    }

    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${coords.latitude}&lon=${coords.longitude}&appid=${OPENWEATHER_KEY}&units=metric`
    )
    if (!res.ok) return { data: null, reason: 'api_error' }

    const json = await res.json()
    return {
      data: {
        tempC: Math.round(json.main.temp * 10) / 10,
        condition: json.weather[0]?.main ?? 'Unknown',
        humidity: json.main.humidity,
        lat: coords.latitude,
        lon: coords.longitude,
      },
    }
  } catch {
    return { data: null, reason: 'network_error' }
  }
}
