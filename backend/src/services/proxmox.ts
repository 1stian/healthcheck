import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { logger } from '../index';

export class ProxmoxClient {
  private client: AxiosInstance;
  private ticket: string = '';
  private ticketExpiry: number = 0;

  constructor(
    private host: string,
    private user: string,
    private token: string,
    private secret: string
  ) {
    const httpsAgent = new https.Agent({
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    });

    this.client = axios.create({
      baseURL: `${host}/api2/json`,
      httpsAgent,
      timeout: 10000,
    });

    this.authenticate();
  }

  private async authenticate() {
    try {
      const response = await axios.post(
        `${this.host}/api2/json/access/ticket`,
        {
          username: this.user,
          password: `${this.token}!${this.secret}`,
        },
        {
          httpsAgent: new https.Agent({
            rejectUnauthorized: process.env.NODE_ENV === 'production',
          }),
        }
      );

      this.ticket = response.data.data.ticket;
      this.ticketExpiry = Date.now() + 3600000; // 1 hour
      logger.debug('Proxmox authentication successful');
    } catch (error) {
      logger.error('Failed to authenticate with Proxmox:', error);
      throw error;
    }
  }

  private async ensureAuthenticated() {
    if (Date.now() > this.ticketExpiry) {
      await this.authenticate();
    }
  }

  async resetVM(node: string, vmid: string): Promise<any> {
    await this.ensureAuthenticated();

    try {
      const response = await this.client.post(`/nodes/${node}/qemu/${vmid}/status/reset`, {}, {
        headers: {
          Cookie: `PVEAuthCookie=${this.ticket}`,
        },
      });

      logger.info(`Reset command sent to VM ${vmid} on node ${node}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to reset VM ${vmid}:`, error);
      throw error;
    }
  }

  async shutdownVM(node: string, vmid: string): Promise<any> {
    await this.ensureAuthenticated();

    try {
      const response = await this.client.post(
        `/nodes/${node}/qemu/${vmid}/status/shutdown`,
        {},
        {
          headers: {
            Cookie: `PVEAuthCookie=${this.ticket}`,
          },
        }
      );

      logger.info(`Shutdown command sent to VM ${vmid} on node ${node}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to shutdown VM ${vmid}:`, error);
      throw error;
    }
  }

  async getVMStatus(node: string, vmid: string): Promise<any> {
    await this.ensureAuthenticated();

    try {
      const response = await this.client.get(`/nodes/${node}/qemu/${vmid}/status/current`, {
        headers: {
          Cookie: `PVEAuthCookie=${this.ticket}`,
        },
      });

      return response.data.data;
    } catch (error) {
      logger.error(`Failed to get VM status for ${vmid}:`, error);
      throw error;
    }
  }
}
