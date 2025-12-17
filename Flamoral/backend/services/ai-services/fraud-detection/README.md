# Fraud Detection Service

AI-powered fraud detection service for the dating platform. Detects suspicious users, fake profiles, location anomalies, and device fingerprint mismatches.

## Features

- **IP Reputation Checking**: Validates IP addresses against known threat databases
- **Velocity Checks**: Detects users performing actions too quickly (too many messages, swipes, etc.)
- **Location Anomaly Detection**: Identifies impossible travel patterns
- **Device Fingerprint Analysis**: Tracks and validates device information
- **Profile Authenticity Scoring**: Analyzes profiles for fake/scam indicators
- **Risk Score Calculation**: Provides 0-100 risk score with recommended actions

## API Endpoints

### POST /api/fraud/check
Check user for fraud risk with comprehensive analysis.

**Request:**
```json
{
  "user_id": "user123",
  "ip_address": "192.168.1.1",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "ip_address": "192.168.1.1",
    "country_code": "US",
    "city": "New York"
  },
  "device": {
    "device_id": "device456",
    "device_type": "ios",
    "os_version": "16.0",
    "user_agent": "Mozilla/5.0..."
  },
  "action_type": "login"
}
```

**Response:**
```json
{
  "user_id": "user123",
  "risk_score": {
    "score": 25.5,
    "level": "low",
    "factors": [
      {
        "type": "ip_reputation",
        "severity": 0.3,
        "description": "IP reputation risk: 0.3"
      }
    ],
    "recommended_action": "allow"
  },
  "is_fraud": false,
  "timestamp": "2025-12-01T10:00:00Z",
  "details": {
    "ip_address": "192.168.1.1",
    "checks_performed": 1
  }
}
```

### POST /api/fraud/location-anomaly
Detect impossible travel and location anomalies.

**Request:**
```json
{
  "user_id": "user123",
  "current_location": {
    "latitude": 51.5074,
    "longitude": -0.1278,
    "timestamp": "2025-12-01T10:00:00Z",
    "country_code": "GB",
    "city": "London"
  },
  "previous_location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "timestamp": "2025-12-01T08:00:00Z",
    "country_code": "US",
    "city": "New York"
  }
}
```

**Response:**
```json
{
  "user_id": "user123",
  "is_anomaly": true,
  "impossible_travel": true,
  "distance_km": 5570.25,
  "time_diff_hours": 2.0,
  "max_speed_kmh": 2785.12,
  "vpn_detected": false,
  "details": {
    "previous_country": "US",
    "current_country": "GB",
    "travel_distance_km": 5570.25,
    "time_elapsed_hours": 2.0,
    "required_speed_kmh": 2785.12
  }
}
```

### POST /api/fraud/device-check
Device fingerprint analysis.

**Request:**
```json
{
  "user_id": "user123",
  "device": {
    "device_id": "device456",
    "device_type": "ios",
    "os_version": "16.0",
    "app_version": "2.1.0",
    "user_agent": "Mozilla/5.0...",
    "fingerprint": "abc123",
    "screen_resolution": "1920x1080",
    "timezone": "America/New_York"
  }
}
```

**Response:**
```json
{
  "user_id": "user123",
  "device_id": "device456",
  "is_trusted": true,
  "is_new": false,
  "fingerprint_match": true,
  "risk_indicators": [],
  "details": {
    "fingerprint_hash": "a1b2c3...",
    "device_type": "ios",
    "os_version": "16.0",
    "app_version": "2.1.0",
    "known_devices_count": 2
  }
}
```

### POST /api/fraud/profile-analysis
Profile authenticity scoring.

**Request:**
```json
{
  "user_id": "user123",
  "profile_data": {
    "name": "John Doe",
    "age": 28,
    "location": "New York",
    "occupation": "Engineer"
  },
  "photos": [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg"
  ],
  "bio": "Looking for meaningful connections...",
  "created_at": "2025-11-01T10:00:00Z"
}
```

**Response:**
```json
{
  "user_id": "user123",
  "authenticity_score": 85.0,
  "is_suspicious": false,
  "fake_indicators": [],
  "scam_indicators": [],
  "stock_photos_detected": false,
  "details": {
    "bio_length": 35,
    "photo_count": 2,
    "profile_fields": 4,
    "analysis_timestamp": "2025-12-01T10:00:00Z"
  }
}
```

## Risk Levels

- **LOW** (0-39): Allow normal operation
- **MEDIUM** (40-59): Monitor closely
- **HIGH** (60-79): Require verification
- **CRITICAL** (80-100): Block immediately

## Running the Service

### Using Docker

```bash
docker build -t fraud-detection .
docker run -p 8001:8001 fraud-detection
```

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py
```

The service will be available at `http://localhost:8001`.

### Health Check

```bash
curl http://localhost:8001/health
```

## Environment Variables

No environment variables required for basic operation. In production, configure:

- Database connections for persistent storage
- IP reputation API keys
- VPN detection service credentials
- Logging and monitoring endpoints

## Technology Stack

- **FastAPI**: Modern Python web framework
- **Pydantic**: Data validation
- **Python 3.11**: Latest Python version

## Development

The service is structured as follows:

```
fraud-detection/
├── main.py                 # FastAPI application
├── models.py              # Pydantic models
├── services/              # Business logic
│   ├── fraud_detector.py      # Main fraud detection
│   ├── location_analyzer.py   # Location anomaly detection
│   ├── device_analyzer.py     # Device fingerprint analysis
│   └── profile_analyzer.py    # Profile authenticity scoring
├── requirements.txt       # Python dependencies
├── Dockerfile            # Container build
└── README.md            # This file
```

## License

Proprietary - All rights reserved
