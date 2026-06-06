export interface MarketEventDefinition {
  id: string;
  name: string;
  description: string;
  type: 'SEO_MULTIPLIER' | 'CONVERSION_SPIKE' | 'CPC_SPIKE' | 'META_MULTIPLIER';
  probability: number; // probability between 0 and 1
  impactMultiplier: number;
}

export const EVENTS_REGISTRY: MarketEventDefinition[] = [
  {
    id: 'GOOGLE_ALGO_UPDATE',
    name: 'Core Google Algorithm Update',
    description: 'Google rolled out a core organic search update. Organic click-through rates (CTR) fluctuate downward.',
    type: 'SEO_MULTIPLIER',
    probability: 0.15,
    impactMultiplier: 0.80,
  },
  {
    id: 'SEASONAL_SHOPPING_SPIKE',
    name: 'Holiday Shopping Spike',
    description: 'A holiday shopping rush is in progress. Conversion rates are doubled, but ad platforms experience higher competition.',
    type: 'CONVERSION_SPIKE',
    probability: 0.10,
    impactMultiplier: 2.0,
  },
  {
    id: 'COMPETITOR_AGGRESSIVE_BIDDING',
    name: 'Competitor Bidding Aggression',
    description: 'Pre-seeded competitors are running aggressive pricing wars. Cost-per-clicks (CPC) on Google rise.',
    type: 'CPC_SPIKE',
    probability: 0.20,
    impactMultiplier: 1.35,
  },
  {
    id: 'PRIVACY_POLICY_LOCKDOWN',
    name: 'Mobile OS Tracking Restriction',
    description: 'New data privacy policy limits mobile identifier tracking. Meta Ads CTR has dropped by 30%.',
    type: 'META_MULTIPLIER',
    probability: 0.15,
    impactMultiplier: 0.70,
  },
  {
    id: 'BLACK_FRIDAY_CYBER_MONDAY',
    name: 'BFCM Shopping Surge',
    description: 'Black Friday and Cyber Monday surge is here. Conversion rates are boosted significantly.',
    type: 'CONVERSION_SPIKE',
    probability: 0.05,
    impactMultiplier: 2.50,
  },
  {
    id: 'SUMMER_SLUMP',
    name: 'Summer Seasonal Slump',
    description: 'Summer holidays lead to lower online shopping engagement. Conversion rates decrease slightly.',
    type: 'CONVERSION_SPIKE',
    probability: 0.12,
    impactMultiplier: 0.85,
  },
  {
    id: 'VIRAL_TIKTOK_TREND',
    name: 'Viral Platform Trend',
    description: 'A viral video highlights your target products. Social media conversion and engagement rates rise.',
    type: 'META_MULTIPLIER',
    probability: 0.08,
    impactMultiplier: 1.50,
  },
  {
    id: 'AD_BLOCKER_ADOPTION_SURGE',
    name: 'Ad Blocker Adoption Wave',
    description: 'An increase in ad blocker usage raises advertising inventory prices and ad costs.',
    type: 'CPC_SPIKE',
    probability: 0.10,
    impactMultiplier: 1.20,
  },
  {
    id: 'NEW_SEO_INDEXING_TECH',
    name: 'Enhanced Crawler Technology',
    description: 'Search engines deploy efficient AI indexing crawlers. High relevance and authority pages receive more traffic.',
    type: 'SEO_MULTIPLIER',
    probability: 0.10,
    impactMultiplier: 1.25,
  },
  {
    id: 'COMPETITOR_BANKRUPTCY',
    name: 'Rival Platform Shutdown',
    description: 'A key rival stops advertising campaigns, leading to decreased keyword bidding competition.',
    type: 'CPC_SPIKE',
    probability: 0.05,
    impactMultiplier: 0.75,
  },
  {
    id: 'TECH_FORUM_ENDORSEMENT',
    name: 'Community Forum Recommendation',
    description: 'A major technical hub recommends your product. Baseline conversion rate climbs.',
    type: 'CONVERSION_SPIKE',
    probability: 0.08,
    impactMultiplier: 1.40,
  },
  {
    id: 'SOCIAL_MEDIA_OUTAGE',
    name: 'Social Network Downtime',
    description: 'Major advertising networks suffer backend infrastructure crashes. Meta ad placements receive less views.',
    type: 'META_MULTIPLIER',
    probability: 0.07,
    impactMultiplier: 0.40,
  },
];
