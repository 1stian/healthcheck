# PowerShell VM Health Check Agent for Windows
#
# This script reports Windows VM health metrics to the healthcheck API
# Install as a Windows Scheduled Task to run every 30 seconds
#
# Configuration:
#   $apiUrl: API endpoint
#   $apiKey: API key for authentication
#   $intervalSeconds: How often to report
#

# Configuration
$apiUrl = [Environment]::GetEnvironmentVariable("HEALTHCHECK_API_URL", "User") ?? "http://localhost:3000/api"
$apiKey = [Environment]::GetEnvironmentVariable("HEALTHCHECK_API_KEY", "User") ?? ""
$intervalSeconds = [int]([Environment]::GetEnvironmentVariable("REPORT_INTERVAL_SECONDS", "User") ?? "30")
$debug = [System.Convert]::ToBoolean([Environment]::GetEnvironmentVariable("DEBUG_HEALTHCHECK", "User") ?? "0")

# Logging function
function Log-Message {
    param([string]$Message)
    
    if ($debug) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $logPath = "$env:ProgramData\HealthCheck\agent.log"
        "$timestamp - $Message" | Out-File -FilePath $logPath -Append -Encoding UTF8
    }
}

Log-Message "Health check agent starting"

try {
    # Get basic system information
    $hostname = [System.Net.Dns]::GetHostName()
    
    # Try to get Proxmox VM ID from system info
    $vmId = [Environment]::GetEnvironmentVariable("PROXMOX_VMID") ?? "unknown"
    $node = [Environment]::GetEnvironmentVariable("PROXMOX_NODE") ?? "unknown"
    
    # Determine VM status (always running if script is executing)
    $status = "running"
    
    # Get CPU usage (0-100)
    $cpuUsage = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'" | 
        Select-Object -ExpandProperty PercentProcessorTime
    
    if ($null -eq $cpuUsage) {
        $cpuUsage = 0
    }
    
    # Get memory information (in MB)
    $memoryInfo = Get-CimInstance Win32_LogicalMemoryConfiguration
    $ramTotal = [math]::Round($memoryInfo.TotalPhysicalMemory / 1MB)
    
    $freeMemory = Get-CimInstance Win32_OperatingSystem | 
        Select-Object -ExpandProperty FreePhysicalMemory
    $ramUsed = [math]::Round(($ramTotal * 1MB - $freeMemory) / 1MB)
    
    # Get disk usage (in MB) - C: drive or system drive
    $systemDrive = $env:SystemDrive
    $diskInfo = Get-Volume -DriveLetter $systemDrive[0] -ErrorAction SilentlyContinue
    
    if ($null -ne $diskInfo) {
        $diskTotal = [math]::Round($diskInfo.Size / 1MB)
        $diskUsed = [math]::Round(($diskInfo.Size - $diskInfo.SizeRemaining) / 1MB)
    } else {
        $diskTotal = 0
        $diskUsed = 0
    }
    
    # Get uptime (in seconds)
    $osInfo = Get-CimInstance Win32_OperatingSystem
    $lastBootTime = $osInfo.LastBootUpTime
    $uptimeSeconds = [math]::Round((Get-Date) - $lastBootTime).TotalSeconds)
    
    # Current timestamp (Unix epoch)
    $timestamp = [int][double]::Parse((Get-Date (Get-Date).ToUniversalTime() -UFormat %s))
    
    Log-Message "Collected metrics - CPU: ${cpuUsage}%, RAM: ${ramUsed}MB/${ramTotal}MB, Uptime: ${uptimeSeconds}s"
    
    # Create JSON payload
    $payload = @{
        hostname = $hostname
        vmid = $vmId
        node = $node
        status = $status
        cpuUsage = [float]$cpuUsage
        ramUsage = [int]$ramUsed
        ramTotal = [int]$ramTotal
        diskUsage = [int]$diskUsed
        diskTotal = [int]$diskTotal
        uptime = [int]$uptimeSeconds
        timestamp = [int]$timestamp
    } | ConvertTo-Json
    
    Log-Message "Payload: $payload"
    
    # Send report to API
    if ([string]::IsNullOrEmpty($apiKey)) {
        Log-Message "WARNING: API_KEY not set, skipping report"
        exit 0
    }
    
    $headers = @{
        "Content-Type" = "application/json"
        "X-API-Key" = $apiKey
    }
    
    $response = Invoke-WebRequest -Uri "$apiUrl/health/report" `
        -Method POST `
        -Headers $headers `
        -Body $payload `
        -ErrorAction Stop
    
    Log-Message "API Response (HTTP $($response.StatusCode)): $($response.Content)"
    
    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 201) {
        Log-Message "Health report sent successfully"
        exit 0
    }
} catch {
    Log-Message "Error: $($_.Exception.Message)"
    exit 1
}
