# System Data Flow & Integration Guide

## Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VM SELF-REPORTING                           │
└─────────────────────────────────────────────────────────────────────┘

LINUX VMs                           WINDOWS VMs
     │                                   │
     │ Runs every 30 seconds             │ Runs every 30 seconds
     │                                   │
     ├─ /opt/healthcheck/               ├─ C:\HealthCheck\
     │  linux-agent.sh                  │  windows-agent.ps1
     │                                   │
     │ Collects:                        │ Collects:
     │ • CPU usage (%)                  │ • CPU usage (%)
     │ • RAM used/total (MB)            │ • RAM used/total (MB)
     │ • Disk used/total (MB)           │ • Disk used/total (MB)
     │ • Uptime (seconds)               │ • Uptime (seconds)
     │ • Hostname                       │ • Hostname
     │ • Status (running)               │ • Status (running)
     │                                   │
     └───────────────┬───────────────────┘
                     │
                     │ HTTP POST
                     │ /api/health/report
                     │
         ┌───────────▼────────────┐
         │   Backend API Server   │
         │  (Express.js)          │
         │  Port: 3000            │
         └───────────┬────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
  ┌──────────────┐          ┌──────────────┐
  │ PostgreSQL   │          │    Redis     │
  │ Database     │          │   Cache      │
  │ Port: 5432   │          │  Port: 6379  │
  │              │          │              │
  │ Tables:      │          │ Stores:      │
  │ • VM         │          │ • VM list    │
  │ • VMMetric   │          │ • Metrics    │
  │ • Reset Logs │          │ • Status     │
  └──────────────┘          └──────────────┘
        │
        │ Stores metrics
        │ Updates VM status
        │ Logs reset attempts
        │
        └──────────────┬──────────────────┐
                       │                  │
          ┌────────────▼──────┐          │
          │ Check for Stale   │          │
          │ VMs (> 5 min)     │          │
          └────────────┬──────┘          │
                       │                 │
                       ▼                 │
          ┌────────────────────┐         │
          │ If stale: Mark as  │         │
          │ DOWN & trigger     │         │
          │ Proxmox reset      │         │
          └────────────┬───────┘         │
                       │                 │
                       ▼                 │
      ┌────────────────────────────┐    │
      │   Proxmox API             │    │
      │  (Reset/Shutdown)         │    │
      │  Port: 8006               │    │
      │                           │    │
      │ Sends: qm reset <vmid>    │    │
      │ Logs: Reset attempt       │    │
      └────────────────────────────┘    │
                                        │
                                        │ Serves web interface
                                        │ Returns API responses
                                        │
                       ┌────────────────▼──────────────┐
                       │   React Frontend Dashboard    │
                       │   Port: 5173                  │
                       │                              │
                       │ Features:                    │
                       │ • Real-time VM status        │
                       │ • CPU/RAM charts             │
                       │ • Reset controls             │
                       │ • Metric history             │
                       │ • Auto-refresh (5 sec)       │
                       │                              │
                       │ Polls API every 5 seconds:   │
                       │ GET /api/vms                 │
                       │ GET /api/vms/:id/metrics     │
                       │ GET /api/status              │
                       │                              │
                       └────────────────┬─────────────┘
                                        │
                                        │ Browser
                                        │ http://localhost:5173
                                        │
                                        ▼
                              ┌──────────────────┐
                              │   Web Browser    │
                              │                  │
                              │  Shows:          │
                              │  • VM Cards      │
                              │  • Status lights │
                              │  • Metrics       │
                              │  • Charts        │
                              └──────────────────┘
