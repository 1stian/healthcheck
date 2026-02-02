# VM Health Reporting Agents

Self-reporting agents for Windows and Linux VMs to send health metrics to the monitoring dashboard.

## Installation

### Linux Agent

1. Copy `linux-agent.sh` to `/opt/healthcheck/`
2. Make executable: `chmod +x /opt/healthcheck/linux-agent.sh`
3. Create systemd service or cron job

**Systemd service** (`/etc/systemd/system/healthcheck-agent.service`):
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
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable: `systemctl enable --now healthcheck-agent`

**Cron job** (every 30 seconds):
```bash
* * * * * /opt/healthcheck/linux-agent.sh > /dev/null 2>&1
* * * * * sleep 30 && /opt/healthcheck/linux-agent.sh > /dev/null 2>&1
```

### Windows Agent

1. Copy `windows-agent.ps1` to `C:\HealthCheck\`
2. Create scheduled task with PowerShell execution policy allow script execution
3. Run every 30 seconds

**PowerShell Command (Run as Administrator)**:
```powershell
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\HealthCheck\windows-agent.ps1"'
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Seconds 30) -RepetitionDuration (New-TimeSpan -Days 365)
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "HealthCheckAgent" -Description "VM Health Reporting Agent"
```

## Configuration

Set environment variables or edit scripts:

**Linux**:
```bash
export HEALTHCHECK_API_URL="http://healthcheck.local/api"
export HEALTHCHECK_API_KEY="your-vm-api-key"
export REPORT_INTERVAL_SECONDS=30
```

**Windows**:
Edit the script to set:
```powershell
$apiUrl = "http://healthcheck.local/api"
$apiKey = "your-vm-api-key"
$intervalSeconds = 30
```

## Metrics Reported

- **Hostname**: VM hostname
- **VMID**: Proxmox VM ID
- **Node**: Proxmox node name
- **Status**: running/stopped
- **CPU Usage**: Current CPU percentage
- **RAM Usage**: Used memory in MB
- **RAM Total**: Total memory in MB
- **Disk Usage**: (Linux) Used disk in MB
- **Disk Total**: (Linux) Total disk in MB
- **Uptime**: System uptime in seconds
- **Timestamp**: Unix timestamp

## Troubleshooting

- Check logs: `journalctl -u healthcheck-agent -f` (Linux)
- Verify connectivity: `curl -X POST http://healthcheck.local/api/health/report ...`
- Check agent process: `ps aux | grep healthcheck` (Linux)
- Enable debug mode in scripts (uncomment debug lines)
