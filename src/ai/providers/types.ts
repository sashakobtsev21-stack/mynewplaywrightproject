/**
 * Provider-neutral shape for a single text completion. The AI layer's text
 * helpers (data generator, test generator) talk to an `LLMProvider` instead of
 * the Anthropic SDK directly, so the model vendor is a config choice, not a
 * hard-wired dependency.
 *
 * Deliberately small: just what the text helpers need (a system prompt, a few
 * turns, a token cap). The multimodal failure analyzer and the tool-use agent
 * stay on the Anthropic client directly — vision and tool-use loops aren't
 * uniform across vendors, and pretending otherwise would be a leaky abstraction.
 */

export type LLMRole = 'user' | 'assistant';

export interface LLMMessage {
  role: LLMRole;
  text: string;
}

/** Where a call came from — copied onto the trace line, same fields as CallMeta. */
export interface LLMMeta {
  module?: string;
  promptName?: string;
  promptVersion?: number;
  /** Set when an untrusted input tripped the injection heuristic (see redaction.ts). */
  injectionSuspected?: boolean;
}

export interface LLMRequest {
  /** Optional model id; each provider falls back to its own default. */
  model?: string;
  system?: string;
  messages: LLMMessage[];
  maxTokens: number;
  temperature?: number;
  meta?: LLMMeta;
}

export interface LLMResponse {
  text: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
}

export interface LLMProvider {
  /** Stable identifier, recorded on the trace (`provider`). */
  readonly name: string;
  /** True when the provider has the credentials/endpoint it needs to run. */
  isConfigured(): boolean;
  /** Run one completion. Writes a trace line, like every other AI call. */
  complete(req: LLMRequest): Promise<LLMResponse>;
}
