import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import * as vscode from 'vscode';

export class SSEServerTransport implements Transport {
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: JSONRPCMessage) => void;

    constructor(
        private readonly res: express.Response,
        private readonly outputChannel: vscode.OutputChannel
    ) {
        this.setupSSE();
    }

    private setupSSE() {
        this.res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });

        // Handle client disconnection
        this.res.on('close', () => {
            this.outputChannel.appendLine('SSE connection closed by client');
            this.onclose?.();
        });
    }

    async start() {
        // SSE connection is established in constructor
        this.outputChannel.appendLine('SSE transport started');
    }

    async send(message: JSONRPCMessage) {
        try {
            this.outputChannel.appendLine('Sending message: ' + JSON.stringify(message));
            this.res.write(`data: ${JSON.stringify(message)}\n\n`);
        } catch (err) {
            this.outputChannel.appendLine('Error sending message: ' + err);
            this.onerror?.(err instanceof Error ? err : new Error(String(err)));
            throw err;
        }
    }

    async handlePostMessage(_req: express.Request, res: express.Response, body: any) {
        this.outputChannel.appendLine('Handling POST message: ' + JSON.stringify(body));
        try {
            if (!this.onmessage) {
                throw new Error('No message handler registered');
            }
            this.onmessage(body);
            res.send('OK');
        } catch (err) {
            this.outputChannel.appendLine('Error handling message: ' + err);
            this.onerror?.(err instanceof Error ? err : new Error(String(err)));
            res.status(500).send('Internal Server Error');
        }
    }

    close(): Promise<void> {
        try {
            // End the SSE stream
            this.res.end();
            this.outputChannel.appendLine('SSE transport closed');
            return Promise.resolve();
        } catch (err) {
            this.outputChannel.appendLine('Error closing SSE transport: ' + err);
            return Promise.reject(err);
        }
    }
}
