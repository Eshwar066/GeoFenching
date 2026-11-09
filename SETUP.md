# Geofencing System - Setup Guide

## Prerequisites

- Go 1.23+
- PostgreSQL 16 with PostGIS 3.4+
- Docker & Docker Compose (optional, for containerized deployment)

## Quick Start (Local Development)

### 1. Start PostgreSQL with PostGIS


```bash
eval "$(/opt/homebrew/bin/brew shellenv zsh)"

docker-compose up -d postgres
```

Or install PostgreSQL locally and enable PostGIS:
```sql
CREATE EXTENSION postgis;
CREATE EXTENSION "uuid-ossp";
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Run the Backend

```bash
cd backend
go run ./cmd/api
```

The server will start on `http://localhost:8080`

### 4. Test the API

```bash
# Health check
curl http://localhost:8080/health

# Create a geofence
curl -X POST http://localhost:8080/geofences \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Restricted Zone",
    "description": "Test restricted area",
    "coordinates": [
      [12.9710, 77.5900],
      [12.9810, 77.5900],
      [12.9810, 77.6000],
      [12.9710, 77.6000],
      [12.9710, 77.5900]
    ],
    "category": "restricted_zone"
  }'

# Register a vehicle
curl -X POST http://localhost:8080/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_number": "KA-01-AB-1234",
    "driver_name": "John Doe",
    "vehicle_type": "truck",
    "phone": "+919876543210"
  }'

# Update vehicle location (outside geofence)
curl -X POST http://localhost:8080/vehicles/location \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "<VEHICLE_ID>",
    "latitude": 12.9650,
    "longitude": 77.5850
  }'

# Update vehicle location (inside geofence - triggers entry event)
curl -X POST http://localhost:8080/vehicles/location \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "<VEHICLE_ID>",
    "latitude": 12.9750,
    "longitude": 77.5950
  }'
```

### 5. WebSocket Connection

Connect to `ws://localhost:8080/ws/alerts` to receive real-time alerts.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /geofences | Create geofence |
| GET | /geofences | List geofences (filter: category) |
| GET | /geofences/{id} | Get geofence by ID |
| POST | /vehicles | Register vehicle |
| GET | /vehicles | List vehicles |
| GET | /vehicles/{id} | Get vehicle by ID |
| PATCH | /vehicles/{id}/status | Update vehicle status |
| POST | /vehicles/location | Update location & detect events |
| GET | /vehicles/location/{vehicle_id} | Get current location & geofence state |
| POST | /alerts/configure | Configure alert rule |
| GET | /alerts | List alert rules |
| GET | /ws/alerts | WebSocket for live alerts |
| GET | /violations/history | Get violation history (filters: vehicle_id, geofence_id, event_type, start_date, end_date) |

## Docker Deployment

```bash
docker-compose up -d --build
```

## Project Structure

```
geofencing-system/
├── backend/
│   ├── cmd/api/          # Main entry point
│   ├── internal/
│   │   ├── config/       # Configuration
│   │   ├── database/     # Database connection & migrations
│   │   ├── middleware/   # HTTP middleware
│   │   ├── geofence/     # Geofence CRUD
│   │   ├── vehicle/      # Vehicle CRUD
│   │   ├── location/     # Location tracking & geofence detection
│   │   ├── alert/        # Alert rules & WebSocket
│   │   └── violation/    # Violation history
│   ├── Dockerfile
│   ├── go.mod
│   └── .env.example
├── docker-compose.yml
└── SETUP.md
```

## Architecture

- **Handler** → HTTP request/response
- **Service** → Business logic
- **Repository** → Database operations
- **Model** → Domain structures
- **Middleware** → Common HTTP behavior

## Geofence Detection Logic

1. On location update, fetch previous geofence membership
2. Find all geofences containing the new location (PostGIS `ST_Covers`)
3. Compare: `entered = current - previous`, `exited = previous - current`
4. Save location, update membership, create events in single transaction
5. Match events against alert rules, broadcast via WebSocket

## Response Format

All responses include `time_ns` (nanoseconds since handler start):

```json
{
  "data": {...},
  "time_ns": "1234567"
}
```

Errors:
```json
{
  "error": "description",
  "time_ns": "1234567"
}
```