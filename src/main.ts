import { Plugin, TFolder } from 'obsidian';
import { MoveWithFolderAliasModal } from './modal'; // Assuming the modal code is in modal.ts

export default class FolderAliasPlugin extends Plugin {
	async onload() {
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file, source) => {
				if (file instanceof TFolder) {
					menu.addItem((item) => {
						item
							.setTitle("Move folder to...")
							.setIcon("folder-input")
							.onClick(() => {
								new MoveWithFolderAliasModal(
									this.app,
									file,
									"Move folder to..."
								).open();
							});

						setTimeout(() => {
							const menuEl = document.querySelector('.menu');
							if (!menuEl) return;

							const itemDom = (item as any).dom as HTMLElement

							// Find all menu item titles
							const items = Array.from(menuEl.querySelectorAll('.menu-item'));

							// Find native "Move folder to..." item
							const nativeItem = items.find(el => {
								const title = el.querySelector('.menu-item-title')?.textContent;
								return title === 'Move folder to...' && el !== itemDom;
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
			name: 'Move file via folder note alias',
			// Simple check: Only run if there is an active file to move
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					if (!checking) {
						new MoveWithFolderAliasModal(
							this.app,
							activeFile,
							"Move file to folder or alias..."
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
