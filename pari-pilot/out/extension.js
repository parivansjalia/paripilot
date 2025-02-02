"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const ollama_1 = __importDefault(require("ollama"));
function activate(context) {
    // Register the chatbot command
    const chatCommand = vscode.commands.registerCommand('paripilot.start', () => {
        const panel = vscode.window.createWebviewPanel('deepchat', 'Deep Seek Chat', vscode.ViewColumn.One, { enableScripts: true });
        panel.webview.html = getWebviewContent();
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'chat') {
                const userPrompt = message.text;
                let responseText = '';
                try {
                    const streamResponse = await ollama_1.default.chat({
                        model: 'deepseek-r1:1.5b',
                        messages: [{ role: 'user', content: userPrompt }],
                        stream: true
                    });
                    for await (const part of streamResponse) {
                        responseText += part.message.content;
                        panel.webview.postMessage({ command: 'chatResponse', text: responseText });
                    }
                }
                catch (err) {
                    panel.webview.postMessage({ command: 'chatResponse', text: `Error: ${String(err)}` });
                }
            }
        });
    });
    // Register the process comment command
    const processCommentCommand = vscode.commands.registerCommand('paripilot.processSelection', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }
        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showErrorMessage('Please select a comment to process.');
            return;
        }
        const selectedText = editor.document.getText(selection);
        const fileType = editor.document.languageId;
        const userPrompt = `${selectedText}\n\nFile Type: ${fileType}\nJust give the code, nothing else.`;
        try {
            const streamResponse = await ollama_1.default.chat({
                model: 'deepseek-r1:1.5b',
                messages: [{ role: 'user', content: userPrompt }],
                stream: true
            });
            let responseText = '';
            for await (const part of streamResponse) {
                responseText += part.message.content;
            }
            editor.edit(editBuilder => {
                editBuilder.insert(selection.end, `\n\n${responseText}`);
            });
        }
        catch (err) {
            vscode.window.showErrorMessage(`Error: ${String(err)}`);
        }
    });
    // Status bar button for comment processing
    const statusBarButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarButton.text = `$(comment) Process Comment`;
    statusBarButton.command = 'paripilot.processSelection';
    statusBarButton.show();
    // Add everything to subscriptions
    context.subscriptions.push(chatCommand, processCommentCommand, statusBarButton);
}
function getWebviewContent() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Pari Pilot</title>
        <style>
            body {
                font-family: 'Segoe UI', sans-serif;
                margin: 20px;
                background-color: #1e1e1e;
                color: #ffffff;
                text-align: center;
            }
            
            h2 {
                margin-bottom: 10px;
                font-size: 1.5rem;
            }

            #container {
                max-width: 500px;
                margin: 0 auto;
                background: #252526;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3);
            }

            #prompt {
                width: 100%;
                height: 80px;
                box-sizing: border-box;
                padding: 10px;
                font-size: 1rem;
                border: none;
                border-radius: 5px;
                background: #333;
                color: white;
                resize: none;
                outline: none;
            }

            #askBtn {
                margin-top: 10px;
                width: 100%;
                padding: 10px;
                font-size: 1rem;
                border: none;
                border-radius: 5px;
                background: #007acc;
                color: white;
                cursor: pointer;
                transition: 0.2s;
            }

            #askBtn:hover {
                background: #005f99;
            }

            #response {
                margin-top: 15px;
                padding: 10px;
                border-radius: 5px;
                background: #444;
                min-height: 50px;
                text-align: left;
                white-space: pre-wrap;
                font-size: 0.95rem;
            }
        </style>
    </head>
    <body>
        <h2>Pari Pilot</h2>
        <div id="container">
            <textarea id="prompt" placeholder="Ask something..."></textarea>
            <button id="askBtn">Ask</button>
            <div id="response"></div>
        </div>
    
        <script> 
            const vscode = acquireVsCodeApi();

            document.getElementById('askBtn').addEventListener('click', () => {
                const text = document.getElementById('prompt').value;
                vscode.postMessage({ command: 'chat', text });
            });

            window.addEventListener('message', event => {
                const { command, text } = event.data;
                if (command === 'chatResponse') {
                    document.getElementById('response').innerText = text;
                }
            });
        </script>
    </body>
    </html>
    `;
}
// Deactivate function
function deactivate() { }
//# sourceMappingURL=extension.js.map