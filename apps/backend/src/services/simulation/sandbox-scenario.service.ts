import { logger } from '../../utils/logger';

export interface ScenarioRelevanceResult {
  isMatch: boolean;
  score: number; // 0 to 1
  warning?: string;
}

const CLUSTERS = {
  FASHION: [
    'fashion', 'clothing', 'retail', 'saree', 'sarees', 'wear', 'dress', 'apparel',
    'shop', 'store', 'silk', 'wedding', 'designer', 'boutique', 'style', 'look',
    'brand', 'ethnic', 'festive', 'garment', 'collection', 'jeans', 'jewelry', 'shoes'
  ],
  SAAS: [
    'software', 'saas', 'crm', 'b2b', 'tool', 'pipeline', 'cloud', 'tech',
    'sales', 'leads', 'signup', 'trial', 'automation', 'enterprise', 'deal',
    'customer', 'platform', 'analytics', 'dashboard', 'collaborative'
  ],
  FITNESS: [
    'fitness', 'gym', 'trainer', 'workout', 'health', 'muscle', 'exercise',
    'diet', 'crossfit', 'wellness', 'yoga', 'weight', 'nutrition', 'cardio',
    'membership', 'coaching', 'athletes'
  ],
  LOCAL: [
    'plumber', 'dentist', 'cleaner', 'service', 'repair', 'local', 'near me',
    'emergency', 'booking', 'appointment', 'hvac', 'electrician', 'contractor',
    'leak', 'dental', 'clinic', 'cleaning'
  ]
};

export function validateScenarioRelevance(
  industry: string,
  scenarioName: string,
  scenarioDescription: string,
  userTexts: string[]
): ScenarioRelevanceResult {
  const combinedScenarioText = `${industry} ${scenarioName} ${scenarioDescription}`.toLowerCase();
  
  // Detect active cluster
  let activeClusterKey: keyof typeof CLUSTERS | null = null;
  for (const [key, words] of Object.entries(CLUSTERS)) {
    if (words.some(word => combinedScenarioText.includes(word))) {
      activeClusterKey = key as keyof typeof CLUSTERS;
      break;
    }
  }

  // If no specific cluster is matched, default to lenient (no penalty)
  if (!activeClusterKey) {
    return { isMatch: true, score: 1.0 };
  }

  const activeClusterWords = CLUSTERS[activeClusterKey];
  const userCombinedText = userTexts.join(' ').toLowerCase();

  // Count matches
  const matchCount = activeClusterWords.filter(word => userCombinedText.includes(word)).length;
  
  // Count other cluster hits
  let otherClusterHits = 0;
  for (const [key, words] of Object.entries(CLUSTERS)) {
    if (key !== activeClusterKey) {
      otherClusterHits += words.filter(word => userCombinedText.includes(word)).length;
    }
  }

  let score = 1.0;
  if (matchCount === 0) {
    score = 0.1;
  } else if (matchCount === 1) {
    score = 0.45;
  } else if (matchCount === 2) {
    score = 0.75;
  } else {
    score = 1.0;
  }

  // Penalty if other clusters are spammed far more
  if (otherClusterHits > matchCount + 2) {
    score = Math.max(0.1, score - 0.3);
  }

  const isMatch = score >= 0.6;
  let warning: string | undefined;
  if (!isMatch) {
    warning = `Warning: Your campaign settings (keywords, ad copy, or targeting) do not seem highly relevant to the active '${industry}' scenario. Aligning your terms with the theme will improve performance.`;
  }

  return { isMatch, score, warning };
}

