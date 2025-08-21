/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Compass Workbench Contribution (register view container + view)

import * as nls from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { Extensions as ViewExtensions, IViewContainersRegistry, IViewsRegistry, ViewContainerLocation, IViewDescriptorService, ViewContainer } from '../../../common/views.js';
import { CompassViewPane } from './compassViewPane.js';
import { IWorkbenchLayoutService, Parts } from '../../../services/layout/browser/layoutService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IWorkbenchContribution, WorkbenchPhase, registerWorkbenchContribution2 } from '../../../common/contributions.js';

// Container: Activity Bar (Sidebar)
export const COMPASS_VIEW_CONTAINER_ID = 'workbench.view.compass';

const VIEW_CONTAINER = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: COMPASS_VIEW_CONTAINER_ID,
	title: nls.localize2('compass', "Compass"),
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [COMPASS_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
	hideIfEmpty: false,
	order: 0
}, ViewContainerLocation.AuxiliaryBar, { doNotRegisterOpenCommand: true });

// View: CompassViewPane
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: CompassViewPane.ID,
	name: nls.localize2('compassViewName', "Compass"),
	ctorDescriptor: new SyncDescriptor(CompassViewPane),
	canMoveView: true,
	canToggleVisibility: true
}], VIEW_CONTAINER);

// Migration & first-run visibility: ensure Compass lives in Auxiliary Bar and show the part if active
const MIGRATION_KEY = 'tne.compassToAuxiliaryBar.migrated';
const EXT_COMPASS_CONTAINER_ID = 'compass-ActivityBar';            // from extern/compass/src/package.json
// const EXT_COMPASS_VIEW_ID = 'compass.SidebarProvider';          // view id if needed for future logic

class CompassAuxiliaryBarContribution implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.compassAuxiliaryBar';
	constructor(
		@IViewDescriptorService private readonly viewsDescriptorService: IViewDescriptorService,
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService,
		@IStorageService private readonly storageService: IStorageService
	) {
		void this.migrateAndReveal();
	}

	private async migrateAndReveal(): Promise<void> {
		try {
			// Only run once per profile
			if (!this.storageService.getBoolean(MIGRATION_KEY, StorageScope.PROFILE, false)) {
				// Move native Compass container (core)
				this.moveContainerToAux(ViewContainerLocation.AuxiliaryBar, COMPASS_VIEW_CONTAINER_ID, 'compass-core');
				// Move extension Compass container if present
				this.moveContainerToAux(ViewContainerLocation.AuxiliaryBar, EXT_COMPASS_CONTAINER_ID, 'compass-extension');

				this.storageService.store(MIGRATION_KEY, true, StorageScope.PROFILE, StorageTarget.USER);
			}

			// If Auxiliary Bar has any active views, ensure it's visible
			const hasActive = this.viewsDescriptorService
				.getViewContainersByLocation(ViewContainerLocation.AuxiliaryBar)
				.some((c: ViewContainer) => this.viewsDescriptorService.getViewContainerModel(c).activeViewDescriptors.length > 0);

			if (hasActive) {
				this.layoutService.setPartHidden(false, Parts.AUXILIARYBAR_PART);
			}
		} catch {
			// best-effort; avoid throwing during startup
		}
	}

	private moveContainerToAux(location: ViewContainerLocation, id: string, reason: string): void {
		const container = this.viewsDescriptorService.getViewContainerById(id);
		if (!container) {
			return;
		}
		const current = this.viewsDescriptorService.getViewContainerLocation(container);
		if (current !== location) {
			this.viewsDescriptorService.moveViewContainerToLocation(container, location, undefined, reason);
		}
	}
}

registerWorkbenchContribution2(CompassAuxiliaryBarContribution.ID, CompassAuxiliaryBarContribution, WorkbenchPhase.AfterRestored);