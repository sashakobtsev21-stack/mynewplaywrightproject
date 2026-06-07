import { env } from '../../config/env';
import type { LLMProvider } from './types';
import { AnthropicProvider } from './anthropic.provider';
import { OpenAICompatibleProvider } from './openai.provider';

export type ProviderName = 'anthropic' | 'openai';

const registry: Record<ProviderName, () => LLMProvider> = {
  anthropic: () => new AnthropicProvider(),
  openai: () => new OpenAICompatibleProvider(),
};

/**
 * Resolve the active LLM provider. Defaults to `LLM_PROVIDER` from the env
 * (itself defaulting to `anthropic`), so the text helpers run unchanged unless a
 * second provider is configured. Pass a name to force one.
 */
export function getProvider(name: ProviderName = env.LLM_PROVIDER): LLMProvider {
  const make = registry[name];
  if (!make) throw new Error(`Unknown LLM provider: ${name}`);
  return make();
}

export { AnthropicProvider } from './anthropic.provider';
export { OpenAICompatibleProvider } from './openai.provider';
export type { LLMProvider, LLMRequest, LLMResponse, LLMMessage, LLMMeta } from './types';
