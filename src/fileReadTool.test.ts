// Test: file_read tool path escape prevention
import { describe, it, before, after } from 'node:test';
import { createFileReadTool } from './tools/fileReadTool.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert';

describe('fileReadTool', () => {
  const testDir = join(process.cwd(), 'test-fixtures');
  const safeFilePath = join(testDir, 'safe.txt');

  before(() => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(safeFilePath, 'test content\nline 2', 'utf8');
  });

  after(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('reads a file within project directory', async () => {
    const tool = createFileReadTool();
    const result = await tool.execute({ path: 'test-fixtures/safe.txt' });
    assert.ok(!result.isError, 'should succeed');
    assert.ok(result.content.includes('test content'), 'should contain file content');
  });

  it('rejects path that escapes project root', async () => {
    const tool = createFileReadTool();
    // Try to read a file outside current directory
    try {
      const result = await tool.execute({ path: '../../etc/passwd' });
      // If no error thrown, should be an error result
      assert.ok(
        result.isError,
        'should return error for path escape attempt'
      );
    } catch (err) {
      // Throwing an error is also acceptable behavior for path escape
      assert.ok(err instanceof Error && err.message.includes('Path escapes'), 'should reject path escape');
    }
  });
});
