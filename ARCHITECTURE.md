# Project Structure Overview

```
healthcheck/
├── backend/                          # Node.js Express API Server
│   ├── src/
│   │   ├── index.ts                 # Main application entry point
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript interfaces & types
│   │   ├── middleware/
│   │   │   ├── auth.ts              # API key authentication
│   │   │   └── errorHandler.ts      # Global error handling
│   │   ├── routes/
│   │   │   ├── health.routes.ts     # POST /api/health/report
│   │   │   ├── vm.routes.ts         # VM management endpoints
│   │   │   └── status.routes.ts     # System status endpoints
│   │   ├── services/
│   │   │   ├── healthcheck.ts       # Core health check logic
│   │   │   └── proxmox.ts           # Proxmox API integration
│   ├── prisma/
│   │   └── schema.prisma            # Database schema
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── frontend/                         # React + Vite Dashboard
│   ├── src/
│   │   ├── main.tsx                 # React entry point
│   │   ├── App.tsx                  # Root component
│   │   ├── App.css
│   │   ├── api/
│   │   │   └── client.ts            # API client & endpoints
│   │   └── components/
│   │       ├── Dashboard.tsx        # Main dashboard component
│   │       ├── Dashboard.css        # Dashboard styles
│   │       ├── VMCard.tsx           # VM status card component
│   │       └── SystemStatus.tsx     # System summary component
│   ├── index.html                   # HTML entry point
│   ├── vite.config.ts               # Vite configuration
│   ├── tsconfig.json
│   ├── package.json
│   └── README.md
│
├── agents/                           # VM Health Reporting Agents
│   ├── linux-agent.sh               # Linux (Bash) agent
│   ├── windows-agent.ps1            # Windows (PowerShell) agent
│   └── README.md
│
├── docker-compose.yml               # PostgreSQL & Redis services
├── .env.example                     # Environment template
├── .env                             # Development environment config
├── .gitignore
├── package.json                     # Root package.json (scripts only)
├── README.md                        # Project overview
├── QUICKSTART.md                    # 5-minute setup guide
└── SETUP.md                         # Complete deployment guide
```

## Key Components

### Backend API (`backend/`)
- **Express Server** running on port 3000
- **TypeScript** for type safety
- **Prisma ORM** for database operations
- **PostgreSQL** for data persistence
- **Redis** for caching
- **Proxmox API Client** for VM management

#### API Routes
```
POST   /api/health/report           - VM submits health metrics
GET    /api/vms                     - List all VMs
GET    /api/vms/:id                 - Get specific VM
GET    /api/vms/:id/metrics         - VM metric history
POST   /api/vms/:id/reset           - Send reset command
GET    /api/vms/:id/reset-history   - Reset attempt history
GET    /api/status                  - System health summary
PUT    /api/status/config           - Update configuration
GET    /health                      - Health check endpoint
```

### Frontend Dashboard (`frontend/`)
- **React 18** with TypeScript
- **Vite** for fast development & builds
- **Tailwind CSS** compatible styling
- **Axios** for API communication
- **Real-time updates** (5-second refresh)
- **Responsive design** for mobile

#### Pages/Components
- **Dashboard**: Main monitoring interface
- **VM Cards**: Individual VM status cards
- **System Status**: Overall system summary
- **VM Details Modal**: Detailed metrics & reset controls

### Database Schema (`backend/prisma/schema.prisma`)

**Models:**
- `VM` - Virtual machine records
- `VMMetric` - Historical metric data
- `ResetHistory` - VM reset logs
- `SystemConfig` - Configuration settings

### VM Agents

**Linux Agent** (`agents/linux-agent.sh`)
- Bash script for Linux VMs
- Collects: CPU, RAM, Disk, Uptime metrics
- Reports via HTTP POST every 30 seconds
- Installs as systemd service or cron job

**Windows Agent** (`agents/windows-agent.ps1`)
- PowerShell script for Windows VMs
- Collects: CPU, RAM, Disk, Uptime metrics
- Reports via HTTP POST every 30 seconds
- Installs as Windows Scheduled Task

