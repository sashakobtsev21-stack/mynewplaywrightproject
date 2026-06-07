import { test, expect } from '@playwright/test';
import type Anthropic from '@anthropic-ai/sdk';
import type { CallOptions, CallParams } from '../../src/ai/anthropic-client';
import {
  getProvider,
  AnthropicProvider,
  OpenAICompatibleProvider,
  type ProviderName,
} from '../../src/ai/providers';

const makeRes = (status: number, jsonBody: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => jsonBody,
    text: async () => JSON.stringify(jsonBody),
  }) as unknown as Response;

type FetchArgs = { url: string | URL | Request; init?: RequestInit };
const seqFetch = (responses: Response[]) => {
  const calls: FetchArgs[] = [];
  let i = 0;
  const fn = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({ url, init });
    return responses[Math.min(i++, responses.length - 1)];
  };
  return Object.assign(fn, { calls });
};

const aMessage = (text: string, inT: number, outT: number): Anthropic.Message =>
  ({
    id: 'm',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-4-5',
    stop_reason: 'end_turn',
    stop_sequence: null,
    content: [{ type: 'text', text, citations: null }],
    usage: { input_tokens: inT, output_tokens: outT },
  }) as unknown as Anthropic.Message;

const okBody = {
  model: 'gpt-4o-mini',
  choices: [{ message: { content: 'hi there' } }],
  usage: { prompt_tokens: 10, completion_tokens: 5 },
};

test.describe('getProvider', () => {
  test('resolves the built-in providers by name', () => {
    expect(getProvider('anthropic')).toBeInstanceOf(AnthropicProvider);
    expect(getProvider('openai')).toBeInstanceOf(OpenAICompatibleProvider);
    expect(getProvider('anthropic').name).toBe('anthropic');
  });

  test('throws on an unknown provider', () => {
    expect(() => getProvider('bogus' as ProviderName)).toThrow(/Unknown LLM provider/);
  });
});

test.describe('OpenAICompatibleProvider', () => {
  const cfg = { apiKey: 'sk-test', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' };

  test('posts a chat completion and maps the response', async () => {
    const fetchFake = seqFetch([makeRes(200, okBody)]);
    const provider = new OpenAICompatibleProvider(cfg, fetchFake as unknown as typeof fetch);

    const res = await provider.complete({
      maxTokens: 100,
      system: 'be terse',
      messages: [{ role: 'user', text: 'go' }],
      meta: { module: 'data-generator' },
    });

    expect(res).toMatchObject({
      text: 'hi there',
      provider: 'openai',
      inputTokens: 10,
      outputTokens: 5,
      model: 'gpt-4o-mini',
    });
    expect(String(fetchFake.calls[0].url)).toMatch(/\/chat\/completions$/);
    const body = JSON.parse(String(fetchFake.calls[0].init?.body));
    expect(body.messages[0]).toEqual({ role: 'system', content: 'be terse' });
    expect(body.messages[1]).toEqual({ role: 'user', content: 'go' });
  });

  test('retries a 500 then succeeds', async () => {
    const fetchFake = seqFetch([makeRes(500, {}), makeRes(200, okBody)]);
    const provider = new OpenAICompatibleProvider(cfg, fetchFake as unknown as typeof fetch);

    const res = await provider.complete({
      maxTokens: 10,
      messages: [{ role: 'user', text: 'go' }],
    });

    expect(res.text).toBe('hi there');
    expect(fetchFake.calls).toHaveLength(2);
  });

  test('isConfigured: cloud needs a key, localhost does not', () => {
    const cloudNoKey = new OpenAICompatibleProvider({
      baseUrl: 'https://api.openai.com/v1',
      model: 'x',
    });
    const local = new OpenAICompatibleProvider({
      baseUrl: 'http://localhost:11434/v1',
      model: 'x',
    });
    const cloudKey = new OpenAICompatibleProvider({
      apiKey: 'k',
      baseUrl: 'https://api.openai.com/v1',
      model: 'x',
    });
    expect(cloudNoKey.isConfigured()).toBe(false);
    expect(local.isConfigured()).toBe(true);
    expect(cloudKey.isConfigured()).toBe(true);
  });
});

test.describe('AnthropicProvider', () => {
  test('maps the request to callClaude and the message back', async () => {
    let captured: { params: CallParams; opts?: CallOptions } | undefined;
    const fakeCall = async (params: CallParams, opts?: CallOptions): Promise<Anthropic.Message> => {
      captured = { params, opts };
      return aMessage('draft', 7, 3);
    };
    const provider = new AnthropicProvider(fakeCall);

    const res = await provider.complete({
      maxTokens: 50,
      system: 'sys',
      messages: [{ role: 'user', text: 'hi' }],
      meta: { module: 'test-generator', injectionSuspected: true },
    });

    expect(res).toMatchObject({
      text: 'draft',
      provider: 'anthropic',
      inputTokens: 7,
      outputTokens: 3,
    });
    expect(captured?.params.max_tokens).toBe(50);
    expect(captured?.params.messages[0]).toEqual({ role: 'user', content: 'hi' });
    expect(captured?.opts?.meta).toMatchObject({
      module: 'test-generator',
      provider: 'anthropic',
      injectionSuspected: true,
    });
  });
});
