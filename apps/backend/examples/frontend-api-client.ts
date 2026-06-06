/**
 * Digital Marketing Simulation Lab - Frontend API Client (Sample Code)
 * 
 * Copy and paste this into your frontend application (e.g. `src/api/client.ts`).
 * Make sure to install or configure your environment variables.
 */

const API_BASE_URL = typeof process !== 'undefined' 
  ? (process.env.VITE_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000')
  : 'http://localhost:5000';

/**
 * Base fetch client wrapper that handles common configurations:
 * 1. Setting Content-Type to JSON.
 * 2. Transmitting HTTP-only cookies (credentials: 'include') for Better Auth.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    // Required to send and receive Better Auth session cookies cross-origin
    credentials: 'include',
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const errorMessage = data.error || data.message || `Request failed with status ${response.status}`;
    const error: any = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AUTHENTICATION ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT_COLLEGE' | 'INDIVIDUAL' | 'INSTRUCTOR' | 'ADMIN';
  institution?: string | null;
  planType?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export function signUp(email: string, name: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/sign-up/email', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'temporary_password_min_8_chars', name }),
  });
}

export function signIn(email: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/sign-in/email', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'user_password_string' }),
  });
}

export function signOut(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/auth/sign-out', {
    method: 'POST',
  });
}

export function getMe(): Promise<User> {
  return request<User>('/api/me', {
    method: 'GET',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SIMULATION FLOW ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

export interface SimulationState {
  id: string;
  userId: string;
  classId: string;
  currentRound: number;
  status: 'INITIALIZED' | 'DECISION_OPEN' | 'LOCKED' | 'PROCESSING' | 'RESULTS_READY' | 'SCORE_LOCKED' | 'COMPLETED';
  isCompleted: boolean;
  cumulativeSpend: number;
  cumulativeRevenue: number;
  score: number;
}

export function createSimulation(): Promise<SimulationState> {
  return request<SimulationState>('/api/simulations', {
    method: 'POST',
  });
}

export function getSimulation(id: string): Promise<SimulationState> {
  return request<SimulationState>(`/api/simulations/${id}`, {
    method: 'GET',
  });
}

export function advanceRound(id: string): Promise<{ success: boolean; roundAdvanced: number; nextRound: number; isCompleted: boolean }> {
  return request<{ success: boolean; roundAdvanced: number; nextRound: number; isCompleted: boolean }>(`/api/simulations/${id}/advance`, {
    method: 'POST',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DECISIONS SUBMISSION
// ─────────────────────────────────────────────────────────────────────────────

export interface DecisionPayload {
  seoTargetKeywords: string[];
  seoContentQuality: number;
  seoBacklinkBudget: number;
  googleCampaigns: Array<{
    name: string;
    budget: number;
    keywords: Array<{ word: string; bid: number }>;
  }>;
  metaCampaigns: Array<{
    name: string;
    budget: number;
    audienceInterest: string;
    bidType: 'cpc' | 'cpm' | 'auto';
    bidAmount: number;
    placement: string;
    creativeQuality: number;
  }>;
  submitted: boolean;
}

export function submitDecisions(simulationId: string, decisions: DecisionPayload): Promise<any> {
  return request<any>(`/api/simulations/${simulationId}/decisions`, {
    method: 'POST',
    body: JSON.stringify(decisions),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. METRICS & REPORTS
// ─────────────────────────────────────────────────────────────────────────────

export interface DailyMetric {
  id: string;
  simulationId: string;
  round: number;
  day: number;
  organicImpressions: number;
  organicClicks: number;
  organicCTR: number;
  organicConversions: number;
  googleImpressions: number;
  googleClicks: number;
  googleCost: number;
  googleConversions: number;
  metaImpressions: number;
  metaClicks: number;
  metaCost: number;
  metaConversions: number;
  revenue: number;
}

export function getMetrics(simulationId: string): Promise<DailyMetric[]> {
  return request<DailyMetric[]>(`/api/simulations/${simulationId}/metrics`, {
    method: 'GET',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PLATFORM-SPECIFIC SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

export function getSeoKeywords(): Promise<Array<{ keyword: string; searchVolume: number; competition: string }>> {
  return request<Array<{ keyword: string; searchVolume: number; competition: string }>>('/api/seo/keywords', {
    method: 'GET',
  });
}

export function getGoogleBenchmarks(): Promise<Array<{ keyword: string; averageCPC: number; competitionIndex: number }>> {
  return request<Array<{ keyword: string; averageCPC: number; competitionIndex: number }>>('/api/google-ads/benchmarks', {
    method: 'GET',
  });
}

export function getMetaAudiences(): Promise<Array<{ interest: string; reachEstimate: number; avgCPC: number }>> {
  return request<Array<{ interest: string; reachEstimate: number; avgCPC: number }>>('/api/meta-ads/audiences', {
    method: 'GET',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ACCREDITATION / CERTIFICATES
// ─────────────────────────────────────────────────────────────────────────────

export interface EligibilityResponse {
  eligible: boolean;
  score: number;
  minPassingScore: number;
}

export function getCertificateEligibility(simulationId: string): Promise<EligibilityResponse> {
  return request<EligibilityResponse>('/api/certificates/check-eligibility', {
    method: 'POST',
    body: JSON.stringify({ simulationId }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. AI CAMPAIGN INSIGHTS
// ─────────────────────────────────────────────────────────────────────────────

export interface InsightResponse {
  insight: string;
  platform: string;
}

export function getAiInsight(simulationId: string, platform: 'seo' | 'google_ads' | 'meta_ads'): Promise<InsightResponse> {
  return request<InsightResponse>('/api/ai/insight', {
    method: 'POST',
    body: JSON.stringify({ simulationId, platform }),
  });
}
