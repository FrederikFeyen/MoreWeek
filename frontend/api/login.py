import sqlite3
import hashlib
import secrets
import json

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def handler(request):
    email = request.get("email")
    password = request.get("password")
    if not email or not password:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing email or password"}),
            "headers": {"Content-Type": "application/json"}
        }
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    if row is None or row[0] != hash_password(password):
        return {
            "statusCode": 401,
            "body": json.dumps({"error": "Invalid credentials"}),
            "headers": {"Content-Type": "application/json"}
        }
    session_token = secrets.token_hex(32)
    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Login successful", "token": session_token}),
        "headers": {"Content-Type": "application/json"}
    }
