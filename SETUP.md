# VM Health Monitoring System - Setup & Deployment Guide

## Overview

This is a comprehensive VM health monitoring solution for Proxmox infrastructure. The system consists of:

- **Backend API** (Node.js + Express): Receives health reports, manages Proxmox integration
- **Frontend Dashboard** (React + Vite): Real-time monitoring interface
- **Linux Agent**: Bash script for Linux VM health reporting
- **Windows Agent**: PowerShell script for Windows VM health reporting
- **Database**: PostgreSQL for persistence, Redis for caching
- **Proxmox Integration**: Automatic VM reset commands via Proxmox API

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  Web Browser / Dashboard                    │
│                     (React Frontend)                        │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTP/REST
                   │
       ┌───────────▼──────────────┐
       │  Express API Server      │
       │  (Node.js Backend)       │
       │  :3000                   │
       └──────┬──────────────┬────┘
              │              │
       ┌──────▼──┐    ┌─────▼────┐
       │PostgreSQL    │  Redis   │
       │Database      │ Cache    │
       │ :5432        │ :6379    │
       └─────────┘    └──────────┘
              │
       ┌──────▼────────────┐
       │ Proxmox API       │
       │ (Reset commands)  │
       └───────────────────┘

VMs (Linux/Windows)
  ├─ linux-agent.sh ──┐
  │                   └──▶ POST /api/health/report
  │                        (every 30 seconds)
  └─ windows-agent.ps1─┘
```

## Prerequisites

- Docker & Docker Compose
- Node.js 18+
- PostgreSQL 14+ (via Docker)
- Redis 7+ (via Docker)
- Proxmox cluster with API access
- Proxmox API credentials

## Installation

### 1. Clone Repository

```bash
cd /opt
git clone <repo-url> healthcheck
cd healthcheck
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Database
DATABASE_URL=postgresql://healthcheck:changeme123@localhost:5432/healthcheck_db

# Proxmox
PROXMOX_HOST=https://your-proxmox:8006
PROXMOX_USER=root@pam
PROXMOX_TOKEN=my-token-id
PROXMOX_SECRET=my-token-secret

# Stale timeout (5 minutes)
STALE_TIMEOUT_MS=300000

# CPU/RAM thresholds (%)
CPU_THRESHOLD=80
RAM_THRESHOLD=90
```

### 3. Start Database Services

```bash
docker-compose up -d

# Verify services
docker-compose ps
```

### 4. Install Backend Dependencies

```bash
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
cd ..
```

### 5. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 6. Build for Production

```bash
npm run build
```

## Running the System

### Development Mode

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Access dashboard at `http://localhost:5173`

### Production Mode

**Using Docker:**

Create `Dockerfile` for backend:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy both backend and frontend
COPY backend ./backend
COPY frontend ./frontend

# Build frontend
RUN cd frontend && npm ci && npm run build

# Install backend deps
RUN cd backend && npm ci

EXPOSE 3000

CMD ["node", "backend/dist/index.js"]
```

Build and run:

```bash
docker build -t vm-healthcheck .
docker run -d \
  --name healthcheck \
  -p 3000:3000 \
  --env-file .env \
  vm-healthcheck
```

**Using systemd (Linux):**

Create `/etc/systemd/system/healthcheck.service`:

```ini
[Unit]
Description=VM Health Monitoring System
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=healthcheck
WorkingDirectory=/opt/healthcheck
Environment="NODE_ENV=production"
EnvironmentFile=/opt/healthcheck/.env
ExecStart=/usr/bin/node /opt/healthcheck/backend/dist/index.js
Restart=on-failure
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable healthcheck
sudo systemctl start healthcheck
```

## VM Agent Deployment

### Linux VMs

1. **Copy agent script**
   ```bash
   sudo mkdir -p /opt/healthcheck
   sudo cp agents/linux-agent.sh /opt/healthcheck/
   sudo chmod +x /opt/healthcheck/linux-agent.sh
   ```

2. **Install as systemd service**
   
   Create `/etc/systemd/system/healthcheck-agent.service`:
   ```ini
   [Unit]
   Description=VM Health Check Agent
   After=network-online.target
   Wants=network-online.target

   [Service]
   Type=simple
   ExecStart=/opt/healthcheck/linux-agent.sh
   Restart=always
   RestartSec=30
   Environment="HEALTHCHECK_API_URL=http://your-api:3000/api"
   Environment="HEALTHCHECK_API_KEY=your-vm-api-key"
   StandardOutput=journal
   StandardError=journal

   [Install]
   WantedBy=multi-user.target
   ```

   Enable:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable healthcheck-agent
   sudo systemctl start healthcheck-agent
   ```

3. **Or install as cron job**
   
   Add to crontab:
   ```
   * * * * * HEALTHCHECK_API_URL=http://your-api:3000/api HEALTHCHECK_API_KEY=your-key /opt/healthcheck/linux-agent.sh >/dev/null 2>&1
   * * * * * sleep 30 && HEALTHCHECK_API_URL=http://your-api:3000/api HEALTHCHECK_API_KEY=your-key /opt/healthcheck/linux-agent.sh >/dev/null 2>&1
   ```

### Windows VMs

1. **Create directory**
   ```powershell
   New-Item -ItemType Directory -Force -Path "C:\HealthCheck"
   Copy-Item agents\windows-agent.ps1 "C:\HealthCheck\"
   ```

