/**
 * Config Loader — Centralized configuration for TechVyro app
 * Loads public/config.json and provides global access to feature flags and AI settings
 */

let appConfig = null;

export async function loadConfig() {
  if (appConfig) return appConfig;

  try {
    const response = await fetch('/config.json');
    if (!response.ok) throw new Error(`Failed to load config: ${response.statusText}`);
    appConfig = await response.json();
    console.log('[Config] Loaded successfully:', appConfig);
    return appConfig;
  } catch (err) {
    console.error('[Config] Error loading config:', err);
    // Return sensible defaults
    appConfig = {
      features: {
        claude_haiku_4_5: true,
        enable_ai_chat: true,
        enable_ai_builder: true
      },
      ai: {
        default_model: 'claude-haiku-4.5',
        models: [
          {
            id: 'claude-haiku-4.5',
            name: 'Claude Haiku 4.5',
            description: 'Fast and efficient AI model for all clients',
            enabled: true,
            tier: 'free'
          }
        ]
      },
      version: '1.0.0'
    };
    return appConfig;
  }
}

export function getConfig() {
  return appConfig;
}

export function isFeatureEnabled(featureName) {
  if (!appConfig) return false;
  return appConfig.features[featureName] === true;
}

export function getAIModels() {
  if (!appConfig || !appConfig.ai) return [];
  return appConfig.ai.models || [];
}

export function getDefaultAIModel() {
  if (!appConfig || !appConfig.ai) return 'claude-haiku-4.5';
  return appConfig.ai.default_model;
}

export function isClaudeHaiku45Enabled() {
  if (!appConfig) return true; // default true
  return appConfig.features.claude_haiku_4_5 === true;
}

// Auto-load config on import
loadConfig();
