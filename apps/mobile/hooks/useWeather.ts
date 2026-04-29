import * as Location from 'expo-location'
import type { WeatherData } from '@repo/types'

const OPENWEATHER_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_KEY ?? ''

export interface Coords { lat: number; lon: number }

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

export async function fetchCurrentWeather(): Promise<WeatherData | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return null

    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    })

    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${coords.latitude}&lon=${coords.longitude}&appid=${OPENWEATHER_KEY}&units=metric`
    )
    if (!res.ok) return null

    const data = await res.json()
    return {
      tempC: Math.round(data.main.temp * 10) / 10,
      condition: data.weather[0]?.main ?? 'Unknown',
      humidity: data.main.humidity,
      lat: coords.latitude,
      lon: coords.longitude,
    }
  } catch {
    return null
  }
}
