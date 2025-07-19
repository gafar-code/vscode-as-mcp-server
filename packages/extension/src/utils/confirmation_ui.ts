import * as vscode from 'vscode';
import { StatusBarManager } from './StatusBarManager';

/**
 * 設定に基づいて確認UIを表示するユーティリティクラス
 */
export class ConfirmationUI {
  // StatusBarManagerのシングルトンインスタンス
  private static statusBarManager: StatusBarManager | null = null;

  /**
   * StatusBarManagerのインスタンスを取得または初期化します
   */
  private static getStatusBarManager(): StatusBarManager {
    if (!this.statusBarManager) {
      this.statusBarManager = new StatusBarManager();
    }
    return this.statusBarManager;
  }

  /**
   * 設定に基づいてコマンド実行前の確認UIを表示します
   * @param message 確認メッセージ
   * @param detail 追加の詳細情報（コマンドなど）
   * @param approveLabel 承認ボタンのラベル
   * @param denyLabel 拒否ボタンのラベル
   * @returns 承認された場合は "Approve"、拒否された場合は "Deny" または理由テキスト
   */
  static async confirm(message: string, detail: string, approveLabel: string, denyLabel: string): Promise<string> {
    // 設定から確認UI方法を取得
    const config = vscode.workspace.getConfiguration('mcpServer');
    const confirmationUI = config.get<string>('confirmationUI', 'quickPick');

    console.log(`[ConfirmationUI] Using ${confirmationUI} UI for confirmation`);

    if (confirmationUI === 'quickPick') {
      return await this.showQuickPickConfirmation(message, detail, approveLabel, denyLabel);
    } else {
      return await this.showStatusBarConfirmation(message, detail, approveLabel, denyLabel);
    }
  }

  /**
   * QuickPickを使用した確認UIを表示します
   */
  private static async showQuickPickConfirmation(
    message: string, 
    detail: string, 
    approveLabel: string,
    denyLabel: string
  ): Promise<string> {
    // QuickPickを作成
    const quickPick = vscode.window.createQuickPick();

    quickPick.title = message;
    quickPick.placeholder = detail || '';

    quickPick.items = [
      { label: `$(check) Approve`, description: approveLabel },
      { label: `$(x) Deny`, description: denyLabel }
    ];
    quickPick.canSelectMany = false;
    quickPick.ignoreFocusOut = true;

    return new Promise<string>(async (resolve) => {
      quickPick.onDidAccept(async () => {
        const selection = quickPick.selectedItems[0];
        quickPick.hide();

        if (selection.label.includes("Approve")) {
          resolve("Approve");
        } else {
          // Show QuickInput for feedback if denied
          const inputBox = vscode.window.createInputBox();
          inputBox.title = "Feedback";
          inputBox.placeholder = "Add context for the agent (optional)";

          inputBox.onDidAccept(() => {
            const feedback = inputBox.value.trim();
            inputBox.hide();
            resolve(feedback || "Deny");
          });

          inputBox.onDidHide(() => {
            if (inputBox.value.trim() === "") {
              resolve("Deny");
            }
          });

          inputBox.show();
        }
      });

      quickPick.onDidHide(() => {
        // Handle dismissal of the QuickPick
        if (!quickPick.selectedItems || quickPick.selectedItems.length === 0) {
          resolve("Deny");
        }
      });

      quickPick.show();
    });
  }

  /**
   * ステータスバーを使用した確認UIを表示します
   */
  private static async showStatusBarConfirmation(
    message: string, 
    detail: string, 
    approveLabel: string,
    denyLabel: string
  ): Promise<string> {
    // メッセージを表示
    vscode.window.showInformationMessage(`${message} ${detail ? `- ${detail}` : ''}`);

    // StatusBarManagerのインスタンスを取得
    try {
      const statusBarManager = this.getStatusBarManager();

      // StatusBarManagerを使用してユーザーの選択を待機
      console.log('[ConfirmationUI] Using StatusBarManager for confirmation');
      const approved = await statusBarManager.ask(approveLabel, denyLabel);
      statusBarManager.hide();

      // 承認された場合は "Approve" を返す
      if (approved) {
        return "Approve";
      }

      // 拒否された場合は追加のフィードバックを収集
      const inputBox = vscode.window.createInputBox();
      inputBox.title = "Feedback";
      inputBox.placeholder = "Add context for the agent (optional)";

      return new Promise<string>((resolve) => {
        inputBox.onDidAccept(() => {
          const feedback = inputBox.value.trim();
          inputBox.hide();
          resolve(feedback || "Deny");
        });

        inputBox.onDidHide(() => {
          if (inputBox.value.trim() === "") {
            resolve("Deny");
          }
        });

        inputBox.show();
      });
    } catch (error) {
      console.error('Error using StatusBarManager:', error);
      // エラーが発生した場合はQuickPickにフォールバック
      console.log('[ConfirmationUI] Falling back to QuickPick confirmation');
      return await this.showQuickPickConfirmation(message, detail, approveLabel, denyLabel);
    }
  }
}
