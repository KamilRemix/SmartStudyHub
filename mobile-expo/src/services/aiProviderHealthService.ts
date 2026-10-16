import {
  AIProviderId,
  BUILTIN_GROQ_KEY,
  BUILTIN_GIGACHAT_CREDS,
  BUILTIN_SAMBANOVA_KEY,
  BUILTIN_GEMINI_KEY,
} from './aiMultiProviderService';

export interface ProviderHealthStatus {
  id: AIProviderId;
  status: 'online' | 'degraded' | 'offline' | 'checking';
  latencyMs: number | null;
  lastChecked: number;
}

type HealthListener = (healthMap: Record<AIProviderId, ProviderHealthStatus>) => void;

// In-memory health cache
const healthCache: Record<AIProviderId, ProviderHealthStatus> = {
  auto: { id: 'auto', status: 'online', latencyMs: null, lastChecked: 0 },
  gemini: { id: 'gemini', status: 'checking', latencyMs: null, lastChecked: 0 },
  gigachat: { id: 'gigachat', status: 'checking', latencyMs: null, lastChecked: 0 },
  groq: { id: 'groq', status: 'checking', latencyMs: null, lastChecked: 0 },
  sambanova: { id: 'sambanova', status: 'checking', latencyMs: null, lastChecked: 0 },
  openrouter: { id: 'openrouter', status: 'checking', latencyMs: null, lastChecked: 0 },
  huggingface: { id: 'huggingface', status: 'checking', latencyMs: null, lastChecked: 0 },
};

const listeners: Set<HealthListener> = new Set();
let isPingingInProgress = false;

export function subscribeToHealthUpdates(listener: HealthListener): () => void {
  listeners.add(listener);
  // Send current cached status immediately
  listener({ ...healthCache });
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  const snapshot = { ...healthCache };
  listeners.forEach((l) => l(snapshot));
}

export function getCachedProviderHealth(): Record<AIProviderId, ProviderHealthStatus> {
  return { ...healthCache };
}

/**
 * Pings an individual endpoint with a strict timeout to measure real-time latency
 */
async function pingEndpoint(
  url: string,
  options: RequestInit,
  timeoutMs: number = 3500
): Promise<{ success: boolean; latencyMs: number }> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const latencyMs = Date.now() - start;
    clearTimeout(timer);
    // Success if 2xx or acceptable model response
    return { success: res.ok, latencyMs };
  } catch {
    clearTimeout(timer);
    return { success: false, latencyMs: Date.now() - start };
  }
}

/**
 * Pings all AI providers concurrently and updates health cache with latency
 */
