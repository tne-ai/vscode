/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IAccessibleViewInformationService } from '../../../services/accessibility/common/accessibleViewInformationService.js';
import * as dom from '../../../../base/browser/dom.js';
import { ViewPane, IViewPaneOptions } from '../../../browser/parts/views/viewPane.js';
import { ICompassService } from '../../../services/compass/common/compass.js';

export class CompassViewPane extends ViewPane {
	public static readonly ID = 'workbench.view.compass.chat';

	private root!: HTMLElement;
	private input!: HTMLInputElement;
	private sendButton!: HTMLButtonElement;

	constructor(
		options: IViewPaneOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
		@IAccessibleViewInformationService accessibleViewInformationService: IAccessibleViewInformationService | undefined,
		@ICompassService private readonly compassService: ICompassService
	) {
		super(
			options,
			keybindingService,
			contextMenuService,
			configurationService,
			contextKeyService,
			viewDescriptorService,
			instantiationService,
			openerService,
			themeService,
			hoverService,
			accessibleViewInformationService
		);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this.root = dom.append(container, dom.$('.compass-view'));
		const header = dom.append(this.root, dom.$('.compass-header'));
		header.textContent = 'Compass';

		const controls = dom.append(this.root, dom.$('.compass-controls'));
		this.input = dom.append(controls, dom.$('input.compass-input')) as HTMLInputElement;
		this.input.placeholder = 'Ask Compass…';

		this.sendButton = dom.append(controls, dom.$('button.compass-send')) as HTMLButtonElement;
		this.sendButton.textContent = 'Start Task';

		this._register(dom.addDisposableListener(this.sendButton, 'click', async () => {
			const text = (this.input.value || '').trim();
			if (!text) {
				this.input.focus();
				return;
			}
			await this.compassService.sendMessage(text, { newTask: true });
			this.input.value = '';
			this.input.focus();
		}));

		// Basic styling
		container.classList.add('compass-view-container');
		this.applyStyles();
	}

	protected override layoutBody(height: number, width: number): void {
		if (this.root) {
			this.root.style.height = `${height}px`;
			this.root.style.width = `${width}px`;
		}
	}

	private applyStyles(): void {
		if (!this.root) {
			return;
		}
		this.root.style.display = 'flex';
		this.root.style.flexDirection = 'column';
		this.root.style.gap = '8px';
		this.root.style.padding = '8px';

		const header = this.root.querySelector('.compass-header') as HTMLElement | null;
		if (header) {
			header.style.fontWeight = '600';
		}

		const controls = this.root.querySelector('.compass-controls') as HTMLElement | null;
		if (controls) {
			controls.style.display = 'flex';
			controls.style.gap = '8px';
			controls.style.alignItems = 'center';
		}

		if (this.input) {
			this.input.style.flex = '1';
		}
	}
}