/**
 * Base generated with Gemini, adjusted manually
 */

import { App, FuzzySuggestModal, TFile, TFolder, FuzzyMatch, renderResults, setIcon, normalizePath, TAbstractFile } from 'obsidian';


interface FolderWithAliases {
	folderPath: string;
	displayName: string; // The text shown in the search bar
	searchString: string; // A combined string of path + aliases for the fuzzy match
	isCreateNew?: boolean;
}


export class MoveWithFolderAliasModal extends FuzzySuggestModal<FolderWithAliases> {
	private fileToMove: TAbstractFile;

	constructor(app: App, fileToMove: TAbstractFile, placeholder: string) {
		super(app);
		this.fileToMove = fileToMove;
		this.setPlaceholder(placeholder);
		this.setInstructions([
			{ command: "↑↓", purpose: "to navigate" },
			{ command: "↵ ", purpose: "to move" },
			{ command: "shift ↵ ", purpose: "to create" },
			{ command: "esc", purpose: "to dismiss" },
		])
		this.emptyStateText = "No existing folders found."

		// Register SHIFT+ENTER shortcut
		this.scope.register(['Shift'], 'Enter', async (evt: KeyboardEvent) => {
			evt.preventDefault();
			const query = this.inputEl.value.trim();
			if (query) {
				await this.createFolderAndMove(query);
				this.close();
			}
		});
	}

	// 1. Gather all folders and resolve their aliases
	getItems(): FolderWithAliases[] {
		const abstractFiles = this.app.vault.getAllLoadedFiles();
		const folders = abstractFiles.filter((f): f is TFolder => f instanceof TFolder);

		const items: FolderWithAliases[] = [];

		for (const folder of folders) {
			// Target path structure: e.g., "Diet/Diet.md"
			// If it's the root folder, folder.path is "/" and folder.name is ""
			const folderNotePath = folder.path === '/'
				? 'main.md' // Fallback for root if you use one
				: `${folder.path}/${folder.name}.md`;

			const folderNote = this.app.vault.getAbstractFileByPath(folderNotePath);
			let aliases: string[] = [];

			if (folderNote instanceof TFile) {
				// Read from Obsidian's metadata cache (lightning fast, no disk IO)
				const cache = this.app.metadataCache.getFileCache(folderNote);
				if (cache?.frontmatter?.aliases) {
					const rawAliases = cache.frontmatter.aliases;
					if (Array.isArray(rawAliases)) {
						aliases = rawAliases.map(a => String(a));
					} else if (typeof rawAliases === 'string') {
						aliases = rawAliases.split(',').map(a => a.trim());
					}
				}
			}
			// Map out how it appears and how it's searched
			if (aliases.length > 0) {
				for (const alias of aliases) {
					items.push({
						folderPath: folder.path,
						displayName: alias,
						searchString: alias,
					});
				}
			}
			items.push({
				folderPath: folder.path,
				displayName: folder.path,
				searchString: folder.path
			});

		}


		return items;
	}

	// 2. Tell the modal what text to actually run the fuzzy search against
	getItemText(item: FolderWithAliases): string {
		return item.searchString;
	}

	// 3. Inject synthetic suggestion when query has no fuzzy matches
	getSuggestions(query: string): FuzzyMatch<FolderWithAliases>[] {
		const results = super.getSuggestions(query);

		if (results.length === 0 && query.trim() !== '') {
			const cleanQuery = query.trim();
			return [
				{
					item: {
						folderPath: '/',
						displayName: cleanQuery,
						searchString: cleanQuery,
						isCreateNew: true,
					},
					match: {
						score: 0,
						matches: []
					}
				}
			];
		}

		return results;
	}

	// 3. Render the clean display name in the UI, highlighting matches
	renderSuggestion(match: FuzzyMatch<FolderWithAliases>, el: HTMLElement) {
		el.classList.add("mod-complex")
		const containerEl = el.createDiv('suggestion-content')

		// Render synthetic "Create new folder" suggestion
		if (match.item.isCreateNew) {
			const titleEl = containerEl.createDiv('suggestion-title');
			titleEl.setText(match.item.displayName);

			const auxEl = el.createDiv('suggestion-aux');
			const hotkeyEl = auxEl.createDiv('suggestion-hotkey');
			hotkeyEl.setText('Enter to create')
			return;
		}

		const titleEl = containerEl.createDiv('suggestion-title');
		renderResults(titleEl, match.item.displayName, match.match);

		const usesAlias = match.item.folderPath !== match.item.displayName;
		if (usesAlias) {
			containerEl.createEl('div', {
				cls: 'suggestion-note',
				text: match.item.folderPath,
			});
		}

		const iconContainerEl = el.createDiv('suggestion-aux')
		const iconEl = iconContainerEl.createDiv('suggestion-flair')
		if (usesAlias) {
			setIcon(iconEl, 'forward')
		}
	}

	// 5. Item selection handler
	onChooseItem(item: FolderWithAliases, evt: MouseEvent | KeyboardEvent) {
		if (item.isCreateNew) {
			this.createFolderAndMove(item.searchString);
			return;
		}

		if (!item.folderPath) return;

		const newPath = item.folderPath === '/'
			? this.fileToMove.name
			: `${item.folderPath}/${this.fileToMove.name}`;

		try {
			this.app.vault.rename(this.fileToMove, newPath);
		} catch (error) {
			console.error("Failed to move file:", error);
		}
	}

	// Helper method to safely create folder paths recursively and move file
	private async createFolderAndMove(folderPath: string) {
		const targetFolder = await this.getOrCreateFolder(folderPath);
		if (targetFolder) {
			const newPath = targetFolder.path === '/'
				? this.fileToMove.name
				: `${targetFolder.path}/${this.fileToMove.name}`;
			try {
				await this.app.vault.rename(this.fileToMove, newPath);
			} catch (error) {
				console.error("Failed to move file to new folder:", error);
			}
		}
	}

	private async getOrCreateFolder(path: string): Promise<TFolder> {
		const normalizedPath = normalizePath(path);
		const existing = this.app.vault.getAbstractFileByPath(normalizedPath);

		if (existing instanceof TFolder) {
			return existing;
		}

		// Ensure subdirectories are created sequentially if path is nested (e.g. "Foo/Bar/Baz")
		const parts = normalizedPath.split('/').filter(Boolean);
		let currentPath = '';
		let folder: TFolder | null = null;

		for (const part of parts) {
			currentPath = currentPath ? `${currentPath}/${part}` : part;
			let target = this.app.vault.getAbstractFileByPath(currentPath);
			if (!target) {
				target = await this.app.vault.createFolder(currentPath);
			}
			if (target instanceof TFolder) {
				folder = target;
			}
		}

		return folder!;
	}
}
