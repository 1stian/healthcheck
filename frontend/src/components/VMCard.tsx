import React from 'react';

interface VMStatus {
  id: string;
  hostname: string;
  status: string;
  health: 'healthy' | 'warning' | 'down';
  cpuUsage: number;
  ramPercent: number;
  lastHeartbeat: string;
}

interface VMCardProps {
  vm: VMStatus;
  onSelect: () => void;
}

const VMCard: React.FC<VMCardProps> = ({ vm, onSelect }) => {
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'down':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const isStale = Date.now() - new Date(vm.lastHeartbeat).getTime() > 300000;

  return (
    <div
      className={`vm-card ${vm.health} ${isStale ? 'stale' : ''}`}
      onClick={onSelect}
      style={{
        borderLeftColor: getHealthColor(vm.health),
      }}
    >
      <div className="card-header">
        <h3>{vm.hostname}</h3>
        <span className={`health-badge health-${vm.health}`}>{vm.health}</span>
      </div>

      <div className="card-body">
        <div className="metric-row">
          <div className="metric">
            <span className="label">Status</span>
            <span className="value">{vm.status}</span>
          </div>
          <div className="metric">
            <span className="label">CPU</span>
            <span className="value">{vm.cpuUsage.toFixed(1)}%</span>
          </div>
        </div>

        <div className="metric-row">
          <div className="metric">
            <span className="label">RAM</span>
            <span className="value">{vm.ramPercent.toFixed(1)}%</span>
          </div>
          <div className="metric">
            <span className="label">Last Update</span>
            <span className="value">
              {Math.round((Date.now() - new Date(vm.lastHeartbeat).getTime()) / 1000)}s ago
            </span>
          </div>
        </div>
      </div>

      <div className="card-footer">
        <button className="btn-details">View Details</button>
      </div>
    </div>
  );
};

export default VMCard;
