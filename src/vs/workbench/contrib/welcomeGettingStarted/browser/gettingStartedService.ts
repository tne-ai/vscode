/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { RawContextKey, ContextKeyExpression } from '../../../../platform/contextkey/common/contextkey.js';
import { LinkedText, parseLinkedText } from '../../../../base/common/linkedText.js';
import { URI } from '../../../../base/common/uri.js';
import { joinPath } from '../../../../base/common/resources.js';
import { FileAccess } from '../../../../base/common/network.js';
import { asWebviewUri } from '../../webview/common/webview.js';
import { ThemeIcon } from '../../../../base/common/themables.js';

/**
 * Minimalized, no-op Walkthroughs service for Compass Welcome page.
 * We keep the token and types to satisfy imports across the workbench while
 * returning empty data and emitting no events.
 */

/**
 * Context Keys
 */
export const HasMultipleNewFileEntries = new RawContextKey<boolean>('hasMultipleNewFileEntries', false);

/**
 * Configuration keys kept for compatibility with existing settings code.
 */
export const hiddenEntriesConfigurationKey = 'workbench.welcomePage.hiddenCategories';

/**
 * Public types used by various modules. Keep minimal shape required by callers.
 */
export interface IResolvedWalkthroughStep {
	id: string;
	title: string;
	description: LinkedText[];
	when?: ContextKeyExpression;
	done?: boolean;
	media?: any;
	order?: number;
}

export interface IResolvedWalkthrough {
	id: string;
	title: string;
	description: string;
	steps: IResolvedWalkthroughStep[];
	next?: string;
	isFeatured?: boolean;
	walkthroughPageTitle?: string;
	icon: { type: 'icon'; icon: ThemeIcon } | { type: 'image'; path: string };
	when?: ContextKeyExpression;
	source?: string;
	newItems?: boolean;
	newEntry?: boolean;
	recencyBonus?: number;
	order?: number;
}

/**
 * Service token and minimal interface
 */
export const IWalkthroughsService = createDecorator<IWalkthroughsService>('walkthroughsService');

export interface IWalkthroughsService {
	readonly _serviceBrand: undefined;
	readonly onDidAddWalkthrough: Event<IResolvedWalkthrough>;
	readonly onDidRemoveWalkthrough: Event<string>;
	readonly onDidChangeWalkthrough: Event<IResolvedWalkthrough>;
	readonly onDidProgressStep: Event<{ category: string; id: string; done: boolean }>;

	getWalkthroughs(): IResolvedWalkthrough[];
	getWalkthrough(id: string): IResolvedWalkthrough;

	progressStep(id: string): void;
	deprogressStep(id: string): void;
	progressByEvent(e: string): void;

	markWalkthroughOpened(id: string): void;
}

/**
 * No-op implementation that satisfies the interface without providing walkthroughs.
 */
export class WalkthroughsService extends Disposable implements IWalkthroughsService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidAddWalkthrough = this._register(new Emitter<IResolvedWalkthrough>());
	readonly onDidAddWalkthrough = this._onDidAddWalkthrough.event;

	private readonly _onDidRemoveWalkthrough = this._register(new Emitter<string>());
	readonly onDidRemoveWalkthrough = this._onDidRemoveWalkthrough.event;

	private readonly _onDidChangeWalkthrough = this._register(new Emitter<IResolvedWalkthrough>());
	readonly onDidChangeWalkthrough = this._onDidChangeWalkthrough.event;

	private readonly _onDidProgressStep = this._register(new Emitter<{ category: string; id: string; done: boolean }>());
	readonly onDidProgressStep = this._onDidProgressStep.event;

	getWalkthroughs(): IResolvedWalkthrough[] { return []; }
	getWalkthrough(_id: string): IResolvedWalkthrough {
		// Return a minimal no-op walkthrough object to satisfy callers that assume existence
		return {
			id: _id,
			title: '',
			description: '',
			steps: [],
			next: undefined,
			isFeatured: false,
			walkthroughPageTitle: '',
			icon: { type: 'icon', icon: ThemeIcon.fromId('symbol-info') },
			when: undefined,
			source: undefined,
			newItems: false,
			newEntry: false,
			recencyBonus: 0,
			order: 0
		};
	}

	progressStep(_id: string): void { /* no-op */ }
	deprogressStep(_id: string): void { /* no-op */ }
	progressByEvent(_e: string): void { /* no-op */ }
	markWalkthroughOpened(_id: string): void { /* no-op */ }
}

/**
 * Helpers kept for compatibility with detail renderers and existing callers.
 */
export const parseDescription = (desc: string): LinkedText[] =>
	desc.split('\n').filter(x => x).map(text => parseLinkedText(text));

export const convertInternalMediaPathToFileURI = (path: string) => path.startsWith('https://')
	? URI.parse(path, true)
	: FileAccess.asFileUri(`vs/workbench/contrib/welcomeGettingStarted/common/media/${path}`);

export const convertInternalMediaPathToBrowserURI = (path: string) => path.startsWith('https://')
	? URI.parse(path, true)
	: FileAccess.asBrowserUri(`vs/workbench/contrib/welcomeGettingStarted/common/media/${path}`);

export const convertInternalMediaPathsToBrowserURIs = (path: string | { hc: string; hcLight?: string; dark: string; light: string }): { hcDark: URI; hcLight: URI; dark: URI; light: URI } => {
	if (typeof path === 'string') {
		const converted = convertInternalMediaPathToBrowserURI(path);
		return { hcDark: converted, hcLight: converted, dark: converted, light: converted };
	} else {
		return {
			hcDark: convertInternalMediaPathToBrowserURI(path.hc),
			hcLight: convertInternalMediaPathToBrowserURI(path.hcLight ?? path.light),
			light: convertInternalMediaPathToBrowserURI(path.light),
			dark: convertInternalMediaPathToBrowserURI(path.dark)
		};
	}
};

export const convertRelativeMediaPathsToWebviewURIs = (basePath: URI, path: string | { hc: string; hcLight?: string; dark: string; light: string }): { hcDark: URI; hcLight: URI; dark: URI; light: URI } => {
	const convertPath = (pathStr: string) => pathStr.startsWith('https://')
		? URI.parse(pathStr, true)
		: asWebviewUri(joinPath(basePath, pathStr));

	if (typeof path === 'string') {
		const converted = convertPath(path);
		return { hcDark: converted, hcLight: converted, dark: converted, light: converted };
	} else {
		return {
			hcDark: convertPath(path.hc),
			hcLight: convertPath(path.hcLight ?? path.light),
			light: convertPath(path.light),
			dark: convertPath(path.dark)
		};
	}
};

/**
 * Register the no-op service with the DI container.
 */
registerSingleton(IWalkthroughsService, WalkthroughsService, InstantiationType.Delayed);
