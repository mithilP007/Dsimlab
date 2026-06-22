import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: path.resolve(__dirname, './tests/e2e'),
  testMatch: '**/*.e2e.{ts,js}',
  outputDir: 'D:/simlab-assignment-artifacts/test-results',
  timeout: 60000,
  retries: 1,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'D:/simlab-playwright-report', open: 'never' }],
    ['json', { outputFile: 'D:/simlab-assignment-artifacts/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    // D drive storage paths
    storageState: undefined,
  },
  projects: [
    // Primary: system-installed Chrome (no download needed)
    {
      name: 'chrome-system',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        screenshot: 'on',
        video: 'on',
        trace: 'on',
        viewport: { width: 1280, height: 900 },
      },
    },
    // Fallback: system-installed Edge (no download needed)
    {
      name: 'msedge-system',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        screenshot: 'on',
        video: 'on',
        trace: 'on',
        viewport: { width: 1280, height: 900 },
      },
    },
    // Playwright Chromium (if downloaded to D drive)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        screenshot: 'on',
        video: 'on',
        trace: 'on',
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
});
