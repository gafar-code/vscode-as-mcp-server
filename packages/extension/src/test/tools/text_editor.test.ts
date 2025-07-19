import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { textEditorTool } from '../../tools/text_editor';

suite('Text Editor Tool Test Suite', () => {
  const tmpDir = path.join(__dirname, '../../test-tmp');

  suiteSetup(async () => {
    // テスト用ディレクトリ構造を作成
    const uri = vscode.Uri.file(tmpDir);
    await vscode.workspace.fs.createDirectory(uri);

    // テストファイルを作成
    const testFile = vscode.Uri.file(path.join(tmpDir, 'test.txt'));
    const content = Buffer.from('line1\nline2\nline3\n', 'utf-8');
    await vscode.workspace.fs.writeFile(testFile, content);
  });

  suiteTeardown(async () => {
    // テスト用ディレクトリを削除
    const uri = vscode.Uri.file(tmpDir);
    await vscode.workspace.fs.delete(uri, { recursive: true });
  });

  test('View file content', async () => {
    const result = await textEditorTool({
      command: 'view',
      path: path.join(tmpDir, 'test.txt'),
    });

    assert.strictEqual(result.isError, false, 'Expected success');
    assert.strictEqual(result.content[0].text, 'line1\nline2\nline3\n', 'Content should match');
  });

  test('View file with range', async () => {
    const result = await textEditorTool({
      command: 'view',
      path: path.join(tmpDir, 'test.txt'),
      view_range: [2, 3], // line2 to line3
    });

    assert.strictEqual(result.isError, false, 'Expected success');
    assert.strictEqual(result.content[0].text, 'line2\nline3\n', 'Content should match range');
  });

  test('Create file in new directory', async () => {
    const newFilePath = path.join(tmpDir, 'subdir', 'new.txt');
    const result = await textEditorTool({
      command: 'create',
      path: newFilePath,
      file_text: 'new content',
      skip_dialog: true, // テスト時は承認ダイアログをスキップ
    });

    assert.strictEqual(result.isError, false, 'Expected success');

    // ファイルが作成されたことを確認
    const uri = vscode.Uri.file(newFilePath);
    const content = await vscode.workspace.fs.readFile(uri);
    assert.strictEqual(Buffer.from(content).toString('utf-8'), 'new content', 'File content should match');
  });

  test('Replace text in file', async () => {
    const testFile = path.join(tmpDir, 'replace.txt');

    // テストファイルを作成
    const uri = vscode.Uri.file(testFile);
    const content = Buffer.from('old text here\n', 'utf-8');
    await vscode.workspace.fs.writeFile(uri, content);

    const result = await textEditorTool({
      command: 'str_replace',
      path: testFile,
      old_str: 'old text',
      new_str: 'new text',
      skip_dialog: true, // テスト時は承認ダイアログをスキップ
    });

    assert.strictEqual(result.isError, false, 'Expected success');

    // 変更が適用されたことを確認
    const newContent = await vscode.workspace.fs.readFile(uri);
    assert.strictEqual(Buffer.from(newContent).toString('utf-8'), 'new text here\n', 'Content should be replaced');
  });

  test('Insert text in file', async () => {
    const testFile = path.join(tmpDir, 'insert.txt');

    // テストファイルを作成
    const uri = vscode.Uri.file(testFile);
    const content = Buffer.from('line1\nline3\n', 'utf-8');
    await vscode.workspace.fs.writeFile(uri, content);

    const result = await textEditorTool({
      command: 'insert',
      path: testFile,
      insert_line: 1,
      new_str: 'line2',
      skip_dialog: true, // テスト時は承認ダイアログをスキップ
    });

    assert.strictEqual(result.isError, false, 'Expected success');

    // 変更が適用されたことを確認
    const newContent = await vscode.workspace.fs.readFile(uri);
    assert.strictEqual(Buffer.from(newContent).toString('utf-8'), 'line1\nline2\nline3\n', 'Content should be inserted');
  });

  test('Handle non-existent file', async () => {
    const result = await textEditorTool({
      command: 'view',
      path: path.join(tmpDir, 'non-existent.txt'),
    });

    assert.strictEqual(result.isError, true, 'Expected error');
    assert.match(result.content[0].text, /File does not exist/, 'Should show error message');
  });

  test('Handle relative paths', async () => {
    // ワークスペースルートからの相対パスをテスト
    const result = await textEditorTool({
      command: 'view',
      path: 'test.txt', // 相対パス
    });

    assert.strictEqual(result.isError, true, 'Expected error for invalid relative path');
    assert.match(result.content[0].text, /File does not exist/, 'Should show error message');
  });
});