```

## API Request Flow

### 1. Health Report Submission (from VM)

```
VM Agent (every 30 seconds)
    │
    ├─ Collect system metrics
    │  • top, free, df, uptime
    │
    ├─ Create JSON payload
    │  {
    │    "hostname": "web-server-01",
    │    "vmid": "100",
    │    "node": "pve-node-1",
    │    "status": "running",
    │    "cpuUsage": 45.2,
    │    "ramUsage": 2048,
    │    "ramTotal": 4096,
    │    "diskUsage": 50000,
    │    "diskTotal": 100000,
    │    "uptime": 3600,
    │    "timestamp": 1672531200
    │  }
    │
    └─ POST to http://api/api/health/report
       ├─ Header: Content-Type: application/json
       ├─ Header: X-API-Key: vm-api-key-123
       └─ Body: JSON payload (above)
            │
            ▼
    Backend receives:
       ├─ Validates data
       ├─ Finds or creates VM record
       ├─ Updates metrics:
       │  • cpuUsage
       │  • ramUsage / ramTotal
       │  • diskUsage / diskTotal
       │  • lastHeartbeat = now()
       │  • isDown = false
       │  └─ isWarning = (CPU > 80% OR RAM > 90%)
       │
       ├─ Creates VMMetric record (historical)
       │
       └─ Returns:
          {
            "success": true,
            "message": "Health report received for web-server-01"
          }
```

### 2. Dashboard Refresh (from Browser)

```
Browser (every 5 seconds via React)
    │
    ├─ GET /api/vms
    │  │
    │  ▼
    │  Backend returns:
    │  [
    │    {
    │      "id": "vm_123",
    │      "hostname": "web-server-01",
    │      "vmid": "100",
    │      "status": "running",
    │      "health": "healthy|warning|down",
    │      "cpuUsage": 45.2,
    │      "ramUsage": 2048,
    │      "ramTotal": 4096,
    │      "ramPercent": 50.0,
    │      "lastHeartbeat": "2024-01-01T12:00:00Z",
    │      "isDown": false,
    │      "isWarning": false
    │    }
    │  ]
    │
    ├─ GET /api/status
    │  │
    │  ▼
    │  Backend returns:
    │  {
    │    "timestamp": "2024-01-01T12:00:00Z",
    │    "vms": {
    │      "total": 10,
    │      "healthy": 8,
    │      "warning": 1,
    │      "down": 1
    │    },
    │    "config": {
    │      "staleTimeoutMs": 300000,
    │      "cpuThreshold": 80,
    │      "ramThreshold": 90,
    │      "autoResetEnabled": true
    │    }
    │  }
    │
    └─ Update React components with new data
       └─ Dashboard re-renders with:
          • VM status cards
          • CPU/RAM percentages
          • Health status badges
          • Last heartbeat times
```

### 3. Auto-Reset Flow (when VM is down)

```
Background Job (every minute)
    │
    ├─ Check for stale VMs
    │  WHERE lastHeartbeat < (now - STALE_TIMEOUT)
    │
    ├─ For each stale VM:
    │  │
    │  ├─ Mark as DOWN
    │  │
    │  ├─ Check if auto-reset enabled
    │  │
    │  ├─ Check reset attempt count < max
    │  │
    │  └─ If OK:
    │     │
    │     ├─ Connect to Proxmox API
    │     │
    │     ├─ Send: qm reset <vmid> on <node>
    │     │
    │     ├─ Get response from Proxmox
    │     │
    │     ├─ Create ResetHistory record:
    │     │  {
    │     │    "vmId": "vm_123",
    │     │    "reason": "Auto-reset: stale VM",
    │     │    "proxmoxResponse": {...},
    │     │    "success": true/false,
    │     │    "timestamp": now()
    │     │  }
    │     │
    │     ├─ Update VM record:
    │     │  {
    │     │    "resetAttempts": +1,
    │     │    "lastReset": now()
    │     │  }
    │     │
    │     └─ If success:
    │        Wait for VM to report healthy status
    │        Dashboard shows "Reset Pending" state
    │
    └─ Log all actions to database
