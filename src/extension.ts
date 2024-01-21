import * as vscode from 'vscode';
import fs from 'fs';
import path from 'path';
import hslToHex from 'hsl-to-hex';
import { STYLE_SETTINGS } from './env';

export function activate(context: vscode.ExtensionContext) {
	console.log('[css-autotokens] Initialising...');
	let state: 'idle' | 'loading' | 'ready' = 'idle';
	let tokens: Record<string, string> = {};

	const loadTokens = async () => {
		if (!vscode.window.activeTextEditor) { return; }
		state = 'loading';
		console.log('[css-autotokens] Loading Tokens...');

		const cssFileRef = findCssReferenceFile();

		if (!cssFileRef) {
			console.log('[css-autotokens] Could not find reference file.');
			state = 'idle';
			return;
		}

		console.log(`[css-autotokens] Found reference file: ${cssFileRef}`);
		const file = fs.readFileSync(cssFileRef, 'utf8');
		const regex = new RegExp(`${STYLE_SETTINGS.tokenPrefix}.+}`, 'gm');
		const rawTokens = file.match(regex);
		tokens = Object.fromEntries(
			rawTokens?.map((x) => {
				const tokenSplit = [
					x.substring(0, x.indexOf(' ')),
					x.substring(x.indexOf(' ')),
				];

				return [
					tokenSplit[0].replace(STYLE_SETTINGS.tokenPrefix, STYLE_SETTINGS.tokenPrefix.replace('--', '')).replace(':', '').trim(),
					tokenSplit[1].trim(),
				];
			}) || []
		);

		console.log(`[css-autotokens] Ready. (${rawTokens?.length} tokens loaded)`);
		state = 'ready';
	};

	const findCssReferenceFile = () => {
		if (!vscode.window.activeTextEditor) {
			return undefined;
		}

		let currentDir = path.dirname(vscode.window.activeTextEditor.document.fileName);

		try {
			while (currentDir !== '/') {
				const files = fs.readdirSync(currentDir);
				if (files.includes('package.json')) {
					const containsPackage = fs.readFileSync(path.join(currentDir, 'package.json'), 'utf8').includes(STYLE_SETTINGS.packageName);
					if (containsPackage) { return `${currentDir}/node_modules/${STYLE_SETTINGS.packageName}/${STYLE_SETTINGS.packageCssReference}`; }
				}
				currentDir = path.resolve(currentDir, '../');
			}
	
			return undefined;
		} catch {
			return undefined;
		}
	};

	const provideTokenAutocompletion = vscode.languages.registerCompletionItemProvider(
		{
			pattern: '**/*.{css,scss,less}',
		},
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				if (state === 'loading' || !vscode.workspace) { 
					return undefined;
				}
				else if (state === 'idle') { 
					loadTokens();
					return undefined;
				}

				const linePrefix = document.lineAt(position).text.slice(0, position.character);
				const regex = new RegExp(`${STYLE_SETTINGS.tokenPrefix}.*}`, 'gm');
				const isPrefixed = linePrefix.match(regex)?.toString();

				if (!isPrefixed) {
					return undefined;
				}

				return Object.entries(tokens)
					.filter(([token]) => token.startsWith(isPrefixed))
					.map(([token, value]) => {
						const item = new vscode.CompletionItem(token, vscode.CompletionItemKind.Variable);

						if (value.startsWith('hsl')) {
							const valueCleaned = value.trim().replace('hsl(', '').replace(');', '');

							const hslSplit = (valueCleaned.includes('\\')
													? [...valueCleaned.split('\\')[0].split(' ')]
													: [...valueCleaned.split(' ')])
												.map((x) => parseFloat(x));

							item.kind = vscode.CompletionItemKind.Color;
							item.detail = hslToHex(hslSplit[0], hslSplit[1], hslSplit[2]);
							item.range = new vscode.Range(new vscode.Position(position.line, position.character - isPrefixed.length), position);
						} else {
							item.detail = value.replace(';', '').trim();
						}

						return item;
					}
				);
			}
		},
		'-'
	);

	context.subscriptions.push(provideTokenAutocompletion);
}

// This method is called when your extension is deactivated
export function deactivate() {}
