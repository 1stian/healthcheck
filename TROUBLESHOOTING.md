# Troubleshooting Guide

## Common Issues & Solutions

### 🚀 Getting Started Issues

#### "npm command not found"
**Problem**: Node.js not installed
```bash
# Install Node.js 18+
# Windows: Download from https://nodejs.org
# Mac: brew install node
# Linux: sudo apt install nodejs npm
```

#### "docker-compose command not found"
**Problem**: Docker not installed
```bash
# Install Docker Desktop
# https://www.docker.com/products/docker-desktop
```

#### "Port 3000/5173 already in use"
**Problem**: Services already running
```bash
# Find process using port
# Linux/Mac:
lsof -i :3000
lsof -i :5173

# Windows:
netstat -ano | findstr :3000

# Kill process (or change PORT in .env)
kill -9 <PID>
```

---

## 🔧 Backend Issues

### Backend won't start

**Error**: "ECONNREFUSED 127.0.0.1:5432"
```
Problem: PostgreSQL not running
Solution:
docker-compose up -d
docker-compose ps  # verify postgres is running
```

**Error**: "Cannot find module '@prisma/client'"
```
Problem: Dependencies not installed
Solution:
cd backend
npm install
npm run db:generate
npm run db:migrate
```

**Error**: "Database connection timeout"
```
Problem: Database not ready yet
Solution:
docker-compose down -v
docker-compose up -d
# Wait 10 seconds for postgres to start
npm run db:migrate
```

### API Not Responding

Test the backend:
```bash
# Should return {"status":"ok"}
curl http://localhost:3000/health

# Check if backend is running
ps aux | grep node
```

Check logs:
```bash
# If running with npm run dev
# Check terminal output for errors

# If running with docker
docker logs healthcheck-api
```

### Proxmox Integration Not Working

**Error**: "Failed to authenticate with Proxmox"
```
1. Verify credentials in .env
2. Test Proxmox API directly:
   curl -k https://your-proxmox:8006/api2/json/access/ticket \
     -d 'username=root@pam&password=your-password'
3. Check if VM can reach Proxmox network
```

---

## 📊 Frontend Issues

### Dashboard not loading

**Error**: "Failed to fetch. Make sure backend is running."
```
Problem: Backend API not accessible
Solution:
1. Check backend is running: curl http://localhost:3000/health
2. Check VITE_API_URL in frontend/.env is correct
3. Check CORS is enabled (should be by default)
```

**Error**: "Cannot find module 'react'"
```
Problem: Dependencies not installed
Solution:
cd frontend
npm install
```

### Dashboard shows "No VMs"

**Problem**: No VMs registered yet
```
Solution:
1. Configure a VM agent (Linux or Windows)
2. Run agent manually to test
3. Check agent logs for errors
4. Refresh dashboard
```

**Debug**: Check if data is in database
```bash
# Connect to database
PGPASSWORD=changeme123 psql -h localhost -U healthcheck -d healthcheck_db

# Query VMs
SELECT * FROM "VM";

# Query metrics
SELECT * FROM "VMMetric" LIMIT 10;
```

---

## 🤖 VM Agent Issues

### Linux Agent Not Reporting

Check agent is executable:
```bash
ls -la /opt/healthcheck/linux-agent.sh
chmod +x /opt/healthcheck/linux-agent.sh
```

Test agent manually:
```bash
export HEALTHCHECK_API_URL="http://your-api:3000/api"
export HEALTHCHECK_API_KEY="your-api-key"
/opt/healthcheck/linux-agent.sh
```

View logs:
```bash
# If using systemd
sudo systemctl status healthcheck-agent
sudo journalctl -u healthcheck-agent -f

# If using cron, check syslog
tail -f /var/log/syslog | grep healthcheck

# Enable debug logging
export DEBUG_HEALTHCHECK=1
/opt/healthcheck/linux-agent.sh
```

Common Linux issues:
```bash
# Permission denied
sudo chmod +x /opt/healthcheck/linux-agent.sh

# Command not found (curl, free, df, etc.)
sudo apt update && sudo apt install -y curl procps util-linux coreutils

# Network unreachable
ping your-api
curl -v http://your-api:3000/api/health/report
```

### Windows Agent Not Reporting

Test agent manually (as Administrator):
```powershell
powershell -ExecutionPolicy Bypass -File "C:\HealthCheck\windows-agent.ps1"
```

Check scheduled task:
```powershell
# List task
Get-ScheduledTask -TaskName "HealthCheckAgent"

# Run manually
Start-ScheduledTask -TaskName "HealthCheckAgent"

# Check for errors
Get-ScheduledTaskInfo -TaskName "HealthCheckAgent"
```

View Windows logs:
```powershell
# PowerShell event log
Get-EventLog -LogName Application | Where {$_.Source -like "*PowerShell*"} | Format-List

# Or use Event Viewer
# Applications and Services Logs > PowerShell
```