```

### 4. VM Details View (when clicking on VM)

```
User clicks "View Details" on VM card
    │
    └─ Modal opens and fetches:
       │
       ├─ GET /api/vms/:id
       │  └─ Returns current VM status
       │
       ├─ GET /api/vms/:id/metrics?hours=24
       │  │
       │  ▼
       │  Returns last 24 hours of metrics:
       │  [
       │    {
       │      "timestamp": "2024-01-01T12:00:00Z",
       │      "cpuUsage": 45.2,
       │      "ramUsage": 2048,
       │      "ramTotal": 4096,
       │      "uptime": 3600
       │    },
       │    ...
       │  ]
       │
       └─ GET /api/vms/:id/reset-history
          │
          ▼
          Returns reset attempts:
          [
            {
              "timestamp": "2024-01-01T11:00:00Z",
              "reason": "Auto-reset: stale VM",
              "success": true
            },
            ...
          ]
```

### 5. Manual Reset Trigger (from Dashboard)

```
User clicks "Send Reset Command"
    │
    └─ POST /api/vms/:id/reset
       │
       ├─ Body: { "reason": "Manual reset via dashboard" }
       │
       ▼
    Backend:
       ├─ Validate VM exists
       ├─ Check reset attempt count < max
       ├─ Connect to Proxmox API
       ├─ Send: qm reset <vmid>
       ├─ Log reset attempt
       ├─ Update resetAttempts counter
       │
       └─ Return response:
          {
            "success": true,
            "message": "Reset command sent to web-server-01",
            "resetAttempts": 1
          }
```

## Database Update Cycle

```
Every 30 seconds (VM Agent → API):
    │
    ├─ INSERT INTO VMMetric (cpuUsage, ramUsage, ...)
    │
    └─ UPDATE VM SET
         lastHeartbeat = now(),
         cpuUsage = $1,
         ramUsage = $2,
         isWarning = ($1 > 80 OR $2/ramTotal > 90%),
         isDown = false

Every 60 seconds (Stale Check Job):
    │
    └─ UPDATE VM SET isDown = true
       WHERE lastHeartbeat < (now - 5min)
         AND isDown = false

On Reset:
    │
    ├─ INSERT INTO ResetHistory (...)
    │
    └─ UPDATE VM SET
         resetAttempts = resetAttempts + 1,
         lastReset = now()

On Config Change:
    │
    └─ UPDATE SystemConfig SET
         staleTimeoutMs = $1,
         cpuThreshold = $2,
         ramThreshold = $3
```

## State Transitions

### VM Health State Machine

```
┌─────────────┐
│   HEALTHY   │ CPU < 80% AND RAM < 90% AND lastHeartbeat < 5min
└──────┬──────┘
       │
       ├─ CPU > 80% OR RAM > 90%
       ▼
┌─────────────┐
│   WARNING   │ High metrics but responsive
└──────┬──────┘
       │
       ├─ Metrics return to normal
       └──> HEALTHY
       │
       ├─ No heartbeat for 5 minutes
       ▼
┌─────────────┐
│    DOWN     │ No heartbeat > timeout
└──────┬──────┘
       │
       ├─ Auto-reset triggered (if enabled)
       │  └──> Reset sent to Proxmox
       │
       ├─ VM recovers and reports
       └──> HEALTHY
       │
       └─ Max reset attempts reached
          └──> RESET_FAILED (manual action needed)
```

## Performance Characteristics

| Operation | Frequency | Response Time | Database Impact |
|-----------|-----------|----------------|-----------------|
| Agent Report | Every 30s | <200ms | 2 inserts/updates |
| Dashboard Refresh | Every 5s | <100ms | Cache hit 90% |
| Metrics Query | On demand | <500ms | Indexed query |
| Stale Check | Every 60s | <1s | Batch update |
| Auto-Reset | On demand | <5s | 1 insert + API call |

## Error Handling Flow

```
API receives request
    │
    ├─ Validation fails
    │  └─ Return 400 Bad Request with error details
    │
    ├─ Database error
    │  └─ Return 500 Internal Error with logging
    │
    ├─ Proxmox API fails
    │  ├─ Log failure to ResetHistory
    │  ├─ Mark success = false
    │  └─ Return 500 with Proxmox error details
    │
    └─ Success
       └─ Return 200 with success message
```

---

This diagram shows how all components interact to provide real-time VM health monitoring!
