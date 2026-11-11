# GeoFencing System - Setup Guide

## Prerequisites

- **Go 1.21+** (for backend)
- **Node.js 18+** (for frontend)
- **PostgreSQL 15+** with **PostGIS 3.3+** extension
- **Docker & Docker Compose** (for containerized deployment)

---

## Local Development Setup

### 1. Database Setup

```bash
# Start PostgreSQL with PostGIS using Docker
docker run --name geofencing-db \
  -e POSTGRES_DB=geofencing \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgis/postgis:15-3.3

# Verify PostGIS is enabled
docker exec -it geofencing-db psql -U postgres -d geofencing -c "SELECT PostGIS_Version();"
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
go mod download

# Copy environment template
cp .env.example .env
# Edit .env with your database credentials

# Run the server
go run cmd/api/main.go

# Server starts at http://localhost:8080
```

#### Environment Variables (.env)
```env
SERVER_PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=geofencing
DB_SSL_MODE=disable
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit with your API URL

# Start development server
npm run dev

# Frontend runs at http://localhost:5173
```

#### Environment Variables (.env)
```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws/alerts
```

---

## Docker Compose Setup

### 1. Start All Services

```bash
# From project root
docker-compose up -d --build

# Services:
# - postgres: PostgreSQL + PostGIS (port 5432)
# - backend: Go API (port 8080)
# - frontend: Vite dev server (port 5173)
```

### 2. Docker Compose Services

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_DB: geofencing
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - DB_NAME=geofencing
      - DB_SSL_MODE=disable
      - SERVER_PORT=8080
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend:/app
    command: ["go", "run", "cmd/api/main.go"]

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_BASE_URL=http://localhost:8080/api
      - VITE_WS_URL=ws://localhost:8080/ws/alerts
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: ["npm", "run", "dev", "--", "--host"]

volumes:
  postgres_data:
```

### 3. Production Build

```bash
# Build backend image
cd backend
docker build -t geofencing-backend .

# Build frontend for production
cd frontend
npm run build
# Output in dist/ - deploy to Vercel/Netlify
```

---

## API Testing with cURL

### Health Check
```bash
curl http://localhost:8080/health
```

### Geofences
```bash
# Create geofence
curl -X POST http://localhost:8080/api/geofences \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Zone",
    "description": "Main delivery area",
    "coordinates": [
      [37.7749, -122.4194],
      [37.7849, -122.4194],
      [37.7849, -122.4094],
      [37.7749, -122.4094],
      [37.7749, -122.4194]
    ],
    "category": "delivery_zone"
  }'

# List geofences
curl http://localhost:8080/api/geofences

# Filter by category
curl "http://localhost:8080/api/geofences?category=delivery_zone"
```

### Vehicles
```bash
# Register vehicle
curl -X POST http://localhost:8080/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_number": "KA-01-AB-1234",
    "driver_name": "John Doe",
    "vehicle_type": "truck",
    "phone": "+1234567890"
  }'

# List vehicles
curl http://localhost:8080/api/vehicles
```

### Location Updates
```bash
# Update vehicle location
curl -X POST http://localhost:8080/api/vehicles/location \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "VEHICLE_ID_HERE",
    "latitude": 37.7849,
    "longitude": -122.4194,
    "timestamp": "2025-01-15T10:35:00Z"
  }'

# Get current location
curl http://localhost:8080/api/vehicles/location/VEHICLE_ID_HERE
```

### Alerts
```bash
# Configure alert
curl -X POST http://localhost:8080/api/alerts/configure \
  -H "Content-Type: application/json" \
  -d '{
    "geofence_id": "GEOFENCE_ID_HERE",
    "vehicle_id": "VEHICLE_ID_HERE",
    "event_type": "entry"
  }'

# List alerts
curl http://localhost:8080/api/alerts
```

### Violations History
```bash
# Get violations with filters
curl "http://localhost:8080/api/violations/history?vehicle_id=VEHICLE_ID&limit=50"

