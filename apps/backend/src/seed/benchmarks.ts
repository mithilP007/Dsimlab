export interface KeywordBenchmark {
  keyword: string;
  searchVolume: number;
  averageCPC: number;
  competition: number; // Scale of 0.0 (low) to 1.0 (high)
}

const BRAND_MODIFIERS = ['best', 'top', 'compare', 'enterprise', 'free', 'cheap', 'online', 'custom', 'smart', 'cloud'];
const INDUSTRY_SECTORS = ['crm', 'erp', 'billing', 'analytics', 'database', 'hr', 'marketing', 'sales', 'security', 'backup'];
const KEYWORD_POSTFIXES = [
  'software', 'system', 'tool', 'platform', 'app', 
  'solution', 'service', 'dashboard', 'api', 'suite'
];

/**
 * Algorithmically generates 10,000 keyword benchmarks with stable deterministic metrics
 */
export function generateKeywordBenchmarks(): KeywordBenchmark[] {
  const benchmarks: KeywordBenchmark[] = [];
  let index = 0;

  // Combinatorics: 10 * 10 * 10 * 10 iterations = 10,000 entries
  for (const mod of BRAND_MODIFIERS) {
    for (const sec of INDUSTRY_SECTORS) {
      for (const post of KEYWORD_POSTFIXES) {
        for (let num = 1; num <= 10; num++) {
          index++;
          const keyword = `${mod} ${sec} ${post} ${num}`;
          
          // Deterministic statistics using sinusoidal functions
          const searchVolume = Math.round(150 + ((Math.sin(index) + 1.1) * 450));
          const averageCPC = parseFloat((0.85 + ((Math.cos(index) + 1.2) * 4.2)).toFixed(2));
          const competition = parseFloat(((Math.sin(index * 1.5) + 1.0) / 2.0).toFixed(2));

          benchmarks.push({
            keyword,
            searchVolume,
            averageCPC,
            competition,
          });
        }
      }
    }
  }

  return benchmarks;
}

/**
 * Searches generated keyword benchmarks matching a query
 */
export function searchKeywordBenchmarks(query: string, limit: number = 20): KeywordBenchmark[] {
  const clean = query.trim().toLowerCase();
  const all = generateKeywordBenchmarks();
  if (!clean) return all.slice(0, limit);
  return all.filter(k => k.keyword.includes(clean)).slice(0, limit);
}
