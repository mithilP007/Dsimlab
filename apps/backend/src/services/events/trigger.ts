import { SeededRandom } from '../../utils/deterministic-random';
import { EVENTS_REGISTRY, MarketEventDefinition } from './registry';

/**
 * Rolls for active market events in a round using a deterministic seeded random generator
 */
export function rollForEvents(random: SeededRandom): MarketEventDefinition[] {
  const activeEvents: MarketEventDefinition[] = [];

  EVENTS_REGISTRY.forEach(event => {
    const roll = random.next();
    if (roll < event.probability) {
      activeEvents.push(event);
    }
  });

  return activeEvents;
}