# With date range
curl "http://localhost:8080/api/violations/history?start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z"
```

### WebSocket Test
```bash
# Using wscat (install: npm install -g wscat)
wscat -c ws://localhost:8080/ws/alerts
```

---

## Frontend Usage Guide

### 1. Dashboard
- Overview of active vehicles, geofences, unacknowledged alerts, recent events
- Quick stats at a glance

### 2. Geofences Page
- **Create**: Click "New Geofence" → Fill form → Draw polygon on map or enter coordinates
- **List**: View all geofences with category filter
- **Map**: Visualize geofence boundaries as polygons

### 3. Vehicles Page
- **Register**: Click "Register Vehicle" → Fill details
- **List**: View all vehicles with status filter
- **Status**: Change vehicle status (active/inactive/maintenance) inline

### 4. Live Map
- **Select Vehicle**: Click a vehicle from sidebar
- **Update Location**: Click on map to simulate location update
- **Real-time**: See vehicle markers and geofence boundaries
- **Events**: Entry/exit events shown as markers

### 5. Alerts Page
- **Configure**: Create alert rules (geofence + vehicle + event type)
- **Live Feed**: Real-time alerts appear in top-right panel
- **Manage**: Acknowledge/dismiss alerts

### 6. Violations History
- **Filters**: Vehicle, geofence, event type, date range
- **Pagination**: Navigate through history
- **Export**: Download CSV

---

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │◀───▶│   Backend   │◀───▶│  Database   │
│  (React)    │  WS  │    (Go)     │     │  (Postgres) │
└─────────────┘  /HTTP└─────────────┘  +PostGIS    └─────────────┘
```

### Backend Structure
```
backend/
├── cmd/api/main.go           # Entry point
├── internal/
│   ├── config/               # Configuration
│   ├── database/             # DB connection & migrations
│   ├── middleware/           # HTTP middleware (timing, CORS, logging)
│   ├── geofence/             # Geofence CRUD + PostGIS queries
│   ├── vehicle/              # Vehicle CRUD
│   ├── location/             # Location updates + point-in-polygon
│   ├── alert/                # Alert rules + WebSocket hub
│   └── violation/            # Historical events
```

### Key Algorithms
- **Point-in-Polygon**: PostGIS `ST_Covers(geofence.boundary, ST_MakePoint(lng, lat))`
- **Entry/Exit Detection**: Compare previous vs current geofence states
- **Real-time Alerts**: WebSocket hub broadcasts to all connected clients

---

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostGIS is enabled
docker exec -it geofencing-db psql -U postgres -d geofencing -c "SELECT PostGIS_Version();"

# Check migrations
docker exec -it geofencing-db psql -U postgres -d geofencing -c "\dt"
```

### WebSocket Not Connecting
- Ensure backend is running on port 8080
- Check browser console for CORS errors
- Verify `VITE_WS_URL` in frontend .env

### Location Not Updating
- Check vehicle exists: `GET /api/vehicles`
- Verify coordinates are valid (lat: -90 to 90, lng: -180 to 180)
- Check backend logs for point-in-polygon errors

---

## Deployment Checklist

### Backend (Docker)
- [ ] Build: `docker build -t geofencing-backend ./backend`
- [ ] Push to registry: `docker push your-registry/geofencing-backend`
- [ ] Deploy to: Railway, Render, Fly.io, ECS, Cloud Run, etc.
- [ ] Set environment variables
- [ ] Configure managed PostgreSQL + PostGIS

### Frontend (Vercel/Netlify)
- [ ] Connect GitHub repo
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Environment variables: `VITE_API_BASE_URL`, `VITE_WS_URL`
- [ ] Deploy

---

## Video Demo Checklist

### App Demo (10-12 min)
- [ ] Create geofence on map
- [ ] Register vehicle
- [ ] Update location to trigger entry event
- [ ] Show real-time alert arriving
- [ ] View violation history with filters
- [ ] Show Docker Compose running locally

### Implementation Deep Dive (12-18 min)
- [ ] Project structure walkthrough
- [ ] Go backend architecture
- [ ] Geospatial point-in-polygon logic
- [ ] WebSocket alert delivery
- [ ] Database schema
- [ ] React frontend structure

### Gaps & Roadmap (10-15 min)
- [ ] Edge cases not handled
- [ ] Production readiness items
- [ ] Scaling to thousands of vehicles
- [ ] What you'd refactor

---

## Support

For questions, refer to the assessment requirements or check the GitHub issues.