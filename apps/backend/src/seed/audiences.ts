export interface AudienceProfile {
  id: string;
  name: string;
  description: string;
  size: number;
  cpmModifier: number;
}

export const META_AUDIENCES: AudienceProfile[] = [
  {
    id: 'business-owners',
    name: 'Business Owners, Founders & CEOs',
    description: 'Target startup founders, small business owners, and corporate executives. High conversion value, but high competition.',
    size: 1000000,
    cpmModifier: 1.6,
  },
  {
    id: 'tech-enthusiasts',
    name: 'Tech Enthusiasts & Developers',
    description: 'Software engineers, early adopters, and gadget lovers. High CTR potential.',
    size: 1500000,
    cpmModifier: 1.25,
  },
  {
    id: 'fashion-lifestyle',
    name: 'Fashion, Health & Lifestyle',
    description: 'B2C consumer segments interested in fashion, fitness, and luxury lifestyle items.',
    size: 2000000,
    cpmModifier: 1.1,
  },
  {
    id: 'general-broad',
    name: 'Broad General Audience',
    description: 'Open general demographics. Lowest cost per mille (CPM), but lowest conversion intent.',
    size: 3500000,
    cpmModifier: 0.8,
  },
];
