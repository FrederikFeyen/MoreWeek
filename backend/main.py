from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel # Added for login
import sqlite3 # Added for login
import httpx
import os
import hashlib
import time
from gtts import gTTS
from deep_translator import GoogleTranslator
from typing import Optional, List
import secrets
 
app = FastAPI(title="Weather API")
 
# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://techbridge-eight.vercel.app", "fastapi-backend-976721550665.europe-west1.run.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
# ==========================================
# ADDED FOR LOGIN: Database & Hashing Setup
# ==========================================
DB_FILE = "users.db"
 
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()
 
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, password_hash TEXT)''')
    
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)",
                       ("farmer@tanzania.com", hash_password("weather123")))
        conn.commit()
    conn.close()
 
init_db()
 
class LoginRequest(BaseModel):
    email: str
    password: str
 
@app.post("/api/login")
def login(req: LoginRequest):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash FROM users WHERE email = ?", (req.email,))
    row = cursor.fetchone()
    conn.close()
 
    if row is None or row[0] != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # NEW: Generate a secure 64-character session token
    session_token = secrets.token_hex(32)
    return {"message": "Login successful", "token": session_token}
# ==========================================
# END ADDED FOR LOGIN
# ==========================================
 
# Create static directory if it doesn't exist
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
TTS_DIR = os.path.join(STATIC_DIR, "tts")
os.makedirs(TTS_DIR, exist_ok=True)
 
# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
 
def generate_warning(daily_data: dict):
    """
    Analyzes 7-day forecast to generate a single warning label.
    """
    codes = daily_data.get("weathercode", [])
    precip = daily_data.get("precipitation_sum", [])
    max_temps = daily_data.get("temperature_2m_max", [])
    min_temps = daily_data.get("temperature_2m_min", [])
    
    # 1. Thunderstorm (Codes 95, 96, 99)
    if any(code in [95, 96, 99] for code in codes):
        return {"text": "Upcoming Thunderstorms Expected", "severity": "high"}
    
    # 2. Heavy Rainfall (Codes 65, 82 OR > 25mm on any day)
    if any(code in [65, 82] for code in codes) or any(p > 25 for p in precip):
        return {"text": "Severe Rainfall Alert", "severity": "high"}
    
    # 3. Heatwave (Any day > 35°C OR 3+ days > 32°C)
    if any(t > 35 for t in max_temps) or len([t for t in max_temps if t > 32]) >= 3:
        return {"text": "Intense Heatwave Detected", "severity": "high"}
    
    # 4. Cold Wave (Any day < -5°C)
    if any(t < -5 for t in min_temps):
        return {"text": "Dangerous Cold Temperatures", "severity": "high"}
    
    # 5. Moderate Rainfall (Any day > 10mm)
    if any(p > 10 for p in precip):
        return {"text": "Moderate Rain Likely", "severity": "medium"}
    
    # 6. Drought Risk (7-day sum is 0mm AND average max temp > 28°C)
    if sum(precip) == 0 and (sum(max_temps) / len(max_temps)) > 28:
        return {"text": "Drought Conditions Possible", "severity": "medium"}
    
    return {"text": "Stable Weather Conditions", "severity": "none"}
 
@app.get("/api/weather")
async def get_weather(lat: float, lon: float):
    # Updated URL to include precipitation_sum
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            # Analyze forecast for warnings
            if "daily" in data:
                data["warning"] = generate_warning(data["daily"])
            else:
                data["warning"] = {"text": "No forecast data available", "severity": "none"}
                
            return data
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch weather data: {str(e)}")
 
@app.get("/api/search")
async def search_location(name: str):
    url = f"https://geocoding-api.open-meteo.com/v1/search?name={name}&count=20&language=en&format=json"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            return data.get("results", [])
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch location data: {str(e)}")
 
@app.get("/api/tts")
async def list_tts_files():
    files = []
    for f in os.listdir(TTS_DIR):
        if f.endswith(".mp3"):
            filepath = os.path.join(TTS_DIR, f)
            files.append({
                "name": f.replace(".mp3", "").replace("_", " "),
                "url": f"http://localhost:8000/static/tts/{f}",
                "created_at": os.path.getctime(filepath)
            })
    # Sort by created_at descending
    files.sort(key=lambda x: x["created_at"], reverse=True)
    return files
 
@app.post("/api/tts")
async def generate_tts(data: dict = Body(...)):
    text = data.get("text")
    filename_input = data.get("name") # e.g. "London_Current_Weather"
    lang = data.get("lang", "en") # 'en' or 'sw'
    
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    
    # Process text based on language
    final_text = text
    if lang == "sw":
        try:
            final_text = GoogleTranslator(source='en', target='sw').translate(text)
        except Exception as e:
            print(f"Translation failed: {str(e)}")
            final_text = text # Fallback
            lang = "en" # Fallback lang if translation fails
 
    # Sanitize and use filename or fallback to hash
    if filename_input:
        # Include lang in filename to avoid conflicts
        safe_name = "".join([c if c.isalnum() or c in ("-", "_") else "_" for c in filename_input])
        filename = f"{safe_name}_{lang.upper()}.mp3"
    else:
        text_hash = hashlib.sha256(final_text.encode()).hexdigest()
        filename = f"{text_hash}_{lang}.mp3"
        
    filepath = os.path.join(TTS_DIR, filename)
    
    # Generate file if it doesn't exist
    if not os.path.exists(filepath):
        try:
            tts = gTTS(text=final_text, lang=lang)
            tts.save(filepath)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")
    
    return {"url": f"http://localhost:8000/static/tts/{filename}", "text": final_text, "lang": lang}
 
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)