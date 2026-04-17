// Test: grep tool maxResults cap
import { describe, it, before, after } from 'node:test';
import { createGrepTool } from '../src/tools/grepTool.js';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert';

describe('grepTool', () => {
  const testDir = join(process.cwd(), 'test-fixtures-grep');
  const testFile = join(testDir, 'grep-test.txt');

  before(() => {
    mkdirSync(testDir, { recursive: true });
    // Create a file with 10 lines containing "match"
    const lines = Array.from({ length: 10 }, (_, i) => `line ${i}: match`);
    writeFileSync(testFile, lines.join('\n'), 'utf8');
  });

  after(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('finds matches with pattern', async () => {
    // Ensure directory and file exist
    if (!existsSync(testFile)) {
      mkdirSync(testDir, { recursive: true });
      const lines = Array.from({ length: 10 }, (_, i) => `line ${i}: match`);
      writeFileSync(testFile, lines.join('\n'), 'utf8');
    }

    const tool = createGrepTool();
    const result = await tool.execute({ pattern: 'match' });
    assert.ok(!result.isError, 'should succeed');
    assert.ok(result.content.includes('match'), 'should find matches');
  });

  it('respects maxResults limit', async () => {
    const tool = createGrepTool();
    const result = await tool.execute({ pattern: 'match', maxResults: 3 });
    assert.ok(!result.isError, 'should succeed');
    const lines = result.content.split('\n');
    assert.ok(lines.length <= 3, `should return at most 3 results, got ${lines.length}`);
  });
});
