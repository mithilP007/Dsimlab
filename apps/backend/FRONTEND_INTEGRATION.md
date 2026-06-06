# Frontend Integration Guide — Connecting to the Backend

This guide provides clean, copy-pasteable code snippets to help you integrate your React/Vite or Next.js frontend with the Fastify/Socket.io simulation backend.

---

## 1. Axios Base Setup
Since the backend uses cookie-based authentication via Better Auth, you **MUST** configure Axios (or fetch) to include credential cookies in cross-origin requests.

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // CRITICAL: Transmits Better Auth session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### CORS Warning
In the backend `.env` file, the `FRONTEND_URL` variable **must** match your frontend development server URL exactly (e.g. `http://localhost:5173` for Vite, or `http://localhost:3000` for Next.js) for credentials and CORS headers to pass.
```env
FRONTEND_URL=http://localhost:5173
```

---

## 2. Authentication Flow

### A. User Registration (Sign-up)
Registers a new student and automatically signs them in.
```typescript
export async function registerUser(email: string, name: string, role: string) {
  try {
    const response = await apiClient.post('/api/auth/sign-up/email', {
      email,
      password: 'a_secure_temporary_password_8chars', // Better Auth email registration
      name,
    });
    return response.data; // { user: { id, name, email, role }, token }
  } catch (error: any) {
    console.error('Registration failed:', error.response?.data || error.message);
    throw error;
  }
}
```

### B. User Authentication (Sign-in)
Logs in a user and establishes the HTTP session cookie.
```typescript
export async function loginUser(email: string) {
  try {
    const response = await apiClient.post('/api/auth/sign-in/email', {
      email,
      password: 'user_password_string',
    });
    return response.data; // Sets session cookie in the browser
  } catch (error: any) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}
```

### C. Retrieve User Session (`/api/me`)
Retrieves details of the currently logged-in user. Call this on app load/routing to see if the session is valid.
```typescript
export async function getMe() {
  try {
    const response = await apiClient.get('/api/me');
    return response.data; // { id, email, name, role, institution, planType }
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.warn('User session is unauthenticated.');
      return null;
    }
    throw error;
  }
}
```

---

## 3. Simulation Core Operations

### A. Create a New Simulation Session
Initializes a new simulator environment for the student.
```typescript
export async function createSimulation() {
  try {
    const response = await apiClient.post('/api/simulations');
    return response.data; // { id, userId, classId, currentRound, status: 'INITIALIZED' }
  } catch (error: any) {
    console.error('Failed to create simulation:', error.response?.data || error.message);
    throw error;
  }
}
```

### B. Submit Round Decisions
Saves the student's SEO keywords, Google Ads campaign configurations, and Meta Ads target audiences for the current round.
```typescript
export interface CampaignDecision {
  seoTargetKeywords: string[];
  seoContentQuality: number; // 1 to 10
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
    creativeQuality: number; // 1 to 10
  }>;
}

export async function submitDecisions(simulationId: string, decisions: CampaignDecision) {
  try {
    const response = await apiClient.post(`/api/simulations/${simulationId}/decisions`, {
      ...decisions,
      submitted: true,
    });
    return response.data; // Returns saved decision record
  } catch (error: any) {
    console.error('Decision submission failed:', error.response?.data || error.message);
    throw error;
  }
}
```

### C. Get Round Snapshots / Daily Metrics
Gets compiled metric nodes for chart rendering.
```typescript
export async function getSimulationMetrics(simulationId: string) {
  try {
    const response = await apiClient.get(`/api/simulations/${simulationId}/metrics`);
    return response.data; // Array of DailyMetric rows containing impressions, clicks, cost, revenue
  } catch (error: any) {
    console.error('Failed to fetch daily metrics:', error.response?.data || error.message);
    throw error;
  }
}
```

---

## 4. AI Strategic Analytics

### Fetch AI Insight Report
Requests automated strategic suggestions based on the student's campaign performance.
```typescript
export async function getAiInsight(simulationId: string, platform: 'seo' | 'google_ads' | 'meta_ads') {
  try {
    const response = await apiClient.post('/api/ai/insight', {
      simulationId,
      platform,
    });
    return response.data; // { insight: "Detailed recommendations text..." }
  } catch (error: any) {
    console.error('AI insight retrieval failed:', error.response?.data || error.message);
    throw error;
  }
}
```

---

## 5. Socket.io WebSocket Integration
WebSockets allow your UI to receive immediate updates when round processing finishes or when instructor events occur.

```typescript
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';

export function connectWebSocket(userId: string, simulationId: string): Socket {
  // Establish connection
  const socket = io(WS_URL, {
    transports: ['websocket'],
    // If using cookie authentication, Socket.io sends cookies automatically on connection.
    // If using headers, you can supply your Better Auth token explicitly:
    // auth: { token: 'YOUR_SESSION_TOKEN' }
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket connected. ID:', socket.id);
    
    // 1. Join user personal notification channel
    socket.emit('join-user', userId);
    
    // 2. Join specific active simulation observer room
    socket.emit('join-simulation', simulationId);
  });

  // 3. Listen for round advance processing completion
  socket.on('round:complete', (data: { type: string; simulationId: string; roundNumber: number; nextState: string }) => {
    console.log(`🎉 Round ${data.roundNumber} completed! Next phase is: ${data.nextState}`);
    // Trigger UI data re-fetch, update charts, unlock screens
  });

  // 4. Listen for instructor notifications/injected market events
  socket.on('notification', (notice: { id: string; message: string; level: 'info' | 'warn' }) => {
    console.log(`🔔 System Notification [${notice.level}]:`, notice.message);
  });

  socket.on('event:triggered', (event: { name: string; description: string }) => {
    console.warn(`⚡ Market Event Injected: ${event.name} - ${event.description}`);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ WebSocket disconnected. Reason:', reason);
  });

  return socket;
}
```