2. **Create scheduled task** (Run as Administrator)
   ```powershell
   # Set execution policy
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

   # Create task
   $action = New-ScheduledTaskAction -Execute 'powershell.exe' `
     -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\HealthCheck\windows-agent.ps1"'
   
   $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
     -RepetitionInterval (New-TimeSpan -Seconds 30) `
     -RepetitionDuration (New-TimeSpan -Days 365)
   
   $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3
   
   Register-ScheduledTask -Action $action -Trigger $trigger `
     -TaskName "HealthCheckAgent" -Description "VM Health Reporting Agent" `
     -Settings $settings -RunLevel Highest
   ```

3. **Set environment variables** (User or System)
   ```powershell
   [Environment]::SetEnvironmentVariable("HEALTHCHECK_API_URL", "http://your-api:3000/api", "User")
   [Environment]::SetEnvironmentVariable("HEALTHCHECK_API_KEY", "your-vm-api-key", "User")
   ```

## API Endpoints

### Health Reporting
- `POST /api/health/report` - VM submits metrics

### VM Management
- `GET /api/vms` - List all VMs
- `GET /api/vms/:id` - Get VM details
- `GET /api/vms/:id/metrics?hours=24` - Get metric history
- `POST /api/vms/:id/reset` - Send reset command to VM
- `GET /api/vms/:id/reset-history` - Get reset history

### System Status
- `GET /api/status` - Get system health summary
- `PUT /api/status/config` - Update configuration

## Monitoring & Alerts

### Dashboard Features
- Real-time VM status (running, warning, down)
- CPU and RAM usage charts
- Last heartbeat timestamp
- Reset history per VM
- System-wide statistics

### Auto-Reset Logic
1. VM considered DOWN if no heartbeat for > `STALE_TIMEOUT_MS` (default 5 min)
2. System sends Proxmox reset command automatically
3. Tracks reset attempts (max 3 by default)
4. Logs all reset history for audit trail

### Threshold Alerts
- **CPU Alert**: Triggered at `CPU_THRESHOLD` (default 80%)
- **RAM Alert**: Triggered at `RAM_THRESHOLD` (default 90%)
- **Down Alert**: No heartbeat for timeout period

## Proxmox Integration

### API Credentials Setup

1. Create API token in Proxmox:
   ```bash
   # SSH to Proxmox node
   ssh root@proxmox
   
   # Create token
   pveum role add HealthCheck -privs "VM.PowerMgmt"
   pveum user add healthcheck@pam
   pveum aclmod / -user healthcheck@pam -role HealthCheck
   pveum token add healthcheck@pam healthcheck-token
   ```

2. Configure in `.env`:
   ```env
   PROXMOX_HOST=https://your-proxmox:8006
   PROXMOX_USER=healthcheck@pam
   PROXMOX_TOKEN=healthcheck-token
   PROXMOX_SECRET=<token-secret>
   ```

### Reset Command Behavior

When a VM is detected as down:
1. System sends `qm reset <vmid>` to Proxmox
2. Response logged in database
3. Reset attempt counter incremented
4. Dashboard shows "Reset Pending" state
5. After max retries, manual intervention recommended

## Troubleshooting

### Agent Not Reporting

**Linux:**
```bash
# Check service
sudo systemctl status healthcheck-agent

# View logs
sudo journalctl -u healthcheck-agent -n 50 -f

# Test manually
/opt/healthcheck/linux-agent.sh
```

**Windows:**
```powershell
# Check task
Get-ScheduledTask -TaskName "HealthCheckAgent"

# Run manually
powershell -ExecutionPolicy Bypass -File "C:\HealthCheck\windows-agent.ps1"
```

### Database Connection Issues

```bash
# Test connection
PGPASSWORD=changeme123 psql -h localhost -U healthcheck -d healthcheck_db -c "SELECT 1"

# Check Docker
docker-compose logs postgres
```

### API Not Responding

```bash
# Check if running
curl http://localhost:3000/health

# View logs
docker logs healthcheck-api

# Test POST
curl -X POST http://localhost:3000/api/health/report \
  -H "Content-Type: application/json" \
  -d '{"hostname":"test","vmid":"100","node":"node1","status":"running","cpuUsage":50,"ramUsage":1000,"ramTotal":2000,"uptime":3600,"timestamp":'$(date +%s)'}'
```

### Proxmox API Errors

Check token validity:
```bash
curl -k -H "Authorization: PVEAPIToken=user@realm!tokenid=secret" \
  https://proxmox:8006/api2/json/access/ticket
```

## Performance Tuning

### Database
- Index VM metrics by timestamp and vmId
- Archive old metrics (>30 days) to separate table
- Use connection pooling

### Caching
- Cache VM list for 10 seconds
- Cache metrics summaries for 30 seconds
- Use Redis TTL

### API Rate Limiting
```typescript
// In backend
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100               // 100 requests per minute
});

app.use('/api/', limiter);
```

## Backup & Recovery

### Database Backup
```bash
# Backup
docker-compose exec -T postgres pg_dump -U healthcheck healthcheck_db > backup.sql

# Restore
docker-compose exec -T postgres psql -U healthcheck healthcheck_db < backup.sql
```

### Configuration Backup
```bash
# Backup environment and configs
cp .env .env.backup
cp -r backend/config backend/config.backup
```

## Security Considerations

1. **API Keys**: Use strong, random API keys per VM
2. **HTTPS**: Enable TLS for frontend and API in production
3. **Database**: Use strong password, restrict connections
4. **Proxmox Token**: Use least privilege permissions
5. **Network**: Run behind firewall, limit API access
6. **Secrets**: Don't commit `.env` files to git
7. **Logs**: Rotate and secure log files

## License

MIT
