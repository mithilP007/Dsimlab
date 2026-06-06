import { config } from '../../config';
import { logger } from '../../utils/logger';

/**
 * Platform union for AI insight generation.
 */
export type InsightPlatform = 'seo' | 'google_ads' | 'meta_ads';

/**
 * Return shape from generateInsight()
 */
export interface InsightResult {
  insight: string;
  fallback: boolean;
}

// ─── Prompt Templates ───────────────────────────────────────────────────────

function buildSeoPrompt(metrics: Record<string, unknown>, decision: Record<string, unknown>): string {
  return `You are a concise digital marketing coach. Analyse the following SEO metrics and give ONE actionable recommendation in a maximum of 2 sentences. Do NOT reveal raw formula weights or internal scoring details.

Organic Clicks: ${metrics.organicClicks ?? 'N/A'}
Organic Impressions: ${metrics.organicImpressions ?? 'N/A'}
Target Keywords: ${JSON.stringify(decision.seoTargetKeywords ?? [])}
Content Quality Score: ${decision.seoContentQuality ?? 'N/A'}/10
Backlink Budget Spent: $${decision.seoBacklinkBudget ?? 0}

Provide 2 sentences of tactical SEO advice only.`;
}

function buildGoogleAdsPrompt(metrics: Record<string, unknown>, decision: Record<string, unknown>): string {
  const campaigns = Array.isArray(decision.googleCampaigns) ? decision.googleCampaigns : [];
  const totalBid = campaigns.reduce((s: number, c: any) => s + (c.bidAmount ?? 0), 0);
  const totalBudget = campaigns.reduce((s: number, c: any) => s + (c.dailyBudget ?? 0), 0);

  return `You are a concise digital marketing coach. Analyse the following Google Ads metrics and explain CTR/CPC/spend changes in a maximum of 2 sentences. Do NOT reveal raw formula weights or internal scoring details.

Google Clicks: ${metrics.googleClicks ?? 'N/A'}
Google Impressions: ${metrics.googleImpressions ?? 'N/A'}
Google Cost: $${metrics.googleCost ?? 'N/A'}
Google Conversions: ${metrics.googleConversions ?? 'N/A'}
Active Campaigns: ${campaigns.length}
Average Bid: $${campaigns.length > 0 ? (totalBid / campaigns.length).toFixed(2) : 0}
Total Daily Budget: $${totalBudget}

Provide 2 sentences of tactical Google Ads advice only.`;
}

function buildMetaAdsPrompt(metrics: Record<string, unknown>, decision: Record<string, unknown>): string {
  const campaigns = Array.isArray(decision.metaCampaigns) ? decision.metaCampaigns : [];
  const totalBudget = campaigns.reduce((s: number, c: any) => s + (c.dailyBudget ?? 0), 0);

  return `You are a concise digital marketing coach. Analyse the following Meta Ads metrics and explain reach/frequency/ad fatigue issues in a maximum of 2 sentences. Do NOT reveal raw formula weights or internal scoring details.

Meta Clicks: ${metrics.metaClicks ?? 'N/A'}
Meta Impressions: ${metrics.metaImpressions ?? 'N/A'}
Meta Cost: $${metrics.metaCost ?? 'N/A'}
Meta Conversions: ${metrics.metaConversions ?? 'N/A'}
Active Campaigns: ${campaigns.length}
Total Daily Budget: $${totalBudget}

Provide 2 sentences of tactical Meta Ads advice only.`;
}

function buildPrompt(
  platform: InsightPlatform,
  metrics: Record<string, unknown>,
  decision: Record<string, unknown>
): string {
  switch (platform) {
    case 'seo':
      return buildSeoPrompt(metrics, decision);
    case 'google_ads':
      return buildGoogleAdsPrompt(metrics, decision);
    case 'meta_ads':
      return buildMetaAdsPrompt(metrics, decision);
  }
}

// ─── Fallback Insights ───────────────────────────────────────────────────────

