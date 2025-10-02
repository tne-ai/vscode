/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILifecycleService, LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { GettingStartedEditorOptions, GettingStartedInput, gettingStartedInputTypeId } from './gettingStartedInput.js';
import { IResourceEditorInput } from '../../../../platform/editor/common/editor.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { getTelemetryLevel } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { TelemetryLevel } from '../../../../platform/telemetry/common/telemetry.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { localize } from '../../../../nls.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { URI } from '../../../../base/common/uri.js';

export const restoreWalkthroughsConfigurationKey = 'workbench.welcomePage.restorableWalkthroughs';
export type RestoreWalkthroughsConfigurationValue = { folder: string; category?: string; step?: string };

const telemetryOptOutStorageKey = 'workbench.telemetryOptOutShown';

export class StartupPageEditorResolverContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.startupPageEditorResolver';

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IEditorResolverService editorResolverService: IEditorResolverService
	) {
		super();
		const disposables = new DisposableStore();
		this._register(disposables);

		editorResolverService.registerEditor(
			`${GettingStartedInput.RESOURCE.scheme}:/**`,
			{
				id: GettingStartedInput.ID,
				label: localize('welcome.displayName', "Welcome Page"),
				priority: RegisteredEditorPriority.builtin,
			},
			{
				singlePerResource: false,
				canSupportResource: (uri: URI) => uri.scheme === GettingStartedInput.RESOURCE.scheme,
			},
			{
				createEditorInput: (editorInput: IResourceEditorInput) => {
					const options = editorInput.options as GettingStartedEditorOptions;
					return {
						editor: disposables.add(this.instantiationService.createInstance(GettingStartedInput, options)),
						options: {
							...options,
							pinned: false
						}
					};
				}
			}
		);
	}
}

export class StartupPageRunnerContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.startupPageRunner';

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IEditorService private readonly editorService: IEditorService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@ILifecycleService private readonly lifecycleService: ILifecycleService,
		@IProductService private readonly productService: IProductService,
		@IWorkbenchEnvironmentService private readonly environmentService: IWorkbenchEnvironmentService,
		@IStorageService private readonly storageService: IStorageService,
		@ILogService private readonly logService: ILogService,
	) {
		super();
		console.log('StartupPageRunnerContribution: Constructor called.');
		this.run().then(undefined, onUnexpectedError);
		this._register(this.editorService.onDidCloseEditor((e) => {
			if (e.editor instanceof GettingStartedInput) {
				e.editor.selectedCategory = undefined;
				e.editor.selectedStep = undefined;
			}
		}));
	}

	private async run() {
		console.log('StartupPageRunnerContribution: run() called');
		// Wait for resolving startup editor until we are restored to reduce startup pressure
		await this.lifecycleService.when(LifecyclePhase.Restored);
		console.log('StartupPageRunnerContribution: LifecyclePhase.Restored');

		// Always open Welcome page for first-launch, no matter what is open or which startupEditor is set.
		if (
			this.productService.enableTelemetry
			&& this.productService.showTelemetryOptOut
			&& getTelemetryLevel(this.configurationService) !== TelemetryLevel.NONE
			&& !this.environmentService.skipWelcome
			&& !this.storageService.get(telemetryOptOutStorageKey, StorageScope.PROFILE)
		) {
			this.storageService.store(telemetryOptOutStorageKey, true, StorageScope.PROFILE, StorageTarget.USER);
			console.log('StartupPageRunnerContribution: Telemetry opt-out notice shown and stored.');
		}

		const enabled = isStartupPageEnabled(this.configurationService, this.contextService, this.environmentService, this.logService);
		console.log(`StartupPageRunnerContribution: isStartupPageEnabled returned ${enabled}`);
		if (enabled) {
			console.log('StartupPageRunnerContribution: Calling openGettingStarted(true)');
			await this.openGettingStarted(true);
		}
	}

	private async openGettingStarted(showTelemetryNotice?: boolean) {
		console.log('StartupPageRunnerContribution: openGettingStarted() called');
		const startupEditorTypeID = gettingStartedInputTypeId;
		const editor = this.editorService.activeEditor;

		// Always open the welcome editor, even if it's already open or active.
		console.log('StartupPageRunnerContribution: Opening Getting Started editor.');

		const options: GettingStartedEditorOptions = editor ? { pinned: false, index: 0, showTelemetryNotice } : { pinned: false, showTelemetryNotice };
		if (startupEditorTypeID === gettingStartedInputTypeId) {
			this.editorService.openEditor({
				resource: GettingStartedInput.RESOURCE,
				options,
			});
			console.log('StartupPageRunnerContribution: editorService.openEditor called for Getting Started.');
		}
	}
}

function isStartupPageEnabled(configurationService: IConfigurationService, contextService: IWorkspaceContextService, environmentService: IWorkbenchEnvironmentService, logService: ILogService) {
	console.log('isStartupPageEnabled() called');
	return true;
}
