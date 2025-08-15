/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Compass Workbench Contribution (register view container + view)

import * as nls from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { Extensions as ViewExtensions, IViewContainersRegistry, IViewsRegistry, ViewContainerLocation } from '../../../common/views.js';
import { CompassViewPane } from './compassViewPane.js';

// Container: Activity Bar (Sidebar)
export const COMPASS_VIEW_CONTAINER_ID = 'workbench.view.compass';

const VIEW_CONTAINER = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: COMPASS_VIEW_CONTAINER_ID,
	title: nls.localize2('compass', "Compass"),
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [COMPASS_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
	hideIfEmpty: false,
	order: 0
}, ViewContainerLocation.Sidebar, { doNotRegisterOpenCommand: true });

// View: CompassViewPane
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: CompassViewPane.ID,
	name: nls.localize2('compassViewName', "Compass"),
	ctorDescriptor: new SyncDescriptor(CompassViewPane),
	canMoveView: true,
	canToggleVisibility: true
}], VIEW_CONTAINER);