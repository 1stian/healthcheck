# Backend Server

Node.js Express API server for the VM health monitoring system.

## Setup

```bash
npm install
```

## Environment Variables

Create `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://healthcheck:changeme123@localhost:5432/healthcheck_db
REDIS_URL=redis://localhost:6379

# Proxmox
PROXMOX_HOST=https://proxmox.example.com:8006
PROXMOX_USER=root@pam
PROXMOX_TOKEN=your-token-id
PROXMOX_SECRET=your-token-secret

# VM Monitoring
STALE_TIMEOUT_MS=300000  # 5 minutes
AUTO_RESET_ENABLED=true
RESET_RETRY_COUNT=3
RESET_RETRY_DELAY_MS=10000

# API Security
JWT_SECRET=your-secret-key-change-in-production
API_KEY=your-api-key-for-vm-agents

# Logging
LOG_LEVEL=info
```

## Development

```bash
npm run dev
```

## Database

```bash
npm run db:migrate
npm run db:seed
```

## API Routes

- `POST /api/health/report` - VM submits health report
- `GET /api/vms` - List all VMs
- `GET /api/vms/:id` - Get VM details
- `GET /api/vms/:id/history` - Get VM metric history
- `POST /api/vms/:id/reset` - Send reset command
- `GET /api/status` - System status
