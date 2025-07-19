import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { listDirectoryTool } from '../../tools/list_directory';

suite('List Directory Tool Test Suite', () => {
  const tmpDir = path.join(__dirname, '../../test-tmp');

  suiteSetup(async () => {
    console.log('Test setup - workspace folders:', vscode.workspace.workspaceFolders);
    console.log('Test setup - tmpDir:', tmpDir);

    // テスト用ディレクトリ構造を作成
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.mkdir(path.join(tmpDir, 'dir1'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, 'dir1/subdir'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, 'dir2'), { recursive: true });

    await fs.writeFile(path.join(tmpDir, 'file1.txt'), 'content');
    await fs.writeFile(path.join(tmpDir, 'dir1/file2.txt'), 'content');
    await fs.writeFile(path.join(tmpDir, 'dir1/subdir/file3.txt'), 'content');
    await fs.writeFile(path.join(tmpDir, '.gitignore'), 'dir2/\n*.log');

    console.log('Test setup - created test files');
  });

  suiteTeardown(async () => {
    // テスト用ディレクトリを削除
    await fs.rm(tmpDir, { recursive: true, force: true });
    console.log('Test teardown - removed test directory');
  });

  test('Basic directory listing', async () => {
    console.log('Running basic directory listing test');
    const result = await listDirectoryTool({ path: tmpDir, depth: -1 });
    console.log('Basic directory listing result:', result);
    assert.strictEqual(result.isError, false, 'Expected success');
    assert.strictEqual(result.content.length, 1, 'Expected single content item');

    const output = result.content[0].text as string;
    assert.match(output, /test-tmp\//, 'Root directory should be listed');
    assert.match(output, /├── dir1\//, 'Should contain dir1');
    assert.match(output, /├── file1.txt/, 'Should contain file1.txt');
  });

  test('Respects .gitignore patterns', async () => {
    console.log('Running .gitignore test');
    const result = await listDirectoryTool({ path: tmpDir, depth: -1 });
    console.log('.gitignore test result:', result);
    assert.strictEqual(result.isError, false, 'Expected success');

    const output = result.content[0].text as string;
    assert.doesNotMatch(output, /dir2/, 'Should not contain ignored directory');
  });

  test('Honors depth parameter', async () => {
    console.log('Running depth parameter test');
    const result = await listDirectoryTool({ path: tmpDir, depth: 1 });
    console.log('Depth parameter test result:', result);
    assert.strictEqual(result.isError, false, 'Expected success');

    const output = result.content[0].text as string;
    assert.match(output, /dir1\//, 'Should contain top-level directory');
    assert.doesNotMatch(output, /subdir/, 'Should not contain deeper directories');
  });

  test('Handles non-existent directory', async () => {
    console.log('Running non-existent directory test');
    const result = await listDirectoryTool({ path: path.join(tmpDir, 'non-existent'), depth: -1 });
    console.log('Non-existent directory test result:', result);
    assert.strictEqual(result.isError, true, 'Expected error');
    assert.match(result.content[0].text as string, /Directory is empty or does not exist/, 'Should show error message');
  });

  test('Lists files in correct order', async () => {
    console.log('Running file order test');
    const result = await listDirectoryTool({ path: tmpDir, depth: -1 });
    console.log('File order test result:', result);
    assert.strictEqual(result.isError, false, 'Expected success');

    const lines = (result.content[0].text as string).split('\n');
    const dirIndex = lines.findIndex(line => line.includes('dir1/'));
    const fileIndex = lines.findIndex(line => line.includes('file1.txt'));

    assert.ok(dirIndex >= 0, 'Directory should be found');
    assert.ok(fileIndex >= 0, 'File should be found');
  });
});
