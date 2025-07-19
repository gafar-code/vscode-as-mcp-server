import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import * as net from 'net';
import * as vscode from 'vscode';

export class SockTransport implements Transport {
    server?: net.Server;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: JSONRPCMessage) => void;
    conn?: net.Socket;

    constructor(
        readonly port: number,
        private readonly outputChannel: vscode.OutputChannel
    ) { }

    start() {
        this.server = net.createServer((conn) => {
            conn.on('data', async (data) => {
                this.outputChannel.appendLine('Received data: ' + data);
                try {
                    this.onmessage!(JSON.parse(data.toString('utf8')));
                } catch (err) {
                    this.outputChannel.appendLine('Error parsing JSON or calling onmessage: ' + err);
                }
            });
            conn.on('error', (err) => {
                this.outputChannel.appendLine('Socket error: ' + err);
                this.onerror?.(err);
            });
            conn.on('close', () => {
                this.outputChannel.appendLine('Socket closed.');
                this.onclose?.();
            });
            this.conn = conn;
        });

        return new Promise<void>((resolve) => {
            this.server!.listen(this.port, () => {
                this.outputChannel.appendLine(`MCP Server running at :${this.port}`);
                resolve();
            });
        });
    }

    async send(message: JSONRPCMessage) {
        this.outputChannel.appendLine('Sending message: ' + JSON.stringify(message));
        if (!this.conn) {
            this.outputChannel.appendLine('No connection to send message.');
            return;
        }
        return new Promise<void>((resolve, reject) => {
            this.conn!.write(JSON.stringify(message) + '\n', (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    close(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.server?.close(() => {
                resolve();
            });
        });
    }
}
