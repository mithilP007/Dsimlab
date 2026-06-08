import { logger } from '../../utils/logger';

export interface GoogleTrendSignal {
  searchVolumeEstimate: number;
  sources: Array<{ name: string; url?: string; fetchedAt: string }>;
}

export class GoogleTrendsClient {
  /**
   * Estimates keyword search volume from public Google Search indicators via Google News search
   */
  async fetchGoogleTrend(keyword: string, location: string): Promise<GoogleTrendSignal> {
    const gl = location.toUpperCase() === 'INDIA' ? 'IN' : 'US';
    const hl = gl === 'IN' ? 'en-IN' : 'en-US';
    const ceid = `${gl}:${hl.split('-')[0]}`;
    
    // Construct search query targeting consumer interest / statistics
    const query = `"${keyword}" market OR statistics OR interest`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

    logger.info({ keyword, url }, 'Fetching Google Trends interest signal from Google News RSS');

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) {
        throw new Error(`Google Search RSS responded with status ${response.status}`);
      }

      const text = await response.text();
      const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
      const count = items.length;

      // Map article counts to search volume estimates
      // 0 articles -> ~200 search volume
      // 100 articles -> ~5000 search volume
      const searchVolumeEstimate = 200 + (count * 120);

      const sources = [{
        name: `Google Search Interest Feed: "${keyword}"`,
        url,
        fetchedAt: new Date().toISOString(),
      }];

      return {
        searchVolumeEstimate,
        sources,
      };
    } catch (err: any) {
      logger.error({ err, keyword }, 'Error fetching Google search trend signals');
      throw new Error(`Trend data source unavailable. Cannot generate real-time trend simulation. (Detail: ${err.message})`);
    }
  }
}

export const googleTrendsClient = new GoogleTrendsClient();
