import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_CONFIG_FILE = 'mini-claude-cli.config.json';

/**
 * Runtime configuration shape
 */
export type RuntimeConfig = {
  anthropicApiKey?: string;
  anthropicAuthToken?: string;
  anthropicBaseUrl?: string;
  model?: string;
};

/**
 * Normalize credential string: trim and treat empty as undefined
 */
export function normalizeCredential(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Read runtime config from JSON file (if exists)
 */
export function readRuntimeConfig(configPath?: string): RuntimeConfig {
  const candidate = path.resolve(process.cwd(), configPath ?? DEFAULT_CONFIG_FILE);
  if (!fs.existsSync(candidate)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(candidate, 'utf8');
    const parsed = JSON.parse(raw) as RuntimeConfig;

    return {
      anthropicApiKey: normalizeCredential(parsed.anthropicApiKey),
      anthropicAuthToken: normalizeCredential(parsed.anthropicAuthToken),
      anthropicBaseUrl: normalizeCredential(parsed.anthropicBaseUrl),
      model: parsed.model?.trim() || undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid config file at ${candidate}: ${errorMessage}`);
  }
}

/**
 * Check if error is 401 unauthorized
 */
export function isUnauthorizedError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number' && status === 401) {
      return true;
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  return /\b401\b/.test(message);
}

/**
 * Auth config for Anthropic client
 */
export type AuthClientConfig = {
  apiKey?: string;
  authToken?: string;
};

/**
 * Build ordered list of auth configs to try.
 * Deduplicates and skips empty credentials.
 */
export function buildAuthClientConfigs(apiKey?: string, authToken?: string): AuthClientConfig[] {
  const configs: AuthClientConfig[] = [];
  const seen = new Set<string>();

  const push = (config: AuthClientConfig): void => {
    if (!config.apiKey && !config.authToken) {
      return;
    }
    const key = `${config.apiKey ?? ''}|${config.authToken ?? ''}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    configs.push(config);
  };

  push({ apiKey, authToken });
  push({ authToken });
  push({ apiKey });

  if (authToken) {
    push({ apiKey: authToken });
  }

  return configs;
}

/**
 * Create Anthropic client with given auth config
 */
export function createAnthropicClient(auth: AuthClientConfig, baseURL?: string): Anthropic {
  const apiKey =
    typeof auth.apiKey === 'string' && auth.apiKey.length > 0 ? auth.apiKey : null;

  return new Anthropic({
    apiKey,
    authToken: apiKey ? null : auth.authToken ?? null,
    ...(baseURL ? { baseURL } : {}),
  });
}

/**
 * Get auth credentials from options, environment, or config file.
 * Priority: options > environment > config file
 */
export function resolveAuth(
  options?: { apiKey?: string; authToken?: string },
  runtimeConfig?: RuntimeConfig
): { apiKey?: string; authToken?: string } {
  // Environment variables (lowest priority; config file should win when present)
  const envApiKey = normalizeCredential(process.env.MINI_CLAUDE_API_KEY);
  const envAuthToken = normalizeCredential(
    process.env.MINI_CLAUDE_AUTH_TOKEN ?? process.env.ANTHROPIC_AUTH_TOKEN
  );

  // Priority: options > config file > environment
  const apiKey =
    normalizeCredential(options?.apiKey) ??
    runtimeConfig?.anthropicApiKey ??
    envApiKey;
  const authToken =
    normalizeCredential(options?.authToken) ??
    runtimeConfig?.anthropicAuthToken ??
    envAuthToken;

  return { apiKey, authToken };
}
