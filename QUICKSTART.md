# Quick Start Guide

Get the VM Health Monitoring system up and running in 5 minutes.

## Prerequisites

- Docker & Docker Compose installed
- Node.js 18+ installed
- Proxmox instance accessible (for production)

## Local Development Setup

### 1. Start Database Services

```bash
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Setup database
npm run db:generate
npm run db:migrate

# Start in dev mode (keep running in a terminal)
npm run dev
```

Backend will be available at `http://localhost:3000`

Test it:
```bash
curl http://localhost:3000/health
```

### 3. Setup Frontend (new terminal)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend will be available at `http://localhost:5173`

Open in browser: http://localhost:5173

### 4. Test VM Agent Reporting

#### Linux Agent Test

```bash
# Make agent executable
chmod +x agents/linux-agent.sh

# Set API endpoint and key
export HEALTHCHECK_API_URL="http://localhost:3000/api"
export HEALTHCHECK_API_KEY="dev-api-key-for-testing"

# Run agent manually to test
./agents/linux-agent.sh
```

#### Windows Agent Test

```powershell
# Set API endpoint and key
$env:HEALTHCHECK_API_URL = "http://localhost:3000/api"
$env:HEALTHCHECK_API_KEY = "dev-api-key-for-testing"

# Run agent
powershell -ExecutionPolicy Bypass -File agents\windows-agent.ps1
```

### 5. View Dashboard

Open http://localhost:5173 in your browser

You should see:
- Status summary (total VMs, healthy, warning, down)
- VM cards showing real-time metrics
- CPU and RAM usage
- Last heartbeat timestamp

## Docker-Based Deployment

For a complete containerized setup:

```bash
# Build backend image
docker build -t vm-healthcheck-backend -f backend/Dockerfile backend/

# Or use docker-compose for full stack
docker-compose -f docker-compose.prod.yml up -d
```

## Quick Configuration

Edit `.env` to customize:

```env
# Stale VM timeout (5 minutes)
STALE_TIMEOUT_MS=300000

# CPU alert threshold
CPU_THRESHOLD=80

# RAM alert threshold
RAM_THRESHOLD=90

# Enable auto-reset
AUTO_RESET_ENABLED=true
```

## Integration with Proxmox

For automatic VM resets, configure Proxmox credentials:

```env
PROXMOX_HOST=https://your-proxmox:8006
PROXMOX_USER=root@pam
PROXMOX_TOKEN=your-token
PROXMOX_SECRET=your-secret
```

See [SETUP.md](./SETUP.md) for detailed Proxmox integration instructions.

## Deploying Agents to VMs

### Linux VM

```bash
# Copy agent
sudo cp agents/linux-agent.sh /opt/healthcheck/
sudo chmod +x /opt/healthcheck/linux-agent.sh

# Configure
export HEALTHCHECK_API_URL="http://your-api:3000/api"
export HEALTHCHECK_API_KEY="your-vm-api-key"

# Install systemd service
sudo systemctl restart healthcheck-agent
```

### Windows VM

```powershell
# Copy and run agent setup
Copy-Item agents\windows-agent.ps1 C:\HealthCheck\
powershell -ExecutionPolicy Bypass C:\HealthCheck\windows-agent.ps1
```

See [agents/README.md](./agents/README.md) for detailed agent setup.

## Troubleshooting

### No VMs appearing in dashboard?

1. Check backend is running: `curl http://localhost:3000/health`
2. Check agent is sending data: Run agent manually and check output
3. Check database: 
   ```bash
   docker-compose exec postgres psql -U healthcheck -d healthcheck_db -c "SELECT * FROM \"VM\";"
   ```

### Agent reporting errors?

Check logs:
```bash
# Linux
sudo journalctl -u healthcheck-agent -f

# Windows
Get-EventLog -LogName Application | Where-Object {$_.Source -like "*PowerShell*"}
```

### Proxmox integration not working?

1. Verify credentials in `.env`
2. Test Proxmox API:
   ```bash
   curl -k https://your-proxmox:8006/api2/json/access/ticket \
     -d 'username=root@pam&password=your-password'
   ```

## Common Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild database
cd backend
npm run db:migrate
npm run db:seed

# Reset database
docker-compose down -v
docker-compose up -d
npm run db:migrate
```

## Next Steps

1. Read [SETUP.md](./SETUP.md) for production deployment
2. Configure Proxmox integration for auto-reset
3. Deploy agents to your VMs
4. Set up monitoring alerts

## Support

For detailed documentation:
- Backend: [backend/README.md](./backend/README.md)
- Frontend: [frontend/README.md](./frontend/README.md)
- Agents: [agents/README.md](./agents/README.md)
- Setup: [SETUP.md](./SETUP.md)

Enjoy monitoring! 🎉
