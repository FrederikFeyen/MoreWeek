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
  };
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const response = await fetch(`https://fastapi-backend-976721550665.europe-west1.run.app/api/weather?lat=${lat}&lon=${lon}`);
  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }
  return response.json();
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
