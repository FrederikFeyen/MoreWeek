'use client';

import { useEffect, useState } from 'react';
import { fetchWeather, WeatherData, getWeatherDescription } from '../lib/weather';

export default function Dashboard() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default location: London
  const lat = 51.5074;
  const lon = -0.1278;

  useEffect(() => {
    const loadWeather = async () => {
      try {
        const data = await fetchWeather(lat, lon);
        setWeather(data);
      } catch (err) {
        setError('Failed to load weather data. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    };
    loadWeather();
  }, []);

  if (loading) return <div className="container">Loading dashboard...</div>;
  if (error) return <div className="container" style={{ color: 'red' }}>{error}</div>;
  if (!weather) return null;

  return (
    <main className="container">
      <h1 style={{ marginBottom: '2rem' }}>Weather Dashboard</h1>
      
      <div className="dashboard-card">
        <h2>Current Weather in London</h2>
        <div className="current-weather">
          <div className="temp">
            {weather.current_weather.temperature}°C
          </div>
          <div className="details">
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {getWeatherDescription(weather.current_weather.weathercode)}
            </p>
            <p>Wind: {weather.current_weather.windspeed} km/h</p>
            <p>Time: {new Date(weather.current_weather.time).toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <h3>7-Day Forecast</h3>
        <div className="forecast-grid">
          {weather.daily.time.map((date, index) => (
            <div key={date} className="forecast-item">
              <div className="forecast-date">
                {new Date(date).toLocaleDateString('en-GB', { weekday: 'short' })}
              </div>
              <div className="forecast-date" style={{ fontSize: '0.8rem', color: '#666' }}>
                {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </div>
              <div className="forecast-temp">
                {Math.round(weather.daily.temperature_2m_max[index])}°
              </div>
              <div style={{ fontSize: '0.7rem' }}>
                {getWeatherDescription(weather.daily.weathercode[index])}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
