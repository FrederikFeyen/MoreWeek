'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  fetchWeather, 
  WeatherData, 
  getWeatherDescription, 
  speakText, 
  searchLocation, 
  Location,
  saveToCache,
  getCachedItems,
  removeFromCache,
  CachedItem,
  getVoiceMessages,
  VoiceMessage
} from '../lib/weather';
import WeatherChart from '../components/WeatherChart';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'saved'>('dashboard');
  
  // Dashboard state
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<'en' | 'sw'>('en');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Saved Items state
  const [savedItems, setSavedItems] = useState<CachedItem[]>([]);
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([]);

  // Selected Location (Default: London)
  const [location, setLocation] = useState<Location>({
    id: 2643743,
    name: 'London',
    latitude: 51.5074,
    longitude: -0.1278,
    country: 'United Kingdom'
  });

  // Fetch weather and save to cache
  useEffect(() => {
    const loadWeather = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWeather(location.latitude, location.longitude);
        setWeather(data);
        saveToCache(location, data);
      } catch (err) {
        setError('Failed to load weather data. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    };
    loadWeather();
  }, [location]);

  // Load saved items and voice messages when tab switches
  useEffect(() => {
    if (activeTab === 'saved') {
      setSavedItems(getCachedItems());
      const loadVoiceMessages = async () => {
        try {
          const msgs = await getVoiceMessages();
          setVoiceMessages(msgs);
        } catch (err) {
          console.error('Failed to load voice messages:', err);
        }
      };
      loadVoiceMessages();
    }
  }, [activeTab]);

  // Handle outside click for search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 2) {
      setIsSearching(true);
      try {
        const results = await searchLocation(query);
        setSearchResults(results);
        setShowDropdown(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const selectLocation = (loc: Location) => {
    setLocation(loc);
    setSearchQuery('');
    setShowDropdown(false);
    setActiveTab('dashboard');
  };

  const handleSpeak = async (text: string, id: string, type: string) => {
    setSpeaking(id);
    try {
      // Generate descriptive filename: City_Type_Date
      const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
      const fileName = `${location.name.replace(/\s/g, '_')}_${type}_${dateStr}`;
      await speakText(text, fileName, selectedLang);
    } catch (err) {
      console.error('TTS Error:', err);
    } finally {
      setSpeaking(null);
    }
  };

  const handleReplay = (url: string, id: string) => {
    setSpeaking(id);
    const audio = new Audio(url);
    audio.onended = () => setSpeaking(null);
    audio.play().catch(err => {
      console.error('Audio play error:', err);
      setSpeaking(null);
    });
  };

  const handleDeleteCache = (id: number) => {
    removeFromCache(id);
    setSavedItems(getCachedItems());
  };

  const renderDashboard = () => {
    if (loading && !weather) return <div className="loading-state">Loading weather...</div>;
    if (error) return <div className="error-state">{error}</div>;
    if (!weather) return null;

    const currentDesc = weather ? `Current weather in ${location.name} is ${getWeatherDescription(weather.current_weather.weathercode)} at ${weather.current_weather.temperature} degrees Celsius.` : '';

    return (
      <div className="tab-content fade-in">
        {weather.warning && weather.warning.severity !== 'none' && (
          <div className={`weather-warning warning-${weather.warning.severity}`}>
            <span className="warning-icon">⚠️</span>
            <span className="warning-text">{weather.warning.text}</span>
          </div>
        )}

        <div className="dashboard-card">

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2>{location.name}, {location.country}</h2>
              <p style={{ color: 'var(--text-muted)' }}>Current Conditions</p>
            </div>
            <button 
              className="speak-btn"
              onClick={() => handleSpeak(currentDesc, 'current', 'Current_Weather')}
              disabled={speaking === 'current'}
            >
              {speaking === 'current' ? '...' : `🔊 Speak (${selectedLang.toUpperCase()})`}
            </button>
          </div>
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
          <WeatherChart data={weather} />
        </div>

        <div className="dashboard-card">
          <h3>7-Day Forecast</h3>
          <div className="forecast-grid">
            {weather.daily.time.map((date, index) => {
              const dayName = new Date(date).toLocaleDateString('en-GB', { weekday: 'long' });
              const temp = Math.round(weather.daily.temperature_2m_max[index]);
              const desc = getWeatherDescription(weather.daily.weathercode[index]);
              const forecastText = `On ${dayName} in ${location.name}, it will be ${desc} with a high of ${temp} degrees.`;
              
              return (
                <div key={date} className="forecast-item">
                  <div className="forecast-date">
                    {new Date(date).toLocaleDateString('en-GB', { weekday: 'short' })}
                  </div>
                  <div className="forecast-date" style={{ fontSize: '0.8rem', color: '#666' }}>
                    {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                  <div className="forecast-temp">
                    {temp}°
                  </div>
                  <div style={{ fontSize: '0.7rem', marginBottom: '0.5rem' }}>
                    {desc}
                  </div>
                  <button 
                    className="speak-btn-small"
                    onClick={() => handleSpeak(forecastText, date, `Forecast_${dayName}`)}
                    disabled={speaking === date}
                  >
                    {speaking === date ? '...' : '🔊'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderSavedData = () => {
    return (
      <div className="tab-content fade-in">
        <section className="saved-section">
          <h2>Cached Weather Data</h2>
          {savedItems.length === 0 ? (
            <div className="empty-state">No cached weather data.</div>
          ) : (
            <div className="saved-grid">
              {savedItems.map((item) => {
                const desc = getWeatherDescription(item.weather.current_weather.weathercode);
                return (
                  <div key={item.location.id} className="saved-card">
                    <div className="saved-card-header">
                      <h3>{item.location.name}</h3>
                      <button className="delete-btn" onClick={() => handleDeleteCache(item.location.id)}>✕</button>
                    </div>
                    <p className="saved-card-geo">{[item.location.admin3, item.location.admin2, item.location.admin1, item.location.country].filter(Boolean).join(', ')}</p>
                    <div className="saved-card-main">
                      <div className="saved-temp">{item.weather.current_weather.temperature}°C</div>
                      <div className="saved-desc">{desc}</div>
                    </div>
                    <p className="saved-timestamp">Cached: {new Date(item.timestamp).toLocaleString()}</p>
                    <button className="secondary-btn" onClick={() => selectLocation(item.location)}>View Live</button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="saved-section" style={{ marginTop: '3rem' }}>
          <h2>Voice Messages Log</h2>
          {voiceMessages.length === 0 ? (
            <div className="empty-state">No voice messages generated yet.</div>
          ) : (
            <div className="voice-log-list">
              {voiceMessages.map((msg, idx) => (
                <div key={idx} className="voice-log-item">
                  <div className="voice-info">
                    <span className="voice-name">{msg.name}</span>
                    <span className="voice-date">{new Date(msg.created_at * 1000).toLocaleString()}</span>
                  </div>
                  <button 
                    className="speak-btn-circle"
                    onClick={() => handleReplay(msg.url, `msg-${idx}`)}
                    disabled={speaking === `msg-${idx}`}
                  >
                    {speaking === `msg-${idx}` ? '...' : '▶'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  };

  return (
    <main className="container">
      <div className="nav-bar">
        <div className="nav-left">
          <div className="tabs">
            <button 
              className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
              onClick={() => setActiveTab('saved')}
            >
              Saved Data
            </button>
          </div>

          <div className="lang-selector">
            <button 
              className={`lang-btn ${selectedLang === 'en' ? 'active' : ''}`}
              onClick={() => setSelectedLang('en')}
            >
              EN
            </button>
            <button 
              className={`lang-btn ${selectedLang === 'sw' ? 'active' : ''}`}
              onClick={() => setSelectedLang('sw')}
            >
              SW
            </button>
          </div>
        </div>

        <div className="search-container" ref={dropdownRef}>
          <input
            type="text"
            placeholder="Search city or village..."
            value={searchQuery}
            onChange={handleSearch}
            className="search-input"
          />
          {isSearching && <div className="search-loader">...</div>}
          {showDropdown && searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map((loc) => (
                <div 
                  key={loc.id} 
                  className="search-result-item"
                  onClick={() => selectLocation(loc)}
                >
                  <strong>{loc.name}</strong>
                  <div className="search-result-details">
                    {[loc.admin3, loc.admin2, loc.admin1, loc.country]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {loading && activeTab === 'dashboard' && <div className="loading-overlay">Updating...</div>}

      {activeTab === 'dashboard' ? renderDashboard() : renderSavedData()}
    </main>
  );
}
