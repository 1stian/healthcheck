import React from 'react';

interface SystemStatusData {
  vms: {
    total: number;
    healthy: number;
    warning: number;
    down: number;
  };
  config: any;
}

interface SystemStatusProps {
  status: SystemStatusData;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ status }) => {
  return (
    <div className="system-status">
      <div className="status-cards">
        <div className="status-card">
          <div className="card-value">{status.vms.total}</div>
          <div className="card-label">Total VMs</div>
        </div>
        <div className="status-card healthy">
          <div className="card-value">{status.vms.healthy}</div>
          <div className="card-label">Healthy</div>
        </div>
        <div className="status-card warning">
          <div className="card-value">{status.vms.warning}</div>
          <div className="card-label">Warning</div>
        </div>
        <div className="status-card down">
          <div className="card-value">{status.vms.down}</div>
          <div className="card-label">Down</div>
        </div>
      </div>

      <div className="config-info">
        <p>
          <strong>Stale Timeout:</strong> {(status.config.staleTimeoutMs / 1000).toFixed(0)}s
        </p>
        <p>
          <strong>CPU Threshold:</strong> {status.config.cpuThreshold}%
        </p>
        <p>
          <strong>RAM Threshold:</strong> {status.config.ramThreshold}%
        </p>
        <p>
          <strong>Auto Reset:</strong> {status.config.autoResetEnabled ? 'Enabled' : 'Disabled'}
        </p>
      </div>
    </div>
  );
};

export default SystemStatus;