## Data Flow

```
Linux/Windows VM Agent
    ↓ (HTTP POST with metrics)
    ↓
Backend API (/api/health/report)
    ↓
Database (PostgreSQL)
    ├─ Update VM record
    ├─ Log metric data
    └─ Update timestamps
    ↓
Frontend Dashboard (polls every 5 seconds)
    ├─ GET /api/vms
    ├─ GET /api/status
    └─ Displays real-time metrics
    ↓
Auto-Reset Logic
    ├─ Detect stale VMs (no heartbeat > timeout)
    ├─ Send reset command to Proxmox
    └─ Log reset history
```

## Database Schema

### VM Table
```sql
id              CUID (primary key)
hostname        String (unique)
vmid            String (unique, Proxmox VM ID)
node            String (Proxmox node name)
status          String (running/stopped/unknown)
cpuUsage        Float (0-100%)
ramUsage        Float (MB)
ramTotal        Float (MB)
diskUsage       Float (MB, optional)
diskTotal       Float (MB, optional)
uptime          Int (seconds)
lastHeartbeat   DateTime
lastReset       DateTime (nullable)
resetAttempts   Int
isDown          Boolean
isWarning       Boolean
apiKey          String (unique, for VM auth)
createdAt       DateTime
updatedAt       DateTime
```

### VMMetric Table
```sql
id              CUID (primary key)
vmId            CUID (foreign key to VM)
timestamp       DateTime
cpuUsage        Float
ramUsage        Float
ramTotal        Float
diskUsage       Float (optional)
diskTotal       Float (optional)
uptime          Int
```

### ResetHistory Table
```sql
id              CUID (primary key)
vmId            CUID (foreign key to VM)
reason          String
proxmoxResponse String (JSON)
success         Boolean
timestamp       DateTime
```

## Configuration

Environment variables (`.env`):

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Proxmox
PROXMOX_HOST=https://proxmox:8006
PROXMOX_USER=root@pam
PROXMOX_TOKEN=token-id
PROXMOX_SECRET=token-secret

# Monitoring
STALE_TIMEOUT_MS=300000       # 5 minutes
AUTO_RESET_ENABLED=true
RESET_RETRY_COUNT=3
CPU_THRESHOLD=80              # %
RAM_THRESHOLD=90              # %

# Security
JWT_SECRET=secret-key
API_KEY=api-key
```

## Development Workflow

### First Time Setup
```bash
docker-compose up -d           # Start services
cd backend && npm install      # Backend deps
npm run db:migrate             # Setup database
cd ../frontend && npm install  # Frontend deps
```

### Development
```bash
npm run dev                    # Runs both backend & frontend
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

### Building for Production
```bash
npm run build                  # Build both packages
npm run start                  # Run production build
```

## Performance Characteristics

- **Data Reporting**: Agent reports every 30 seconds
- **Dashboard Refresh**: Frontend updates every 5 seconds
- **Stale Detection**: Default 5-minute timeout
- **Database**: PostgreSQL with indexed queries
- **Cache**: Redis for frequent queries
- **API Response**: <100ms for most endpoints

## Security Features

- API key authentication for VMs
- JWT tokens for user sessions (ready to add)
- HTTPS support (ready for production)
- Rate limiting (can be enabled)
- SQL injection protection (Prisma)
- CORS configuration
- Helmet for HTTP headers

## Scalability

- Horizontal scaling: Multiple API servers behind load balancer
- Database: PostgreSQL replicas for read scaling
- Cache: Redis cluster for distributed caching
- Metrics archiving: Move old data to data warehouse
- Agent batching: Multiple VMs per report (future enhancement)

## Monitoring & Alerting

Current features:
- Real-time dashboard display
- Stale data detection
- High CPU/RAM alerts
- Reset attempt tracking
- Historical metric logging

Future enhancements:
- Email/Slack notifications
- Metric trending
- SLA tracking
- Custom alert rules
- Webhook integrations
