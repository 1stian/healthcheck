#!/bin/bash

###############################################################################
# Linux VM Health Check Agent
# 
# This script reports VM health metrics to the healthcheck API
# Install as a systemd service or cron job to run every 30 seconds
#
# Configuration:
#   HEALTHCHECK_API_URL: API endpoint (default: http://localhost:3000/api)
#   HEALTHCHECK_API_KEY: API key for authentication
#   REPORT_INTERVAL_SECONDS: How often to report (default: 30)
###############################################################################

set -euo pipefail

# Configuration
API_URL="${HEALTHCHECK_API_URL:-http://localhost:3000/api}"
API_KEY="${HEALTHCHECK_API_KEY:-}"
REPORT_INTERVAL="${REPORT_INTERVAL_SECONDS:-30}"
DEBUG="${DEBUG_HEALTHCHECK:-0}"

# Logging function
log() {
    if [ "$DEBUG" = "1" ]; then
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >> /var/log/healthcheck-agent.log
    fi
}

log "Health check agent starting"

# Get basic system information
HOSTNAME=$(hostname -f 2>/dev/null || hostname)
VMID="${PROXMOX_VMID:-unknown}"
NODE="${PROXMOX_NODE:-unknown}"

# Try to detect if running in Proxmox VM
if command -v dmidecode &> /dev/null; then
    SYSTEM_SERIAL=$(dmidecode -s system-serial-number 2>/dev/null || echo "unknown")
    # Extract VMID from Proxmox serial format
    if [[ "$SYSTEM_SERIAL" =~ ([0-9]+) ]]; then
        VMID="${BASH_REMATCH[1]}"
    fi
fi

# Determine VM status
if systemctl is-system-running > /dev/null 2>&1; then
    STATUS="running"
else
    STATUS="unknown"
fi

# Get CPU usage (0-100)
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}' || echo "0")

# Get memory information (in MB)
if command -v free &> /dev/null; then
    MEMORY_INFO=$(free -m | grep Mem)
    RAM_TOTAL=$(echo "$MEMORY_INFO" | awk '{print $2}')
    RAM_USED=$(echo "$MEMORY_INFO" | awk '{print $3}')
else
    RAM_TOTAL=0
    RAM_USED=0
fi

# Get disk usage (in MB)
if command -v df &> /dev/null; then
    DISK_INFO=$(df -m / | tail -1)
    DISK_TOTAL=$(echo "$DISK_INFO" | awk '{print $2}')
    DISK_USED=$(echo "$DISK_INFO" | awk '{print $3}')
else
    DISK_TOTAL=0
    DISK_USED=0
fi

# Get uptime (in seconds)
if command -v uptime &> /dev/null; then
    UPTIME_SECONDS=$(awk '{print int($1)}' /proc/uptime 2>/dev/null || echo "0")
else
    UPTIME_SECONDS=0
fi

# Current timestamp
TIMESTAMP=$(date +%s)

log "Collected metrics - CPU: ${CPU_USAGE}%, RAM: ${RAM_USED}MB/${RAM_TOTAL}MB, Uptime: ${UPTIME_SECONDS}s"

# Create JSON payload
read -r -d '' PAYLOAD << EOF || true
{
  "hostname": "$HOSTNAME",
  "vmid": "$VMID",
  "node": "$NODE",
  "status": "$STATUS",
  "cpuUsage": $CPU_USAGE,
  "ramUsage": $RAM_USED,
  "ramTotal": $RAM_TOTAL,
  "diskUsage": $DISK_USED,
  "diskTotal": $DISK_TOTAL,
  "uptime": $UPTIME_SECONDS,
  "timestamp": $TIMESTAMP
}
EOF

log "Payload: $PAYLOAD"

# Send report to API
if [ -z "$API_KEY" ]; then
    log "WARNING: API_KEY not set, skipping report"
    exit 0
fi

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$API_URL/health/report" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "$PAYLOAD" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n-1)

log "API Response (HTTP $HTTP_CODE): $RESPONSE_BODY"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    log "Health report sent successfully"
    exit 0
else
    log "Failed to send health report (HTTP $HTTP_CODE): $RESPONSE_BODY"
    exit 1
fi
