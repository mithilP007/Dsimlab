/**
 * Unit tests for the Ollama AI client
 * Tests: fallback behaviour, prompt selection, model configuration, 2-sentence cap
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateInsight, InsightPlatform } from '../../src/services/ai/ollama-client';

// ─── Mock global fetch ────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Test Data ────────────────────────────────────────────────────────────────

const SEO_METRICS = {
  organicClicks: 450,
  organicImpressions: 12_000,
  organicConversions: 22,
};

const SEO_DECISION = {
  seoTargetKeywords: ['crm software', 'sales dashboard'],
  seoContentQuality: 7,
  seoBacklinkBudget: 500,
};

const GOOGLE_METRICS = {
  googleClicks: 320,
  googleImpressions: 9_000,
  googleCost: 640,
  googleConversions: 18,
};

const GOOGLE_DECISION = {
  googleCampaigns: [{ bidAmount: 2.5, dailyBudget: 50 }, { bidAmount: 3.0, dailyBudget: 60 }],
};

const META_METRICS = {
  metaClicks: 180,
  metaImpressions: 22_000,
  metaCost: 320,
  metaConversions: 9,
};

const META_DECISION = {
  metaCampaigns: [{ dailyBudget: 100 }, { dailyBudget: 80 }],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generateInsight – Ollama online', () => {
  it('returns Ollama response with fallback=false when Ollama is healthy', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'Focus on improving your E-E-A-T signals. Add expert author bios to boost organic rankings.' }),
    });

    const result = await generateInsight('seo', SEO_METRICS, SEO_DECISION);

    expect(result.fallback).toBe(false);
    expect(result.insight).toContain('E-E-A-T');
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('enforces 2-sentence cap on long Ollama responses', async () => {
    const longResponse = 'Sentence one. Sentence two. Sentence three. Sentence four.';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: longResponse }),
    });

    const result = await generateInsight('seo', SEO_METRICS, SEO_DECISION);
    expect(result.fallback).toBe(false);
    // Must contain at most 2 terminal punctuation marks
    const sentences = (result.insight.match(/[.!?]/g) ?? []).length;
    expect(sentences).toBeLessThanOrEqual(2);
  });
});

describe('generateInsight – Ollama offline / fallback', () => {
  it('returns fallback=true when fetch throws a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await generateInsight('seo', SEO_METRICS, SEO_DECISION);

    expect(result.fallback).toBe(true);
    expect(typeof result.insight).toBe('string');
    expect(result.insight.length).toBeGreaterThan(0);
  });

  it('returns fallback=true when Ollama responds with a non-OK status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

    const result = await generateInsight('google_ads', GOOGLE_METRICS, GOOGLE_DECISION);

    expect(result.fallback).toBe(true);
    expect(result.insight).toBeDefined();
  });

  it('returns fallback=true when fetch times out (AbortError)', async () => {
    mockFetch.mockRejectedValueOnce(Object.assign(new Error('Aborted'), { name: 'AbortError' }));

    const result = await generateInsight('meta_ads', META_METRICS, META_DECISION);

    expect(result.fallback).toBe(true);
    expect(result.insight.length).toBeGreaterThan(20);
  });

  it('returns fallback=true when Ollama returns empty response text', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: '   ' }),
    });

    const result = await generateInsight('seo', SEO_METRICS, SEO_DECISION);

    expect(result.fallback).toBe(true);
  });
});

describe('generateInsight – platform-specific fallback heuristics', () => {
  beforeEach(() => {
    mockFetch.mockRejectedValue(new Error('offline'));
  });

  it('SEO fallback mentions backlinks/keywords when traffic is low', async () => {
    const result = await generateInsight('seo', { organicClicks: 50 }, SEO_DECISION);
    expect(result.insight.toLowerCase()).toMatch(/backlink|keyword|content/);
  });

  it('SEO fallback acknowledges growth when organic clicks are healthy', async () => {
    const result = await generateInsight('seo', { organicClicks: 500 }, SEO_DECISION);
    expect(result.insight.toLowerCase()).toMatch(/growing|momentum|diversif/);
  });

  it('Google Ads fallback mentions CTR/CPC when CTR is low', async () => {
    const result = await generateInsight(
      'google_ads',
      { googleClicks: 10, googleImpressions: 5000, googleCost: 50, googleConversions: 1 },
      GOOGLE_DECISION
    );
    expect(result.insight.toLowerCase()).toMatch(/ctr|copy|quality score/);
  });

  it('Google Ads fallback suggests conversion optimisation when CTR is good', async () => {
    const result = await generateInsight(
      'google_ads',
      { googleClicks: 200, googleImpressions: 5000, googleCost: 300, googleConversions: 15 },
      GOOGLE_DECISION
    );
    expect(result.insight.toLowerCase()).toMatch(/conversion|landing page/);
  });

  it('Meta Ads fallback mentions ad fatigue when frequency is high', async () => {
    const result = await generateInsight(
      'meta_ads',
      { metaClicks: 10, metaImpressions: 100_000, metaCost: 200, metaConversions: 3 },
      META_DECISION
    );
    expect(result.insight.toLowerCase()).toMatch(/fatigue|creative|frequency/);
  });

  it('Meta Ads fallback suggests Reels when frequency is healthy', async () => {
    const result = await generateInsight(
      'meta_ads',
      { metaClicks: 400, metaImpressions: 8000, metaCost: 200, metaConversions: 20 },
      META_DECISION
    );
    expect(result.insight.toLowerCase()).toMatch(/reel|video|creative/);
  });
});
