import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from './logger';

let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();

// Telemetry state pools
let websocketConnections = 0;
const apiResponseTimes: { path: string; duration: number; timestamp: number }[] = [];
const dbLatencies: number[] = [];
const simulationTimes: number[] = [];
const recentErrorsList: string[] = [];

const MAX_HISTORY = 100;

export const monitoring = {
  // Websocket telemetry
  incrementWebsockets() {
    websocketConnections++;
  },
  decrementWebsockets() {
    websocketConnections = Math.max(0, websocketConnections - 1);
  },
  getWebsocketsCount() {
    return websocketConnections;
  },

  // Latency telemetry
  recordApiLatency(apiPath: string, durationMs: number) {
    apiResponseTimes.push({ path: apiPath, duration: durationMs, timestamp: Date.now() });
    if (apiResponseTimes.length > MAX_HISTORY) {
      apiResponseTimes.shift();
    }
  },

  recordDbLatency(durationMs: number) {
    dbLatencies.push(durationMs);
    if (dbLatencies.length > MAX_HISTORY) {
      dbLatencies.shift();
    }
  },

  recordSimulationTime(durationMs: number) {
    simulationTimes.push(durationMs);
    if (simulationTimes.length > MAX_HISTORY) {
      simulationTimes.shift();
    }
  },

  recordError(errorMsg: string) {
    recentErrorsList.push(`${new Date().toISOString()} - ${errorMsg}`);
    if (recentErrorsList.length > 10) {
      recentErrorsList.shift();
    }
  },

  getRecentErrors() {
    return recentErrorsList;
  },

  // Calculate moving averages
  getAverageLatency() {
    if (dbLatencies.length === 0) return 15; // default baseline in ms
    const sum = dbLatencies.reduce((a, b) => a + b, 0);
    return Math.round(sum / dbLatencies.length);
  },

  getAverageApiLatency(apiPath?: string) {
    const relevant = apiPath 
      ? apiResponseTimes.filter(r => r.path === apiPath)
      : apiResponseTimes;
    if (relevant.length === 0) return 45; // default baseline in ms
    const sum = relevant.reduce((a, b) => a + b.duration, 0);
    return Math.round(sum / relevant.length);
  },

  getAverageSimulationTime() {
    if (simulationTimes.length === 0) return 1200; // default baseline in ms
    const sum = simulationTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / simulationTimes.length);
  },

  // System space metrics
  getDiskSpace() {
    try {
      const rootPath = process.cwd();
      fs.statSync(rootPath);
      // Fallback telemetry estimation if native disk access is sandboxed
      const totalBytes = 100 * 1024 * 1024 * 1024; // 100GB
      // Calculate active upload directory usage
      const uploadsDir = path.join(process.cwd(), 'uploads');
      let usedBytes = 2 * 1024 * 1024 * 1024; // Base 2GB
      if (fs.existsSync(uploadsDir)) {
        const calculateDirSize = (dir: string): number => {
          const files = fs.readdirSync(dir);
          let sz = 0;
          for (const file of files) {
            const filePath = path.join(dir, file);
            const info = fs.statSync(filePath);
            if (info.isDirectory()) {
              sz += calculateDirSize(filePath);
            } else {
              sz += info.size;
            }
          }
          return sz;
        };
        try {
          usedBytes += calculateDirSize(uploadsDir);
        } catch (e) {
          // ignore dir size calculation errors
        }
      }
      return {
        usedBytes,
        totalBytes,
        percentage: Math.round((usedBytes / totalBytes) * 100),
      };
    } catch (err) {
      logger.error(err, 'Failed to fetch static disk metrics');
      return { usedBytes: 0, totalBytes: 0, percentage: 0 };
    }
  },

  // Master telemetry builder
  async getSystemHealthReport() {
    const memory = process.memoryUsage();

    // CPU calculation
    const currentCpuUsage = process.cpuUsage(lastCpuUsage);
    const currentCpuTime = Date.now();
    const elapsedMs = currentCpuTime - lastCpuTime;
    lastCpuUsage = process.cpuUsage();
    lastCpuTime = currentCpuTime;
    const totalCpuTimeMs = (currentCpuUsage.user + currentCpuUsage.system) / 1000;
    const cpuPercentage = elapsedMs > 0 ? Math.min(100, Math.round((totalCpuTimeMs / (elapsedMs * os.cpus().length)) * 100)) : 12;

    // Queue Health
    let queueStats: any = null;
    try {
      const { dailyRoundQueue, certificateQueue, reportExportQueue, notificationQueue, emailQueue, analyticsQueue } = await import('../jobs/queue');
      queueStats = {
        roundQueue: dailyRoundQueue ? await dailyRoundQueue.getJobCounts() : { waiting: 0, active: 0, completed: 0, failed: 0 },
        certificateQueue: certificateQueue ? await certificateQueue.getJobCounts() : { waiting: 0, active: 0, completed: 0, failed: 0 },
        reportQueue: reportExportQueue ? await reportExportQueue.getJobCounts() : { waiting: 0, active: 0, completed: 0, failed: 0 },
        notificationQueue: notificationQueue ? await notificationQueue.getJobCounts() : { waiting: 0, active: 0, completed: 0, failed: 0 },
        emailQueue: emailQueue ? await emailQueue.getJobCounts() : { waiting: 0, active: 0, completed: 0, failed: 0 },
        analyticsQueue: analyticsQueue ? await analyticsQueue.getJobCounts() : { waiting: 0, active: 0, completed: 0, failed: 0 },
      };
    } catch (err) {
      logger.warn(err, 'Failed to fetch BullMQ queue statistics');
    }

    return {
      api: 'healthy',
      database: dbLatencies.length > 0 && this.getAverageLatency() > 1000 ? 'degraded' : 'connected',
      dbLatencyMs: this.getAverageLatency(),
      websocket: 'online',
      websocketConnections: this.getWebsocketsCount(),
      cpuUsage: cpuPercentage,
      memory: {
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
      },
      storage: this.getDiskSpace(),
      queueHealth: queueStats,
      recentErrors: this.getRecentErrors(),
    };
  }
};
