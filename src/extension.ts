// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from 'node:child_process';
import * as path from 'node:path';
import { HexEditorProvider } from './hexEditorProvider';
import { HexDiffPanel } from './hexDiffPanel';

async function getGitOriginal(uri: vscode.Uri): Promise<Uint8Array | null> {
	return new Promise((resolve) => {
		const cwd = path.dirname(uri.fsPath);
		const file = path.basename(uri.fsPath);
		cp.execFile('git', ['ls-files', '--full-name', file], { cwd }, (err: any, stdout: any) => {
			if (err) { resolve(null); return; }
			const relPath = stdout.trim();
			if (!relPath) { resolve(null); return; }
			
			// Try to get HEAD version
			cp.execFile('git', ['show', `HEAD:${relPath}`], { cwd, encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 }, (err2: any, stdout2: any) => {
				if (err2) { resolve(null); return; }
				resolve(new Uint8Array(stdout2));
			});
		});
	});
}

export function activate(context: vscode.ExtensionContext) {
	const disposableCommand = vscode.commands.registerCommand('hexdiff.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from HexDiff!');
	});

	const compareCommand = vscode.commands.registerCommand('hexdiff.compareSelected', async (clickedUri: vscode.Uri, selectedUris: vscode.Uri[]) => {
		if (!selectedUris || selectedUris.length !== 2) {
			vscode.window.showErrorMessage('Please select exactly two files to compare.');
			return;
		}
		const uri1 = selectedUris[0];
		const uri2 = selectedUris[1];
		
		HexDiffPanel.createOrShow(context.extensionUri, uri1, uri2);
	});

	const compareGitCommand = vscode.commands.registerCommand('hexdiff.compareWithGit', async (uri: vscode.Uri) => {
		if (!uri || uri.scheme !== 'file') {
			vscode.window.showErrorMessage('Please select a local file to compare.');
			return;
		}
		
		const originalData = await getGitOriginal(uri);
		if (!originalData) {
			vscode.window.showErrorMessage('Could not find original Git version. Is the file tracked by Git?');
			return;
		}

		HexDiffPanel.createOrShowWithData(
			context.extensionUri,
			vscode.Uri.parse(`git:HEAD:${path.basename(uri.fsPath)}`),
			uri,
			originalData,
			null // will be loaded dynamically in HexDiffPanel
		);
	});
	context.subscriptions.push(compareCommand);
	context.subscriptions.push(compareGitCommand);
	context.subscriptions.push(HexEditorProvider.register(context));
}

// This method is called when your extension is deactivated
export function deactivate() {}
