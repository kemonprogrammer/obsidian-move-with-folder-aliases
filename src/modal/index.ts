/**
 * Base generated with Gemini, adjusted manually
 */

import { App, FuzzySuggestModal, TFile, TFolder, FuzzyMatch, renderResults, setIcon } from 'obsidian';


interface FolderWithAliases {
    folder: TFolder;
    displayName: string; // The text shown in the search bar
    searchString: string; // A combined string of path + aliases for the fuzzy match
}


export class MoveWithFolderAliasModal extends FuzzySuggestModal<FolderWithAliases> {
    private fileToMove: TFile;

    constructor(app: App, fileToMove: TFile) {
        super(app);
        this.fileToMove = fileToMove;
        this.setPlaceholder("Move file to folder or alias...");
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
				for (const alias of aliases){
					items.push({
						folder: folder,
						displayName: alias,
						searchString: alias,
					});
				}
            } 
			items.push({
				folder: folder,
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

	// 3. Render the clean display name in the UI, highlighting matches
	renderSuggestion(match: FuzzyMatch<FolderWithAliases>, el: HTMLElement) {
		el.classList.add("mod-complex")
		const containerEl = el.createDiv('suggestion-content')

		const titleEl = containerEl.createDiv('suggestion-title');
		renderResults(titleEl, match.item.displayName, match.match);
		
		const usesAlias = match.item.folder.path !== match.item.displayName;
		if (usesAlias) {
			containerEl.createEl('div',  {
				cls: 'suggestion-note',
				text: match.item.folder.path,
			});
		}

		const iconContainerEl = el.createDiv('suggestion-aux')
		const iconEl = iconContainerEl.createDiv('suggestion-flair')
		if (usesAlias){
			setIcon(iconEl, 'forward')
		}
	}

    // 4. Perform the file move once an item is picked
    async onChooseItem(item: FolderWithAliases, evt: MouseEvent | KeyboardEvent) {
        const newPath = item.folder.path === '/' 
            ? this.fileToMove.name 
            : `${item.folder.path}/${this.fileToMove.name}`;
            
        try {
            await this.app.vault.rename(this.fileToMove, newPath);
        } catch (error) {
            console.error("Failed to move file:", error);
        }
    }
}
