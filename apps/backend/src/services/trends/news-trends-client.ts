import { logger } from '../../utils/logger';

export interface NewsSignal {
  mentions: number;
  impactScore: number;
  sources: Array<{ name: string; url?: string; fetchedAt: string }>;
}

export class NewsTrendsClient {
  /**
   * Fetches news signals from public Google News RSS feed
   */
  async fetchNewsSignal(keyword: string, location: string): Promise<NewsSignal> {
    const gl = location.toUpperCase() === 'INDIA' ? 'IN' : 'US';
    const hl = gl === 'IN' ? 'en-IN' : 'en-US';
    const ceid = `${gl}:${hl.split('-')[0]}`;
    
    // Construct the public Google News RSS Search URL
    const query = `${keyword}`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

    logger.info({ keyword, url }, 'Fetching public news trends signal from Google News RSS');

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) {
        throw new Error(`Google News RSS responded with status ${response.status}`);
      }

      const text = await response.text();

      // Count the number of articles in the feed using `<item>` tags
      const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
      const mentions = items.length;

      // Extract a few sample article links and titles as sources
      const sources: Array<{ name: string; url?: string; fetchedAt: string }> = [];
      const fetchedAt = new Date().toISOString();

      items.slice(0, 3).forEach((item) => {
        const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);

        if (titleMatch) {
          const title = titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
          const link = linkMatch ? linkMatch[1].trim() : undefined;
          sources.push({
            name: `Google News: ${title}`,
            url: link,
            fetchedAt,
          });
        }
      });

      if (sources.length === 0) {
        sources.push({
          name: `Google News RSS Feed for ${keyword}`,
          url,
          fetchedAt,
        });
      }

      // Compute impact multiplier based on number of articles returned
      const impactScore = Math.min(100, mentions * 4);

      return {
        mentions,
        impactScore,
        sources,
      };
    } catch (err: any) {
      logger.error({ err, keyword }, 'Error fetching news trend signals from Google News RSS');
      throw new Error(`Trend data source unavailable. Cannot generate real-time trend simulation. (Detail: ${err.message})`);
    }
  }
}

export const newsTrendsClient = new NewsTrendsClient();