function fallbackInsight(platform: InsightPlatform, metrics: Record<string, unknown>): string {
  switch (platform) {
    case 'seo': {
      const clicks = Number(metrics.organicClicks ?? 0);
      if (clicks < 100) {
        return 'Your organic traffic is low — prioritise publishing long-form, keyword-rich content and secure at least 3–5 backlinks per round. Focus keyword selection on medium-difficulty terms where your site has a realistic chance of ranking.';
      }
      return 'Organic traffic is growing steadily. Consider diversifying your keyword portfolio into related long-tail queries and incrementally increasing content quality to sustain ranking momentum.';
    }
    case 'google_ads': {
      const ctr = Number(metrics.googleImpressions ?? 0) > 0
        ? Number(metrics.googleClicks ?? 0) / Number(metrics.googleImpressions)
        : 0;
      if (ctr < 0.02) {
        return 'Your Google Ads CTR is below 2% — test more compelling ad copy and tighten keyword match types to improve relevance. Review your quality score signals to reduce CPC and improve ad rank.';
      }
      return 'CTR is healthy; the next lever is conversion rate optimisation. Align landing page content with ad copy and consider adjusting bid strategy to maximise conversions rather than clicks.';
    }
    case 'meta_ads': {
      const freq = Number(metrics.metaImpressions ?? 0) > 0
        ? Number(metrics.metaImpressions) / Math.max(Number(metrics.metaClicks ?? 1), 1)
        : 1;
      if (freq > 5) {
        return 'High ad frequency suggests audience fatigue — refresh creative assets or expand your target audience to new interest segments. Rotating creatives every round will protect CTR from declining.';
      }
      return 'Meta Ads frequency is within healthy range. Experiment with video creatives on Reels placements to boost reach without proportionally increasing spend.';
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generates a platform-specific AI insight using a local Ollama LLM.
 * Falls back gracefully to heuristic insights if Ollama is offline or times out.
 */
export async function generateInsight(
  platform: InsightPlatform,
  metrics: Record<string, unknown>,
  decision: Record<string, unknown>
): Promise<InsightResult> {
  const endpoint = `${config.OLLAMA_HOST}/api/generate`;
  const model = config.OLLAMA_MODEL;
  const prompt = buildPrompt(platform, metrics, decision);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10-second timeout

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data: any = await response.json();
      const text: string = (data?.response ?? '').trim();
      if (text) {
        // Enforce 2-sentence cap client-side as a safety net
        const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
        const capped = sentences.slice(0, 2).join(' ').trim();
        return { insight: capped, fallback: false };
      }
    }
  } catch (err) {
    const reason = (err as Error).name === 'AbortError' ? 'timeout' : 'offline';
    logger.debug({ host: config.OLLAMA_HOST, reason }, 'Ollama unavailable — using heuristic fallback insight.');
  }

  return { insight: fallbackInsight(platform, metrics), fallback: true };
}

/**
 * Legacy wrapper used by BullMQ round-complete notification jobs.
 * Generates general marketing feedback (not platform-specific).
 */
export async function generateMarketingFeedback(
  studentName: string,
  score: number,
  dimensions: { seo: number; google: number; meta: number; budget: number }
): Promise<string> {
  const endpoint = `${config.OLLAMA_HOST}/api/generate`;
  const prompt = `You are an expert digital marketing tutor. Give a student constructive, educational feedback on their simulation round.
Student: ${studentName}
Round Composite Score: ${score}/100
SEO Score: ${dimensions.seo}/100
Google Ads Score: ${dimensions.google}/100
Meta Ads Score: ${dimensions.meta}/100
Budget Pacing Score: ${dimensions.budget}/100

Provide 2-3 sentences of tactical advice. Keep it educational and concise.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.OLLAMA_MODEL, prompt, stream: false }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data: any = await response.json();
      if (data?.response) return data.response.trim();
    }
  } catch {
    logger.debug({ host: config.OLLAMA_HOST }, 'Ollama offline — using heuristic marketing feedback.');
  }

  if (score >= 88.0) {
    return `Incredible results, ${studentName}! Your budget pacing is tight and your ROAS is leading the cohort. Consider auditing high-intent long-tail keywords in Google Ads to capture extra volume.`;
  }
  if (dimensions.budget < 60.0) {
    return `Hi ${studentName}, your overall performance was impacted by poor budget pacing. Make sure to pace your monthly allocations evenly to prevent campaigns from running out of funds prematurely.`;
  }
  if (dimensions.seo < 50.0) {
    return `Your paid campaigns are generating clicks, but your organic SEO score is lagging. Invest more budget in high-quality backlinks and focus on keyword relevance to boost free organic traffic.`;
  }
  return `Solid round, ${studentName}. To optimise further, review your Meta Ads creatives to minimise audience ad fatigue and protect your CTR from decaying.`;
}
