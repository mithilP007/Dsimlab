import { logger } from '../../utils/logger';

export interface SocialTrendSignal {
  socialBuzzVolume: number;
  sources: Array<{ name: string; url?: string; fetchedAt: string }>;
}

export class SocialTrendsClient {
  /**
   * Estimates social media buzz volume for keywords using news/blog search indexes
   */
  async fetchSocialTrend(keyword: string, location: string): Promise<SocialTrendSignal> {
    const gl = location.toUpperCase() === 'INDIA' ? 'IN' : 'US';
    const hl = gl === 'IN' ? 'en-IN' : 'en-US';
    const ceid = `${gl}:${hl.split('-')[0]}`;
    
    // Construct query targeting social platform mentions / blogs
    const query = `"${keyword}" (social OR viral OR buzz OR tiktok OR reddit)`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

    logger.info({ keyword, url }, 'Fetching Social Trends interest signal from Google News RSS');

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) {
        throw new Error(`Social Search RSS responded with status ${response.status}`);
      }

      const text = await response.text();
      const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
      const count = items.length;

      // Map article counts to social buzz volume estimates
      const socialBuzzVolume = count;

      const sources = [{
        name: `Social Platform Interest Buzz: "${keyword}"`,
        url,
        fetchedAt: new Date().toISOString(),
      }];

      return {
        socialBuzzVolume,
        sources,
      };
    } catch (err: any) {
      logger.error({ err, keyword }, 'Error fetching social trend signals');
      throw new Error(`Trend data source unavailable. Cannot generate real-time trend simulation. (Detail: ${err.message})`);
    }
  }
}

export const socialTrendsClient = new SocialTrendsClient();
