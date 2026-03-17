import httpx
import json

def handler(request):
    lat = request.get("lat")
    lon = request.get("lon")
    if lat is None or lon is None:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing lat or lon parameter"}),
            "headers": {"Content-Type": "application/json"}
        }

    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto"
    try:
        response = httpx.get(url)
        response.raise_for_status()
        data = response.json()
        return {
            "statusCode": 200,
            "body": json.dumps(data),
            "headers": {"Content-Type": "application/json"}
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
            "headers": {"Content-Type": "application/json"}
        }
