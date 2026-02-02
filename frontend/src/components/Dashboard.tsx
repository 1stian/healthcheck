import React, { useState, useEffect } from 'react';
import { vmAPI, statusAPI } from '../api/client';
import VMCard from './VMCard';
import SystemStatus from './SystemStatus';
import './Dashboard.css';

interface VMStatus {
  id: string;
  hostname: string;
  vmid: string;
  node: string;
  status: string;
  health: 'healthy' | 'warning' | 'down';
  cpuUsage: number;
  ramUsage: number;
  ramTotal: number;
  ramPercent: number;
  lastHeartbeat: string;
  isDown: boolean;
  isWarning: boolean;
}

interface SystemStatusData {
  vms: {
    total: number;
    healthy: number;
    warning: number;
    down: number;
  };
  config: any;
}

const Dashboard: React.FC = () => {
  const [vms, setVMs] = useState<VMStatus[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVM, setSelectedVM] = useState<VMStatus | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vmsRes, statusRes] = await Promise.all([vmAPI.listVMs(), statusAPI.getStatus()]);

      setVMs(vmsRes.data);
      setSystemStatus(statusRes.data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch data. Make sure the backend is running.'
      );
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(
      fetchData,
      parseInt(import.meta.env.VITE_REFRESH_INTERVAL || '5000')
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>VM Health Monitor</h1>
        <div className="header-info">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          <button onClick={fetchData} className="btn-refresh">
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      {systemStatus && <SystemStatus status={systemStatus} />}

      <div className="vm-grid">
        {loading && vms.length === 0 ? (
          <div className="loading">Loading VM data...</div>
        ) : vms.length === 0 ? (
          <div className="no-vms">No VMs registered yet</div>
        ) : (
          vms.map((vm) => (
            <VMCard key={vm.id} vm={vm} onSelect={() => setSelectedVM(vm)} />
          ))
        )}
      </div>

      {selectedVM && (
        <VMDetailsModal vm={selectedVM} onClose={() => setSelectedVM(null)} />
      )}
    </div>
  );
};

const VMDetailsModal: React.FC<{ vm: VMStatus; onClose: () => void }> = ({
  vm,
  onClose,
}) => {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const [metricsRes, historyRes] = await Promise.all([
          vmAPI.getVMMetrics(vm.id),
          vmAPI.getResetHistory(vm.id),
        ]);
        setMetrics(metricsRes.data);
        setHistory(historyRes.data);
      } catch (error) {
        console.error('Error fetching VM details:', error);
      }
    };

    fetchDetails();
  }, [vm.id]);

  const handleReset = async () => {
    if (window.confirm(`Are you sure you want to reset ${vm.hostname}?`)) {
      try {
        const response = await vmAPI.resetVM(vm.id, `Manual reset via dashboard`);
        alert(`Reset sent: ${response.data.message}`);
        onClose();
      } catch (error) {
        alert(`Error: ${(error as any).response?.data?.error || 'Reset failed'}`);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{vm.hostname}</h2>
          <button className="btn-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <section>
            <h3>Current Status</h3>
            <div className="status-details">
              <p>
                <strong>Status:</strong> {vm.status}
              </p>
              <p>
                <strong>Health:</strong>{' '}
                <span className={`health-${vm.health}`}>{vm.health.toUpperCase()}</span>
              </p>
              <p>
                <strong>CPU:</strong> {vm.cpuUsage.toFixed(2)}%
              </p>
              <p>
                <strong>RAM:</strong> {vm.ramPercent.toFixed(2)}% ({vm.ramUsage}MB /{' '}
                {vm.ramTotal}MB)
              </p>
              <p>
                <strong>Last Heartbeat:</strong>{' '}
                {new Date(vm.lastHeartbeat).toLocaleString()}
              </p>
            </div>
          </section>

          {metrics.length > 0 && (
            <section>
              <h3>Metrics ({metrics.length} records)</h3>
              <div className="metrics-summary">
                <p>
                  Avg CPU:{' '}
                  {(metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / metrics.length).toFixed(
                    2
                  )}
                  %
                </p>
                <p>
                  Max CPU:{' '}
                  {Math.max(...metrics.map((m) => m.cpuUsage)).toFixed(2)}%
                </p>
              </div>
            </section>
          )}

          {history.length > 0 && (
            <section>
              <h3>Reset History</h3>
              <ul className="reset-history">
                {history.slice(0, 5).map((entry, i) => (
                  <li key={i}>
                    <small>{new Date(entry.timestamp).toLocaleString()}</small>
                    <br />
                    {entry.reason} - {entry.success ? '✓ Success' : '✗ Failed'}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="modal-footer">
          {vm.isDown && (
            <button className="btn-danger" onClick={handleReset}>
              Send Reset Command
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
