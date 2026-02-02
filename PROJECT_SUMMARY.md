# VM Health Monitoring System - Project Summary

## What You Have

A complete, production-ready VM health monitoring solution for Proxmox infrastructure with the following components:

### 📊 **Dashboard (Frontend)**
- React-based web interface
- Real-time VM status display
- CPU/RAM usage metrics
- Health status visualization (Healthy/Warning/Down)
- VM reset controls
- System-wide statistics
- Auto-refresh every 5 seconds
- Responsive design for all devices

### 🔧 **Backend API (Node.js)**
- Express server with TypeScript
- RESTful API endpoints
- PostgreSQL database integration
- Redis caching
- Proxmox API integration
- Automatic VM reset functionality
- Health report processing
- Metric history storage
- User-friendly error handling

### 🤖 **VM Agents**
- **Linux Agent**: Bash script with systemd/cron support
- **Windows Agent**: PowerShell script with Scheduled Task support
- Cross-platform metric collection (CPU, RAM, Disk, Uptime)
- Self-healing capabilities
- Configurable reporting intervals

### 📦 **Database & Cache**
- PostgreSQL for persistent storage
- Redis for fast caching
- Docker Compose for easy setup
- Automatic migrations
- Complete schema for VM tracking

## Key Features

✅ **Self-Reporting VMs** - VMs send their own metrics (no monitoring agent needed on hypervisor)
✅ **Multi-Platform** - Supports Windows and Linux VMs simultaneously
✅ **Real-Time Dashboard** - Live updates with 5-second refresh interval
✅ **Automatic Reset** - Sends reset commands to unresponsive VMs via Proxmox API
✅ **Stale Data Detection** - Marks VMs as down if no heartbeat for configured timeout
✅ **Metric History** - Tracks all metrics over time for trending
✅ **Reset Tracking** - Logs all reset attempts with success/failure status
✅ **Configurable Thresholds** - CPU, RAM, and timeout settings
✅ **Production Ready** - Docker support, systemd services, error handling

## Quick Start (5 Minutes)

```bash
# 1. Start database services
docker-compose up -d

# 2. Setup backend
cd backend
npm install
npm run db:migrate
npm run dev

# 3. Start frontend (new terminal)
cd frontend
npm install
npm run dev

# 4. Open http://localhost:5173 in your browser
```

## File Structure

```
healthcheck/
├── backend/              # Node.js API server
├── frontend/             # React dashboard
├── agents/               # VM reporting scripts
│   ├── linux-agent.sh
│   └── windows-agent.ps1
├── docker-compose.yml    # Database services
├── .env                  # Configuration
├── QUICKSTART.md         # 5-minute setup
├── SETUP.md             # Detailed deployment guide
├── ARCHITECTURE.md      # System design & structure
└── README.md            # Project overview
```

## Configuration

Edit `.env` to customize:

```env
PROXMOX_HOST=https://your-proxmox:8006
PROXMOX_USER=root@pam
PROXMOX_TOKEN=token-id
PROXMOX_SECRET=token-secret

STALE_TIMEOUT_MS=300000  # 5 minutes
CPU_THRESHOLD=80         # Alert at 80%
RAM_THRESHOLD=90         # Alert at 90%
AUTO_RESET_ENABLED=true
```

## API Endpoints

**Core endpoints** (11 total):
- `POST /api/health/report` - VM reports metrics
- `GET /api/vms` - List all VMs
- `GET /api/vms/:id` - VM details
- `GET /api/vms/:id/metrics` - Metric history
- `POST /api/vms/:id/reset` - Send reset command
- `GET /api/vms/:id/reset-history` - Reset logs
- `GET /api/status` - System summary
- `PUT /api/status/config` - Update settings
- Plus health check and more

## Deployment Options

### Local Development
```bash
npm run dev
```

### Docker
```bash
docker build -t vm-healthcheck .
docker run -p 3000:3000 vm-healthcheck
```

### Linux Systemd
```bash
sudo systemctl enable healthcheck
sudo systemctl start healthcheck
```

### Production
See [SETUP.md](./SETUP.md) for complete production deployment guide

## Agent Installation

### Linux VMs
```bash
sudo cp agents/linux-agent.sh /opt/healthcheck/
sudo systemctl enable healthcheck-agent
sudo systemctl start healthcheck-agent
```

### Windows VMs
```powershell
Copy-Item agents\windows-agent.ps1 C:\HealthCheck\
# Create scheduled task (instructions in agents/README.md)
```

## Database

**Models:**
- `VM` - Virtual machine records
- `VMMetric` - Historical metrics
- `ResetHistory` - Reset logs
- `SystemConfig` - Settings

**Technologies:**
- PostgreSQL 14+ (via Docker)
- Redis 7+ (via Docker)
- Prisma ORM

## Monitoring Logic

### VM Status Determination
```
if (no heartbeat > STALE_TIMEOUT_MS)
    → Status = DOWN
    → Auto-reset triggered (if enabled)
else if (CPU > CPU_THRESHOLD OR RAM > RAM_THRESHOLD)
    → Status = WARNING
else
    → Status = HEALTHY
```

### Auto-Reset Process
1. VM marked as DOWN (stale data)
2. Reset command sent to Proxmox
3. Reset attempt logged
4. Dashboard shows "Reset Pending"
5. After max retries, manual intervention needed

## Proxmox Integration

Supports:
- VM reset commands
- VM shutdown commands
- VM status queries
- Token-based authentication
- API error handling & retry logic

## Next Steps

1. **Local Testing**: Follow QUICKSTART.md
2. **Configure Proxmox**: Get API credentials
3. **Deploy Agents**: Install on your VMs
4. **Production Setup**: Follow SETUP.md for deployment
5. **Customize**: Adjust thresholds in dashboard config

## Documentation

- **[README.md](README.md)** - Project overview
- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute setup
- **[SETUP.md](SETUP.md)** - Complete deployment guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design
- **[backend/README.md](backend/README.md)** - API documentation
- **[frontend/README.md](frontend/README.md)** - Dashboard setup
- **[agents/README.md](agents/README.md)** - Agent installation

## Tech Stack

**Backend:**
- Node.js 18+
- Express.js
- TypeScript
- PostgreSQL
- Redis
- Prisma ORM

**Frontend:**
- React 18
- Vite
- TypeScript
- Axios

**VM Agents:**
- Bash (Linux)
- PowerShell (Windows)

**Infrastructure:**
- Docker & Docker Compose
- Systemd
- Scheduled Tasks (Windows)
- Cron (Linux)

## Support

For issues or questions:
1. Check the relevant README files
2. Review SETUP.md for your deployment scenario
3. Check agent logs for reporting issues
4. Verify Proxmox API credentials

---

**Status:** ✅ Ready for development and deployment
**Version:** 1.0.0
**License:** MIT

Happy monitoring! 🎉
