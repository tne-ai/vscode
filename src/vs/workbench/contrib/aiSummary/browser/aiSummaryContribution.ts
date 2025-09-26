/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize, ILocalizedString } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { Extensions, IViewContainersRegistry, IViewsRegistry, ViewContainer, ViewContainerLocation } from '../../../common/views.js';
import { AiSummaryView } from './aiSummaryView.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';

const AI_SUMMARY_VIEW_ID = 'workbench.view.aiSummary';
const AI_SUMMARY_VIEW_TITLE: ILocalizedString = {
	value: localize({ key: 'aiSummary', comment: ['AI Summary view name'] }, "AI Summary"),
	original: "AI Summary"
};

const aiSummaryViewIcon = registerIcon('ai-summary-view-icon', Codicon.lightbulb, localize('aiSummaryViewIcon', 'Icon for the AI Summary view.'));

export class AiSummaryContribution {
	constructor() {
		this.registerView();
	}

	private registerView(): void {
		const viewContainerRegistry = Registry.as<IViewContainersRegistry>(Extensions.ViewContainersRegistry);
		const viewContainer: ViewContainer = viewContainerRegistry.registerViewContainer({
			id: AI_SUMMARY_VIEW_ID,
			title: AI_SUMMARY_VIEW_TITLE,
			icon: aiSummaryViewIcon,
			ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [AI_SUMMARY_VIEW_ID, { mergeViewWithContainerWhenSingleView: true }]),
			storageId: AI_SUMMARY_VIEW_ID,
			hideIfEmpty: true,
			order: 0 // Set order to 0 to make it the first view in the activity bar
		}, ViewContainerLocation.Sidebar);

		const viewsRegistry = Registry.as<IViewsRegistry>(Extensions.ViewsRegistry);
		viewsRegistry.registerViews([{
			id: AI_SUMMARY_VIEW_ID,
			name: AI_SUMMARY_VIEW_TITLE,
			ctorDescriptor: new SyncDescriptor(AiSummaryView),
			canToggleVisibility: true,
			canMoveView: true,
			containerIcon: aiSummaryViewIcon,
		}], viewContainer);

	}
}

// Instantiate the contribution to register the view
new AiSummaryContribution();