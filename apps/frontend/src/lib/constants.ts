export const SIMULATION_DAYS = 30 as const;

export const CURRENCIES = ['USD', 'INR'] as const;

export const INDUSTRIES = [
  'E-commerce',
  'SaaS',
  'EdTech',
  'FinTech',
  'Healthcare',
  'Travel & Hospitality',
] as const;

export const MATCH_TYPES = ['Exact', 'Phrase', 'Broad'] as const;

export const CAMPAIGN_OBJECTIVES = [
  'Brand Awareness',
  'Traffic',
  'Lead Generation',
  'Conversions',
] as const;

export const BID_STRATEGIES = [
  'Manual CPC',
  'Maximize Clicks',
  'Maximize Conversions',
  'Target CPA',
] as const;

export const PLACEMENTS = [
  'Facebook Feed',
  'Instagram Feed',
  'Instagram Stories',
  'Audience Network',
  'Messenger',
] as const;

export const SCORE_DIMENSIONS = [
  'ROI',
  'SEO Performance',
  'Ads Efficiency',
  'Budget Management',
  'Overall',
] as const;

// Create mock data templates for ease of development / sandbox testing
export const MOCK_USER = {
  id: 'usr_1',
  name: 'Alex Simulation',
  email: 'alex@simplab.dev',
  role: 'individual' as const,
  createdAt: '2026-06-04T00:00:00.000Z',
};

export const MOCK_CAMPAIGN = {
  id: 'cmp_1',
  name: 'Search Campaign Summer',
  type: 'google-ads' as const,
  status: 'active' as const,
  googleAdsDetails: {
    id: 'gads_1',
    name: 'Search Campaign Summer',
    budget: 1500,
    bidStrategy: 'Maximize Conversions',
    matchType: 'Phrase',
    keywords: ['digital marketing simulation', 'marketing platform', 'learn marketing'],
    impressions: 12450,
    clicks: 840,
    conversions: 42,
    spent: 980,
  },
  createdAt: '2026-06-04T00:00:00.000Z',
};
