import type Anthropic from '@anthropic-ai/sdk';
import {
  callClaude,
  extractText,
  isAiEnabled,
  type CallOptions,
  type CallParams,
} from '../anthropic-client';
import type { LLMProvider, LLMRequest, LLMResponse } from './types';

type CallFn = (params: CallParams, opts?: CallOptions) => Promise<Anthropic.Message>;

/**
 * The default provider: a thin adapter over the existing `callClaude()` path, so
 * it inherits the same retry, backoff, and trace writing. The transport is
 * injectable purely so the mapping can be unit-tested without a network call.
 */
export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';

  constructor(private readonly call: CallFn = callClaude) {}

  isConfigured(): boolean {
    return isAiEnabled();
  }

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const resp = await this.call(
      {
        model: req.model,
        max_tokens: req.maxTokens,
        system: req.system,
        temperature: req.temperature,
        messages: req.messages.map((m) => ({ role: m.role, content: m.text })),
      },
      {
        meta: {
          module: req.meta?.module ?? 'unknown',
          promptName: req.meta?.promptName,
          promptVersion: req.meta?.promptVersion,
          provider: this.name,
          injectionSuspected: req.meta?.injectionSuspected,
        },
      },
    );

    return {
      text: extractText(resp.content),
      model: resp.model,
      provider: this.name,
      inputTokens: resp.usage.input_tokens,
      outputTokens: resp.usage.output_tokens,
    };
  }
}
