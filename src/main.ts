import { Plugin, TAbstractFile, TFile } from 'obsidian';
import { MoveWithFolderAliasModal } from './modal'; // Assuming the modal code is in modal.ts

export default class FolderAliasPlugin extends Plugin {
	async onload() {

		// override tab header and file explorer context menu item
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file, source) => {
				if (source !== 'tab-header' && source !== 'file-explorer-context-menu') return;

				if (file instanceof TAbstractFile) {
					const type = (file instanceof TFile) ? "file" : "folder"
					menu.addItem((item) => {
						item
							.setTitle(`Move ${type} to...`)
							.setIcon("folder-tree")
							.onClick(() => {
								new MoveWithFolderAliasModal(
									this.app,
									file,
									`Move ${type} to...`
								).open();
							});

						// Defer DOM replacement until Obsidian builds the native menu
						window.setTimeout(() => {
							const menuEl = document.querySelector('.menu');
							if (!menuEl) return;
							const itemDom = (item as any).dom as HTMLElement

							const items = Array.from(menuEl.querySelectorAll('.menu-item'));

							// Locate native "Move file to..." item
							const nativeItem = items.find(el => {
								const title = el.querySelector('.menu-item-title')?.textContent;
								return title === `Move ${type} to...` && el !== itemDom;
							});

							if (nativeItem) {
								// Insert your modal launcher right before/after the native one
								nativeItem.insertAdjacentElement('afterend', itemDom);
								// Hide native one so yours replaces it visually
								(nativeItem as HTMLElement).style.display = 'none';
							}
						}, 0);
					});

				}
			})
		);

		this.addCommand({
			id: 'move-file-to-folder-alias',
			name: 'Move file to...',
			// Simple check: Only run if there is an active file to move
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					if (!checking) {
						new MoveWithFolderAliasModal(
							this.app,
							activeFile,
							"Move file to..."
						).open();
					}
					return true;
				}
				return false;
			},
			// Maps standard hotkeys out of the box
			hotkeys: [
				{
					modifiers: ["Mod"], // "Mod" automatically defaults to Ctrl on Linux/Windows and Cmd on Mac
					key: "m"
				}
			]
		});
	}
}