export function getScenarioDefaults(mode: string, scenario: any): any {
  const ind = (scenario?.industry || '').toLowerCase();
  const desc = (scenario?.description || '').toLowerCase();
  const name = (scenario?.name || '').toLowerCase();
  const combined = `${ind} ${desc} ${name}`;

  let theme: 'FASHION' | 'SAAS' | 'FITNESS' | 'LOCAL' = 'SAAS';
  if (CLUSTERS.FASHION.some(w => combined.includes(w))) {
    theme = 'FASHION';
  } else if (CLUSTERS.FITNESS.some(w => combined.includes(w))) {
    theme = 'FITNESS';
  } else if (CLUSTERS.LOCAL.some(w => combined.includes(w))) {
    theme = 'LOCAL';
  }

  if (mode === 'GOOGLE_ADS') {
    if (theme === 'FASHION') {
      return {
        campaigns: [{
          name: 'Saree & Ethnic Wear Search',
          objective: 'Sales',
          conversionGoal: 'Purchase',
          status: 'Active',
          locations: [scenario?.location || 'Global'],
          devices: ['mobile', 'desktop'],
          adSchedule: 'All day',
          dailyBudget: 150,
          biddingStrategy: 'Maximize Conversions',
          adGroups: [{
            name: 'Silk Sarees Premium',
            theme: 'Silk Sarees',
            defaultBid: 1.80,
            keywords: [
              { word: 'silk sarees online', matchType: 'phrase', bid: 1.80 },
              { word: 'designer sarees', matchType: 'exact', bid: 2.20 },
              { word: 'wedding sarees shopping', matchType: 'phrase', bid: 2.00 }
            ],
            ads: [{
              headlines: ['Premium Silk Sarees Online', 'Shop Wedding & Festive Sarees', 'Designer Ethnic Collections'],
              descriptions: ['Discover handwoven silk sarees. Premium wedding designs. Free worldwide shipping on orders.', 'Shop the festive collection online. Exclusive saree designs and custom tailoring available.'],
              finalUrl: 'https://premium-sarees.com/shop',
              displayPath1: 'sarees',
              displayPath2: 'wedding'
            }]
          }],
          negativeKeywords: [{ word: 'free sarees', type: 'phrase' }, { word: 'cheap synthetic', type: 'exact' }],
          sitelinks: ['New Arrivals', 'Silk Sarees Collection', 'Festive Offers', 'Contact Us'],
          callouts: ['100% Pure Silk', 'Free Shipping Worldwide', 'Custom Stitched Blouses', 'Easy Returns']
        }]
      };
    } else if (theme === 'FITNESS') {
      return {
        campaigns: [{
          name: 'Gym Memberships Local Search',
          objective: 'Leads',
          conversionGoal: 'Lead Form',
          status: 'Active',
          locations: [scenario?.location || 'Local area'],
          devices: ['mobile', 'tablet'],
          adSchedule: 'Business hours',
          dailyBudget: 100,
          biddingStrategy: 'Maximize Clicks',
          adGroups: [{
            name: 'Fitness & Gym Near Me',
            theme: 'Gym near me',
            defaultBid: 1.50,
            keywords: [
              { word: 'gym near me', matchType: 'phrase', bid: 1.50 },
              { word: 'fitness coaching programs', matchType: 'phrase', bid: 1.80 },
              { word: 'personal trainer membership', matchType: 'exact', bid: 2.50 }
            ],
            ads: [{
              headlines: ['Best Gym & Fitness Studio', 'Expert Personal Training Near You', 'Claim Your 3-Day Free Pass'],
              descriptions: ['Join our state-of-the-art gym today. Personal coaching, group workouts, and custom nutrition guides.', 'Kickstart your fitness journey. Certified coaches, flexible gym hours. Sign up for a free consult.'],
              finalUrl: 'https://local-fitness-studio.com/join',
              displayPath1: 'gym',
              displayPath2: 'trial'
            }]
          }],
          negativeKeywords: [{ word: 'free gym equipment', type: 'phrase' }],
          sitelinks: ['Gym Amenities', 'Coaching Plans', 'Class Schedule', 'Reviews'],
          callouts: ['24/7 Access Option', 'Certified Personal Trainers', 'Shower & Locker Rooms']
        }]
      };
    } else if (theme === 'LOCAL') {
      return {
        campaigns: [{
          name: 'Plumbing & Emergency Services',
          objective: 'Leads',
          conversionGoal: 'Phone Call',
          status: 'Active',
          locations: [scenario?.location || 'Metro area'],
          devices: ['mobile'],
          adSchedule: 'All day',
          dailyBudget: 120,
          biddingStrategy: 'Target CPA',
          targetCpa: 25.00,
          adGroups: [{
            name: 'Emergency Plumber Services',
            theme: 'Emergency Plumber',
            defaultBid: 3.50,
            keywords: [
              { word: 'emergency plumber near me', matchType: 'exact', bid: 4.50 },
              { word: 'drain cleaning service', matchType: 'phrase', bid: 3.00 },
              { word: 'water leak repair plumber', matchType: 'phrase', bid: 3.50 }
            ],
            ads: [{
              headlines: ['Emergency Plumber 24/7', 'Fast Drain Cleaning Services', 'No Extra Charge On Weekends'],
              descriptions: ['Experiencing a water leak? Call our emergency local plumbers now. 30-minute response time.', 'Professional drain cleaning and plumbing repairs. Licensed technicians, transparent pricing.'],
              finalUrl: 'https://emergency-plumber-now.com',
              displayPath1: 'plumbing',
              displayPath2: 'emergency'
            }]
          }],
          negativeKeywords: [{ word: 'plumbing school', type: 'phrase' }],
          sitelinks: ['Drain Cleaning', 'Leak Detection', 'Pricing Estimate', 'Our Team'],
          callouts: ['Licensed & Insured', '30-Min Rapid Response', '24/7 Emergency Dispatch']
        }]
      };
    } else {
      // Default SaaS
      return {
        campaigns: [{
          name: 'B2B CRM Search Campaign',
          objective: 'Leads',
          conversionGoal: 'Signup',
          status: 'Active',
          locations: ['Global'],
          devices: ['desktop', 'mobile'],
          adSchedule: 'Business hours',
          dailyBudget: 200,
          biddingStrategy: 'Target CPA',
          targetCpa: 45.00,
          adGroups: [{
            name: 'SaaS CRM Core',
            theme: 'CRM software',
            defaultBid: 2.50,
            keywords: [
              { word: 'crm software saas', matchType: 'phrase', bid: 2.50 },
              { word: 'b2b sales pipeline tool', matchType: 'phrase', bid: 3.20 },
              { word: 'best collaborative crm', matchType: 'exact', bid: 4.00 }
            ],
            ads: [{
              headlines: ['Best B2B Collaborative CRM', 'Streamline Your Sales Pipeline', 'Start Free 14-Day Trial Now'],
              descriptions: ['Track client deals, record calls, and automate sales pipelines in a single workspace. Try now.', 'Modern CRM software built for scaling teams. Advanced activity reporting and custom pipelines.'],
              finalUrl: 'https://collaborative-crm-software.com/trial',
              displayPath1: 'saas',
              displayPath2: 'signup'
            }]
          }],
          negativeKeywords: [{ word: 'free open source crm', type: 'phrase' }],
          sitelinks: ['CRM Pricing Plans', 'Feature Overview', 'Customer Success', 'Book Demo'],
          callouts: ['No Credit Card Required', 'Integrates with Slack & Gmail', '24/7 Enterprise Support']
        }]
      };
    }
  } else if (mode === 'META_ADS') {
    if (theme === 'FASHION') {
      return {
        campaigns: [{
          name: 'Saree Fashion Catalog Sales',
          objective: 'Sales',
          status: 'Active',
          adSets: [{
            name: 'Women Ethnic Wear Audience',
            dailyBudget: 100,
            optimizationGoal: 'Purchases',
            bidStrategy: 'Highest volume',
            conversionEvent: 'Purchase',
            attributionSetting: '7-day click + 1-day view',
            targeting: {
              ageMin: 22,
              ageMax: 50,
              gender: 'women',
              interests: 'Saree, Wedding shopping, Indian fashion, Boutique shopping'
            },
            placements: ['Facebook Feed', 'Instagram Feed', 'Instagram Stories', 'Reels'],
            creative: {
              format: 'carousel',
              primaryText: 'Exquisite silk sarees handwoven for your special occasions. Discover our wedding & festive collection today. Flat 15% off!',
              headline: 'Premium Silk Saree Collection',
              description: 'Shop luxury sarees online.',
              cta: 'Shop Now',
              angle: 'offer-based',
              destinationUrl: 'https://premium-sarees.com/carousel'
            }
          }]
        }]
      };
    } else if (theme === 'FITNESS') {
      return {
        campaigns: [{
          name: 'Gym Lead Generation Campaign',
          objective: 'Leads',
          status: 'Active',
          adSets: [{
            name: 'Local Gym Fitness Enthusiasts',
            dailyBudget: 80,
            optimizationGoal: 'Leads',
            bidStrategy: 'Cost per result goal',
            bidAmount: 8.00,
            conversionEvent: 'Lead',
            attributionSetting: '1-day click',
            targeting: {
              ageMin: 18,
              ageMax: 45,
              gender: 'all',
              interests: 'CrossFit, Weight training, Personal training, Gyms'
            },
            placements: ['Facebook Feed', 'Instagram Feed', 'Reels'],
            creative: {
              format: 'video',
              primaryText: 'Ready to smash your fitness goals? Join our gym and train with certified coaches. Sign up now to claim a free personal training session!',
              headline: 'Claim Your Free Gym Personal Training Session',
              description: 'Limited spots available.',
              cta: 'Sign Up',
              angle: 'problem-solution',
              destinationUrl: 'https://local-fitness-studio.com/signup'
            }
          }]
        }]
      };
    } else if (theme === 'LOCAL') {
      return {
        campaigns: [{
          name: 'Local Plumbing Services Coverage',
          objective: 'Traffic',
          status: 'Active',
          adSets: [{
            name: 'Homeowners in Metro Area',
            dailyBudget: 60,
            optimizationGoal: 'Landing page views',
            bidStrategy: 'Highest volume',
            conversionEvent: 'View Content',
            targeting: {
              ageMin: 30,
              ageMax: 65,
              gender: 'all',
              interests: 'Home improvement, Do it yourself, Maintenance'
            },
            placements: ['Facebook Feed', 'Instagram Feed'],
            creative: {
              format: 'single image',
              primaryText: 'Leaky faucet or clogged drain? Don\'t let it ruin your day. Call our licensed local plumbers for fast, professional service.',
              headline: 'Licensed & Emergency Plumbing Near You',
              description: 'Call us today for upfront quotes.',
              cta: 'Contact Us',
              angle: 'social-proof',
              destinationUrl: 'https://emergency-plumber-now.com/contact'
            }
          }]
        }]
      };
    } else {
      // Default SaaS
      return {
        campaigns: [{
          name: 'B2B Sales CRM Trial Signups',
          objective: 'Sales',
          status: 'Active',
          adSets: [{
            name: 'Sales Leaders & Business Owners',
            dailyBudget: 150,
            optimizationGoal: 'Purchases',
            bidStrategy: 'Highest volume',
            conversionEvent: 'Purchase',
            attributionSetting: '7-day click + 1-day view',
            targeting: {
              ageMin: 25,
              ageMax: 55,
              gender: 'all',
              interests: 'Sales management, Business owner, Startups, CRM'
            },
            placements: ['Facebook Feed', 'Instagram Feed', 'Reels'],
            creative: {
              format: 'single image',
              primaryText: 'Still tracking deals in messy spreadsheets? Upgrade your team to a collaborative sales pipeline tool. Start your free 14-day trial today.',
              headline: 'Automate Sales Pipelines Instantly',
              description: 'Try the leading collaborative CRM.',
              cta: 'Learn More',
              angle: 'problem-solution',
              destinationUrl: 'https://collaborative-crm-software.com/learn-more'
            }
          }]
        }]
      };
    }
  } else if (mode === 'SEO') {
    if (theme === 'FASHION') {
      return {
        seoTargetKeywords: ['buy silk sarees online', 'wedding sarees shopping', 'designer ethnic wear', 'premium festive boutique'],
        seoMetaTitle: 'Buy Premium Silk & Designer Sarees Online | Festive Boutique',
        seoMetaDescription: 'Discover our luxury collection of handwoven silk sarees and designer wedding sarees. Shop ethnic wear collections at our online boutique with free shipping.',
        seoBodyContent: 'Buying premium silk sarees online is easier than ever. Our exclusive designer collection features gorgeous wedding sarees and modern ethnic wear made from pure mulberry silk. Perfect for festive celebrations, our boutique options include custom-tailored blouses and free global shipping.',
        seoUrlSlug: 'buy-premium-silk-sarees-online',
        seoInternalLinks: 3,
        seoAnchorText: 'designer wedding sarees online',
        seoBacklinkQuality: 2, // medium quality links
        seoBacklinkBudget: 150,
        seoTechnicalConfig: {
          hasSssl: true,
          hasSitemap: true,
          hasRobots: true,
          isMobileFriendly: true,
          hasAltTags: true,
          hasSchema: true
        },
        seoCoreWebVitals: {
          lcp: 1.8,
          cls: 0.05,
          inp: 80
        }
      };
    } else if (theme === 'FITNESS') {
      return {
        seoTargetKeywords: ['gym memberships near me', 'fitness coaching program', 'personal trainer services', 'local workout studios'],
        seoMetaTitle: 'Gym Memberships & Personal Fitness Coaching Studio',
        seoMetaDescription: 'Start your fitness journey at the leading local gym and fitness studio. Sign up for personal trainer services and custom coaching plans.',
        seoBodyContent: 'Looking for the best gym memberships near me? Our local fitness studio offers professional coaching programs and personal trainer services to help you achieve your wellness targets. Work out with certified trainers in our premium training facility.',
        seoUrlSlug: 'gym-memberships-fitness-coaching-studio',
        seoInternalLinks: 2,
        seoAnchorText: 'personal trainer fitness coaching',
        seoBacklinkQuality: 2,
        seoBacklinkBudget: 100,
        seoTechnicalConfig: {
          hasSssl: true,
          hasSitemap: true,
          hasRobots: true,
          isMobileFriendly: true,
          hasAltTags: true,
          hasSchema: false
        },
        seoCoreWebVitals: {
          lcp: 2.2,
          cls: 0.08,
          inp: 120
        }
      };
    } else if (theme === 'LOCAL') {
      return {
        seoTargetKeywords: ['emergency plumber near me', 'drain cleaning services', 'water leak repair', 'local plumbing contractor'],
        seoMetaTitle: 'Emergency Plumber Near Me | Fast Drain Cleaning & Leak Repairs',
        seoMetaDescription: 'Need a reliable local plumbing contractor? We offer 24/7 emergency plumber services, professional drain cleaning, and water leak repairs.',
        seoBodyContent: 'Call our emergency plumber near me when you need rapid leak repairs or residential drain cleaning services. As your trusted local plumbing contractor, we dispatch licensed plumbers 24/7 to solve water line leaks and restore sewer systems.',
        seoUrlSlug: 'emergency-plumber-near-me-drain-cleaning',
        seoInternalLinks: 2,
        seoAnchorText: 'emergency plumber drain cleaning',
        seoBacklinkQuality: 1, // low-budget/local links
        seoBacklinkBudget: 80,
        seoTechnicalConfig: {
          hasSssl: true,
          hasSitemap: true,
          hasRobots: false,
          isMobileFriendly: true,
          hasAltTags: true,
          hasSchema: true
        },
        seoCoreWebVitals: {
          lcp: 2.0,
          cls: 0.06,
          inp: 90
        }
      };
    } else {
      // Default SaaS
      return {
        seoTargetKeywords: ['best crm software saas', 'sales pipeline automation tool', 'collaborative team crm', 'b2b customer database'],
        seoMetaTitle: 'Best CRM Software SaaS | Collaborative Sales Pipeline Tool',
        seoMetaDescription: 'Discover the top-rated cloud CRM software built for collaborative B2B sales pipelines. Track deals and automate customer outreach in a single dashboard.',
        seoBodyContent: 'Our collaborative team CRM is the best crm software saas for scaling sales networks. With native sales pipeline automation tools, marketing reps can organize active opportunities, view deal stages, and share B2B customer database logs easily.',
        seoUrlSlug: 'best-crm-software-saas-pipeline-tool',
        seoInternalLinks: 4,
        seoAnchorText: 'best crm software saas online',
        seoBacklinkQuality: 3, // High quality links
        seoBacklinkBudget: 300,
        seoTechnicalConfig: {
          hasSssl: true,
          hasSitemap: true,
          hasRobots: true,
          isMobileFriendly: true,
          hasAltTags: true,
          hasSchema: true
        },
        seoCoreWebVitals: {
          lcp: 1.5,
          cls: 0.03,
          inp: 60
        }
      };
    }
  }
  return {};
}
