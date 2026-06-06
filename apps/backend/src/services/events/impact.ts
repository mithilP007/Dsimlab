export interface MarketMultipliers {
  seoCTR: number;
  googleCPC: number;
  metaCTR: number;
  conversionRate: number;
  metaCPM: number;
}

interface MiniEvent {
  type: string;
  impactMultiplier: number;
}

/**
 * Aggregates triggered events and outputs multiplier factors for search volume, ads cost, CTR, and conversions
 */
export function calculateEventImpacts(activeEvents: MiniEvent[]): MarketMultipliers {
  const impacts: MarketMultipliers = {
    seoCTR: 1.0,
    googleCPC: 1.0,
    metaCTR: 1.0,
    conversionRate: 1.0,
    metaCPM: 1.0,
  };

  activeEvents.forEach(evt => {
    if (evt.type === 'SEO_MULTIPLIER') {
      impacts.seoCTR *= evt.impactMultiplier;
    } else if (evt.type === 'CPC_SPIKE') {
      impacts.googleCPC *= evt.impactMultiplier;
    } else if (evt.type === 'META_MULTIPLIER') {
      impacts.metaCTR *= evt.impactMultiplier;
    } else if (evt.type === 'CONVERSION_SPIKE') {
      // In holiday spike, conversions double but ad competitiveness increases costs (CPMs/CPCs) by 40%
      impacts.conversionRate *= evt.impactMultiplier;
      impacts.googleCPC *= 1.4;
      impacts.metaCPM *= 1.4;
    }
  });

  return impacts;
}
