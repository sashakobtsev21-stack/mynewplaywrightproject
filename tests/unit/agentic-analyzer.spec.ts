import * as path from 'path';
import { test, expect } from '@playwright/test';
import type Anthropic from '@anthropic-ai/sdk';
import {
  executeTool,
  resolveWithinRoot,
  runAgentLoop,
  PROJECT_ROOT,
  type Send,
} from '../../src/ai/agentic-analyzer';

const toolUse = (name: string, input: unknown, id = 'tu1'): Anthropic.ToolUseBlock =>
  ({ type: 'tool_use', id, name, input }) as Anthropic.ToolUseBlock;

const textBlock = (text: string): Anthropic.ContentBlock =>
  ({ type: 'text', text, citations: null }) as unknown as Anthropic.ContentBlock;

const message = (
  content: Anthropic.ContentBlock[],
  stop_reason: Anthropic.Message['stop_reason'],
): Anthropic.Message =>
  ({
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-4-5',
    content,
    stop_reason,
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  }) as unknown as Anthropic.Message;

// Defined at module scope (not inside the test) to keep the branch out of the
// test body: returns a tool call while tools are offered, a text answer once the
// loop drops them for the forced-final call.
const cappingSend: Send = async (params) =>
  params.tools
    ? message([toolUse('list_dir', { path: '.' })], 'tool_use')
    : message([textBlock('CAPPED ANSWER')], 'end_turn');

test.describe('resolveWithinRoot (path sandbox)', () => {
  test('accepts a path inside the project root', () => {
    expect(resolveWithinRoot('package.json')).toBe(path.join(PROJECT_ROOT, 'package.json'));
  });

  test('rejects traversal outside the root', () => {
    expect(() => resolveWithinRoot('../secret')).toThrow(/escapes the project root/);
    expect(() => resolveWithinRoot('../../etc/passwd')).toThrow(/escapes the project root/);
  });
});

test.describe('executeTool (sandboxed tools)', () => {
  test('read_file returns file contents', () => {
    const res = executeTool(toolUse('read_file', { path: 'package.json' }));
    expect(res.is_error).toBeFalsy();
    expect(String(res.content)).toContain('restful-booker-tests');
  });

  test('list_dir lists entries', () => {
    const res = executeTool(toolUse('list_dir', { path: '.' }));
    expect(String(res.content)).toContain('package.json');
  });

  test('grep finds a known symbol', () => {
    const res = executeTool(toolUse('grep', { query: 'redactSecrets', dir: 'src/ai' }));
    expect(String(res.content)).toContain('redaction.ts');
  });

  test('a missing file is an error result, not a throw', () => {
    const res = executeTool(toolUse('read_file', { path: 'does-not-exist.xyz' }));
    expect(res.is_error).toBe(true);
  });

  test('a path-escape attempt is caught and returned as an error', () => {
    const res = executeTool(toolUse('read_file', { path: '../../etc/passwd' }));
    expect(res.is_error).toBe(true);
    expect(String(res.content)).toMatch(/escapes the project root/);
  });

  test('an unknown tool name is an error result', () => {
    const res = executeTool(toolUse('rm_rf', { path: '/' }));
    expect(res.is_error).toBe(true);
  });
});

test.describe('runAgentLoop (tool-use loop)', () => {
  test('executes tool calls and returns the final text answer', async () => {
    const responses = [
      message([toolUse('list_dir', { path: '.' })], 'tool_use'),
      message([textBlock('FINAL ANSWER')], 'end_turn'),
    ];
    let call = 0;
    const send: Send = async () => responses[call++];

    const result = await runAgentLoop({ system: 'sys', userPrompt: 'go', send });

    expect(result.text).toBe('FINAL ANSWER');
    expect(result.toolCalls).toBe(1);
    expect(result.steps).toBe(2);
  });

  test('hits the step cap and forces a final answer without tools', async () => {
    const result = await runAgentLoop({
      system: 'sys',
      userPrompt: 'go',
      send: cappingSend,
      maxSteps: 2,
    });

    expect(result.text).toBe('CAPPED ANSWER');
    expect(result.steps).toBe(2);
    expect(result.toolCalls).toBe(2);
  });
});
