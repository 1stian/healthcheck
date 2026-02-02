# VM Health Monitoring System

A comprehensive health monitoring solution for Windows and Linux virtual machines running on Proxmox. This system allows VMs to self-report their health metrics (CPU, RAM usage, status) to a central dashboard.

## Features

- **Real-time Dashboard**: Web interface displaying VM health status
- **Auto-Reporting**: VMs self-report metrics (hostname, CPU, RAM, uptime)
- **Stale Data Detection**: Automatic detection of unresponsive VMs
- **Proxmox Integration**: Send reset commands to unresponsive VMs via Proxmox API
- **Cross-Platform Support**: Native agents for Windows (PowerShell) and Linux (Bash)
- **Auto-Update**: Live dashboard updates

## Architecture

```
healthcheck/
├── backend/              # Node.js API server
│   ├── src/
│   ├── routes/           # API endpoints
│   ├── models/           # Database models
│   └── proxmox/          # Proxmox integration
├── frontend/             # React web dashboard
├── agents/               # VM reporting agents
│   ├── windows/          # PowerShell agent
│   └── linux/            # Bash agent
├── docker-compose.yml    # Database & services
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- Docker (for database)
- Proxmox API credentials

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   ```

2. **Configure environment**
   - Copy `.env.example` to `.env`
   - Add Proxmox credentials and database connection

3. **Start services**
   ```bash
   docker-compose up -d
   npm run dev
   ```

4. **Deploy agents**
   - Windows: Run PowerShell agent with scheduled task
   - Linux: Install as cron job or systemd service

## Configuration

### Backend
- `PROXMOX_HOST`: Proxmox API endpoint
- `PROXMOX_USER`: Proxmox API user
- `PROXMOX_TOKEN`: Proxmox API token
- `STALE_TIMEOUT_MS`: Data freshness threshold (default: 5 minutes)

### VM Agent
- `HEALTHCHECK_API_URL`: Backend API endpoint
- `REPORT_INTERVAL_MS`: Report frequency (default: 30 seconds)
- `THRESHOLD_CPU`: CPU alert threshold (default: 80%)
- `THRESHOLD_RAM`: RAM alert threshold (default: 90%)

## VM Health States

- **Healthy**: All metrics normal, recent data
- **Warning**: High CPU/RAM, but responsive
- **Down**: No data received for > STALE_TIMEOUT
- **Reset Pending**: Reset command sent, waiting confirmation

## API Endpoints

- `POST /api/health/report` - VM health report submission
- `GET /api/vms` - List all VMs
- `GET /api/vms/:id` - Get VM details
- `POST /api/vms/:id/reset` - Send reset command
- `GET /api/metrics/:id` - VM metrics history

## Monitoring & Alerts

The system monitors:
- **CPU Usage**: Real-time and average over time window
- **RAM Usage**: Total available and used
- **Disk Usage**: Optional (can be added to agent)
- **Uptime**: VM uptime in seconds
- **Last Heartbeat**: Last successful report timestamp

VMs are considered down if no heartbeat received for the configured timeout period.

## Development

```bash
# Start backend in dev mode
npm run dev:backend

# Start frontend in dev mode
npm run dev:frontend

# Run tests
npm test

# Build for production
npm run build
```

## Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production setup guide.

## License

MIT
