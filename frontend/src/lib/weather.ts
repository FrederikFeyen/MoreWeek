export interface WeatherData {
  current_weather: {
    temperature: number;
    windspeed: number;
    winddirection: number;
    weathercode: number;
    time: string;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weathercode: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
  };
  current_moisture?: number | string;
  current_precipitation_probability?: number;
  warning?: {
    text: string;
    severity: 'none' | 'medium' | 'high';
  };
}

export interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const response = await fetch(`http://127.0.0.1:8000/api/weather?lat=${lat}&lon=${lon}`);
  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }
  return response.json();
}

export async function searchLocation(name: string): Promise<Location[]> {
  const response = await fetch(`http://127.0.0.1:8000/api/search?name=${name}`);
  if (!response.ok) {
    throw new Error('Failed to fetch location data');
  }
  return response.json();
}

export interface VoiceMessage {
  name: string;
  url: string;
  created_at: number;
}

export async function getVoiceMessages(): Promise<VoiceMessage[]> {
  const response = await fetch('http://127.0.0.1:8000/api/tts');
  if (!response.ok) {
    throw new Error('Failed to fetch voice messages');
  }
  return response.json();
}

export async function speakText(text: string, name?: string, lang: string = 'en'): Promise<void> {
  const response = await fetch('http://127.0.0.1:8000/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, name, lang }),
  });

  if (!response.ok) {
    throw new Error('TTS request failed');
  }

  const { url } = await response.json();
  const audio = new Audio(url);
  await audio.play();
}

export const getWeatherDescription = (code: number) => {
  const descriptions: { [key: number]: string } = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Drizzle: Light intensity',
    53: 'Drizzle: Moderate intensity',
    55: 'Drizzle: Dense intensity',
    61: 'Rain: Slight intensity',
    63: 'Rain: Moderate intensity',
    65: 'Rain: Heavy intensity',
    71: 'Snow fall: Slight intensity',
    73: 'Snow fall: Moderate intensity',
    75: 'Snow fall: Heavy intensity',
    80: 'Rain showers: Slight',
    81: 'Rain showers: Moderate',
    82: 'Rain showers: Violent',
    95: 'Thunderstorm: Slight or moderate',
  };
  return descriptions[code] || 'Unknown';
};

// --- Caching Logic ---
const CACHE_KEY = 'weather_dashboard_cache';

export interface CachedItem {
  location: Location;
  weather: WeatherData;
  timestamp: string;
}

export function saveToCache(location: Location, weather: WeatherData) {
  if (typeof window === 'undefined') return;
  
  const cacheStr = localStorage.getItem(CACHE_KEY);
  let cache: Record<number, CachedItem> = cacheStr ? JSON.parse(cacheStr) : {};
  
  cache[location.id] = {
    location,
    weather,
    timestamp: new Date().toISOString()
  };
  
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function getCachedItems(): CachedItem[] {
  if (typeof window === 'undefined') return [];
  
  const cacheStr = localStorage.getItem(CACHE_KEY);
  if (!cacheStr) return [];
  
  const cache: Record<number, CachedItem> = JSON.parse(cacheStr);
  return Object.values(cache).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function removeFromCache(locationId: number) {
  if (typeof window === 'undefined') return;
  
  const cacheStr = localStorage.getItem(CACHE_KEY);
  if (!cacheStr) return;
  
  let cache: Record<number, CachedItem> = JSON.parse(cacheStr);
  delete cache[locationId];
  
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}