export async function pingAllProviders(force: boolean = false): Promise<Record<AIProviderId, ProviderHealthStatus>> {
  const now = Date.now();
  // Don't re-ping if checked within the last 60 seconds unless forced
  if (!force && Object.values(healthCache).some((h) => h.lastChecked > 0 && now - h.lastChecked < 60000)) {
    return { ...healthCache };
  }

  if (isPingingInProgress) {
    return { ...healthCache };
  }
  isPingingInProgress = true;

  // Mark all as checking
  (Object.keys(healthCache) as AIProviderId[]).forEach((id) => {
    healthCache[id].status = 'checking';
  });
  notifyListeners();

  // 1. Ping Pollinations (Ultra-fast anonymous OpenAI free reasoning endpoint)
  const pingPollinations = async () => {
    const res = await pingEndpoint('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'ping' }],
        model: 'openai-fast',
      }),
    });
    return res;
  };

  // 2. Ping Groq
  const pingGroq = async () => {
    return await pingEndpoint('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${BUILTIN_GROQ_KEY}` },
    });
  };

  // 3. Ping GigaChat OAuth
  const pingGigaChat = async () => {
    return await pingEndpoint('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        RqUID: '00000000-0000-4000-8000-000000000000',
        Authorization: `Basic ${BUILTIN_GIGACHAT_CREDS}`,
      },
      body: 'scope=GIGACHAT_API_PERS',
    });
  };

  // 4. Ping OpenRouter
  const pingOpenRouter = async () => {
    return await pingEndpoint('https://openrouter.ai/api/v1/models', {
      headers: {
        'HTTP-Referer': 'https://smartstudyhub.app',
        'X-Title': 'SmartStudyHub',
      },
    });
  };

  // 5. Ping SambaNova
  const pingSambaNova = async () => {
    return await pingEndpoint('https://api.sambanova.ai/v1/models', {
      headers: { Authorization: `Bearer ${BUILTIN_SAMBANOVA_KEY}` },
    });
  };

  // 6. Ping HuggingFace
  const pingHuggingFace = async () => {
    return await pingEndpoint('https://huggingface.co/api/status', {});
  };

  // 7. Ping Gemini Flash
  const pingGemini = async () => {
    const res = await pingEndpoint(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key=${encodeURIComponent(BUILTIN_GEMINI_KEY)}`,
      { method: 'GET' }
    );
    if (res.success) return res;
    return await pingEndpoint(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite?key=${encodeURIComponent(BUILTIN_GEMINI_KEY)}`,
      { method: 'GET' }
    );
  };

  const [polRes, groqRes, gigaRes, openRes, sambaRes, hfRes, gemRes] = await Promise.all([
    pingPollinations(),
    pingGroq(),
    pingGigaChat(),
    pingOpenRouter(),
    pingSambaNova(),
    pingHuggingFace(),
    pingGemini(),
  ]);

  const timestamp = Date.now();

  healthCache.gemini = {
    id: 'gemini',
    status: gemRes.success ? 'online' : 'offline',
    latencyMs: gemRes.success ? gemRes.latencyMs : null,
    lastChecked: timestamp,
  };

  // Update Pollinations/OpenRouter status
  healthCache.openrouter = {
    id: 'openrouter',
    status: polRes.success ? 'online' : openRes.success ? 'online' : 'offline',
    latencyMs: polRes.success ? polRes.latencyMs : openRes.success ? openRes.latencyMs : null,
    lastChecked: timestamp,
  };

  healthCache.groq = {
    id: 'groq',
    status: groqRes.success ? 'online' : 'offline',
    latencyMs: groqRes.success ? groqRes.latencyMs : null,
    lastChecked: timestamp,
  };

  healthCache.gigachat = {
    id: 'gigachat',
    status: gigaRes.success ? 'online' : 'offline',
    latencyMs: gigaRes.success ? gigaRes.latencyMs : null,
    lastChecked: timestamp,
  };

  healthCache.sambanova = {
    id: 'sambanova',
    status: sambaRes.success ? 'online' : 'offline',
    latencyMs: sambaRes.success ? sambaRes.latencyMs : null,
    lastChecked: timestamp,
  };

  healthCache.huggingface = {
    id: 'huggingface',
    status: hfRes.success ? 'online' : 'offline',
    latencyMs: hfRes.success ? hfRes.latencyMs : null,
    lastChecked: timestamp,
  };

  // Auto is online if any provider is online
  const anyOnline = Object.values(healthCache).some((h) => h.id !== 'auto' && h.status === 'online');
  const fastest = Object.values(healthCache)
    .filter((h) => h.id !== 'auto' && h.status === 'online' && typeof h.latencyMs === 'number')
    .sort((a, b) => (a.latencyMs || 9999) - (b.latencyMs || 9999))[0];

  healthCache.auto = {
    id: 'auto',
    status: anyOnline ? 'online' : 'degraded',
    latencyMs: fastest?.latencyMs || null,
    lastChecked: timestamp,
  };

  isPingingInProgress = false;
  notifyListeners();
  return { ...healthCache };
}

/**
 * Returns sorted list of providers for the Auto-Cascade so that the fastest,
 * currently verified online providers are queried first.
 */
export function getSortedProviderSequence(candidates: AIProviderId[]): AIProviderId[] {
  return [...candidates].sort((a, b) => {
    const healthA = healthCache[a];
    const healthB = healthCache[b];

    const scoreA = healthA?.status === 'online' ? (healthA.latencyMs || 500) : 10000;
    const scoreB = healthB?.status === 'online' ? (healthB.latencyMs || 500) : 10000;

    return scoreA - scoreB;
  });
}
