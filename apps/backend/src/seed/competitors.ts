export interface CompetitorSEOProfile {
  name: string;
  pageAuthority: number;
  domainAuthority: number;
}

export interface CompetitorBidProfile {
  name: string;
  keyword: string;
  bid: number;
  dailyBudget: number;
}

export const SEO_COMPETITORS: CompetitorSEOProfile[] = [
  { name: 'Omni CRM Solutions', pageAuthority: 65, domainAuthority: 70 },
  { name: 'SlickSales Automation', pageAuthority: 48, domainAuthority: 52 },
  { name: 'TechFlow Cloud Suite', pageAuthority: 30, domainAuthority: 35 },
  { name: 'DirectMarket Corp', pageAuthority: 15, domainAuthority: 20 },
];

export const AD_COMPETITORS_BIDS: CompetitorBidProfile[] = [
  { name: 'Omni CRM Solutions', keyword: 'best crm software 1', bid: 4.80, dailyBudget: 150.0 },
  { name: 'SlickSales Automation', keyword: 'top sales app 3', bid: 3.50, dailyBudget: 100.0 },
  { name: 'TechFlow Cloud Suite', keyword: 'cloud marketing solution 5', bid: 2.90, dailyBudget: 80.0 },
  { name: 'DirectMarket Corp', keyword: 'free database tool 8', bid: 1.20, dailyBudget: 50.0 },
];
