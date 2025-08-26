/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export interface CompanyInfo {
	name: string;
	industry: string;
}

export class CeoWebview {
    public static readonly viewType = 'ceoWebview';
    private _panel: vscode.WebviewPanel;
    private _extensionUri: vscode.Uri;

    public get panel(): vscode.WebviewPanel {
        return this._panel;
    }

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;

        this._panel = vscode.window.createWebviewPanel(
            CeoWebview.viewType,
            'CEO View',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this._extensionUri]
            }
        );

        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
        this._setWebviewMessageListener(this._panel.webview);
    }

    public dispose() {
        this._panel.dispose();
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'ceoWebview.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'ceoWebview.css'));

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>CEO View</title>
            </head>
            <body>
                <h1>Company Information</h1>
                <div id="company-info-display"></div>
                <div id="company-info-edit-controls">
                    <input type="text" id="company-name-input" placeholder="Company Name">
                    <input type="text" id="industry-input" placeholder="Industry">
                    <button id="edit-company-info-btn">Edit</button>
                    <button id="save-company-info-btn" style="display:none;">Save</button>
                </div>

                <h1>TNE-CONTEXT Reports</h1>
                <div id="report-checklist-container"></div>

                <h1>CEO Input</h1>
                <textarea id="ceo-input" rows="6" placeholder="Type a message for Compass…"></textarea>
                <div id="ceo-controls">
                    <input type="checkbox" id="ceo-new-task-toggle" checked>
                    <label for="ceo-new-task-toggle">Start new task</label>
                    <button id="send-to-compass-btn">Send to Compass</button>
                </div>

                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showInformationMessage(message.text);
                        return;
                }
            },
            undefined,
            [this._panel.onDidDispose(() => this.dispose())]
        );
    }
}