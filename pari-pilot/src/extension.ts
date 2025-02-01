// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import ollama from 'ollama'; 

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const panel = vscode.window.createWebviewPanel(
		'deepchat',
		'Deep Seek Chat',
		vscode.ViewColumn.One, 
		{ enableScripts: true}
	)

	panel.webview.html = getWebviewContent()

	panel.webview.onDidReceiveMessage(async (message: any) => {
		if(message.command == 'chat'){
			const userPrompt = message.test
			let responseText = ''

			try {
				const streamResponse = await ollama.chat({
					model: 'deepseek-r1:1.5b', 
					messages: [{ role: 'user', content: userPrompt}],
					stream: true
				})

				for await (const part of streamResponse){
					responseText += part.message.content
					panel.webview.postMessage({ command: 'chatResponse', text: responseText})
				}

			} catch (err){
				panel.webview.postMessage({ command: 'chatResponse', test: `Error: ${String(err)}` });
			}
		}
	})
}

function getWebviewContent(): string{
	return `
	<!DOCTYPE html>
	<html lang="en">
	<head>
	<meta charset="UTF-8" />
	<style>
		body {
			font-family: sans-serif;
			margin: 1rem;
		}
		
		#prompt {
			width: 100%;
			box-sizing: border-box;
		
		}

		#response {
			border: 1px solid #ccc;
			margin-top: 1rem;
			padding: 0.5rem;
		}
	</style>
	</head>
	<body>
		<h2> Pari Pilot</h2>
		<textarea id ="prompt" rows="3 placeholder="Ask something..."></textarea><br/>
		<button id = "askBtn">Ask</button>
		<div id="response"></div>	
	
	
	<script> 
		const vscode = acquireVsCodeApi();

		document.getElementById('askBtn).addEventListener('click', () => {
			const text = document.getElementById('prompt').value;
			vscode.postMessage({ command: 'chat', test});
		});

		window.addEventListerner('message', event => {
			const { command, test } = event.data;
			if (command === 'chatResponse') {
				document.getElementById('response').innerText = test;
			}
		});	

	</script>

	</body>
	</html>

	`
}


// This method is called when your extension is deactivated
export function deactivate() {}