Enable debug output (save to file):
```powershell
# Edit script to add
Start-Transcript -Path "C:\HealthCheck\debug.log" -Append
# At the end add
Stop-Transcript
```

---

## 📦 Database Issues

### Can't connect to PostgreSQL

```bash
# Test connection
PGPASSWORD=changeme123 psql -h localhost -U healthcheck -d healthcheck_db -c "SELECT 1"

# Check if container is running
docker-compose ps postgres

# View container logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres
```

### Database schema missing tables

```bash
# Recreate schema
cd backend
npm run db:migrate
npm run db:seed

# Or completely reset
docker-compose down -v
docker-compose up -d
npm run db:migrate
```

### "Unique constraint violation" error

```
Problem: Duplicate VM hostname or vmid
Solution:
1. Check if VM already exists in database
2. Delete duplicate: DELETE FROM "VM" WHERE hostname='test-vm';
3. Or: docker-compose down -v && docker-compose up -d
```

---

## 🐳 Docker Issues

### Container won't start

```bash
# Check logs
docker-compose logs postgres
docker-compose logs redis

# Check port conflicts
netstat -tulpn | grep LISTEN

# Rebuild images
docker-compose down
docker-compose up -d --build

# Force recreate
docker-compose up -d --force-recreate
```

### "docker-compose command not found"

```bash
# Try docker compose (newer syntax)
docker compose up -d

# Or use full path
/usr/local/bin/docker-compose up -d

# Or on Windows, use Docker Desktop which includes it
```

### Containers running but services unreachable

```bash
# Check container IPs
docker-compose ps
docker inspect <container-id>

# Test connection
docker-compose exec postgres pg_isready
docker-compose exec redis redis-cli ping

# Check if ports are exposed
docker-compose logs
```

---

## 🔍 Debugging Tips

### Enable Debug Logging

**Backend:**
```bash
# In .env
LOG_LEVEL=debug

# Or set env var
LOG_LEVEL=debug npm run dev
```

**Frontend:**
```bash
# Browser console shows errors
# F12 or Ctrl+Shift+I to open DevTools
# Check Network tab for failed requests
```

**Agents:**
```bash
# Linux
DEBUG_HEALTHCHECK=1 /opt/healthcheck/linux-agent.sh

# Windows
$env:DEBUG_HEALTHCHECK = "1"
powershell -ExecutionPolicy Bypass -File "C:\HealthCheck\windows-agent.ps1"
```

### Check API Responses

```bash
# Test health report endpoint
curl -X POST http://localhost:3000/api/health/report \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-for-testing" \
  -d '{
    "hostname":"test-vm",
    "vmid":"100",
    "node":"node1",
    "status":"running",
    "cpuUsage":50,
    "ramUsage":1000,
    "ramTotal":2000,
    "uptime":3600,
    "timestamp":'$(date +%s)'
  }'

# Test VM list
curl http://localhost:3000/api/vms

# Test status
curl http://localhost:3000/api/status
```

### Check Network Connectivity

From VM to API:
```bash
# Test DNS resolution
nslookup your-api
nslookup healthcheck.local

# Test connectivity
ping your-api
curl -v http://your-api:3000/health

# Check firewall
ufw status  # Linux
netstat -an | grep 3000  # Check if listening
```

---

## 📋 Verification Checklist

- [ ] Docker running: `docker ps`
- [ ] PostgreSQL running: `docker-compose ps postgres`
- [ ] Redis running: `docker-compose ps redis`
- [ ] Backend running: `curl http://localhost:3000/health`
- [ ] Frontend running: Open http://localhost:5173
- [ ] Database connected: `npm run db:migrate` succeeds
- [ ] Agent installed on VM
- [ ] Agent can reach API: `curl http://api:3000/health` from VM
- [ ] Proxmox credentials working (if using reset)
- [ ] Dashboard shows VMs after running agent

---

## Getting Help

If you're stuck:

1. **Check logs first**
   - Backend: Terminal output or `npm run dev`
   - Frontend: Browser console (F12)
   - Agents: System logs (journalctl, Event Viewer)
   - Docker: `docker-compose logs`

2. **Verify configuration**
   - Check `.env` file has correct values
   - Verify Proxmox credentials
   - Check agent API URLs and keys

3. **Test components individually**
   - Test backend API directly with curl
   - Test database connection
   - Test agent manually
   - Test network connectivity

4. **Reset everything**
   ```bash
   docker-compose down -v
   docker-compose up -d
   npm run db:migrate
   npm run dev
   ```

5. **Review documentation**
   - SETUP.md for deployment
   - agents/README.md for agent setup
   - backend/README.md for API details
   - ARCHITECTURE.md for system overview

---

**Still stuck?** Check the documentation files or review the error messages carefully - they usually point to the issue! 🔍
