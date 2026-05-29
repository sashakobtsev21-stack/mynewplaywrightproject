import { test, expect } from '@playwright/test';
import { loadPrompt } from '../../src/ai/prompt-loader';

test.describe('prompt-loader', () => {
  test('parses frontmatter and exposes the input contract', () => {
    const p = loadPrompt('data-generator');
    expect(p.meta.name).toBe('data-generator');
    expect(p.meta.version).toBe(1);
    expect(p.meta.inputs).toEqual(['count', 'kind', 'shape', 'context']);
  });

  test('substitutes declared variables', () => {
    const out = loadPrompt('data-generator').render({
      count: '3',
      kind: 'guest',
      shape: '{ name: string }',
      context: '',
    });
    expect(out).toContain('Generate 3 realistic test data record(s) for kind "guest"');
    expect(out).toContain('{ name: string }');
  });

  test('throws when a declared input is missing', () => {
    expect(() =>
      loadPrompt('data-generator').render({ count: '1', kind: 'guest' } as Record<string, string>),
    ).toThrow(/missing required input "shape"/);
  });

  test('does not re-scan substituted values for placeholders', () => {
    const out = loadPrompt('failure-analyzer').render({
      testDir: 'x',
      errorContext: 'a value with {{notAVar}} inside',
      specSource: 'z',
    });
    expect(out).toContain('{{notAVar}}');
  });
});
