/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/extensionManagement.css';
import './ceoView.css'; // Import the new CSS file
import { localize, localize2 } from '../../../../nls.js';

import { Registry } from '../../../../platform/registry/common/platform.js';
import { MenuRegistry, MenuId, registerAction2, Action2, IMenuItem, IAction2Options } from '../../../../platform/actions/common/actions.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ExtensionsLocalizedLabel, IExtensionManagementService, IExtensionGalleryService, PreferencesLocalizedLabel, EXTENSION_INSTALL_SOURCE_CONTEXT, ExtensionInstallSource, SortBy, FilterType, VerifyExtensionSignatureConfigKey } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { EnablementState, IExtensionManagementServerService, IPublisherInfo, IWorkbenchExtensionEnablementService, IWorkbenchExtensionManagementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionIgnoredRecommendationsService, IExtensionRecommendationsService } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions, IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { VIEWLET_ID, IExtensionsWorkbenchService, IExtensionsViewPaneContainer, TOGGLE_IGNORE_EXTENSION_ACTION_ID, INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID, WORKSPACE_RECOMMENDATIONS_VIEW_ID, IWorkspaceRecommendedExtensionsView, AutoUpdateConfigurationKey, HasOutdatedExtensionsContext, SELECT_INSTALL_VSIX_EXTENSION_COMMAND_ID, LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID, ExtensionEditorTab, THEME_ACTIONS_GROUP, INSTALL_ACTIONS_GROUP, OUTDATED_EXTENSIONS_VIEW_ID, CONTEXT_HAS_GALLERY, extensionsSearchActionsMenu, UPDATE_ACTIONS_GROUP, IExtensionArg, ExtensionRuntimeActionType, EXTENSIONS_CATEGORY, AutoRestartConfigurationKey, extensionsFilterSubMenu, DefaultViewsContext, CONTEXT_EXTENSIONS_GALLERY_STATUS } from '../common/extensions.js';
import { InstallSpecificVersionOfExtensionAction, ConfigureWorkspaceRecommendedExtensionsAction, ConfigureWorkspaceFolderRecommendedExtensionsAction, SetColorThemeAction, SetFileIconThemeAction, SetProductIconThemeAction, ClearLanguageAction, ToggleAutoUpdateForExtensionAction, ToggleAutoUpdatesForPublisherAction, TogglePreReleaseExtensionAction, InstallAnotherVersionAction, InstallAction } from './extensionsActions.js';
import { ExtensionsInput } from '../common/extensionsInput.js';
import { ExtensionEditor } from './extensionEditor.js';
import { StatusUpdater, MaliciousExtensionChecker, ExtensionsViewletViewsContribution, BuiltInExtensionsContext, SearchMarketplaceExtensionsContext, RecommendedExtensionsContext, ExtensionsSortByContext, SearchHasTextContext, ExtensionsSearchValueContext, ExtensionMarketplaceStatusUpdater, ExtensionsViewPaneContainer } from './extensionsViewlet.js';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions, ConfigurationScope } from '../../../../platform/configuration/common/configurationRegistry.js';
import * as jsonContributionRegistry from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { ExtensionsConfigurationSchema, ExtensionsConfigurationSchemaId } from '../common/extensionsFileTemplate.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IInstantiationService, ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { KeymapExtensions } from '../common/extensionsUtils.js';
import { areSameExtensions, getIdAndVersion } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { EditorPaneDescriptor, IEditorPaneRegistry } from '../../../browser/editor.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import { UriComponents, URI } from '../../../../base/common/uri.js';
import { ExtensionActivationProgress } from './extensionsActivationProgress.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { ExtensionDependencyChecker } from './extensionsDependencyChecker.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IQuickAccessRegistry, Extensions } from '../../../../platform/quickinput/common/quickAccess.js';
import { InstallExtensionQuickAccessProvider, ManageExtensionsQuickAccessProvider } from './extensionsQuickAccess.js';
import { ExtensionRecommendationsService } from './extensionRecommendationsService.js';
import { CONTEXT_SYNC_ENABLEMENT } from '../../../services/userDataSync/common/userDataSync.js';
import { CopyAction, CutAction, PasteAction } from '../../../../editor/contrib/clipboard/browser/clipboard.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { MultiCommand } from '../../../../editor/browser/editorExtensions.js';
import { IWebview } from '../../webview/browser/webview.js';
import { ExtensionsWorkbenchService } from './extensionsWorkbenchService.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IExtensionRecommendationNotificationService } from '../../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { ExtensionRecommendationNotificationService } from './extensionRecommendationNotificationService.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ResourceContextKey, WorkbenchStateContext } from '../../../common/contextkeys.js';
import { IAction } from '../../../../base/common/actions.js';
import { IWorkspaceExtensionsConfigService } from '../../../services/extensionRecommendations/common/workspaceExtensionsConfig.js';
import { Schemas } from '../../../../base/common/network.js';
import { ShowRuntimeExtensionsAction } from './abstractRuntimeExtensionsEditor.js';
import { ExtensionEnablementWorkspaceTrustTransitionParticipant } from './extensionEnablementWorkspaceTrustTransitionParticipant.js';
import { clearSearchResultsIcon, configureRecommendedIcon, filterIcon, installWorkspaceRecommendedIcon, refreshIcon } from './extensionsIcons.js';
import { EXTENSION_CATEGORIES, ExtensionType } from '../../../../platform/extensions/common/extensions.js';
import { Disposable, DisposableStore, IDisposable, isDisposable } from '../../../../base/common/lifecycle.js';
import { IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { mnemonicButtonLabel } from '../../../../base/common/labels.js';
import { Query } from '../common/extensionQuery.js';
import { EditorExtensions } from '../../../common/editor.js';
import { WORKSPACE_TRUST_EXTENSION_SUPPORT } from '../../../services/workspaces/common/workspaceTrust.js';
import { ExtensionsCompletionItemsProvider } from './extensionsCompletionItemsProvider.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Event } from '../../../../base/common/event.js';
import { UnsupportedExtensionsMigrationContrib } from './unsupportedExtensionsMigrationContribution.js';
import { isNative, isWeb } from '../../../../base/common/platform.js';
import { ExtensionStorageService } from '../../../../platform/extensionManagement/common/extensionStorage.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IStringDictionary } from '../../../../base/common/collections.js';
import { CONTEXT_KEYBINDINGS_EDITOR } from '../../preferences/common/preferences.js';
import { ProgressLocation } from '../../../../platform/progress/common/progress.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IConfigurationMigrationRegistry, Extensions as ConfigurationMigrationExtensions } from '../../../common/configuration.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import product from '../../../../platform/product/common/product.js';
import { ILanguageModelToolsService } from '../../chat/common/languageModelToolsService.js';
import { SearchExtensionsTool, SearchExtensionsToolData } from '../common/searchExtensionsTool.js';
import { DEFAULT_ACCOUNT_SIGN_IN_COMMAND } from '../../../services/accounts/common/defaultAccount.js';
import { IExtensionGalleryManifestService, IExtensionGalleryManifest, ExtensionGalleryManifestStatus, ExtensionGalleryResourceType, getExtensionGalleryManifestResourceUri, ExtensionGalleryServiceUrlConfigKey } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
// CEO View imports
import { IViewsRegistry, IViewContainersRegistry, Extensions as ViewExtensions, ViewContainerLocation, IViewDescriptorService } from '../../../common/views.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { ViewPane, IViewPaneOptions } from '../../../browser/parts/views/viewPane.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { joinPath } from '../../../../base/common/resources.js';
import { VSBuffer } from '../../../../base/common/buffer.js';

// Singletons
registerSingleton(IExtensionsWorkbenchService, ExtensionsWorkbenchService, InstantiationType.Eager /* Auto updates extensions */);
registerSingleton(IExtensionRecommendationNotificationService, ExtensionRecommendationNotificationService, InstantiationType.Delayed);
registerSingleton(IExtensionRecommendationsService, ExtensionRecommendationsService, InstantiationType.Eager /* Prompts recommendations in the background */);

// Quick Access
Registry.as<IQuickAccessRegistry>(Extensions.Quickaccess).registerQuickAccessProvider({
	ctor: ManageExtensionsQuickAccessProvider,
	prefix: ManageExtensionsQuickAccessProvider.PREFIX,
	placeholder: localize('manageExtensionsQuickAccessPlaceholder', "Press Enter to manage extensions."),
	helpEntries: [{ description: localize('manageExtensionsHelp', "Manage Extensions") }]
});

// Editor
Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane).registerEditorPane(
	EditorPaneDescriptor.create(
		ExtensionEditor,
		ExtensionEditor.ID,
		localize('extension', "Extension")
	),
	[
		new SyncDescriptor(ExtensionsInput)
	]);

// Extensions view container registration (restored)
// Register the Extensions container so the 'workbench.view.extensions' command exists
export const VIEW_CONTAINER = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: VIEWLET_ID,
		title: localize2('extensions', 'Extensions'),
		ctorDescriptor: new SyncDescriptor(ExtensionsViewPaneContainer, [VIEWLET_ID, { mergeViewWithContainerWhenSingleView: true }]),
		icon: Codicon.extensions,
		storageId: VIEWLET_ID,
		order: 999 // Set a high order to place it at the bottom of the activity bar
	},
	ViewContainerLocation.Sidebar
);

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration)
	.registerConfiguration({
		id: 'extensions',
		order: 30,
		title: localize('extensionsConfigurationTitle', "Extensions"),
		type: 'object',
		properties: {
			'extensions.autoUpdate': {
				enum: [true, 'onlyEnabledExtensions', false,],
				enumItemLabels: [
					localize('all', "All Extensions"),
					localize('enabled', "Only Enabled Extensions"),
					localize('none', "None"),
				],
				enumDescriptions: [
					localize('extensions.autoUpdate.true', 'Download and install updates automatically for all extensions.'),
					localize('extensions.autoUpdate.enabled', 'Download and install updates automatically only for enabled extensions.'),
					localize('extensions.autoUpdate.false', 'Extensions are not automatically updated.'),
				],
				description: localize('extensions.autoUpdate', "Controls the automatic update behavior of extensions. The updates are fetched from a Microsoft online service."),
				default: true,
				scope: ConfigurationScope.APPLICATION,
				tags: ['usesOnlineServices']
			},
			'extensions.autoCheckUpdates': {
				type: 'boolean',
				description: localize('extensionsCheckUpdates', "When enabled, automatically checks extensions for updates. If an extension has an update, it is marked as outdated in the Extensions view. The updates are fetched from a Microsoft online service."),
				default: true,
				scope: ConfigurationScope.APPLICATION,
				tags: ['usesOnlineServices']
			},
			'extensions.ignoreRecommendations': {
				type: 'boolean',
				description: localize('extensionsIgnoreRecommendations', "When enabled, the notifications for extension recommendations will not be shown."),
				default: false
			},
			'extensions.showRecommendationsOnlyOnDemand': {
				type: 'boolean',
				deprecationMessage: localize('extensionsShowRecommendationsOnlyOnDemand_Deprecated', "This setting is deprecated. Use extensions.ignoreRecommendations setting to control recommendation notifications. Use Extensions view's visibility actions to hide Recommended view by default."),
				default: false,
				tags: ['usesOnlineServices']
			},
			'extensions.closeExtensionDetailsOnViewChange': {
				type: 'boolean',
				description: localize('extensionsCloseExtensionDetailsOnViewChange', "When enabled, editors with extension details will be automatically closed upon navigating away from the Extensions View."),
				default: false
			},
			'extensions.confirmedUriHandlerExtensionIds': {
				type: 'array',
				items: {
					type: 'string'
				},
				description: localize('handleUriConfirmedExtensions', "When an extension is listed here, a confirmation prompt will not be shown when that extension handles a URI."),
				default: [],
				scope: ConfigurationScope.APPLICATION
			},
			'extensions.webWorker': {
				type: ['boolean', 'string'],
				enum: [true, false, 'auto'],
				enumDescriptions: [
					localize('extensionsWebWorker.true', "The Web Worker Extension Host will always be launched."),
					localize('extensionsWebWorker.false', "The Web Worker Extension Host will never be launched."),
					localize('extensionsWebWorker.auto', "The Web Worker Extension Host will be launched when a web extension needs it."),
				],
				description: localize('extensionsWebWorker', "Enable web worker extension host."),
				default: 'auto'
			},
			'extensions.supportVirtualWorkspaces': {
				type: 'object',
				markdownDescription: localize('extensions.supportVirtualWorkspaces', "Override the virtual workspaces support of an extension."),
				patternProperties: {
					'([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$': {
						type: 'boolean',
						default: false
					}
				},
				additionalProperties: false,
				default: {},
				defaultSnippets: [{
					'body': {
						'pub.name': false
					}
				}]
			},
			'extensions.experimental.affinity': {
				type: 'object',
				markdownDescription: localize('extensions.affinity', "Configure an extension to execute in a different extension host process."),
				patternProperties: {
					'([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$': {
						type: 'integer',
						default: 1
					}
				},
				additionalProperties: false,
				default: {},
				defaultSnippets: [{
					'body': {
						'pub.name': 1
					}
				}]
			},
			[WORKSPACE_TRUST_EXTENSION_SUPPORT]: {
				type: 'object',
				scope: ConfigurationScope.APPLICATION,
				markdownDescription: localize('extensions.supportUntrustedWorkspaces', "Override the untrusted workspace support of an extension. Extensions using `true` will always be enabled. Extensions using `limited` will always be enabled, and the extension will hide functionality that requires trust. Extensions using `false` will only be enabled only when the workspace is trusted."),
				patternProperties: {
					'([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$': {
						type: 'object',
						properties: {
							'supported': {
								type: ['boolean', 'string'],
								enum: [true, false, 'limited'],
								enumDescriptions: [
									localize('extensions.supportUntrustedWorkspaces.true', "Extension will always be enabled."),
									localize('extensions.supportUntrustedWorkspaces.false', "Extension will only be enabled only when the workspace is trusted."),
									localize('extensions.supportUntrustedWorkspaces.limited', "Extension will always be enabled, and the extension will hide functionality requiring trust."),
								],
								description: localize('extensions.supportUntrustedWorkspaces.supported', "Defines the untrusted workspace support setting for the extension."),
							},
							'version': {
								type: 'string',
								description: localize('extensions.supportUntrustedWorkspaces.version', "Defines the version of the extension for which the override should be applied. If not specified, the override will be applied independent of the extension version."),
							}
						}
					}
				}
			},
			'extensions.experimental.deferredStartupFinishedActivation': {
				type: 'boolean',
				description: localize('extensionsDeferredStartupFinishedActivation', "When enabled, extensions which declare the `onStartupFinished` activation event will be activated after a timeout."),
				default: false
			},
			'extensions.experimental.issueQuickAccess': {
				type: 'boolean',
				description: localize('extensionsInQuickAccess', "When enabled, extensions can be searched for via Quick Access and report issues from there."),
				default: true
			},
			[VerifyExtensionSignatureConfigKey]: {
				type: 'boolean',
				description: localize('extensions.verifySignature', "When enabled, extensions are verified to be signed before getting installed."),
				default: true,
				scope: ConfigurationScope.APPLICATION,
				included: isNative
			},
			[AutoRestartConfigurationKey]: {
				type: 'boolean',
				description: localize('autoRestart', "If activated, extensions will automatically restart following an update if the window is not in focus. There can be a data loss if you have open Notebooks or Custom Editors."),
				default: false,
				included: product.quality !== 'stable'
			},
			[ExtensionGalleryServiceUrlConfigKey]: {
				type: 'string',
				description: localize('extensions.gallery.serviceUrl', "Configure the Marketplace service URL to connect to"),
				default: '',
				scope: ConfigurationScope.APPLICATION,
				tags: ['usesOnlineServices'],
				included: false,
				policy: {
					name: 'ExtensionGalleryServiceUrl',
					minimumVersion: '1.99',
				},
			},
			'extensions.supportNodeGlobalNavigator': {
				type: 'boolean',
				description: localize('extensionsSupportNodeGlobalNavigator', "When enabled, Node.js navigator object is exposed on the global scope."),
				default: false,
			},
		}
	});

const jsonRegistry = <jsonContributionRegistry.IJSONContributionRegistry>Registry.as(jsonContributionRegistry.Extensions.JSONContribution);
jsonRegistry.registerSchema(ExtensionsConfigurationSchemaId, ExtensionsConfigurationSchema);

// Register Commands
CommandsRegistry.registerCommand('_extensions.manage', (accessor: ServicesAccessor, extensionId: string, tab?: ExtensionEditorTab, preserveFocus?: boolean, feature?: string) => {
	const extensionService = accessor.get(IExtensionsWorkbenchService);
	const extension = extensionService.local.find(e => areSameExtensions(e.identifier, { id: extensionId }));
	if (extension) {
		extensionService.open(extension, { tab, preserveFocus, feature });
	} else {
		throw new Error(localize('notFound', "Extension '{0}' not found.", extensionId));
	}
});

CommandsRegistry.registerCommand('extension.open', async (accessor: ServicesAccessor, extensionId: string, tab?: ExtensionEditorTab, preserveFocus?: boolean, feature?: string, sideByside?: boolean) => {
	const extensionService = accessor.get(IExtensionsWorkbenchService);
	const commandService = accessor.get(ICommandService);

	const [extension] = await extensionService.getExtensions([{ id: extensionId }], CancellationToken.None);
	if (extension) {
		return extensionService.open(extension, { tab, preserveFocus, feature, sideByside });
	}

	return commandService.executeCommand('_extensions.manage', extensionId, tab, preserveFocus, feature);
});

CommandsRegistry.registerCommand({
	id: 'workbench.extensions.installExtension',
	metadata: {
		description: localize('workbench.extensions.installExtension.description', "Install the given extension"),
		args: [
			{
				name: 'extensionIdOrVSIXUri',
				description: localize('workbench.extensions.installExtension.arg.decription', "Extension id or VSIX resource uri"),
				constraint: (value: any) => typeof value === 'string' || value instanceof URI,
			},
			{
				name: 'options',
				description: '(optional) Options for installing the extension. Object with the following properties: ' +
					'`installOnlyNewlyAddedFromExtensionPackVSIX`: When enabled, VS Code installs only newly added extensions from the extension pack VSIX. This option is considered only when installing VSIX. ',
				isOptional: true,
				schema: {
					'type': 'object',
					'properties': {
						'installOnlyNewlyAddedFromExtensionPackVSIX': {
							'type': 'boolean',
							'description': localize('workbench.extensions.installExtension.option.installOnlyNewlyAddedFromExtensionPackVSIX', "When enabled, VS Code installs only newly added extensions from the extension pack VSIX. This option is considered only while installing a VSIX."),
							default: false
						},
						'installPreReleaseVersion': {
							'type': 'boolean',
							'description': localize('workbench.extensions.installExtension.option.installPreReleaseVersion', "When enabled, VS Code installs the pre-release version of the extension if available."),
							default: false
						},
						'donotSync': {
							'type': 'boolean',
							'description': localize('workbench.extensions.installExtension.option.donotSync', "When enabled, VS Code do not sync this extension when Settings Sync is on."),
							default: false
						},
						'justification': {
							'type': ['string', 'object'],
							'description': localize('workbench.extensions.installExtension.option.justification', "Justification for installing the extension. This is a string or an object that can be used to pass any information to the installation handlers. i.e. `{reason: 'This extension wants to open a URI', action: 'Open URI'}` will show a message box with the reason and action upon install."),
						},
						'enable': {
							'type': 'boolean',
							'description': localize('workbench.extensions.installExtension.option.enable', "When enabled, the extension will be enabled if it is installed but disabled. If the extension is already enabled, this has no effect."),
							default: false
						},
						'context': {
							'type': 'object',
							'description': localize('workbench.extensions.installExtension.option.context', "Context for the installation. This is a JSON object that can be used to pass any information to the installation handlers. i.e. `{skipWalkthrough: true}` will skip opening the walkthrough upon install."),
						}
					}
				}
			}
		]
	},
	handler: async (
		accessor,
		arg: string | UriComponents,
		options?: {
			installOnlyNewlyAddedFromExtensionPackVSIX?: boolean;
			installPreReleaseVersion?: boolean;
			donotSync?: boolean;
			justification?: string | { reason: string; action: string };
			enable?: boolean;
			context?: IStringDictionary<any>;
		}) => {
		const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
		const extensionManagementService = accessor.get(IWorkbenchExtensionManagementService);
		const extensionGalleryService = accessor.get(IExtensionGalleryService);
		try {
			if (typeof arg === 'string') {
				const [id, version] = getIdAndVersion(arg);
				const extension = extensionsWorkbenchService.local.find(e => areSameExtensions(e.identifier, { id, uuid: version }));
				if (extension?.enablementState === EnablementState.DisabledByExtensionKind) {
					const [gallery] = await extensionGalleryService.getExtensions([{ id, preRelease: options?.installPreReleaseVersion }], CancellationToken.None);
					if (!gallery) {
						throw new Error(localize('notFound', "Extension '{0}' not found.", arg));
					}
					await extensionManagementService.installFromGallery(gallery, {
						isMachineScoped: options?.donotSync ? true : undefined, /* do not allow syncing extensions automatically while installing through the command */
						installPreReleaseVersion: options?.installPreReleaseVersion,
						installGivenVersion: !!version,
						context: { ...options?.context, [EXTENSION_INSTALL_SOURCE_CONTEXT]: ExtensionInstallSource.COMMAND },
					});
				} else {
					await extensionsWorkbenchService.install(arg, {
						version,
						installPreReleaseVersion: options?.installPreReleaseVersion,
						context: { ...options?.context, [EXTENSION_INSTALL_SOURCE_CONTEXT]: ExtensionInstallSource.COMMAND },
						justification: options?.justification,
						enable: options?.enable,
						isMachineScoped: options?.donotSync ? true : undefined, /* do not allow syncing extensions automatically while installing through the command */
					}, ProgressLocation.Notification);
				}
			} else {
				const vsix = URI.revive(arg);
				await extensionsWorkbenchService.install(vsix, { installGivenVersion: true });
			}
		} catch (e) {
			onUnexpectedError(e);
			throw e;
		}
	}
});

CommandsRegistry.registerCommand({
	id: 'workbench.extensions.uninstallExtension',
	metadata: {
		description: localize('workbench.extensions.uninstallExtension.description', "Uninstall the given extension"),
		args: [
			{
				name: localize('workbench.extensions.uninstallExtension.arg.name', "Id of the extension to uninstall"),
				schema: {
					'type': 'string'
				}
			}
		]
	},
	handler: async (accessor, id: string) => {
		if (!id) {
			throw new Error(localize('id required', "Extension id required."));
		}
		const extensionManagementService = accessor.get(IExtensionManagementService);
		const installed = await extensionManagementService.getInstalled();
		const [extensionToUninstall] = installed.filter(e => areSameExtensions(e.identifier, { id }));
		if (!extensionToUninstall) {
			throw new Error(localize('notInstalled', "Extension '{0}' is not installed. Make sure you use the full extension ID, including the publisher, e.g.: ms-dotnettools.csharp.", id));
		}
		if (extensionToUninstall.isBuiltin) {
			throw new Error(localize('builtin', "Extension '{0}' is a Built-in extension and cannot be uninstalled", id));
		}

		try {
			await extensionManagementService.uninstall(extensionToUninstall);
		} catch (e) {
			onUnexpectedError(e);
			throw e;
		}
	}
});

CommandsRegistry.registerCommand({
	id: 'workbench.extensions.search',
	metadata: {
		description: localize('workbench.extensions.search.description', "Search for a specific extension"),
		args: [
			{
				name: localize('workbench.extensions.search.arg.name', "Query to use in search"),
				schema: { 'type': 'string' }
			}
		]
	},
	handler: async (accessor, query: string = '') => {
		return accessor.get(IExtensionsWorkbenchService).openSearch(query);
	}
});

function overrideActionForActiveExtensionEditorWebview(command: MultiCommand | undefined, f: (webview: IWebview) => void) {
	command?.addImplementation(105, 'extensions-editor', (accessor) => {
		const editorService = accessor.get(IEditorService);
		const editor = editorService.activeEditorPane;
		if (editor instanceof ExtensionEditor) {
			if (editor.activeWebview?.isFocused) {
				f(editor.activeWebview);
				return true;
			}
		}
		return false;
	});
}

overrideActionForActiveExtensionEditorWebview(CopyAction, webview => webview.copy());
overrideActionForActiveExtensionEditorWebview(CutAction, webview => webview.cut());
overrideActionForActiveExtensionEditorWebview(PasteAction, webview => webview.paste());

// Contexts
export const CONTEXT_HAS_LOCAL_SERVER = new RawContextKey<boolean>('hasLocalServer', false);
export const CONTEXT_HAS_REMOTE_SERVER = new RawContextKey<boolean>('hasRemoteServer', false);
export const CONTEXT_HAS_WEB_SERVER = new RawContextKey<boolean>('hasWebServer', false);
const CONTEXT_GALLERY_SORT_CAPABILITIES = new RawContextKey<string>('gallerySortCapabilities', '');
const CONTEXT_GALLERY_FILTER_CAPABILITIES = new RawContextKey<string>('galleryFilterCapabilities', '');
const CONTEXT_GALLERY_ALL_PUBLIC_REPOSITORY_SIGNED = new RawContextKey<boolean>('galleryAllPublicRepositorySigned', false);
const CONTEXT_GALLERY_ALL_PRIVATE_REPOSITORY_SIGNED = new RawContextKey<boolean>('galleryAllPrivateRepositorySigned', false);
const CONTEXT_GALLERY_HAS_EXTENSION_LINK = new RawContextKey<boolean>('galleryHasExtensionLink', false);

async function runAction(action: IAction): Promise<void> {
	try {
		await action.run();
	} finally {
		if (isDisposable(action)) {
			action.dispose();
		}
	}
}

type IExtensionActionOptions = IAction2Options & {
	menuTitles?: { [id: string]: string };
	run(accessor: ServicesAccessor, ...args: any[]): Promise<any>;
};

class ExtensionsContributions extends Disposable implements IWorkbenchContribution {

	constructor(
		@IExtensionManagementService private readonly extensionManagementService: IExtensionManagementService,
		@IExtensionManagementServerService private readonly extensionManagementServerService: IExtensionManagementServerService,
		@IExtensionGalleryManifestService private readonly extensionGalleryManifestService: IExtensionGalleryManifestService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IViewsService private readonly viewsService: IViewsService,
		@IExtensionsWorkbenchService private readonly extensionsWorkbenchService: IExtensionsWorkbenchService,
		@IWorkbenchExtensionEnablementService private readonly extensionEnablementService: IWorkbenchExtensionEnablementService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IDialogService private readonly dialogService: IDialogService,
		@ICommandService private readonly commandService: ICommandService,
		@IProductService private readonly productService: IProductService,
	) {
		super();
		const hasLocalServerContext = CONTEXT_HAS_LOCAL_SERVER.bindTo(contextKeyService);
		if (this.extensionManagementServerService.localExtensionManagementServer) {
			hasLocalServerContext.set(true);
		}

		const hasRemoteServerContext = CONTEXT_HAS_REMOTE_SERVER.bindTo(contextKeyService);
		if (this.extensionManagementServerService.remoteExtensionManagementServer) {
			hasRemoteServerContext.set(true);
		}

		const hasWebServerContext = CONTEXT_HAS_WEB_SERVER.bindTo(contextKeyService);
		if (this.extensionManagementServerService.webExtensionManagementServer) {
			hasWebServerContext.set(true);
		}

		this.updateExtensionGalleryStatusContexts();
		this._register(extensionGalleryManifestService.onDidChangeExtensionGalleryManifestStatus(() => this.updateExtensionGalleryStatusContexts()));
		extensionGalleryManifestService.getExtensionGalleryManifest()
			.then(extensionGalleryManifest => {
				this.updateGalleryCapabilitiesContexts(extensionGalleryManifest);
				this._register(extensionGalleryManifestService.onDidChangeExtensionGalleryManifest(extensionGalleryManifest => this.updateGalleryCapabilitiesContexts(extensionGalleryManifest)));
			});
		this.registerGlobalActions();
		this.registerContextMenuActions();
		this.registerQuickAccessProvider();
	}

	private async updateExtensionGalleryStatusContexts(): Promise<void> {
		CONTEXT_HAS_GALLERY.bindTo(this.contextKeyService).set(this.extensionGalleryManifestService.extensionGalleryManifestStatus === ExtensionGalleryManifestStatus.Available);
		CONTEXT_EXTENSIONS_GALLERY_STATUS.bindTo(this.contextKeyService).set(this.extensionGalleryManifestService.extensionGalleryManifestStatus);
	}

	private async updateGalleryCapabilitiesContexts(extensionGalleryManifest: IExtensionGalleryManifest | null): Promise<void> {
		CONTEXT_GALLERY_SORT_CAPABILITIES.bindTo(this.contextKeyService).set(`_${extensionGalleryManifest?.capabilities.extensionQuery.sorting?.map(s => s.name)?.join('_')}_UpdateDate_`);
		CONTEXT_GALLERY_FILTER_CAPABILITIES.bindTo(this.contextKeyService).set(`_${extensionGalleryManifest?.capabilities.extensionQuery.filtering?.map(s => s.name)?.join('_')}_`);
		CONTEXT_GALLERY_ALL_PUBLIC_REPOSITORY_SIGNED.bindTo(this.contextKeyService).set(!!extensionGalleryManifest?.capabilities?.signing?.allPublicRepositorySigned);
		CONTEXT_GALLERY_ALL_PRIVATE_REPOSITORY_SIGNED.bindTo(this.contextKeyService).set(!!extensionGalleryManifest?.capabilities?.signing?.allPrivateRepositorySigned);
		CONTEXT_GALLERY_HAS_EXTENSION_LINK.bindTo(this.contextKeyService).set(!!(extensionGalleryManifest && getExtensionGalleryManifestResourceUri(extensionGalleryManifest, ExtensionGalleryResourceType.ExtensionDetailsViewUri)));
	}

	private registerQuickAccessProvider(): void {
		if (this.extensionManagementServerService.localExtensionManagementServer
			|| this.extensionManagementServerService.remoteExtensionManagementServer
			|| this.extensionManagementServerService.webExtensionManagementServer
		) {
			Registry.as<IQuickAccessRegistry>(Extensions.Quickaccess).registerQuickAccessProvider({
				ctor: InstallExtensionQuickAccessProvider,
				prefix: InstallExtensionQuickAccessProvider.PREFIX,
				placeholder: localize('installExtensionQuickAccessPlaceholder', "Type the name of an extension to install or search."),
				helpEntries: [{ description: localize('installExtensionQuickAccessHelp', "Install or Search Extensions") }]
			});
		}
	}

	// Global actions
	private registerGlobalActions(): void {
		this._register(MenuRegistry.appendMenuItem(MenuId.MenubarPreferencesMenu, {
			command: {
				id: VIEWLET_ID,
				title: localize({ key: 'miPreferencesExtensions', comment: ['&& denotes a mnemonic'] }, "&&Extensions")
			},
			group: '2_configuration',
			order: 3
		}));
		this._register(MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
			command: {
				id: VIEWLET_ID,
				title: localize('showExtensions', "Extensions")
			},
			group: '2_configuration',
			order: 3
		}));

		this.registerExtensionAction({
			id: 'workbench.extensions.action.focusExtensionsView',
			title: localize2('focusExtensions', 'Focus on Extensions View'),
			category: ExtensionsLocalizedLabel,
			f1: true,
			run: async (accessor: ServicesAccessor) => {
				await accessor.get(IExtensionsWorkbenchService).openSearch('');
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.installExtensions',
			title: localize2('installExtensions', 'Install Extensions'),
			category: ExtensionsLocalizedLabel,
			menu: {
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER))
			},
			run: async (accessor: ServicesAccessor) => {
				accessor.get(IViewsService).openViewContainer(VIEWLET_ID, true);
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.showRecommendedKeymapExtensions',
			title: localize2('showRecommendedKeymapExtensionsShort', 'Keymaps'),
			category: PreferencesLocalizedLabel,
			menu: [{
				id: MenuId.CommandPalette,
				when: CONTEXT_HAS_GALLERY
			}, {
				id: MenuId.EditorTitle,
				when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_HAS_GALLERY),
				group: '2_keyboard_discover_actions'
			}],
			menuTitles: {
				[MenuId.EditorTitle.id]: localize('importKeyboardShortcutsFroms', "Migrate Keyboard Shortcuts from...")
			},
			run: () => this.extensionsWorkbenchService.openSearch('@recommended:keymaps ')
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.showLanguageExtensions',
			title: localize2('showLanguageExtensionsShort', 'Language Extensions'),
			category: PreferencesLocalizedLabel,
			menu: {
				id: MenuId.CommandPalette,
				when: CONTEXT_HAS_GALLERY
			},
			run: () => this.extensionsWorkbenchService.openSearch('@recommended:languages ')
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.checkForUpdates',
			title: localize2('checkForUpdates', 'Check for Extension Updates'),
			category: ExtensionsLocalizedLabel,
			menu: [{
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER))
			}, {
				id: MenuId.ViewContainerTitle,
				when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), CONTEXT_HAS_GALLERY),
				group: '1_updates',
				order: 1
			}],
			run: async () => {
				await this.extensionsWorkbenchService.checkForUpdates();
				const outdated = this.extensionsWorkbenchService.outdated;
				if (outdated.length) {
					return this.extensionsWorkbenchService.openSearch('@outdated ');
				} else {
					return this.dialogService.info(localize('noUpdatesAvailable', "All extensions are up to date."));
				}
			}
		});

		const enableAutoUpdateWhenCondition = ContextKeyExpr.equals(`config.${AutoUpdateConfigurationKey}`, false);
		this.registerExtensionAction({
			id: 'workbench.extensions.action.enableAutoUpdate',
			title: localize2('enableAutoUpdate', 'Enable Auto Update for All Extensions'),
			category: ExtensionsLocalizedLabel,
			precondition: enableAutoUpdateWhenCondition,
			menu: [{
				id: MenuId.ViewContainerTitle,
				order: 5,
				group: '1_updates',
				when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), enableAutoUpdateWhenCondition)
			}, {
				id: MenuId.CommandPalette,
			}],
			run: (accessor: ServicesAccessor) => accessor.get(IExtensionsWorkbenchService).updateAutoUpdateForAllExtensions(true)
		});

		const disableAutoUpdateWhenCondition = ContextKeyExpr.notEquals(`config.${AutoUpdateConfigurationKey}`, false);
		this.registerExtensionAction({
			id: 'workbench.extensions.action.disableAutoUpdate',
			title: localize2('disableAutoUpdate', 'Disable Auto Update for All Extensions'),
			precondition: disableAutoUpdateWhenCondition,
			category: ExtensionsLocalizedLabel,
			menu: [{
				id: MenuId.ViewContainerTitle,
				order: 5,
				group: '1_updates',
				when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), disableAutoUpdateWhenCondition)
			}, {
				id: MenuId.CommandPalette,
			}],
			run: (accessor: ServicesAccessor) => accessor.get(IExtensionsWorkbenchService).updateAutoUpdateForAllExtensions(false)
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.updateAllExtensions',
			title: localize2('updateAll', 'Update All Extensions'),
			category: ExtensionsLocalizedLabel,
			precondition: HasOutdatedExtensionsContext,
			menu: [
				{
					id: MenuId.CommandPalette,
					when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER))
				}, {
					id: MenuId.ViewContainerTitle,
					when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), ContextKeyExpr.or(ContextKeyExpr.has(`config.${AutoUpdateConfigurationKey}`).negate(), ContextKeyExpr.equals(`config.${AutoUpdateConfigurationKey}`, 'onlyEnabledExtensions'))),
					group: '1_updates',
					order: 2
				}, {
					id: MenuId.ViewTitle,
					when: ContextKeyExpr.equals('view', OUTDATED_EXTENSIONS_VIEW_ID),
					group: 'navigation',
					order: 1
				}
			],
			icon: installWorkspaceRecommendedIcon,
			run: async () => {
				await this.extensionsWorkbenchService.updateAll();
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.enableAll',
			title: localize2('enableAll', 'Enable All Extensions'),
			category: ExtensionsLocalizedLabel,
			menu: [{
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER)
			}, {
				id: MenuId.ViewContainerTitle,
				when: ContextKeyExpr.equals('viewContainer', VIEWLET_ID),
				group: '2_enablement',
				order: 1
			}],
			run: async () => {
				const extensionsToEnable = this.extensionsWorkbenchService.local.filter(e => !!e.local && this.extensionEnablementService.canChangeEnablement(e.local) && !this.extensionEnablementService.isEnabled(e.local));
				if (extensionsToEnable.length) {
					await this.extensionsWorkbenchService.setEnablement(extensionsToEnable, EnablementState.EnabledGlobally);
				}
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.enableAllWorkspace',
			title: localize2('enableAllWorkspace', 'Enable All Extensions for this Workspace'),
			category: ExtensionsLocalizedLabel,
			menu: {
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('empty'), ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER))
			},
			run: async () => {
				const extensionsToEnable = this.extensionsWorkbenchService.local.filter(e => !!e.local && this.extensionEnablementService.canChangeEnablement(e.local) && !this.extensionEnablementService.isEnabled(e.local));
				if (extensionsToEnable.length) {
					await this.extensionsWorkbenchService.setEnablement(extensionsToEnable, EnablementState.EnabledWorkspace);
				}
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.disableAll',
			title: localize2('disableAll', 'Disable All Installed Extensions'),
			category: ExtensionsLocalizedLabel,
			menu: [{
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER)
			}, {
				id: MenuId.ViewContainerTitle,
				when: ContextKeyExpr.equals('viewContainer', VIEWLET_ID),
				group: '2_enablement',
				order: 2
			}],
			run: async () => {
				const extensionsToDisable = this.extensionsWorkbenchService.local.filter(e => !e.isBuiltin && !!e.local && this.extensionEnablementService.isEnabled(e.local) && this.extensionEnablementService.canChangeEnablement(e.local));
				if (extensionsToDisable.length) {
					await this.extensionsWorkbenchService.setEnablement(extensionsToDisable, EnablementState.DisabledGlobally);
				}
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.disableAllWorkspace',
			title: localize2('disableAllWorkspace', 'Disable All Installed Extensions for this Workspace'),
			category: ExtensionsLocalizedLabel,
			menu: {
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('empty'), ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER))
			},
			run: async () => {
				const extensionsToDisable = this.extensionsWorkbenchService.local.filter(e => !e.isBuiltin && !!e.local && this.extensionEnablementService.isEnabled(e.local) && this.extensionEnablementService.canChangeEnablement(e.local));
				if (extensionsToDisable.length) {
					await this.extensionsWorkbenchService.setEnablement(extensionsToDisable, EnablementState.DisabledWorkspace);
				}
			}
		});

		this.registerExtensionAction({
			id: SELECT_INSTALL_VSIX_EXTENSION_COMMAND_ID,
			title: localize2('InstallFromVSIX', 'Install from VSIX...'),
			category: ExtensionsLocalizedLabel,
			menu: [{
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER)
			}, {
				id: MenuId.ViewContainerTitle,
				when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER)),
				group: '3_install',
				order: 1
			}],
			run: async (accessor: ServicesAccessor) => {
				const fileDialogService = accessor.get(IFileDialogService);
				const commandService = accessor.get(ICommandService);
				const vsixPaths = await fileDialogService.showOpenDialog({
					title: localize('installFromVSIX', "Install from VSIX"),
					filters: [{ name: 'VSIX Extensions', extensions: ['vsix'] }],
					canSelectFiles: true,
					canSelectMany: true,
					openLabel: mnemonicButtonLabel(localize({ key: 'installButton', comment: ['&& denotes a mnemonic'] }, "&&Install"))
				});
				if (vsixPaths) {
					await commandService.executeCommand(INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID, vsixPaths);
				}
			}
		});

		this.registerExtensionAction({
			id: INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID,
			title: localize('installVSIX', "Install Extension VSIX"),
			menu: [{
				id: MenuId.ExplorerContext,
				group: 'extensions',
				when: ContextKeyExpr.and(ResourceContextKey.Extension.isEqualTo('.vsix'), ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER)),
			}],
			run: async (accessor: ServicesAccessor, resources: URI[] | URI) => {
				const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
				const hostService = accessor.get(IHostService);
				const notificationService = accessor.get(INotificationService);

				const vsixs = Array.isArray(resources) ? resources : [resources];
				const result = await Promise.allSettled(vsixs.map(async (vsix) => await extensionsWorkbenchService.install(vsix, { installGivenVersion: true })));
				let error: Error | undefined, requireReload = false, requireRestart = false;
				for (const r of result) {
					if (r.status === 'rejected') {
						error = new Error(r.reason);
						break;
					}
					requireReload = requireReload || r.value.runtimeState?.action === ExtensionRuntimeActionType.ReloadWindow;
					requireRestart = requireRestart || r.value.runtimeState?.action === ExtensionRuntimeActionType.RestartExtensions;
				}
				if (error) {
					throw error;
				}
				if (requireReload) {
					notificationService.prompt(
						Severity.Info,
						vsixs.length > 1 ? localize('InstallVSIXs.successReload', "Completed installing extensions. Please reload Visual Studio Code to enable them.")
							: localize('InstallVSIXAction.successReload', "Completed installing extension. Please reload Visual Studio Code to enable it."),
						[{
							label: localize('InstallVSIXAction.reloadNow', "Reload Now"),
							run: () => hostService.reload()
						}]
					);
				}
				else if (requireRestart) {
					notificationService.prompt(
						Severity.Info,
						vsixs.length > 1 ? localize('InstallVSIXs.successRestart', "Completed installing extensions. Please restart extensions to enable them.")
							: localize('InstallVSIXAction.successRestart', "Completed installing extension. Please restart extensions to enable it."),
						[{
							label: localize('InstallVSIXAction.restartExtensions', "Restart Extensions"),
							run: () => extensionsWorkbenchService.updateRunningExtensions()
						}]
					);
				}
				else {
					notificationService.prompt(
						Severity.Info,
						vsixs.length > 1 ? localize('InstallVSIXs.successNoReload', "Completed installing extensions.") : localize('InstallVSIXAction.successNoReload', "Completed installing extension."),
						[]
					);
				}
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.installExtensionFromLocation',
			title: localize2('installExtensionFromLocation', 'Install Extension from Location...'),
			category: Categories.Developer,
			menu: [{
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.or(CONTEXT_HAS_WEB_SERVER, CONTEXT_HAS_LOCAL_SERVER)
			}],
			run: async (accessor: ServicesAccessor) => {
				const extensionManagementService = accessor.get(IWorkbenchExtensionManagementService);
				if (isWeb) {
					return new Promise<void>((c, e) => {
						const quickInputService = accessor.get(IQuickInputService);
						const disposables = new DisposableStore();
						const quickPick = disposables.add(quickInputService.createQuickPick());
						quickPick.title = localize('installFromLocation', "Install Extension from Location");
						quickPick.customButton = true;
						quickPick.customLabel = localize('install button', "Install");
						quickPick.placeholder = localize('installFromLocationPlaceHolder', "Location of the web extension");
						quickPick.ignoreFocusOut = true;
						disposables.add(Event.any(quickPick.onDidAccept, quickPick.onDidCustom)(async () => {
							quickPick.hide();
							if (quickPick.value) {
								try {
									await extensionManagementService.installFromLocation(URI.parse(quickPick.value));
								} catch (error) {
									e(error);
									return;
								}
							}
							c();
						}));
						disposables.add(quickPick.onDidHide(() => disposables.dispose()));
						quickPick.show();
					});
				} else {
					const fileDialogService = accessor.get(IFileDialogService);
					const extensionLocation = await fileDialogService.showOpenDialog({
						canSelectFolders: true,
						canSelectFiles: false,
						canSelectMany: false,
						title: localize('installFromLocation', "Install Extension from Location"),
					});
					if (extensionLocation?.[0]) {
						await extensionManagementService.installFromLocation(extensionLocation[0]);
					}
				}
			}
		});

		MenuRegistry.appendMenuItem(extensionsSearchActionsMenu, {
			submenu: extensionsFilterSubMenu,
			title: localize('filterExtensions', "Filter Extensions..."),
			group: 'navigation',
			order: 2,
			icon: filterIcon,
		});

		const showFeaturedExtensionsId = 'extensions.filter.featured';
		const featuresExtensionsWhenContext = ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.regex(CONTEXT_GALLERY_FILTER_CAPABILITIES.key, new RegExp(`_${FilterType.Featured}_`)));
		this.registerExtensionAction({
			id: showFeaturedExtensionsId,
			title: localize2('showFeaturedExtensions', 'Show Featured Extensions'),
			category: ExtensionsLocalizedLabel,
			menu: [{
				id: MenuId.CommandPalette,
				when: featuresExtensionsWhenContext
			}, {
				id: extensionsFilterSubMenu,
				when: featuresExtensionsWhenContext,
				group: '1_predefined',
				order: 1,
			}],
			menuTitles: {
				[extensionsFilterSubMenu.id]: localize('featured filter', "Featured")
			},
			run: () => this.extensionsWorkbenchService.openSearch('@featured ')
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.showPopularExtensions',
			title: localize2('showPopularExtensions', 'Show Popular Extensions'),
			category: ExtensionsLocalizedLabel,
			menu: [{
				id: MenuId.CommandPalette,
				when: CONTEXT_HAS_GALLERY
			}, {
				id: extensionsFilterSubMenu,
				when: CONTEXT_HAS_GALLERY,
				group: '1_predefined',
				order: 2,
			}],
			menuTitles: {
				[extensionsFilterSubMenu.id]: localize('most popular filter', "Most Popular")
			},
			run: () => this.extensionsWorkbenchService.openSearch('@popular ')
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.showRecommendedExtensions',
			title: localize2('showRecommendedExtensions', 'Show Recommended Extensions'),
			category: ExtensionsLocalizedLabel,
			menu: [{
				id: MenuId.CommandPalette,
				when: CONTEXT_HAS_GALLERY
			}, {
				id: extensionsFilterSubMenu,
				when: CONTEXT_HAS_GALLERY,
				group: '1_predefined',
				order: 2,
			}],
			menuTitles: {
				[extensionsFilterSubMenu.id]: localize('most popular recommended', "Recommended")
			},
			run: () => this.extensionsWorkbenchService.openSearch('@recommended ')
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.recentlyPublishedExtensions',
			title: localize2('recentlyPublishedExtensions', 'Show Recently Published Extensions'),
			category: ExtensionsLocalizedLabel,
			menu: [{
				id: MenuId.CommandPalette,
				when: CONTEXT_HAS_GALLERY
			}, {
				id: extensionsFilterSubMenu,
				when: CONTEXT_HAS_GALLERY,
				group: '1_predefined',
				order: 2,
			}],
			menuTitles: {
				[extensionsFilterSubMenu.id]: localize('recently published filter', "Recently Published")
			},
			run: () => this.extensionsWorkbenchService.openSearch('@recentlyPublished ')
		});

		const extensionsCategoryFilterSubMenu = new MenuId('extensionsCategoryFilterSubMenu');
		MenuRegistry.appendMenuItem(extensionsFilterSubMenu, {
			submenu: extensionsCategoryFilterSubMenu,
			title: localize('filter by category', "Category"),
			when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.regex(CONTEXT_GALLERY_FILTER_CAPABILITIES.key, new RegExp(`_${FilterType.Category}_`))),
			group: '2_categories',
			order: 1,
		});

		EXTENSION_CATEGORIES.forEach((category, index) => {
			this.registerExtensionAction({
				id: `extensions.actions.searchByCategory.${category}`,
				title: category,
				menu: [{
					id: extensionsCategoryFilterSubMenu,
					when: CONTEXT_HAS_GALLERY,
					order: index,
				}],
				run: () => this.extensionsWorkbenchService.openSearch(`@category:"${category.toLowerCase()}"`)
			});
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.installedExtensions',
			title: localize2('installedExtensions', 'Show Installed Extensions'),
			category: ExtensionsLocalizedLabel,
			f1: true,
			menu: [{
				id: extensionsFilterSubMenu,
				group: '3_installed',
				order: 1,
			}],
			menuTitles: {
				[extensionsFilterSubMenu.id]: localize('installed filter', "Installed")
			},
			run: () => this.extensionsWorkbenchService.openSearch('@installed ')
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.listBuiltInExtensions',
			title: localize2('showBuiltInExtensions', 'Show Built-in Extensions'),
			category: ExtensionsLocalizedLabel,
			menu: [{
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER)
			}, {
				id: extensionsFilterSubMenu,
				group: '3_installed',
				order: 3,
			}],
			menuTitles: {
				[extensionsFilterSubMenu.id]: localize('builtin filter', "Built-in")
			},
			run: () => this.extensionsWorkbenchService.openSearch('@builtin ')
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.extensionUpdates',
			title: localize2('extensionUpdates', 'Show Extension Updates'),
			category: ExtensionsLocalizedLabel,
			precondition: CONTEXT_HAS_GALLERY,
			f1: true,
			menu: [{
				id: extensionsFilterSubMenu,
				group: '3_installed',
				when: CONTEXT_HAS_GALLERY,
				order: 2,
			}],
			menuTitles: {
				[extensionsFilterSubMenu.id]: localize('extension updates filter', "Updates")
			},
			run: () => this.extensionsWorkbenchService.openSearch('@updates')
		});

		this.registerExtensionAction({
			id: LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID,
			title: localize2('showWorkspaceUnsupportedExtensions', 'Show Extensions Unsupported By Workspace'),
			category: ExtensionsLocalizedLabel,
			menu: [{
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER),
			}, {
				id: extensionsFilterSubMenu,
				group: '3_installed',
				order: 6,
				when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER),
			}],
			menuTitles: {
				[extensionsFilterSubMenu.id]: localize('workspace unsupported filter', "Workspace Unsupported")
			},
			run: () => this.extensionsWorkbenchService.openSearch('@workspaceUnsupported')
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.showEnabledExtensions',
			title: localize2('showEnabledExtensions', 'Show Enabled Extensions'),
			category: ExtensionsLocalizedLabel,
			menu: [{
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER)
			}, {
				id: extensionsFilterSubMenu,
				group: '3_installed',
				order: 4,
			}],
			menuTitles: {
				[extensionsFilterSubMenu.id]: localize('enabled filter', "Enabled")
			},
			run: () => this.extensionsWorkbenchService.openSearch('@enabled ')
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.showDisabledExtensions',
			title: localize2('showDisabledExtensions', 'Show Disabled Extensions'),
			category: ExtensionsLocalizedLabel,
			menu: [{
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER)
			}, {
				id: extensionsFilterSubMenu,
				group: '3_installed',
				order: 5,
			}],
			menuTitles: {
				[extensionsFilterSubMenu.id]: localize('disabled filter', "Disabled")
			},
			run: () => this.extensionsWorkbenchService.openSearch('@disabled ')
		});

		const extensionsSortSubMenu = new MenuId('extensionsSortSubMenu');
		MenuRegistry.appendMenuItem(extensionsFilterSubMenu, {
			submenu: extensionsSortSubMenu,
			title: localize('sorty by', "Sort By"),
			when: ContextKeyExpr.and(ContextKeyExpr.or(CONTEXT_HAS_GALLERY, DefaultViewsContext)),
			group: '4_sort',
			order: 1,
		});

		[
			{ id: 'installs', title: localize('sort by installs', "Install Count"), precondition: BuiltInExtensionsContext.negate(), sortCapability: SortBy.InstallCount },
			{ id: 'rating', title: localize('sort by rating', "Rating"), precondition: BuiltInExtensionsContext.negate(), sortCapability: SortBy.WeightedRating },
			{ id: 'name', title: localize('sort by name', "Name"), precondition: BuiltInExtensionsContext.negate(), sortCapability: SortBy.Title },
			{ id: 'publishedDate', title: localize('sort by published date', "Published Date"), precondition: BuiltInExtensionsContext.negate(), sortCapability: SortBy.PublishedDate },
			{ id: 'updateDate', title: localize('sort by update date', "Updated Date"), precondition: ContextKeyExpr.and(SearchMarketplaceExtensionsContext.negate(), RecommendedExtensionsContext.negate(), BuiltInExtensionsContext.negate()), sortCapability: 'UpdateDate' },
		].map(({ id, title, precondition, sortCapability }, index) => {
			const sortCapabilityContext = ContextKeyExpr.regex(CONTEXT_GALLERY_SORT_CAPABILITIES.key, new RegExp(`_${sortCapability}_`));
			this.registerExtensionAction({
				id: `extensions.sort.${id}`,
				title,
				precondition: ContextKeyExpr.and(precondition, ContextKeyExpr.regex(ExtensionsSearchValueContext.key, /^@feature:/).negate(), sortCapabilityContext),
				menu: [{
					id: extensionsSortSubMenu,
					when: ContextKeyExpr.and(ContextKeyExpr.or(CONTEXT_HAS_GALLERY, DefaultViewsContext), sortCapabilityContext),
					order: index,
				}],
				toggled: ExtensionsSortByContext.isEqualTo(id),
				run: async () => {
					const extensionsViewPaneContainer = ((await this.viewsService.openViewContainer(VIEWLET_ID, true))?.getViewPaneContainer()) as IExtensionsViewPaneContainer | undefined;
					const currentQuery = Query.parse(extensionsViewPaneContainer?.searchValue ?? '');
					extensionsViewPaneContainer?.search(new Query(currentQuery.value, id).toString());
					extensionsViewPaneContainer?.focus();
				}
			});
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.clearExtensionsSearchResults',
			title: localize2('clearExtensionsSearchResults', 'Clear Extensions Search Results'),
			category: ExtensionsLocalizedLabel,
			icon: clearSearchResultsIcon,
			f1: true,
			precondition: SearchHasTextContext,
			menu: {
				id: extensionsSearchActionsMenu,
				group: 'navigation',
				order: 1,
			},
			run: async (accessor: ServicesAccessor) => {
				const viewPaneContainer = accessor.get(IViewsService).getActiveViewPaneContainerWithId(VIEWLET_ID);
				if (viewPaneContainer) {
					const extensionsViewPaneContainer = viewPaneContainer as IExtensionsViewPaneContainer;
					extensionsViewPaneContainer.search('');
					extensionsViewPaneContainer.focus();
				}
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.refreshExtension',
			title: localize2('refreshExtension', 'Refresh'),
			category: ExtensionsLocalizedLabel,
			icon: refreshIcon,
			f1: true,
			menu: {
				id: MenuId.ViewContainerTitle,
				when: ContextKeyExpr.equals('viewContainer', VIEWLET_ID),
				group: 'navigation',
				order: 2
			},
			run: async (accessor: ServicesAccessor) => {
				const viewPaneContainer = accessor.get(IViewsService).getActiveViewPaneContainerWithId(VIEWLET_ID);
				if (viewPaneContainer) {
					await (viewPaneContainer as IExtensionsViewPaneContainer).refresh();
				}
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.installWorkspaceRecommendedExtensions',
			title: localize('installWorkspaceRecommendedExtensions', "Install Workspace Recommended Extensions"),
			icon: installWorkspaceRecommendedIcon,
			menu: {
				id: MenuId.ViewTitle,
				when: ContextKeyExpr.equals('view', WORKSPACE_RECOMMENDATIONS_VIEW_ID),
				group: 'navigation',
				order: 1
			},
			run: async (accessor: ServicesAccessor) => {
				const view = accessor.get(IViewsService).getActiveViewWithId(WORKSPACE_RECOMMENDATIONS_VIEW_ID) as IWorkspaceRecommendedExtensionsView;
				return view.installWorkspaceRecommendations();
			}
		});

		this.registerExtensionAction({
			id: ConfigureWorkspaceFolderRecommendedExtensionsAction.ID,
			title: ConfigureWorkspaceFolderRecommendedExtensionsAction.LABEL,
			icon: configureRecommendedIcon,
			menu: [{
				id: MenuId.CommandPalette,
				when: WorkbenchStateContext.notEqualsTo('empty'),
			}, {
				id: MenuId.ViewTitle,
				when: ContextKeyExpr.equals('view', WORKSPACE_RECOMMENDATIONS_VIEW_ID),
				group: 'navigation',
				order: 2
			}],
			run: () => runAction(this.instantiationService.createInstance(ConfigureWorkspaceFolderRecommendedExtensionsAction, ConfigureWorkspaceFolderRecommendedExtensionsAction.ID, ConfigureWorkspaceFolderRecommendedExtensionsAction.LABEL))
		});

		this.registerExtensionAction({
			id: InstallSpecificVersionOfExtensionAction.ID,
			title: { value: InstallSpecificVersionOfExtensionAction.LABEL, original: 'Install Specific Version of Extension...' },
			category: ExtensionsLocalizedLabel,
			menu: {
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.or(CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER))
			},
			run: () => runAction(this.instantiationService.createInstance(InstallSpecificVersionOfExtensionAction, InstallSpecificVersionOfExtensionAction.ID, InstallSpecificVersionOfExtensionAction.LABEL))
		});
	}

	// Extension Context Menu
	private registerContextMenuActions(): void {

		this.registerExtensionAction({
			id: SetColorThemeAction.ID,
			title: SetColorThemeAction.TITLE,
			menu: {
				id: MenuId.ExtensionContext,
				group: THEME_ACTIONS_GROUP,
				order: 0,
				when: ContextKeyExpr.and(ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasColorThemes'))
			},
			run: async (accessor: ServicesAccessor, extensionId: string) => {
				const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
				const instantiationService = accessor.get(IInstantiationService);
				const extension = extensionWorkbenchService.local.find(e => areSameExtensions(e.identifier, { id: extensionId }));
				if (extension) {
					const action = instantiationService.createInstance(SetColorThemeAction);
					action.extension = extension;
					return action.run();
				}
			}
		});

		this.registerExtensionAction({
			id: SetFileIconThemeAction.ID,
			title: SetFileIconThemeAction.TITLE,
			menu: {
				id: MenuId.ExtensionContext,
				group: THEME_ACTIONS_GROUP,
				order: 0,
				when: ContextKeyExpr.and(ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasFileIconThemes'))
			},
			run: async (accessor: ServicesAccessor, extensionId: string) => {
				const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
				const instantiationService = accessor.get(IInstantiationService);
				const extension = extensionWorkbenchService.local.find(e => areSameExtensions(e.identifier, { id: extensionId }));
				if (extension) {
					const action = instantiationService.createInstance(SetFileIconThemeAction);
					action.extension = extension;
					return action.run();
				}
			}
		});

		this.registerExtensionAction({
			id: SetProductIconThemeAction.ID,
			title: SetProductIconThemeAction.TITLE,
			menu: {
				id: MenuId.ExtensionContext,
				group: THEME_ACTIONS_GROUP,
				order: 0,
				when: ContextKeyExpr.and(ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasProductIconThemes'))
			},
			run: async (accessor: ServicesAccessor, extensionId: string) => {
				const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
				const instantiationService = accessor.get(IInstantiationService);
				const extension = extensionWorkbenchService.local.find(e => areSameExtensions(e.identifier, { id: extensionId }));
				if (extension) {
					const action = instantiationService.createInstance(SetProductIconThemeAction);
					action.extension = extension;
					return action.run();
				}
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.showPreReleaseVersion',
			title: localize2('show pre-release version', 'Show Pre-Release Version'),
			menu: {
				id: MenuId.ExtensionContext,
				group: INSTALL_ACTIONS_GROUP,
				order: 0,
				when: ContextKeyExpr.and(ContextKeyExpr.has('inExtensionEditor'), ContextKeyExpr.has('galleryExtensionHasPreReleaseVersion'), ContextKeyExpr.has('isPreReleaseExtensionAllowed'), ContextKeyExpr.not('showPreReleaseVersion'), ContextKeyExpr.not('isBuiltinExtension'))
			},
			run: async (accessor: ServicesAccessor, extensionId: string) => {
				const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
				const extension = (await extensionWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
				extensionWorkbenchService.open(extension, { showPreReleaseVersion: true });
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.showReleasedVersion',
			title: localize2('show released version', 'Show Release Version'),
			category: ExtensionsLocalizedLabel,
			menu: {
				id: MenuId.ExtensionContext,
				group: INSTALL_ACTIONS_GROUP,
				order: 1,
				when: ContextKeyExpr.and(ContextKeyExpr.has('inExtensionEditor'), ContextKeyExpr.has('galleryExtensionHasPreReleaseVersion'), ContextKeyExpr.has('extensionHasReleaseVersion'), ContextKeyExpr.has('showPreReleaseVersion'), ContextKeyExpr.not('isBuiltinExtension'))
			},
			run: async (accessor: ServicesAccessor, extensionId: string) => {
				const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
				const extension = (await extensionWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
				extensionWorkbenchService.open(extension, { showPreReleaseVersion: false });
			}
		});

		this.registerExtensionAction({
			id: ToggleAutoUpdateForExtensionAction.ID,
			title: ToggleAutoUpdateForExtensionAction.LABEL,
			category: ExtensionsLocalizedLabel,
			precondition: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.notEquals(`config.${AutoUpdateConfigurationKey}`, 'onlyEnabledExtensions'), ContextKeyExpr.equals('isExtensionEnabled', true)), ContextKeyExpr.not('extensionDisallowInstall'), ContextKeyExpr.has('isExtensionAllowed')),
			menu: {
				id: MenuId.ExtensionContext,
				group: UPDATE_ACTIONS_GROUP,
				order: 1,
				when: ContextKeyExpr.and(
					ContextKeyExpr.not('inExtensionEditor'),
					ContextKeyExpr.equals('extensionStatus', 'installed'),
					ContextKeyExpr.not('isBuiltinExtension'),
				)
			},
			run: async (accessor: ServicesAccessor, id: string) => {
				const instantiationService = accessor.get(IInstantiationService);
				const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
				const extension = extensionWorkbenchService.local.find(e => areSameExtensions(e.identifier, { id }));
				if (extension) {
					const action = instantiationService.createInstance(ToggleAutoUpdateForExtensionAction);
					action.extension = extension;
					return action.run();
				}
			}
		});

		this.registerExtensionAction({
			id: ToggleAutoUpdatesForPublisherAction.ID,
			title: { value: ToggleAutoUpdatesForPublisherAction.LABEL, original: 'Auto Update (Publisher)' },
			category: ExtensionsLocalizedLabel,
			precondition: ContextKeyExpr.equals(`config.${AutoUpdateConfigurationKey}`, false),
			menu: {
				id: MenuId.ExtensionContext,
				group: UPDATE_ACTIONS_GROUP,
				order: 2,
				when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.not('isBuiltinExtension'))
			},
			run: async (accessor: ServicesAccessor, id: string) => {
				const instantiationService = accessor.get(IInstantiationService);
				const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
				const extension = extensionWorkbenchService.local.find(e => areSameExtensions(e.identifier, { id }));
				if (extension) {
					const action = instantiationService.createInstance(ToggleAutoUpdatesForPublisherAction);
					action.extension = extension;
					return action.run();
				}
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.switchToPreRlease',
			title: localize('enablePreRleaseLabel', "Switch to Pre-Release Version"),
			category: ExtensionsLocalizedLabel,
			menu: {
				id: MenuId.ExtensionContext,
				group: INSTALL_ACTIONS_GROUP,
				order: 2,
				when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.has('galleryExtensionHasPreReleaseVersion'), ContextKeyExpr.has('isPreReleaseExtensionAllowed'), ContextKeyExpr.not('installedExtensionIsOptedToPreRelease'), ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.not('isBuiltinExtension'))
			},
			run: async (accessor: ServicesAccessor, id: string) => {
				const instantiationService = accessor.get(IInstantiationService);
				const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
				const extension = extensionWorkbenchService.local.find(e => areSameExtensions(e.identifier, { id }));
				if (extension) {
					const action = instantiationService.createInstance(TogglePreReleaseExtensionAction);
					action.extension = extension;
					return action.run();
				}
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.switchToRelease',
			title: localize('disablePreRleaseLabel', "Switch to Release Version"),
			category: ExtensionsLocalizedLabel,
			menu: {
				id: MenuId.ExtensionContext,
				group: INSTALL_ACTIONS_GROUP,
				order: 2,
				when: ContextKeyExpr.and(CONTEXT_HAS_GALLERY, ContextKeyExpr.has('galleryExtensionHasPreReleaseVersion'), ContextKeyExpr.has('isExtensionAllowed'), ContextKeyExpr.has('installedExtensionIsOptedToToPreRelease'), ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.not('isBuiltinExtension'))
			},
			run: async (accessor: ServicesAccessor, id: string) => {
				const instantiationService = accessor.get(IInstantiationService);
				const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
				const extension = extensionWorkbenchService.local.find(e => areSameExtensions(e.identifier, { id }));
				if (extension) {
					const action = instantiationService.createInstance(TogglePreReleaseExtensionAction);
					action.extension = extension;
					return action.run();
				}
			}
		});

		this.registerExtensionAction({
			id: ClearLanguageAction.ID,
			title: ClearLanguageAction.TITLE,
			menu: {
				id: MenuId.ExtensionContext,
				group: INSTALL_ACTIONS_GROUP,
				order: 0,
				when: ContextKeyExpr.and(ContextKeyExpr.not('inExtensionEditor'), ContextKeyExpr.has('canSetLanguage'), ContextKeyExpr.has('isActiveLanguagePackExtension'))
			},
			run: async (accessor: ServicesAccessor, extensionId: string) => {
				const instantiationService = accessor.get(IInstantiationService);
				const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
				const extension = (await extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
				const action = instantiationService.createInstance(ClearLanguageAction);
				action.extension = extension;
				return action.run();
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.installUnsigned',
			title: localize('install', "Install"),
			menu: {
				id: MenuId.ExtensionContext,
				group: '0_install',
				when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'uninstalled'), ContextKeyExpr.has('isGalleryExtension'), ContextKeyExpr.not('extensionDisallowInstall'), ContextKeyExpr.has('extensionIsUnsigned'),
					ContextKeyExpr.or(ContextKeyExpr.and(CONTEXT_GALLERY_ALL_PUBLIC_REPOSITORY_SIGNED, ContextKeyExpr.not('extensionIsPrivate')), ContextKeyExpr.and(CONTEXT_GALLERY_ALL_PRIVATE_REPOSITORY_SIGNED, ContextKeyExpr.has('extensionIsPrivate')))),
				order: 1
			},
			run: async (accessor: ServicesAccessor, extensionId: string) => {
				const instantiationService = accessor.get(IInstantiationService);
				const extension = this.extensionsWorkbenchService.local.filter(e => areSameExtensions(e.identifier, { id: extensionId }))[0]
					|| (await this.extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
				if (extension) {
					const action = instantiationService.createInstance(InstallAction, { installPreReleaseVersion: this.extensionManagementService.preferPreReleases });
					action.extension = extension;
					return action.run();
				}
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.installAndDonotSync',
			title: localize('install installAndDonotSync', "Install (Do not Sync)"),
			menu: {
				id: MenuId.ExtensionContext,
				group: '0_install',
				when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'uninstalled'), ContextKeyExpr.has('isGalleryExtension'), ContextKeyExpr.has('isExtensionAllowed'), ContextKeyExpr.not('extensionDisallowInstall'), CONTEXT_SYNC_ENABLEMENT),
				order: 1
			},
			run: async (accessor: ServicesAccessor, extensionId: string) => {
				const instantiationService = accessor.get(IInstantiationService);
				const extension = this.extensionsWorkbenchService.local.filter(e => areSameExtensions(e.identifier, { id: extensionId }))[0]
					|| (await this.extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
				if (extension) {
					const action = instantiationService.createInstance(InstallAction, {
						installPreReleaseVersion: this.extensionManagementService.preferPreReleases,
						isMachineScoped: true,
					});
					action.extension = extension;
					return action.run();
				}
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.installPrereleaseAndDonotSync',
			title: localize('installPrereleaseAndDonotSync', "Install Pre-Release (Do not Sync)"),
			menu: {
				id: MenuId.ExtensionContext,
				group: '0_install',
				when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'uninstalled'), ContextKeyExpr.has('isGalleryExtension'), ContextKeyExpr.has('extensionHasPreReleaseVersion'), ContextKeyExpr.has('isPreReleaseExtensionAllowed'), ContextKeyExpr.not('extensionDisallowInstall'), CONTEXT_SYNC_ENABLEMENT),
				order: 2
			},
			run: async (accessor: ServicesAccessor, extensionId: string) => {
				const instantiationService = accessor.get(IInstantiationService);
				const extension = this.extensionsWorkbenchService.local.filter(e => areSameExtensions(e.identifier, { id: extensionId }))[0]
					|| (await this.extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
				if (extension) {
					const action = instantiationService.createInstance(InstallAction, {
						isMachineScoped: true,
						preRelease: true
					});
					action.extension = extension;
					return action.run();
				}
			}
		});

		this.registerExtensionAction({
			id: InstallAnotherVersionAction.ID,
			title: InstallAnotherVersionAction.LABEL,
			menu: {
				id: MenuId.ExtensionContext,
				group: '0_install',
				when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'uninstalled'), ContextKeyExpr.has('isGalleryExtension'), ContextKeyExpr.has('isExtensionAllowed'), ContextKeyExpr.not('extensionDisallowInstall')),
				order: 3
			},
			run: async (accessor: ServicesAccessor, extensionId: string) => {
				const instantiationService = accessor.get(IInstantiationService);
				const extension = this.extensionsWorkbenchService.local.filter(e => areSameExtensions(e.identifier, { id: extensionId }))[0]
					|| (await this.extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
				if (extension) {
					return instantiationService.createInstance(InstallAnotherVersionAction, extension, false).run();
				}
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.copyExtension',
			title: localize2('workbench.extensions.action.copyExtension', 'Copy'),
			menu: {
				id: MenuId.ExtensionContext,
				group: '1_copy'
			},
			run: async (accessor: ServicesAccessor, extensionId: string) => {
				const clipboardService = accessor.get(IClipboardService);
				const extension = this.extensionsWorkbenchService.local.filter(e => areSameExtensions(e.identifier, { id: extensionId }))[0]
					|| (await this.extensionsWorkbenchService.getExtensions([{ id: extensionId }], CancellationToken.None))[0];
				if (extension) {
					const name = localize('extensionInfoName', 'Name: {0}', extension.displayName);
					const id = localize('extensionInfoId', 'Id: {0}', extensionId);
					const description = localize('extensionInfoDescription', 'Description: {0}', extension.description);
					const verision = localize('extensionInfoVersion', 'Version: {0}', extension.version);
					const publisher = localize('extensionInfoPublisher', 'Publisher: {0}', extension.publisherDisplayName);
					const link = extension.url ? localize('extensionInfoVSMarketplaceLink', 'VS Marketplace Link: {0}', `${extension.url}`) : null;
					const clipboardStr = `${name}\n${id}\n${description}\n${verision}\n${publisher}${link ? '\n' + link : ''}`;
					await clipboardService.writeText(clipboardStr);
				}
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.copyExtensionId',
			title: localize2('workbench.extensions.action.copyExtensionId', 'Copy Extension ID'),
			menu: {
				id: MenuId.ExtensionContext,
				group: '1_copy'
			},
			run: async (accessor: ServicesAccessor, id: string) => accessor.get(IClipboardService).writeText(id)
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.copyLink',
			title: localize2('workbench.extensions.action.copyLink', 'Copy Link'),
			menu: {
				id: MenuId.ExtensionContext,
				group: '1_copy',
				when: ContextKeyExpr.and(ContextKeyExpr.has('isGalleryExtension'), CONTEXT_GALLERY_HAS_EXTENSION_LINK),
			},
			run: async (accessor: ServicesAccessor, _, extension: IExtensionArg) => {
				const clipboardService = accessor.get(IClipboardService);
				if (extension.galleryLink) {
					await clipboardService.writeText(extension.galleryLink);
				}
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.configure',
			title: localize2('workbench.extensions.action.configure', 'Settings'),
			menu: {
				id: MenuId.ExtensionContext,
				group: '2_configure',
				when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasConfiguration')),
				order: 1
			},
			run: async (accessor: ServicesAccessor, id: string) => accessor.get(IPreferencesService).openSettings({ jsonEditor: false, query: `@ext:${id}` })
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.download',
			title: localize('download VSIX', "Download VSIX"),
			menu: {
				id: MenuId.ExtensionContext,
				when: ContextKeyExpr.and(ContextKeyExpr.not('extensionDisallowInstall'), ContextKeyExpr.has('isGalleryExtension')),
				order: this.productService.quality === 'stable' ? 0 : 1
			},
			run: async (accessor: ServicesAccessor, extensionId: string) => {
				accessor.get(IExtensionsWorkbenchService).downloadVSIX(extensionId, 'release');
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.downloadPreRelease',
			title: localize('download pre-release', "Download Pre-Release VSIX"),
			menu: {
				id: MenuId.ExtensionContext,
				when: ContextKeyExpr.and(ContextKeyExpr.not('extensionDisallowInstall'), ContextKeyExpr.has('isGalleryExtension'), ContextKeyExpr.has('extensionHasPreReleaseVersion')),
				order: this.productService.quality === 'stable' ? 1 : 0
			},
			run: async (accessor: ServicesAccessor, extensionId: string) => {
				accessor.get(IExtensionsWorkbenchService).downloadVSIX(extensionId, 'prerelease');
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.downloadSpecificVersion',
			title: localize('download specific version', "Download Specific Version VSIX..."),
			menu: {
				id: MenuId.ExtensionContext,
				when: ContextKeyExpr.and(ContextKeyExpr.not('extensionDisallowInstall'), ContextKeyExpr.has('isGalleryExtension')),
				order: 2
			},
			run: async (accessor: ServicesAccessor, extensionId: string) => {
				accessor.get(IExtensionsWorkbenchService).downloadVSIX(extensionId, 'any');
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.manageAccountPreferences',
			title: localize2('workbench.extensions.action.changeAccountPreference', "Account Preferences"),
			menu: {
				id: MenuId.ExtensionContext,
				group: '2_configure',
				when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasAccountPreferences')),
				order: 2,
			},
			run: (accessor: ServicesAccessor, id: string) => accessor.get(ICommandService).executeCommand('_manageAccountPreferencesForExtension', id)
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.configureKeybindings',
			title: localize2('workbench.extensions.action.configureKeybindings', 'Keyboard Shortcuts'),
			menu: {
				id: MenuId.ExtensionContext,
				group: '2_configure',
				when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasKeybindings')),
				order: 2
			},
			run: async (accessor: ServicesAccessor, id: string) => accessor.get(IPreferencesService).openGlobalKeybindingSettings(false, { query: `@ext:${id}` })
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.toggleApplyToAllProfiles',
			title: localize2('workbench.extensions.action.toggleApplyToAllProfiles', "Apply Extension to all Profiles"),
			toggled: ContextKeyExpr.has('isApplicationScopedExtension'),
			menu: {
				id: MenuId.ExtensionContext,
				group: '2_configure',
				when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('isDefaultApplicationScopedExtension').negate(), ContextKeyExpr.has('isBuiltinExtension').negate(), ContextKeyExpr.equals('isWorkspaceScopedExtension', false)),
				order: 3
			},
			run: async (accessor: ServicesAccessor, _: string, extensionArg: IExtensionArg) => {
				const uriIdentityService = accessor.get(IUriIdentityService);
				const extension = extensionArg.location ? this.extensionsWorkbenchService.installed.find(e => uriIdentityService.extUri.isEqual(e.local?.location, extensionArg.location)) : undefined;
				if (extension) {
					return this.extensionsWorkbenchService.toggleApplyExtensionToAllProfiles(extension);
				}
			}
		});

		this.registerExtensionAction({
			id: TOGGLE_IGNORE_EXTENSION_ACTION_ID,
			title: localize2('workbench.extensions.action.toggleIgnoreExtension', "Sync This Extension"),
			menu: {
				id: MenuId.ExtensionContext,
				group: '2_configure',
				when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), CONTEXT_SYNC_ENABLEMENT, ContextKeyExpr.equals('isWorkspaceScopedExtension', false)),
				order: 4
			},
			run: async (accessor: ServicesAccessor, id: string) => {
				const extension = this.extensionsWorkbenchService.local.find(e => areSameExtensions({ id }, e.identifier));
				if (extension) {
					return this.extensionsWorkbenchService.toggleExtensionIgnoredToSync(extension);
				}
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.ignoreRecommendation',
			title: localize2('workbench.extensions.action.ignoreRecommendation', "Ignore Recommendation"),
			menu: {
				id: MenuId.ExtensionContext,
				group: '3_recommendations',
				when: ContextKeyExpr.has('isExtensionRecommended'),
				order: 1
			},
			run: async (accessor: ServicesAccessor, id: string) => accessor.get(IExtensionIgnoredRecommendationsService).toggleGlobalIgnoredRecommendation(id, true)
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.undoIgnoredRecommendation',
			title: localize2('workbench.extensions.action.undoIgnoredRecommendation', "Undo Ignored Recommendation"),
			menu: {
				id: MenuId.ExtensionContext,
				group: '3_recommendations',
				when: ContextKeyExpr.has('isUserIgnoredRecommendation'),
				order: 1
			},
			run: async (accessor: ServicesAccessor, id: string) => accessor.get(IExtensionIgnoredRecommendationsService).toggleGlobalIgnoredRecommendation(id, false)
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.addExtensionToWorkspaceRecommendations',
			title: localize2('workbench.extensions.action.addExtensionToWorkspaceRecommendations', "Add to Workspace Recommendations"),
			menu: {
				id: MenuId.ExtensionContext,
				group: '3_recommendations',
				when: ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('empty'), ContextKeyExpr.has('isBuiltinExtension').negate(), ContextKeyExpr.has('isExtensionWorkspaceRecommended').negate(), ContextKeyExpr.has('isUserIgnoredRecommendation').negate(), ContextKeyExpr.notEquals('extensionSource', 'resource')),
				order: 2
			},
			run: (accessor: ServicesAccessor, id: string) => accessor.get(IWorkspaceExtensionsConfigService).toggleRecommendation(id)
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.removeExtensionFromWorkspaceRecommendations',
			title: localize2('workbench.extensions.action.removeExtensionFromWorkspaceRecommendations', "Remove from Workspace Recommendations"),
			menu: {
				id: MenuId.ExtensionContext,
				group: '3_recommendations',
				when: ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('empty'), ContextKeyExpr.has('isBuiltinExtension').negate(), ContextKeyExpr.has('isExtensionWorkspaceRecommended')),
				order: 2
			},
			run: (accessor: ServicesAccessor, id: string) => accessor.get(IWorkspaceExtensionsConfigService).toggleRecommendation(id)
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.addToWorkspaceRecommendations',
			title: localize2('workbench.extensions.action.addToWorkspaceRecommendations', "Add Extension to Workspace Recommendations"),
			category: EXTENSIONS_CATEGORY,
			menu: {
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace'), ContextKeyExpr.equals('resourceScheme', Schemas.extension)),
			},
			async run(accessor: ServicesAccessor): Promise<any> {
				const editorService = accessor.get(IEditorService);
				const workspaceExtensionsConfigService = accessor.get(IWorkspaceExtensionsConfigService);
				if (!(editorService.activeEditor instanceof ExtensionsInput)) {
					return;
				}
				const extensionId = editorService.activeEditor.extension.identifier.id.toLowerCase();
				const recommendations = await workspaceExtensionsConfigService.getRecommendations();
				if (recommendations.includes(extensionId)) {
					return;
				}
				await workspaceExtensionsConfigService.toggleRecommendation(extensionId);
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.addToWorkspaceFolderRecommendations',
			title: localize2('workbench.extensions.action.addToWorkspaceFolderRecommendations', "Add Extension to Workspace Folder Recommendations"),
			category: EXTENSIONS_CATEGORY,
			menu: {
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('folder'),
					ContextKeyExpr.equals('resourceScheme', Schemas.extension)),
			},
			run: () => this.commandService.executeCommand('workbench.extensions.action.addToWorkspaceRecommendations')
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.addToWorkspaceIgnoredRecommendations',
			title: localize2('workbench.extensions.action.addToWorkspaceIgnoredRecommendations', "Add Extension to Workspace Ignored Recommendations"),
			category: EXTENSIONS_CATEGORY,
			menu: {
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace'), ContextKeyExpr.equals('resourceScheme', Schemas.extension)),
			},
			async run(accessor: ServicesAccessor): Promise<any> {
				const editorService = accessor.get(IEditorService);
				const workspaceExtensionsConfigService = accessor.get(IWorkspaceExtensionsConfigService);
				if (!(editorService.activeEditor instanceof ExtensionsInput)) {
					return;
				}
				const extensionId = editorService.activeEditor.extension.identifier.id.toLowerCase();
				const unwantedRecommendations = await workspaceExtensionsConfigService.getUnwantedRecommendations();
				if (unwantedRecommendations.includes(extensionId)) {
					return;
				}
				await workspaceExtensionsConfigService.toggleUnwantedRecommendation(extensionId);
			}
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.addToWorkspaceFolderIgnoredRecommendations',
			title: localize2('workbench.extensions.action.addToWorkspaceFolderIgnoredRecommendations', "Add Extension to Workspace Folder Recommendations"),
			category: EXTENSIONS_CATEGORY,
			menu: {
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('folder'), ContextKeyExpr.equals('resourceScheme', Schemas.extension)),
			},
			run: () => this.commandService.executeCommand('workbench.extensions.action.addToWorkspaceIgnoredRecommendations')
		});

		this.registerExtensionAction({
			id: ConfigureWorkspaceRecommendedExtensionsAction.ID,
			title: { value: ConfigureWorkspaceRecommendedExtensionsAction.LABEL, original: 'Configure Recommended Extensions (Workspace)' },
			category: EXTENSIONS_CATEGORY,
			menu: {
				id: MenuId.CommandPalette,
				when: WorkbenchStateContext.isEqualTo('workspace'),
			},
			run: () => runAction(this.instantiationService.createInstance(ConfigureWorkspaceRecommendedExtensionsAction, ConfigureWorkspaceRecommendedExtensionsAction.ID, ConfigureWorkspaceRecommendedExtensionsAction.LABEL))
		});

		this.registerExtensionAction({
			id: 'workbench.extensions.action.manageTrustedPublishers',
			title: localize2('workbench.extensions.action.manageTrustedPublishers', "Manage Trusted Extension Publishers"),
			category: EXTENSIONS_CATEGORY,
			f1: true,
			run: async (accessor: ServicesAccessor) => {
				const quickInputService = accessor.get(IQuickInputService);
				const extensionManagementService = accessor.get(IWorkbenchExtensionManagementService);
				const trustedPublishers = extensionManagementService.getTrustedPublishers();
				const trustedPublisherItems = trustedPublishers.map(publisher => ({
					id: publisher.publisher,
					label: publisher.publisherDisplayName,
					description: publisher.publisher,
					picked: true,
				})).sort((a, b) => a.label.localeCompare(b.label));
				const result = await quickInputService.pick(trustedPublisherItems, {
					canPickMany: true,
					title: localize('trustedPublishers', "Manage Trusted Extension Publishers"),
					placeHolder: localize('trustedPublishersPlaceholder', "Choose which publishers to trust"),
				});
				if (result) {
					const untrustedPublishers = [];
					for (const { publisher } of trustedPublishers) {
						if (!result.some(r => r.id === publisher)) {
							untrustedPublishers.push(publisher);
						}
					}
					trustedPublishers.filter(publisher => !result.some(r => r.id === publisher.publisher));
					extensionManagementService.untrustPublishers(...untrustedPublishers);
				}
			}
		});

	}

	private registerExtensionAction(extensionActionOptions: IExtensionActionOptions): IDisposable {
		const menus = extensionActionOptions.menu ? Array.isArray(extensionActionOptions.menu) ? extensionActionOptions.menu : [extensionActionOptions.menu] : [];
		let menusWithOutTitles: ({ id: MenuId } & Omit<IMenuItem, 'command'>)[] = [];
		const menusWithTitles: { id: MenuId; item: IMenuItem }[] = [];
		if (extensionActionOptions.menuTitles) {
			for (let index = 0; index < menus.length; index++) {
				const menu = menus[index];
				const menuTitle = extensionActionOptions.menuTitles[menu.id.id];
				if (menuTitle) {
					menusWithTitles.push({ id: menu.id, item: { ...menu, command: { id: extensionActionOptions.id, title: menuTitle } } });
				} else {
					menusWithOutTitles.push(menu);
				}
			}
		} else {
			menusWithOutTitles = menus;
		}
		const disposables = new DisposableStore();
		disposables.add(registerAction2(class extends Action2 {
			constructor() {
				super({
					...extensionActionOptions,
					menu: menusWithOutTitles
				});
			}
			run(accessor: ServicesAccessor, ...args: any[]): Promise<any> {
				return extensionActionOptions.run(accessor, ...args);
			}
		}));
		if (menusWithTitles.length) {
			disposables.add(MenuRegistry.appendMenuItems(menusWithTitles));
		}
		return disposables;
	}

}

class ExtensionStorageCleaner implements IWorkbenchContribution {

	constructor(
		@IExtensionManagementService extensionManagementService: IExtensionManagementService,
		@IStorageService storageService: IStorageService,
	) {
		ExtensionStorageService.removeOutdatedExtensionVersions(extensionManagementService, storageService);
	}
}

class TrustedPublishersInitializer implements IWorkbenchContribution {
	constructor(
		@IWorkbenchExtensionManagementService extensionManagementService: IWorkbenchExtensionManagementService,
		@IUserDataProfilesService userDataProfilesService: IUserDataProfilesService,
		@IProductService productService: IProductService,
		@IStorageService storageService: IStorageService,
	) {
		const trustedPublishersInitStatusKey = 'trusted-publishers-init-migration';
		if (!storageService.get(trustedPublishersInitStatusKey, StorageScope.APPLICATION)) {
			for (const profile of userDataProfilesService.profiles) {
				extensionManagementService.getInstalled(ExtensionType.User, profile.extensionsResource)
					.then(async extensions => {
						const trustedPublishers = new Map<string, IPublisherInfo>();
						for (const extension of extensions) {
							if (!extension.publisherDisplayName) {
								continue;
							}
							const publisher = extension.manifest.publisher.toLowerCase();
							if (productService.trustedExtensionPublishers?.includes(publisher)
								|| (extension.publisherDisplayName && productService.trustedExtensionPublishers?.includes(extension.publisherDisplayName.toLowerCase()))) {
								continue;
							}
							trustedPublishers.set(publisher, { publisher, publisherDisplayName: extension.publisherDisplayName });
						}
						if (trustedPublishers.size) {
							extensionManagementService.trustPublishers(...trustedPublishers.values());
						}
						storageService.store(trustedPublishersInitStatusKey, 'true', StorageScope.APPLICATION, StorageTarget.MACHINE);
					});
			}
		}
	}
}

class ExtensionToolsContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'extensions.chat.toolsContribution';

	constructor(
		@ILanguageModelToolsService toolsService: ILanguageModelToolsService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();
		const searchExtensionsTool = instantiationService.createInstance(SearchExtensionsTool);
		this._register(toolsService.registerToolData(SearchExtensionsToolData));
		this._register(toolsService.registerToolImplementation(SearchExtensionsToolData.id, searchExtensionsTool));
	}
}

const workbenchRegistry = Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(ExtensionsContributions, LifecyclePhase.Restored);
workbenchRegistry.registerWorkbenchContribution(StatusUpdater, LifecyclePhase.Eventually);
workbenchRegistry.registerWorkbenchContribution(MaliciousExtensionChecker, LifecyclePhase.Eventually);
workbenchRegistry.registerWorkbenchContribution(KeymapExtensions, LifecyclePhase.Restored);
workbenchRegistry.registerWorkbenchContribution(ExtensionsViewletViewsContribution, LifecyclePhase.Restored);
workbenchRegistry.registerWorkbenchContribution(ExtensionActivationProgress, LifecyclePhase.Eventually);
workbenchRegistry.registerWorkbenchContribution(ExtensionDependencyChecker, LifecyclePhase.Eventually);
workbenchRegistry.registerWorkbenchContribution(ExtensionEnablementWorkspaceTrustTransitionParticipant, LifecyclePhase.Restored);
workbenchRegistry.registerWorkbenchContribution(ExtensionsCompletionItemsProvider, LifecyclePhase.Restored);
workbenchRegistry.registerWorkbenchContribution(UnsupportedExtensionsMigrationContrib, LifecyclePhase.Eventually);
workbenchRegistry.registerWorkbenchContribution(TrustedPublishersInitializer, LifecyclePhase.Eventually);
workbenchRegistry.registerWorkbenchContribution(ExtensionMarketplaceStatusUpdater, LifecyclePhase.Eventually);
if (isWeb) {
	workbenchRegistry.registerWorkbenchContribution(ExtensionStorageCleaner, LifecyclePhase.Eventually);
}

registerWorkbenchContribution2(ExtensionToolsContribution.ID, ExtensionToolsContribution, WorkbenchPhase.AfterRestored);


// Running Extensions
registerAction2(ShowRuntimeExtensionsAction);

registerAction2(class ExtensionsGallerySignInAction extends Action2 {
	constructor() {
		super({
			id: 'workbench.extensions.actions.gallery.signIn',
			title: localize2('signInToMarketplace', 'Sign in to access Extensions Marketplace'),
			menu: {
				id: MenuId.AccountsContext,
				when: CONTEXT_EXTENSIONS_GALLERY_STATUS.isEqualTo(ExtensionGalleryManifestStatus.RequiresSignIn)
			},
		});
	}
	run(accessor: ServicesAccessor): Promise<void> {
		return accessor.get(ICommandService).executeCommand(DEFAULT_ACCOUNT_SIGN_IN_COMMAND);
	}
});

Registry.as<IConfigurationMigrationRegistry>(ConfigurationMigrationExtensions.ConfigurationMigration)
	.registerConfigurationMigrations([{
		key: AutoUpdateConfigurationKey,
		migrateFn: (value, accessor) => {
			if (value === 'onlySelectedExtensions') {
				return { value: false };
			}
			return [];
		}
	}]);

// CEO View: Sidebar container and view wired to Compass
const CEO_VIEW_CONTAINER_ID = 'workbench.view.ceo';
const CEO_VIEW_ID = 'workbench.view.ceoView';

interface CompanyInfo {
	name: string;
	industry: string;
}

class CEOView extends ViewPane {
	static readonly ID = CEO_VIEW_ID;

	private companyNameInput!: HTMLInputElement;
	private industryInput!: HTMLInputElement;
	private reportChecklist!: HTMLElement;
	private contentContainer!: HTMLElement; // Declare contentContainer as a class member
	private companyNameDisplay!: HTMLElement; // For displaying company name as header
	private industryDisplay!: HTMLElement; // For displaying industry as header

	private companyInfo: CompanyInfo = { name: '', industry: '' };

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
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super(
			{ ...options, titleMenuId: MenuId.ViewTitle, singleViewPaneContainerTitle: 'CEO View' },
			keybindingService,
			contextMenuService,
			configurationService,
			contextKeyService,
			viewDescriptorService,
			instantiationService,
			openerService,
			themeService,
			hoverService
		);
		this._register(this.onDidChangeBodyVisibility(() => this.onBodyVisibilityChange()));
	}

	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);

		if (!this.contentContainer) {
			this.contentContainer = document.createElement('div');
			this.contentContainer.className = 'ceo-view-content';
			parent.appendChild(this.contentContainer);
		} else {
			// Clear existing content to prevent duplication on re-render
			while (this.contentContainer.firstChild) {
				this.contentContainer.removeChild(this.contentContainer.firstChild);
			}
		}

		// Company Info Section
		const companyInfoSection = document.createElement('div');
		companyInfoSection.className = 'ceo-company-info-section';
		this.contentContainer.appendChild(companyInfoSection);

		const companyOverviewTitle = document.createElement('div');
		companyOverviewTitle.className = 'ceo-section-title';
		companyOverviewTitle.textContent = localize('companyOverviewTitle', "Company Overview");
		companyInfoSection.appendChild(companyOverviewTitle);

		// Add "Company" label
		const companyLabel = document.createElement('label');
		companyLabel.textContent = localize('ceo.companyLabel', "Company");
		companyLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(companyLabel);

		this.companyNameDisplay = document.createElement('h1');
		this.companyNameDisplay.className = 'ceo-company-name-display';
		this.companyNameDisplay.addEventListener('dblclick', () => this.toggleEditMode('name', true));
		this.companyNameDisplay.addEventListener('click', () => this.toggleEditMode('name', true));
		companyInfoSection.appendChild(this.companyNameDisplay);

		this.companyNameInput = document.createElement('input');
		this.companyNameInput.type = 'text';
		this.companyNameInput.placeholder = localize('ceo.companyNamePlaceholder', "Enter company name");
		this.companyNameInput.className = 'ceo-input ceo-hidden'; // Hidden by default
		this.companyNameInput.addEventListener('change', () => this.saveCompanyInfo());
		this.companyNameInput.addEventListener('blur', () => this.toggleEditMode('name', false)); // Exit edit mode on blur
		companyInfoSection.appendChild(this.companyNameInput);

		// Add "Industry" label
		const industryLabel = document.createElement('label');
		industryLabel.textContent = localize('ceo.industryLabel', "Industry");
		industryLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(industryLabel);

		this.industryDisplay = document.createElement('h2');
		this.industryDisplay.className = 'ceo-industry-display';
		this.industryDisplay.addEventListener('dblclick', () => this.toggleEditMode('industry', true));
		this.industryDisplay.addEventListener('click', () => this.toggleEditMode('industry', true));
		companyInfoSection.appendChild(this.industryDisplay);

		this.industryInput = document.createElement('input');
		this.industryInput.type = 'text';
		this.industryInput.placeholder = localize('ceo.industryPlaceholder', "Enter industry");
		this.industryInput.className = 'ceo-input ceo-hidden'; // Hidden by default
		this.industryInput.addEventListener('change', () => this.saveCompanyInfo());
		this.industryInput.addEventListener('blur', () => this.toggleEditMode('industry', false)); // Exit edit mode on blur
		companyInfoSection.appendChild(this.industryInput);

		// Description Section
		const descriptionSection = document.createElement('div');
		descriptionSection.className = 'ceo-description-section';
		this.contentContainer.appendChild(descriptionSection);

		const descriptionTitle = document.createElement('div');
		descriptionTitle.className = 'ceo-section-title';
		descriptionTitle.textContent = localize('ceo.descriptionTitle', "Executive Strategy");
		descriptionSection.appendChild(descriptionTitle);

		const description = document.createElement('div');
		description.className = 'ceo-description';
		description.textContent = localize('ceo.descriptionText', "Align the organization around a coherent strategy.\n\nIn this view, you can use deep research to gain insights on a company's positioning and strategic details, as well as its broader market and competitors.\n\nThe agent, with your guidance, will then propose strategic moves within your industry and draft an implementation plan to achieve these goals."); 
		descriptionSection.appendChild(description);

		// Reports Checklist Section
		const reportsSection = document.createElement('div');
		reportsSection.className = 'ceo-reports-section';
		this.contentContainer.appendChild(reportsSection);

		const reportsTitle = document.createElement('div');
		reportsTitle.textContent = localize('ceo.reportsTitle', "Status"); // Changed title
		reportsTitle.className = 'ceo-section-title';
		reportsSection.appendChild(reportsTitle);

		this.reportChecklist = document.createElement('div');
		this.reportChecklist.className = 'ceo-report-checklist';
		reportsSection.appendChild(this.reportChecklist);


		this.loadCompanyInfo(); // This will now handle rendering headers or inputs
		this.updateReportChecklist();
	}

	private onBodyVisibilityChange(): void {
		if (this.isBodyVisible()) {
			this.loadCompanyInfo();
			this.updateReportChecklist();
		}
	}

	private async getCompanyInfoFilePath(): Promise<URI> {
		const tneContextPath = await this.getTNEContextPath();
		return joinPath(tneContextPath, 'company-info.json');
	}

	private async loadCompanyInfo(): Promise<void> {
		const filePath = await this.getCompanyInfoFilePath(); // Await the async call
		try {
			const content = await this.fileService.readFile(filePath);
			this.companyInfo = JSON.parse(content.value.toString());
			this.companyNameInput.value = this.companyInfo.name;
			this.industryInput.value = this.companyInfo.industry;

			// Display as headers if info exists
			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);

		} catch (error) {
			if (error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
				this.notificationService.info(localize('ceo.companyInfo.notFound', "company-info.json not found in TNE-CONTEXT. Please enter company details."));
				this.companyInfo = { name: '', industry: '' };
				this.companyNameInput.value = '';
				this.industryInput.value = '';

				// Show inputs if no info found
				this.toggleEditMode('name', true);
				this.toggleEditMode('industry', true);
			} else {
				this.notificationService.error(localize('ceo.companyInfo.loadError', "Failed to load company-info.json: {0}", error.message));
			}
		}
	}

	private async saveCompanyInfo(): Promise<void> {
		this.companyInfo.name = this.companyNameInput.value.trim();
		this.companyInfo.industry = this.industryInput.value.trim();
		const filePath = await this.getCompanyInfoFilePath(); // Await the async call
		try {
			await this.fileService.writeFile(filePath, VSBuffer.fromString(JSON.stringify(this.companyInfo, null, 2)));
			this.notificationService.info(localize('ceo.companyInfo.saveSuccess', "Company info saved to TNE-CONTEXT/company-info.json."));

			// Update display after saving
			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			this.notificationService.error(localize('ceo.companyInfo.saveError', "Failed to save company-info.json: {0}", error.message));
		}
	}

	private toggleEditMode(field: 'name' | 'industry', enable: boolean): void {
		if (field === 'name') {
			if (enable) {
				this.companyNameDisplay.classList.add('ceo-hidden');
				this.companyNameInput.classList.remove('ceo-hidden');
				this.companyNameInput.focus();
			} else {
				this.companyNameDisplay.classList.remove('ceo-hidden');
				this.companyNameInput.classList.add('ceo-hidden');
			}
		} else if (field === 'industry') {
			if (enable) {
				this.industryDisplay.classList.add('ceo-hidden');
				this.industryInput.classList.remove('ceo-hidden');
				this.industryInput.focus();
			} else {
				this.industryDisplay.classList.remove('ceo-hidden');
				this.industryInput.classList.add('ceo-hidden');
			}
		}
	}

	private async updateReportChecklist(): Promise<void> {
		// Clear existing checklist items safely
		while (this.reportChecklist.firstChild) {
			this.reportChecklist.removeChild(this.reportChecklist.firstChild);
		}
		const tneContextPath = await this.getTNEContextPath(); // Await the async call
		const reports = [
			'b1-strategic-facts.md',
			'b2-disruption-recos.md',
			'b3-strategic-decisions.md',
			'b4-implementation-plan.md',
			'b5-partners.md',
			'b6-workflow.md'
		];

		for (const report of reports) {
			const listItem = document.createElement('div');
			listItem.className = 'ceo-report-item';

			const statusIndicator = document.createElement('span');
			statusIndicator.className = 'status-indicator';

			const label = document.createElement('label');
			const displayReportName = report
				.replace(/b\d-/, '') // Remove 'bX-' prefix
				.replace(/-/g, ' ')   // Replace dashes with spaces
				.replace(/\.md$/, '') // Remove '.md' extension
				.split(' ')           // Split into words
				.map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
				.join(' ');           // Join back with spaces
			label.textContent = displayReportName;

			try {
				const reportUri = joinPath(tneContextPath, report);
				await this.fileService.resolve(reportUri);
				statusIndicator.classList.add('checked');
				label.classList.add('checked');
			} catch (error) {
				statusIndicator.classList.add('unchecked');
				label.classList.add('unchecked');
			}

			listItem.appendChild(statusIndicator);
			listItem.appendChild(label);
			listItem.addEventListener('click', () => this.handleReportClick(report, statusIndicator.classList.contains('checked')));
			this.reportChecklist.appendChild(listItem);
		}
	}

	private async handleReportClick(report: string, isCompleted: boolean): Promise<void> {
		const reportToModeMap: { [key: string]: { slug: string; name: string } } = {
			'b1-strategic-facts.md': { slug: 'b1-background-and-framework', name: 'Background and Framework' },
			'b2-disruption-recos.md': { slug: 'b2-disruption-playbook', name: 'Disruption Playbook' },
			'b3-strategic-decisions.md': { slug: 'b3-long-term-mission', name: 'Long-Term Mission' },
			'b4-implementation-plan.md': { slug: 'b4-implementation-plan', name: 'Implementation Plan' },
			'b5-partners.md': { slug: 'b5-synergy-with-another-company', name: 'Partner Strategy' },
			'b6-workflow.md': { slug: 'b6-workflow-specification', name: 'Business Process' },
		};

		if (isCompleted) {
			// Open the file in the editor
			const tneContextPath = await this.getTNEContextPath();
			const reportUri = joinPath(tneContextPath, report);
			try {
				await this.commandService.executeCommand('vscode.open', reportUri);
				this.notificationService.info(localize('ceo.report.opened', "Opened report: {0}", report));
			} catch (error) {
				this.notificationService.error(localize('ceo.report.openError', "Failed to open report {0}: {1}", report, error.message));
			}
		} else {
			// Trigger a Compass mode switch with detailed message
			const modeInfo = reportToModeMap[report];
			if (modeInfo) {
				const companyName = this.companyInfo.name || 'the company';
				const industry = this.companyInfo.industry || 'unspecified';
				const message = localize(
					'ceo.mode.switchMessage',
					"The user is requesting a detailed analysis of {0} in the {1} industry. Switch to the {2} mode and begin.",
					companyName,
					industry,
					modeInfo.name
				);

				try {
					await this.commandService.executeCommand('compass.service.startTask', { message: message, newTask: false, mode: modeInfo.slug });
					this.notificationService.info(localize('ceo.mode.switchTriggered', "Triggered mode switch to: {0}", modeInfo.name));
				} catch (error) {
					this.notificationService.error(localize('ceo.mode.switchError', "Failed to trigger mode switch to {0}: {1}", modeInfo.name, error.message));
				}
			} else {
				this.notificationService.warn(localize('ceo.mode.noMapping', "No mode mapping found for report: {0}", report));
			}
		}
	}

	private async getTNEContextPath(): Promise<URI> {
		const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
		let tneContextUri: URI;

		if (workspaceFolders.length > 0) {
			tneContextUri = joinPath(workspaceFolders[0].uri, 'TNE-CONTEXT');
		} else {
			// Fallback to a default path if no workspace is open
			tneContextUri = URI.file('/tmp/TNE-CONTEXT');
		}

		try {
			await this.fileService.resolve(tneContextUri);
		} catch (error) {
			// If TNE-CONTEXT directory not found, create it
			if (error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
				await this.fileService.createFolder(tneContextUri);
				this.notificationService.info(localize('ceo.tneContext.created', "TNE-CONTEXT directory created."));
			} else {
				this.notificationService.error(localize('ceo.tneContext.error', "Error resolving/creating TNE-CONTEXT directory: {0}", error.message));
			}
		}
		return tneContextUri;
	}

	// Override shouldShowWelcome to ensure our custom content is always shown
	override shouldShowWelcome(): boolean {
		return false;
	}

}

// Register CEO container in the primary Side Bar
const ceoViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: CEO_VIEW_CONTAINER_ID,
		title: localize2('ceo', 'CEO'),
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CEO_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
		icon: Codicon.megaphone,
		storageId: CEO_VIEW_CONTAINER_ID,
		order: 1
	},
	ViewContainerLocation.Sidebar
);

// Register the CEO view inside the container
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: CEO_VIEW_ID,
	name: localize2('ceo.view', 'CEO'),
	containerIcon: Codicon.megaphone,
	ctorDescriptor: new SyncDescriptor(CEOView),
	canMoveView: true,
	canToggleVisibility: true,
	when: undefined,
}], ceoViewContainer);




// COO View: Sidebar container and view wired to Compass
const COO_VIEW_CONTAINER_ID = 'workbench.view.coo';
const COO_VIEW_ID = 'workbench.view.cooView';

interface COOCompanyInfo {
	name: string;
	industry: string;
}

class COOView extends ViewPane {
	static readonly ID = COO_VIEW_ID;

	private companyNameInput!: HTMLInputElement;
	private industryInput!: HTMLInputElement;
	private reportChecklist!: HTMLElement;
	private contentContainer!: HTMLElement;
	private companyNameDisplay!: HTMLElement;
	private industryDisplay!: HTMLElement;

	private companyInfo: COOCompanyInfo = { name: '', industry: '' };

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
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super(
			{ ...options, titleMenuId: MenuId.ViewTitle, singleViewPaneContainerTitle: 'COO View' },
			keybindingService,
			contextMenuService,
			configurationService,
			contextKeyService,
			viewDescriptorService,
			instantiationService,
			openerService,
			themeService,
			hoverService
		);
		this._register(this.onDidChangeBodyVisibility(() => this.onBodyVisibilityChange()));
	}

	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);

		if (!this.contentContainer) {
			this.contentContainer = document.createElement('div');
			this.contentContainer.className = 'ceo-view-content';
			parent.appendChild(this.contentContainer);
		} else {
			while (this.contentContainer.firstChild) {
				this.contentContainer.removeChild(this.contentContainer.firstChild);
			}
		}

		const companyInfoSection = document.createElement('div');
		companyInfoSection.className = 'ceo-company-info-section';
		this.contentContainer.appendChild(companyInfoSection);

		const companyOverviewTitle = document.createElement('div');
		companyOverviewTitle.className = 'ceo-section-title';
		companyOverviewTitle.textContent = localize('companyOverviewTitle', "Company Overview");
		companyInfoSection.appendChild(companyOverviewTitle);

		const companyLabel = document.createElement('label');
		companyLabel.textContent = localize('coo.companyLabel', "Company");
		companyLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(companyLabel);

		this.companyNameDisplay = document.createElement('h1');
		this.companyNameDisplay.className = 'ceo-company-name-display';
		this.companyNameDisplay.addEventListener('dblclick', () => this.toggleEditMode('name', true));
		this.companyNameDisplay.addEventListener('click', () => this.toggleEditMode('name', true));
		companyInfoSection.appendChild(this.companyNameDisplay);

		this.companyNameInput = document.createElement('input');
		this.companyNameInput.type = 'text';
		this.companyNameInput.placeholder = localize('coo.companyNamePlaceholder', "Enter company name");
		this.companyNameInput.className = 'ceo-input ceo-hidden';
		this.companyNameInput.addEventListener('change', () => this.saveCompanyInfo());
		this.companyNameInput.addEventListener('blur', () => this.toggleEditMode('name', false));
		companyInfoSection.appendChild(this.companyNameInput);

		const industryLabel = document.createElement('label');
		industryLabel.textContent = localize('coo.industryLabel', "Industry");
		industryLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(industryLabel);

		this.industryDisplay = document.createElement('h2');
		this.industryDisplay.className = 'ceo-industry-display';
		this.industryDisplay.addEventListener('dblclick', () => this.toggleEditMode('industry', true));
		this.industryDisplay.addEventListener('click', () => this.toggleEditMode('industry', true));
		companyInfoSection.appendChild(this.industryDisplay);

		this.industryInput = document.createElement('input');
		this.industryInput.type = 'text';
		this.industryInput.placeholder = localize('coo.industryPlaceholder', "Enter industry");
		this.industryInput.className = 'ceo-input ceo-hidden';
		this.industryInput.addEventListener('change', () => this.saveCompanyInfo());
		this.industryInput.addEventListener('blur', () => this.toggleEditMode('industry', false));
		companyInfoSection.appendChild(this.industryInput);

		// Description Section
		const descriptionSection = document.createElement('div');
		descriptionSection.className = 'ceo-description-section';
		this.contentContainer.appendChild(descriptionSection);

		const descriptionTitle = document.createElement('div');
		descriptionTitle.className = 'ceo-section-title';
		descriptionTitle.textContent = localize('coo.descriptionTitle', "Business Operations");
		descriptionSection.appendChild(descriptionTitle);

		const description = document.createElement('div');
		description.className = 'ceo-description';
		description.textContent = localize('coo.descriptionText', "Turn strategy into repeatable operations. This workspace guides you to outline your enterprise workflows and finds ways to optimize them, connecting day‑to‑day execution to strategic goals.");
		descriptionSection.appendChild(description);

		const reportsSection = document.createElement('div');
		reportsSection.className = 'ceo-reports-section';
		this.contentContainer.appendChild(reportsSection);

		const reportsTitle = document.createElement('div');
		reportsTitle.textContent = localize('coo.reportsTitle', "Status");
		reportsTitle.className = 'ceo-section-title';
		reportsSection.appendChild(reportsTitle);

		this.reportChecklist = document.createElement('div');
		this.reportChecklist.className = 'ceo-report-checklist';
		reportsSection.appendChild(this.reportChecklist);

		this.loadCompanyInfo();
		this.updateReportChecklist();
	}

	private onBodyVisibilityChange(): void {
		if (this.isBodyVisible()) {
			this.loadCompanyInfo();
			this.updateReportChecklist();
		}
	}

	private async getCompanyInfoFilePath(): Promise<URI> {
		const tneContextPath = await this.getTNEContextPath();
		return joinPath(tneContextPath, 'company-info.json');
	}

	private async loadCompanyInfo(): Promise<void> {
		const filePath = await this.getCompanyInfoFilePath();
		try {
			const content = await this.fileService.readFile(filePath);
			this.companyInfo = JSON.parse(content.value.toString());
			this.companyNameInput.value = this.companyInfo.name;
			this.industryInput.value = this.companyInfo.industry;

			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);

		} catch (error) {
			if ((error as any).fileOperationResult === 1) {
				this.notificationService.info(localize('coo.companyInfo.notFound', "company-info.json not found in TNE-CONTEXT. Please enter company details."));
				this.companyInfo = { name: '', industry: '' };
				this.companyNameInput.value = '';
				this.industryInput.value = '';
				this.toggleEditMode('name', true);
				this.toggleEditMode('industry', true);
			} else {
				this.notificationService.error(localize('coo.companyInfo.loadError', "Failed to load company-info.json: {0}", (error as any).message));
			}
		}
	}

	private async saveCompanyInfo(): Promise<void> {
		this.companyInfo.name = this.companyNameInput.value.trim();
		this.companyInfo.industry = this.industryInput.value.trim();
		const filePath = await this.getCompanyInfoFilePath();
		try {
			await this.fileService.writeFile(filePath, VSBuffer.fromString(JSON.stringify(this.companyInfo, null, 2)));
			this.notificationService.info(localize('coo.companyInfo.saveSuccess', "Company info saved to TNE-CONTEXT/company-info.json."));
			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			this.notificationService.error(localize('coo.companyInfo.saveError', "Failed to save company-info.json: {0}", (error as any).message));
		}
	}

	private toggleEditMode(field: 'name' | 'industry', enable: boolean): void {
		if (field === 'name') {
			if (enable) {
				this.companyNameDisplay.classList.add('ceo-hidden');
				this.companyNameInput.classList.remove('ceo-hidden');
				this.companyNameInput.focus();
			} else {
				this.companyNameDisplay.classList.remove('ceo-hidden');
				this.companyNameInput.classList.add('ceo-hidden');
			}
		} else {
			if (enable) {
				this.industryDisplay.classList.add('ceo-hidden');
				this.industryInput.classList.remove('ceo-hidden');
				this.industryInput.focus();
			} else {
				this.industryDisplay.classList.remove('ceo-hidden');
				this.industryInput.classList.add('ceo-hidden');
			}
		}
	}

	private async updateReportChecklist(): Promise<void> {
		while (this.reportChecklist.firstChild) {
			this.reportChecklist.removeChild(this.reportChecklist.firstChild);
		}
		const tneContextPath = await this.getTNEContextPath();
		const reports = [
			'coo1-implementation-plan.md',
			'coo2-workflow-specification.md'
		];

		for (const report of reports) {
			const listItem = document.createElement('div');
			listItem.className = 'ceo-report-item';

			const statusIndicator = document.createElement('span');
			statusIndicator.className = 'status-indicator';

			const label = document.createElement('label');
			const displayReportName = report
				.replace(/coo\d-/, '')
				.replace(/-/g, ' ')
				.replace(/\.md$/, '')
				.split(' ')
				.map(w => w.charAt(0).toUpperCase() + w.slice(1))
				.join(' ');
			label.textContent = displayReportName;

			try {
				const reportUri = joinPath(tneContextPath, report);
				await this.fileService.resolve(reportUri);
				statusIndicator.classList.add('checked');
				label.classList.add('checked');
			} catch {
				statusIndicator.classList.add('unchecked');
				label.classList.add('unchecked');
			}

			listItem.appendChild(statusIndicator);
			listItem.appendChild(label);
			listItem.addEventListener('click', () => this.handleReportClick(report, statusIndicator.classList.contains('checked')));
			this.reportChecklist.appendChild(listItem);
		}
	}

	private async handleReportClick(report: string, isCompleted: boolean): Promise<void> {
		const reportToModeMap: { [key: string]: { slug: string; name: string } } = {
			'coo1-implementation-plan.md': { slug: 'coo1-implementation-plan', name: 'Implementation Plan' },
			'coo2-workflow-specification.md': { slug: 'coo2-workflow-specification', name: 'Business Process' },
		};

		if (isCompleted) {
			const tneContextPath = await this.getTNEContextPath();
			const reportUri = joinPath(tneContextPath, report);
			try {
				await this.commandService.executeCommand('vscode.open', reportUri);
				this.notificationService.info(localize('coo.report.opened', "Opened report: {0}", report));
			} catch (error) {
				this.notificationService.error(localize('coo.report.openError', "Failed to open report {0}: {1}", report, (error as any).message));
			}
		} else {
			const modeInfo = reportToModeMap[report];
			if (modeInfo) {
				const companyName = this.companyInfo.name || 'the company';
				const industry = this.companyInfo.industry || 'unspecified';
				const message = localize(
					'coo.mode.switchMessage',
					"The user requests {0} for {1} in the {2} industry. Switch to the {0} mode and begin.",
					modeInfo.name,
					companyName,
					industry
				);

				try {
					await this.commandService.executeCommand('compass.service.startTask', { message, newTask: false, mode: modeInfo.slug });
					this.notificationService.info(localize('coo.mode.switchTriggered', "Triggered mode switch to: {0}", modeInfo.name));
				} catch (error) {
					this.notificationService.error(localize('coo.mode.switchError', "Failed to trigger mode switch to {0}: {1}", modeInfo.name, (error as any).message));
				}
			} else {
				this.notificationService.warn(localize('coo.mode.noMapping', "No mode mapping found for report: {0}", report));
			}
		}
	}

	private async getTNEContextPath(): Promise<URI> {
		const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
		let tneContextUri: URI;
		if (workspaceFolders.length > 0) {
			tneContextUri = joinPath(workspaceFolders[0].uri, 'TNE-CONTEXT');
		} else {
			tneContextUri = URI.file('/tmp/TNE-CONTEXT');
		}
		try {
			await this.fileService.resolve(tneContextUri);
		} catch (error) {
			if ((error as any).fileOperationResult === 1) {
				await this.fileService.createFolder(tneContextUri);
				this.notificationService.info(localize('coo.tneContext.created', "TNE-CONTEXT directory created."));
			} else {
				this.notificationService.error(localize('coo.tneContext.error', "Error resolving/creating TNE-CONTEXT directory: {0}", (error as any).message));
			}
		}
		return tneContextUri;
	}

	override shouldShowWelcome(): boolean { return false; }
}

// Register COO container
const cooViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: COO_VIEW_CONTAINER_ID,
		title: localize2('coo', 'COO'),
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [COO_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
		icon: Codicon.gear,
		storageId: COO_VIEW_CONTAINER_ID,
		order: 7
	},
	ViewContainerLocation.Sidebar
);
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: COO_VIEW_ID,
	name: localize2('coo.view', 'COO'),
	containerIcon: Codicon.gear,
	ctorDescriptor: new SyncDescriptor(COOView),
	canMoveView: true,
	canToggleVisibility: true,
	when: undefined,
}], cooViewContainer);


// CFO View: Sidebar container and view wired to Compass
const CFO_VIEW_CONTAINER_ID = 'workbench.view.cfo';
const CFO_VIEW_ID = 'workbench.view.cfoView';

interface CFOCompanyInfo {
	name: string;
	industry: string;
}

class CFOView extends ViewPane {
	static readonly ID = CFO_VIEW_ID;

	private companyNameInput!: HTMLInputElement;
	private industryInput!: HTMLInputElement;
	private reportChecklist!: HTMLElement;
	private contentContainer!: HTMLElement;
	private companyNameDisplay!: HTMLElement;
	private industryDisplay!: HTMLElement;

	private companyInfo: CFOCompanyInfo = { name: '', industry: '' };

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
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super(
			{ ...options, titleMenuId: MenuId.ViewTitle, singleViewPaneContainerTitle: 'CFO View' },
			keybindingService,
			contextMenuService,
			configurationService,
			contextKeyService,
			viewDescriptorService,
			instantiationService,
			openerService,
			themeService,
			hoverService
		);
		this._register(this.onDidChangeBodyVisibility(() => this.onBodyVisibilityChange()));
	}

	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);

		if (!this.contentContainer) {
			this.contentContainer = document.createElement('div');
			this.contentContainer.className = 'ceo-view-content';
			parent.appendChild(this.contentContainer);
		} else {
			while (this.contentContainer.firstChild) {
				this.contentContainer.removeChild(this.contentContainer.firstChild);
			}
		}

		const companyInfoSection = document.createElement('div');
		companyInfoSection.className = 'ceo-company-info-section';
		this.contentContainer.appendChild(companyInfoSection);

		const companyOverviewTitle = document.createElement('div');
		companyOverviewTitle.className = 'ceo-section-title';
		companyOverviewTitle.textContent = localize('companyOverviewTitle', "Company Overview");
		companyInfoSection.appendChild(companyOverviewTitle);



		const companyLabel = document.createElement('label');
		companyLabel.textContent = localize('cfo.companyLabel', "Company");
		companyLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(companyLabel);

		this.companyNameDisplay = document.createElement('h1');
		this.companyNameDisplay.className = 'ceo-company-name-display';
		this.companyNameDisplay.addEventListener('dblclick', () => this.toggleEditMode('name', true));
		this.companyNameDisplay.addEventListener('click', () => this.toggleEditMode('name', true));
		companyInfoSection.appendChild(this.companyNameDisplay);

		this.companyNameInput = document.createElement('input');
		this.companyNameInput.type = 'text';
		this.companyNameInput.placeholder = localize('cfo.companyNamePlaceholder', "Enter company name");
		this.companyNameInput.className = 'ceo-input ceo-hidden';
		this.companyNameInput.addEventListener('change', () => this.saveCompanyInfo());
		this.companyNameInput.addEventListener('blur', () => this.toggleEditMode('name', false));
		companyInfoSection.appendChild(this.companyNameInput);

		const industryLabel = document.createElement('label');
		industryLabel.textContent = localize('cfo.industryLabel', "Industry");
		industryLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(industryLabel);

		this.industryDisplay = document.createElement('h2');
		this.industryDisplay.className = 'ceo-industry-display';
		this.industryDisplay.addEventListener('dblclick', () => this.toggleEditMode('industry', true));
		this.industryDisplay.addEventListener('click', () => this.toggleEditMode('industry', true));
		companyInfoSection.appendChild(this.industryDisplay);

		this.industryInput = document.createElement('input');
		this.industryInput.type = 'text';
		this.industryInput.placeholder = localize('cfo.industryPlaceholder', "Enter industry");
		this.industryInput.className = 'ceo-input ceo-hidden';
		this.industryInput.addEventListener('change', () => this.saveCompanyInfo());
		this.industryInput.addEventListener('blur', () => this.toggleEditMode('industry', false));
		companyInfoSection.appendChild(this.industryInput);

		// Description Section
		const descriptionSection = document.createElement('div');
		descriptionSection.className = 'ceo-description-section';
		this.contentContainer.appendChild(descriptionSection);

		const descriptionTitle = document.createElement('div');
		descriptionTitle.className = 'ceo-section-title';
		descriptionTitle.textContent = localize('cfo.descriptionTitle', "Financial Strategy");
		descriptionSection.appendChild(descriptionTitle);

		const description = document.createElement('div');
		description.className = 'ceo-description';
		description.textContent = localize('cfo.descriptionText', "Assesses financial health and investment readiness, quantifying ROI, runway, and funding needs. If needed, this agent will suggest tactical moves to maximize your investment potential.");
		descriptionSection.appendChild(description);

		// Reports Checklist Section
		const reportsSection = document.createElement('div');
		reportsSection.className = 'ceo-reports-section';
		this.contentContainer.appendChild(reportsSection);

		const reportsTitle = document.createElement('div');
		reportsTitle.textContent = localize('cfo.reportsTitle', "Status");
		reportsTitle.className = 'ceo-section-title';
		reportsSection.appendChild(reportsTitle);

		this.reportChecklist = document.createElement('div');
		this.reportChecklist.className = 'ceo-report-checklist';
		reportsSection.appendChild(this.reportChecklist);

		this.loadCompanyInfo();
		this.updateReportChecklist();
	}

	private onBodyVisibilityChange(): void {
		if (this.isBodyVisible()) {
			this.loadCompanyInfo();
			this.updateReportChecklist();
		}
	}

	private async getCompanyInfoFilePath(): Promise<URI> {
		const tneContextPath = await this.getTNEContextPath();
		return joinPath(tneContextPath, 'company-info.json');
	}

	private async loadCompanyInfo(): Promise<void> {
		const filePath = await this.getCompanyInfoFilePath();
		try {
			const content = await this.fileService.readFile(filePath);
			this.companyInfo = JSON.parse(content.value.toString());
			this.companyNameInput.value = this.companyInfo.name;
			this.industryInput.value = this.companyInfo.industry;

			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);

		} catch (error) {
			if ((error as any).fileOperationResult === 1) {
				this.notificationService.info(localize('cfo.companyInfo.notFound', "company-info.json not found in TNE-CONTEXT. Please enter company details."));
				this.companyInfo = { name: '', industry: '' };
				this.companyNameInput.value = '';
				this.industryInput.value = '';
				this.toggleEditMode('name', true);
				this.toggleEditMode('industry', true);
			} else {
				this.notificationService.error(localize('cfo.companyInfo.loadError', "Failed to load company-info.json: {0}", (error as any).message));
			}
		}
	}

	private async saveCompanyInfo(): Promise<void> {
		this.companyInfo.name = this.companyNameInput.value.trim();
		this.companyInfo.industry = this.industryInput.value.trim();
		const filePath = await this.getCompanyInfoFilePath();
		try {
			await this.fileService.writeFile(filePath, VSBuffer.fromString(JSON.stringify(this.companyInfo, null, 2)));
			this.notificationService.info(localize('cfo.companyInfo.saveSuccess', "Company info saved to TNE-CONTEXT/company-info.json."));
			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			this.notificationService.error(localize('cfo.companyInfo.saveError', "Failed to save company-info.json: {0}", (error as any).message));
		}
	}

	private toggleEditMode(field: 'name' | 'industry', enable: boolean): void {
		if (field === 'name') {
			if (enable) {
				this.companyNameDisplay.classList.add('ceo-hidden');
				this.companyNameInput.classList.remove('ceo-hidden');
				this.companyNameInput.focus();
			} else {
				this.companyNameDisplay.classList.remove('ceo-hidden');
				this.companyNameInput.classList.add('ceo-hidden');
			}
		} else {
			if (enable) {
				this.industryDisplay.classList.add('ceo-hidden');
				this.industryInput.classList.remove('ceo-hidden');
				this.industryInput.focus();
			} else {
				this.industryDisplay.classList.remove('ceo-hidden');
				this.industryInput.classList.add('ceo-hidden');
			}
		}
	}

	private async updateReportChecklist(): Promise<void> {
		while (this.reportChecklist.firstChild) {
			this.reportChecklist.removeChild(this.reportChecklist.firstChild);
		}
		const tneContextPath = await this.getTNEContextPath();
		const reports = [
			'f1-financial.md',
			'f2-investment-analysis.md',
			'f3-investment-memo.md'
		];

		for (const report of reports) {
			const listItem = document.createElement('div');
			listItem.className = 'ceo-report-item';

			const statusIndicator = document.createElement('span');
			statusIndicator.className = 'status-indicator';

			const label = document.createElement('label');
			const displayReportName = report
				.replace(/f\d-/, '')
				.replace(/-/g, ' ')
				.replace(/\.md$/, '')
				.split(' ')
				.map(w => w.charAt(0).toUpperCase() + w.slice(1))
				.join(' ');
			label.textContent = displayReportName;

			try {
				const reportUri = joinPath(tneContextPath, report);
				await this.fileService.resolve(reportUri);
				statusIndicator.classList.add('checked');
				label.classList.add('checked');
			} catch {
				statusIndicator.classList.add('unchecked');
				label.classList.add('unchecked');
			}

			listItem.appendChild(statusIndicator);
			listItem.appendChild(label);
			listItem.addEventListener('click', () => this.handleReportClick(report, statusIndicator.classList.contains('checked')));
			this.reportChecklist.appendChild(listItem);
		}
	}

	private async handleReportClick(report: string, isCompleted: boolean): Promise<void> {
		const reportToModeMap: { [key: string]: { slug: string; name: string } } = {
			'f1-financial.md': { slug: 'cfo1-financial', name: 'Financial' },
			'f2-investment-analysis.md': { slug: 'cfo-2-investment-analysis', name: 'Investment Analysis' },
			'f3-investment-memo.md': { slug: 'cfo-3-investment-memo', name: 'Investment Memo' },
		};

		if (isCompleted) {
			const tneContextPath = await this.getTNEContextPath();
			const reportUri = joinPath(tneContextPath, report);
			try {
				await this.commandService.executeCommand('vscode.open', reportUri);
				this.notificationService.info(localize('cfo.report.opened', "Opened report: {0}", report));
			} catch (error) {
				this.notificationService.error(localize('cfo.report.openError', "Failed to open report {0}: {1}", report, (error as any).message));
			}
		} else {
			const modeInfo = reportToModeMap[report];
			if (modeInfo) {
				const companyName = this.companyInfo.name || 'the company';
				const industry = this.companyInfo.industry || 'unspecified';
				const message = localize('cfo.mode.switchMessage',
					"The user requests {0} for {1} in the {2} industry. Switch to the {0} mode and begin.",
					modeInfo.name, companyName, industry);
				try {
					await this.commandService.executeCommand('compass.service.startTask', { message, newTask: false, mode: modeInfo.slug });
					this.notificationService.info(localize('cfo.mode.switchTriggered', "Triggered mode switch to: {0}", modeInfo.name));
				} catch (error) {
					this.notificationService.error(localize('cfo.mode.switchError', "Failed to trigger mode switch to {0}: {1}", modeInfo.name, (error as any).message));
				}
			} else {
				this.notificationService.warn(localize('cfo.mode.noMapping', "No mode mapping found for report: {0}", report));
			}
		}
	}

	private async getTNEContextPath(): Promise<URI> {
		const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
		let tneContextUri: URI;
		if (workspaceFolders.length > 0) {
			tneContextUri = joinPath(workspaceFolders[0].uri, 'TNE-CONTEXT');
		} else {
			tneContextUri = URI.file('/tmp/TNE-CONTEXT');
		}
		try {
			await this.fileService.resolve(tneContextUri);
		} catch (error) {
			if ((error as any).fileOperationResult === 1) {
				await this.fileService.createFolder(tneContextUri);
				this.notificationService.info(localize('cfo.tneContext.created', "TNE-CONTEXT directory created."));
			} else {
				this.notificationService.error(localize('cfo.tneContext.error', "Error resolving/creating TNE-CONTEXT directory: {0}", (error as any).message));
			}
		}
		return tneContextUri;
	}

	override shouldShowWelcome(): boolean { return false; }
}

// Register CFO container
const cfoViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: CFO_VIEW_CONTAINER_ID,
		title: localize2('cfo', 'CFO'),
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CFO_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
		icon: Codicon.creditCard,
		storageId: CFO_VIEW_CONTAINER_ID,
		order: 9
	},
	ViewContainerLocation.Sidebar
);
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: CFO_VIEW_ID,
	name: localize2('cfo.view', 'CFO'),
	containerIcon: Codicon.creditCard,
	ctorDescriptor: new SyncDescriptor(CFOView),
	canMoveView: true,
	canToggleVisibility: true,
	when: undefined,
}], cfoViewContainer);


// CTO-E View: Sidebar container and view wired to Compass
const CTOE_VIEW_CONTAINER_ID = 'workbench.view.ctoE';
const CTOE_VIEW_ID = 'workbench.view.ctoEView';

interface CtoECompanyInfo {
	name: string;
	industry: string;
}

class CtoEView extends ViewPane {
	static readonly ID = CTOE_VIEW_ID;

	private companyNameInput!: HTMLInputElement;
	private industryInput!: HTMLInputElement;
	private reportChecklist!: HTMLElement;
	private contentContainer!: HTMLElement;
	private companyNameDisplay!: HTMLElement;
	private industryDisplay!: HTMLElement;

	private companyInfo: CtoECompanyInfo = { name: '', industry: '' };

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
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super(
			{ ...options, titleMenuId: MenuId.ViewTitle, singleViewPaneContainerTitle: 'CTO-E View' },
			keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService,
			instantiationService, openerService, themeService, hoverService
		);
		this._register(this.onDidChangeBodyVisibility(() => this.onBodyVisibilityChange()));
	}

	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);
		if (!this.contentContainer) {
			this.contentContainer = document.createElement('div');
			this.contentContainer.className = 'ceo-view-content';
			parent.appendChild(this.contentContainer);
		} else {
			while (this.contentContainer.firstChild) { this.contentContainer.removeChild(this.contentContainer.firstChild); }
		}

		const companyInfoSection = document.createElement('div');
		companyInfoSection.className = 'ceo-company-info-section';
		this.contentContainer.appendChild(companyInfoSection);

		const companyOverviewTitle = document.createElement('div');
		companyOverviewTitle.className = 'ceo-section-title';
		companyOverviewTitle.textContent = localize('companyOverviewTitle', "Company Overview");
		companyInfoSection.appendChild(companyOverviewTitle);


		const companyLabel = document.createElement('label');
		companyLabel.textContent = localize('ctoE.companyLabel', "Company");
		companyLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(companyLabel);

		this.companyNameDisplay = document.createElement('h1');
		this.companyNameDisplay.className = 'ceo-company-name-display';
		this.companyNameDisplay.addEventListener('dblclick', () => this.toggleEditMode('name', true));
		this.companyNameDisplay.addEventListener('click', () => this.toggleEditMode('name', true));
		companyInfoSection.appendChild(this.companyNameDisplay);

		this.companyNameInput = document.createElement('input');
		this.companyNameInput.type = 'text';
		this.companyNameInput.placeholder = localize('ctoE.companyNamePlaceholder', "Enter company name");
		this.companyNameInput.className = 'ceo-input ceo-hidden';
		this.companyNameInput.addEventListener('change', () => this.saveCompanyInfo());
		this.companyNameInput.addEventListener('blur', () => this.toggleEditMode('name', false));
		companyInfoSection.appendChild(this.companyNameInput);

		const industryLabel = document.createElement('label');
		industryLabel.textContent = localize('ctoE.industryLabel', "Industry");
		industryLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(industryLabel);

		this.industryDisplay = document.createElement('h2');
		this.industryDisplay.className = 'ceo-industry-display';
		this.industryDisplay.addEventListener('dblclick', () => this.toggleEditMode('industry', true));
		this.industryDisplay.addEventListener('click', () => this.toggleEditMode('industry', true));
		companyInfoSection.appendChild(this.industryDisplay);

		this.industryInput = document.createElement('input');
		this.industryInput.type = 'text';
		this.industryInput.placeholder = localize('ctoE.industryPlaceholder', "Enter industry");
		this.industryInput.className = 'ceo-input ceo-hidden';
		this.industryInput.addEventListener('change', () => this.saveCompanyInfo());
		this.industryInput.addEventListener('blur', () => this.toggleEditMode('industry', false));
		companyInfoSection.appendChild(this.industryInput);

		// Description Section
		const descriptionSection = document.createElement('div');
		descriptionSection.className = 'ceo-description-section';
		this.contentContainer.appendChild(descriptionSection);

		const descriptionTitle = document.createElement('div');
		descriptionTitle.className = 'ceo-section-title';
		descriptionTitle.textContent = localize('ctoE.descriptionTitle', "Feature Development Strategy");
		descriptionSection.appendChild(descriptionTitle);

		const description = document.createElement('div');
		description.className = 'ceo-description';
		description.textContent = localize('ctoE.descriptionText', "Deliver product improvements with confidence.\n\nThis agent will examine your existing codebase and business objectives, suggest new features that align with your high-level goals, then produce a technical specification for development.");
		descriptionSection.appendChild(description);

		// Reports Checklist Section
		const reportsSection = document.createElement('div');
		reportsSection.className = 'ceo-reports-section';
		this.contentContainer.appendChild(reportsSection);

		const reportsTitle = document.createElement('div');
		reportsTitle.textContent = localize('ctoE.reportsTitle', "Status");
		reportsTitle.className = 'ceo-section-title';
		reportsSection.appendChild(reportsTitle);

		this.reportChecklist = document.createElement('div');
		this.reportChecklist.className = 'ceo-report-checklist';
		reportsSection.appendChild(this.reportChecklist);

		this.loadCompanyInfo();
		this.updateReportChecklist();
	}

	private onBodyVisibilityChange(): void {
		if (this.isBodyVisible()) {
			this.loadCompanyInfo();
			this.updateReportChecklist();
		}
	}

	private async getCompanyInfoFilePath(): Promise<URI> {
		const tneContext = await this.getTNEContextPath();
		return joinPath(tneContext, 'company-info.json');
	}

	private async getTNEContextPath(): Promise<URI> {
		const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
		return workspaceFolders.length > 0 ? joinPath(workspaceFolders[0].uri, 'TNE-CONTEXT') : URI.file('/tmp/TNE-CONTEXT');
	}

	private async loadCompanyInfo(): Promise<void> {
		const filePath = await this.getCompanyInfoFilePath();
		try {
			const content = await this.fileService.readFile(filePath);
			this.companyInfo = JSON.parse(content.value.toString());
			this.companyNameInput.value = this.companyInfo.name;
			this.industryInput.value = this.companyInfo.industry;

			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			if ((error as any).fileOperationResult === 1 /* FILE_NOT_FOUND */) {
				this.notificationService.info(localize('ctoE.companyInfo.notFound', "company-info.json not found in TNE-CONTEXT. Please enter company details."));
				this.companyInfo = { name: '', industry: '' };
				this.companyNameInput.value = '';
				this.industryInput.value = '';
				this.toggleEditMode('name', true);
				this.toggleEditMode('industry', true);
			} else {
				this.notificationService.error(localize('ctoE.companyInfo.loadError', "Failed to load company-info.json: {0}", (error as any).message));
			}
		}
	}

	private async saveCompanyInfo(): Promise<void> {
		this.companyInfo.name = this.companyNameInput.value.trim();
		this.companyInfo.industry = this.industryInput.value.trim();
		const filePath = await this.getCompanyInfoFilePath();
		try {
			await this.fileService.writeFile(filePath, VSBuffer.fromString(JSON.stringify(this.companyInfo, null, 2)));
			this.notificationService.info(localize('ctoE.companyInfo.saveSuccess', "Company info saved to TNE-CONTEXT/company-info.json."));
			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			this.notificationService.error(localize('ctoE.companyInfo.saveError', "Failed to save company-info.json: {0}", (error as any).message));
		}
	}

	private toggleEditMode(field: 'name' | 'industry', enable: boolean): void {
		if (field === 'name') {
			if (enable) {
				this.companyNameDisplay.classList.add('ceo-hidden');
				this.companyNameInput.classList.remove('ceo-hidden');
				this.companyNameInput.focus();
			} else {
				this.companyNameDisplay.classList.remove('ceo-hidden');
				this.companyNameInput.classList.add('ceo-hidden');
			}
		} else {
			if (enable) {
				this.industryDisplay.classList.add('ceo-hidden');
				this.industryInput.classList.remove('ceo-hidden');
				this.industryInput.focus();
			} else {
				this.industryDisplay.classList.remove('ceo-hidden');
				this.industryInput.classList.add('ceo-hidden');
			}
		}
	}

	private async updateReportChecklist(): Promise<void> {
		while (this.reportChecklist.firstChild) { this.reportChecklist.removeChild(this.reportChecklist.firstChild); }
		const tneContextPath = await this.getTNEContextPath();
		const reports = [
			'cto-e1-inspect-and-digest.md',
			'cto-e2-new-feature-research.md',
			'cto-e3-feature-recommendations.md',
			'cto-e4-feature-implementation-brief.md'
		];

		for (const report of reports) {
			const listItem = document.createElement('div');
			listItem.className = 'ceo-report-item';
			const statusIndicator = document.createElement('span');
			statusIndicator.className = 'status-indicator';
			const label = document.createElement('label');
			const displayReportName = report.replace(/cto-e\d-/, '').replace(/-/g, ' ').replace(/\.md$/, '')
				.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
			label.textContent = displayReportName;

			try {
				const reportUri = joinPath(tneContextPath, report);
				await this.fileService.resolve(reportUri);
				statusIndicator.classList.add('checked');
				label.classList.add('checked');
			} catch {
				statusIndicator.classList.add('unchecked');
				label.classList.add('unchecked');
			}
			listItem.appendChild(statusIndicator);
			listItem.appendChild(label);
			listItem.addEventListener('click', () => this.handleReportClick(report, statusIndicator.classList.contains('checked')));
			this.reportChecklist.appendChild(listItem);
		}
	}

	private async handleReportClick(report: string, isCompleted: boolean): Promise<void> {
		const reportToModeMap: { [key: string]: { slug: string; name: string } } = {
			'cto-e1-inspect-and-digest.md': { slug: 'cto-e1-inspect-and-digest', name: 'Inspect and Digest' },
			'cto-e2-new-feature-research.md': { slug: 'cto-e2-new-feature-research', name: 'New Feature Research' },
			'cto-e3-feature-recommendations.md': { slug: 'cto-e3-feature-recommendations', name: 'Feature Recommendations' },
			'cto-e4-feature-implementation-brief.md': { slug: 'cto-e4-feature-implementation-brief', name: 'Feature Implementation Brief' },
		};
		if (isCompleted) {
			const tneContextPath = await this.getTNEContextPath();
			const reportUri = joinPath(tneContextPath, report);
			try {
				await this.commandService.executeCommand('vscode.open', reportUri);
				this.notificationService.info(localize('ctoE.report.opened', "Opened report: {0}", report));
			} catch (error) {
				this.notificationService.error(localize('ctoE.report.openError', "Failed to open report {0}: {1}", report, (error as any).message));
			}
		} else {
			const modeInfo = reportToModeMap[report];
			if (modeInfo) {
				const message = localize('ctoE.mode.switchMessage', "Begin: {0}", modeInfo.name);
				try {
					await this.commandService.executeCommand('compass.service.startTask', { message, newTask: false, mode: modeInfo.slug });
					this.notificationService.info(localize('ctoE.mode.switchTriggered', "Triggered mode switch to: {0}", modeInfo.name));
				} catch (error) {
					this.notificationService.error(localize('ctoE.mode.switchError', "Failed to trigger mode switch: {0}", (error as any).message));
				}
			}
		}
	}
}

const ctoEViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: CTOE_VIEW_CONTAINER_ID,
		title: localize2('ctoE', 'CTO-E'),
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CTOE_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
		icon: Codicon.lightbulb,
		storageId: CTOE_VIEW_CONTAINER_ID,
		order: 10
	},
	ViewContainerLocation.Sidebar
);
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: CTOE_VIEW_ID,
	name: localize2('ctoE.view', 'CTO-E'),
	containerIcon: Codicon.lightbulb,
	ctorDescriptor: new SyncDescriptor(CtoEView),
	canMoveView: true,
	canToggleVisibility: true,
	when: undefined,
}], ctoEViewContainer);




// CIP View: Sidebar container and view wired to Compass
const CIP_VIEW_CONTAINER_ID = 'workbench.view.cip';
const CIP_VIEW_ID = 'workbench.view.cipView';

interface CIPCompanyInfo {
	name: string;
	industry: string;
}

class CIPView extends ViewPane {
	static readonly ID = CIP_VIEW_ID;

	private companyNameInput!: HTMLInputElement;
	private industryInput!: HTMLInputElement;
	private companyNameDisplay!: HTMLElement;
	private industryDisplay!: HTMLElement;

	private reportChecklist!: HTMLElement;
	private contentContainer!: HTMLElement;

	private companyInfo: CIPCompanyInfo = { name: '', industry: '' };

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
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super(
			{ ...options, titleMenuId: MenuId.ViewTitle, singleViewPaneContainerTitle: 'CIP View' },
			keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService,
			instantiationService, openerService, themeService, hoverService
		);
		this._register(this.onDidChangeBodyVisibility(() => this.onBodyVisibilityChange()));
	}

	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);
		if (!this.contentContainer) {
			this.contentContainer = document.createElement('div');
			this.contentContainer.className = 'ceo-view-content';
			parent.appendChild(this.contentContainer);
		} else {
			while (this.contentContainer.firstChild) { this.contentContainer.removeChild(this.contentContainer.firstChild); }
		}

		// Company Info
		const companyInfoSection = document.createElement('div');
		companyInfoSection.className = 'ceo-company-info-section';
		this.contentContainer.appendChild(companyInfoSection);

		const companyOverviewTitle = document.createElement('div');
		companyOverviewTitle.className = 'ceo-section-title';
		companyOverviewTitle.textContent = localize('companyOverviewTitle', "Company Overview");
		companyInfoSection.appendChild(companyOverviewTitle);



		const companyLabel = document.createElement('label');
		companyLabel.textContent = localize('cip.companyLabel', "Company");
		companyLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(companyLabel);

		this.companyNameDisplay = document.createElement('h1');
		this.companyNameDisplay.className = 'ceo-company-name-display';
		this.companyNameDisplay.addEventListener('dblclick', () => this.toggleEditMode('name', true));
		this.companyNameDisplay.addEventListener('click', () => this.toggleEditMode('name', true));
		companyInfoSection.appendChild(this.companyNameDisplay);

		this.companyNameInput = document.createElement('input');
		this.companyNameInput.type = 'text';
		this.companyNameInput.placeholder = localize('cip.companyNamePlaceholder', "Enter company name");
		this.companyNameInput.className = 'ceo-input ceo-hidden';
		this.companyNameInput.addEventListener('change', () => this.saveCompanyInfo());
		this.companyNameInput.addEventListener('blur', () => this.toggleEditMode('name', false));
		companyInfoSection.appendChild(this.companyNameInput);

		const industryLabel = document.createElement('label');
		industryLabel.textContent = localize('cip.industryLabel', "Industry");
		industryLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(industryLabel);

		this.industryDisplay = document.createElement('h2');
		this.industryDisplay.className = 'ceo-industry-display';
		this.industryDisplay.addEventListener('dblclick', () => this.toggleEditMode('industry', true));
		this.industryDisplay.addEventListener('click', () => this.toggleEditMode('industry', true));
		companyInfoSection.appendChild(this.industryDisplay);

		this.industryInput = document.createElement('input');
		this.industryInput.type = 'text';
		this.industryInput.placeholder = localize('cip.industryPlaceholder', "Enter industry");
		this.industryInput.className = 'ceo-input ceo-hidden';
		this.industryInput.addEventListener('change', () => this.saveCompanyInfo());
		this.industryInput.addEventListener('blur', () => this.toggleEditMode('industry', false));
		companyInfoSection.appendChild(this.industryInput);

		// Description Section
		const descriptionSection = document.createElement('div');
		descriptionSection.className = 'ceo-description-section';
		this.contentContainer.appendChild(descriptionSection);

		const descriptionTitle = document.createElement('div');
		descriptionTitle.className = 'ceo-section-title';
		descriptionTitle.textContent = localize('cip.descriptionTitle', "Intellectual Property");
		descriptionSection.appendChild(descriptionTitle);

		const description = document.createElement('div');
		description.className = 'ceo-description';
		description.textContent = localize('cip.descriptionText', "Capture and protect innovation.\n\nFormalize your intellectual property, and generate provisional patents and applications.");
		descriptionSection.appendChild(description);

		// Reports Checklist Section
		const reportsSection = document.createElement('div');
		reportsSection.className = 'ceo-reports-section';
		this.contentContainer.appendChild(reportsSection);

		const reportsTitle = document.createElement('div');
		reportsTitle.textContent = localize('cip.reportsTitle', "Status");
		reportsTitle.className = 'ceo-section-title';
		reportsSection.appendChild(reportsTitle);

		this.reportChecklist = document.createElement('div');
		this.reportChecklist.className = 'ceo-report-checklist';
		reportsSection.appendChild(this.reportChecklist);

		this.loadCompanyInfo();
		this.updateReportChecklist();
	}

	private onBodyVisibilityChange(): void {
		if (this.isBodyVisible()) {
			this.loadCompanyInfo();
			this.updateReportChecklist();
		}
	}

	private async getCompanyInfoFilePath(): Promise<URI> {
		const tne = await this.getTNEContextPath();
		return joinPath(tne, 'company-info.json');
	}


	private async loadCompanyInfo(): Promise<void> {
		const filePath = await this.getCompanyInfoFilePath();
		try {
			const content = await this.fileService.readFile(filePath);
			this.companyInfo = JSON.parse(content.value.toString());
			this.companyNameInput.value = this.companyInfo.name;
			this.industryInput.value = this.companyInfo.industry;

			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			if ((error as any).fileOperationResult === 1 /* FILE_NOT_FOUND */) {
				this.companyInfo = { name: '', industry: '' };
				this.companyNameInput.value = '';
				this.industryInput.value = '';
				this.toggleEditMode('name', true);
				this.toggleEditMode('industry', true);
			} else {
				this.notificationService.error(localize('cip.companyInfo.loadError', "Failed to load company-info.json: {0}", (error as any).message));
			}
		}
	}

	private async saveCompanyInfo(): Promise<void> {
		this.companyInfo.name = this.companyNameInput.value.trim();
		this.companyInfo.industry = this.industryInput.value.trim();
		const filePath = await this.getCompanyInfoFilePath();
		try {
			await this.fileService.writeFile(filePath, VSBuffer.fromString(JSON.stringify(this.companyInfo, null, 2)));
			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			this.notificationService.error(localize('cip.companyInfo.saveError', "Failed to save company-info.json: {0}", (error as any).message));
		}
	}

	private toggleEditMode(field: 'name' | 'industry', enable: boolean): void {
		if (field === 'name') {
			if (enable) {
				this.companyNameDisplay.classList.add('ceo-hidden');
				this.companyNameInput.classList.remove('ceo-hidden');
				this.companyNameInput.focus();
			} else {
				this.companyNameDisplay.classList.remove('ceo-hidden');
				this.companyNameInput.classList.add('ceo-hidden');
			}
		} else {
			if (enable) {
				this.industryDisplay.classList.add('ceo-hidden');
				this.industryInput.classList.remove('ceo-hidden');
				this.industryInput.focus();
			} else {
				this.industryDisplay.classList.remove('ceo-hidden');
				this.industryInput.classList.add('ceo-hidden');
			}
		}
	}

	private async getTNEContextPath(): Promise<URI> {
		const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
		return workspaceFolders.length > 0 ? joinPath(workspaceFolders[0].uri, 'TNE-CONTEXT') : URI.file('/tmp/TNE-CONTEXT');
	}

	private async updateReportChecklist(): Promise<void> {
		while (this.reportChecklist.firstChild) { this.reportChecklist.removeChild(this.reportChecklist.firstChild); }
		const tneContextPath = await this.getTNEContextPath();
		const reports = [
			'cip1-focus-of-invention.md',
			'cip2-provisional-patent-description.md',
			'cip3-invention-methods.md',
			'cip4-claims.md'
		];
		for (const report of reports) {
			const listItem = document.createElement('div');
			listItem.className = 'ceo-report-item';
			const statusIndicator = document.createElement('span');
			statusIndicator.className = 'status-indicator';
			const label = document.createElement('label');
			const displayReportName = report.replace(/cip\d-/, '').replace(/-/g, ' ').replace(/\.md$/, '')
				.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
			label.textContent = displayReportName;

			try {
				const reportUri = joinPath(tneContextPath, report);
				await this.fileService.resolve(reportUri);
				statusIndicator.classList.add('checked');
				label.classList.add('checked');
			} catch {
				statusIndicator.classList.add('unchecked');
				label.classList.add('unchecked');
			}
			listItem.appendChild(statusIndicator);
			listItem.appendChild(label);
			listItem.addEventListener('click', () => this.handleReportClick(report, statusIndicator.classList.contains('checked')));
			this.reportChecklist.appendChild(listItem);
		}
	}

	private async handleReportClick(report: string, isCompleted: boolean): Promise<void> {
		const reportToModeMap: { [key: string]: { slug: string; name: string } } = {
			'cip1-focus-of-invention.md': { slug: 'cip1-focus-of-invention', name: 'Focus of Invention' },
			'cip2-provisional-patent-description.md': { slug: 'cip2-provisional-patent-description', name: 'Provisional Patent Description' },
			'cip3-invention-methods.md': { slug: 'cip3-invention-methods', name: 'Invention Methods' },
			'cip4-claims.md': { slug: 'cip4-claims', name: 'IP Claims' },
		};
		if (isCompleted) {
			const tneContextPath = await this.getTNEContextPath();
			const reportUri = joinPath(tneContextPath, report);
			try {
				await this.commandService.executeCommand('vscode.open', reportUri);
				this.notificationService.info(localize('cip.report.opened', "Opened report: {0}", report));
			} catch (error) {
				this.notificationService.error(localize('cip.report.openError', "Failed to open report {0}: {1}", report, (error as any).message));
			}
		} else {
			const modeInfo = reportToModeMap[report];
			if (modeInfo) {
				const message = localize('cip.mode.switchMessage', "Begin: {0}", modeInfo.name);
				try {
					await this.commandService.executeCommand('compass.service.startTask', { message, newTask: false, mode: modeInfo.slug });
					this.notificationService.info(localize('cip.mode.switchTriggered', "Triggered mode switch to: {0}", modeInfo.name));
				} catch (error) {
					this.notificationService.error(localize('cip.mode.switchError', "Failed to trigger mode switch: {0}", (error as any).message));
				}
			}
		}
	}
}

const cipViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: CIP_VIEW_CONTAINER_ID,
		title: localize2('cip', 'CIP'),
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CIP_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
		icon: Codicon.law,
		storageId: CIP_VIEW_CONTAINER_ID,
		order: 12
	},
	ViewContainerLocation.Sidebar
);
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: CIP_VIEW_ID,
	name: localize2('cip.view', 'CIP'),
	containerIcon: Codicon.law,
	ctorDescriptor: new SyncDescriptor(CIPView),
	canMoveView: true,
	canToggleVisibility: true,
	when: undefined,
}], cipViewContainer);


// CMO View: Sidebar container and view wired to Compass
const CMO_VIEW_CONTAINER_ID = 'workbench.view.cmo';
const CMO_VIEW_ID = 'workbench.view.cmoView';

interface CMOCompanyInfo {
	name: string;
	industry: string;
}

class CMOView extends ViewPane {
	static readonly ID = CMO_VIEW_ID;

	private companyNameInput!: HTMLInputElement;
	private industryInput!: HTMLInputElement;
	private companyNameDisplay!: HTMLElement;
	private industryDisplay!: HTMLElement;

	private reportChecklist!: HTMLElement;
	private contentContainer!: HTMLElement;

	private companyInfo: CMOCompanyInfo = { name: '', industry: '' };

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
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super(
			{ ...options, titleMenuId: MenuId.ViewTitle, singleViewPaneContainerTitle: 'CMO View' },
			keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService,
			instantiationService, openerService, themeService, hoverService
		);
		this._register(this.onDidChangeBodyVisibility(() => this.onBodyVisibilityChange()));
	}

	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);
		if (!this.contentContainer) {
			this.contentContainer = document.createElement('div');
			this.contentContainer.className = 'ceo-view-content';
			parent.appendChild(this.contentContainer);
		} else {
			while (this.contentContainer.firstChild) { this.contentContainer.removeChild(this.contentContainer.firstChild); }
		}

		// Company Info
		const companyInfoSection = document.createElement('div');
		companyInfoSection.className = 'ceo-company-info-section';
		this.contentContainer.appendChild(companyInfoSection);

		const companyOverviewTitle = document.createElement('div');
		companyOverviewTitle.className = 'ceo-section-title';
		companyOverviewTitle.textContent = localize('companyOverviewTitle', "Company Overview");
		companyInfoSection.appendChild(companyOverviewTitle);


		const companyLabel = document.createElement('label');
		companyLabel.textContent = localize('cmo.companyLabel', "Company");
		companyLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(companyLabel);

		this.companyNameDisplay = document.createElement('h1');
		this.companyNameDisplay.className = 'ceo-company-name-display';
		this.companyNameDisplay.addEventListener('dblclick', () => this.toggleEditMode('name', true));
		this.companyNameDisplay.addEventListener('click', () => this.toggleEditMode('name', true));
		companyInfoSection.appendChild(this.companyNameDisplay);

		this.companyNameInput = document.createElement('input');
		this.companyNameInput.type = 'text';
		this.companyNameInput.placeholder = localize('cmo.companyNamePlaceholder', "Enter company name");
		this.companyNameInput.className = 'ceo-input ceo-hidden';
		this.companyNameInput.addEventListener('change', () => this.saveCompanyInfo());
		this.companyNameInput.addEventListener('blur', () => this.toggleEditMode('name', false));
		companyInfoSection.appendChild(this.companyNameInput);

		const industryLabel = document.createElement('label');
		industryLabel.textContent = localize('cmo.industryLabel', "Industry");
		industryLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(industryLabel);

		this.industryDisplay = document.createElement('h2');
		this.industryDisplay.className = 'ceo-industry-display';
		this.industryDisplay.addEventListener('dblclick', () => this.toggleEditMode('industry', true));
		this.industryDisplay.addEventListener('click', () => this.toggleEditMode('industry', true));
		companyInfoSection.appendChild(this.industryDisplay);

		this.industryInput = document.createElement('input');
		this.industryInput.type = 'text';
		this.industryInput.placeholder = localize('cmo.industryPlaceholder', "Enter industry");
		this.industryInput.className = 'ceo-input ceo-hidden';
		this.industryInput.addEventListener('change', () => this.saveCompanyInfo());
		this.industryInput.addEventListener('blur', () => this.toggleEditMode('industry', false));
		companyInfoSection.appendChild(this.industryInput);

		// Description Section
		const descriptionSection = document.createElement('div');
		descriptionSection.className = 'ceo-description-section';
		this.contentContainer.appendChild(descriptionSection);

		const descriptionTitle = document.createElement('div');
		descriptionTitle.className = 'ceo-section-title';
		descriptionTitle.textContent = localize('cmo.descriptionTitle', "Go-To-Market Overview");
		descriptionSection.appendChild(descriptionTitle);

		const description = document.createElement('div');
		description.className = 'ceo-description';
		description.textContent = localize('cmo.descriptionText', "Translate product value into market impact.\n\nProduce creative briefs, presentations, and a business website to communicate positioning and drive demand.");
		descriptionSection.appendChild(description);

		// Reports Checklist Section
		const reportsSection = document.createElement('div');
		reportsSection.className = 'ceo-reports-section';
		this.contentContainer.appendChild(reportsSection);

		const reportsTitle = document.createElement('div');
		reportsTitle.textContent = localize('cmo.reportsTitle', "Status");
		reportsTitle.className = 'ceo-section-title';
		reportsSection.appendChild(reportsTitle);

		this.reportChecklist = document.createElement('div');
		this.reportChecklist.className = 'ceo-report-checklist';
		reportsSection.appendChild(this.reportChecklist);

		this.loadCompanyInfo();
		this.updateReportChecklist();
	}

	private onBodyVisibilityChange(): void {
		if (this.isBodyVisible()) {
			this.loadCompanyInfo();
			this.updateReportChecklist();
		}
	}

	private async getCompanyInfoFilePath(): Promise<URI> {
		const tne = await this.getTNEContextPath();
		return joinPath(tne, 'company-info.json');
	}

	private async getTNEContextPath(): Promise<URI> {
		const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
		return workspaceFolders.length > 0 ? joinPath(workspaceFolders[0].uri, 'TNE-CONTEXT') : URI.file('/tmp/TNE-CONTEXT');
	}

	private async loadCompanyInfo(): Promise<void> {
		const filePath = await this.getCompanyInfoFilePath();
		try {
			const content = await this.fileService.readFile(filePath);
			this.companyInfo = JSON.parse(content.value.toString());
			this.companyNameInput.value = this.companyInfo.name;
			this.industryInput.value = this.companyInfo.industry;

			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			if ((error as any).fileOperationResult === 1 /* FILE_NOT_FOUND */) {
				this.companyInfo = { name: '', industry: '' };
				this.companyNameInput.value = '';
				this.industryInput.value = '';
				this.toggleEditMode('name', true);
				this.toggleEditMode('industry', true);
			} else {
				this.notificationService.error(localize('cmo.companyInfo.loadError', "Failed to load company-info.json: {0}", (error as any).message));
			}
		}
	}

	private async saveCompanyInfo(): Promise<void> {
		this.companyInfo.name = this.companyNameInput.value.trim();
		this.companyInfo.industry = this.industryInput.value.trim();
		const filePath = await this.getCompanyInfoFilePath();
		try {
			await this.fileService.writeFile(filePath, VSBuffer.fromString(JSON.stringify(this.companyInfo, null, 2)));
			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			this.notificationService.error(localize('cmo.companyInfo.saveError', "Failed to save company-info.json: {0}", (error as any).message));
		}
	}

	private toggleEditMode(field: 'name' | 'industry', enable: boolean): void {
		if (field === 'name') {
			if (enable) {
				this.companyNameDisplay.classList.add('ceo-hidden');
				this.companyNameInput.classList.remove('ceo-hidden');
				this.companyNameInput.focus();
			} else {
				this.companyNameDisplay.classList.remove('ceo-hidden');
				this.companyNameInput.classList.add('ceo-hidden');
			}
		} else {
			if (enable) {
				this.industryDisplay.classList.add('ceo-hidden');
				this.industryInput.classList.remove('ceo-hidden');
				this.industryInput.focus();
			} else {
				this.industryDisplay.classList.remove('ceo-hidden');
				this.industryInput.classList.add('ceo-hidden');
			}
		}
	}


	private async updateReportChecklist(): Promise<void> {
		while (this.reportChecklist.firstChild) { this.reportChecklist.removeChild(this.reportChecklist.firstChild); }
		const tneContextPath = await this.getTNEContextPath();
		const reports = [
			'cmo1-content-to-outline.md',
			'cmo2-presentation.md',
			'cmo3-business-website.md'
		];
		for (const report of reports) {
			const listItem = document.createElement('div');
			listItem.className = 'ceo-report-item';
			const statusIndicator = document.createElement('span');
			statusIndicator.className = 'status-indicator';
			const label = document.createElement('label');
			const displayReportName = report.replace(/cmo\d-/, '').replace(/-/g, ' ').replace(/\.md$/, '')
				.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
			label.textContent = displayReportName;

			try {
				const reportUri = joinPath(tneContextPath, report);
				await this.fileService.resolve(reportUri);
				statusIndicator.classList.add('checked');
				label.classList.add('checked');
			} catch {
				statusIndicator.classList.add('unchecked');
				label.classList.add('unchecked');
			}
			listItem.appendChild(statusIndicator);
			listItem.appendChild(label);
			listItem.addEventListener('click', () => this.handleReportClick(report, statusIndicator.classList.contains('checked')));
			this.reportChecklist.appendChild(listItem);
		}
	}

	private async handleReportClick(report: string, isCompleted: boolean): Promise<void> {
		const reportToModeMap: { [key: string]: { slug: string; name: string } } = {
			'cmo1-content-to-outline.md': { slug: 'cmo1-content-to-outline', name: 'Creative Brief' },
			'cmo2-presentation.md': { slug: 'cmo2-presentation', name: 'Create Materials' },
			'cmo3-business-website.md': { slug: 'cmo3-business-website', name: 'Business Website' },
		};
		if (isCompleted) {
			const tneContextPath = await this.getTNEContextPath();
			const reportUri = joinPath(tneContextPath, report);
			try {
				await this.commandService.executeCommand('vscode.open', reportUri);
				this.notificationService.info(localize('cmo.report.opened', "Opened report: {0}", report));
			} catch (error) {
				this.notificationService.error(localize('cmo.report.openError', "Failed to open report {0}: {1}", report, (error as any).message));
			}
		} else {
			const modeInfo = reportToModeMap[report];
			if (modeInfo) {
				const message = localize('cmo.mode.switchMessage', "Begin: {0}", modeInfo.name);
				try {
					await this.commandService.executeCommand('compass.service.startTask', { message, newTask: false, mode: modeInfo.slug });
					this.notificationService.info(localize('cmo.mode.switchTriggered', "Triggered mode switch to: {0}", modeInfo.name));
				} catch (error) {
					this.notificationService.error(localize('cmo.mode.switchError', "Failed to trigger mode switch: {0}", (error as any).message));
				}
			}
		}
	}
}

const cmoViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: CMO_VIEW_CONTAINER_ID,
		title: localize2('cmo', 'CMO'),
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CMO_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
		icon: Codicon.megaphone,
		storageId: CMO_VIEW_CONTAINER_ID,
		order: 13
	},
	ViewContainerLocation.Sidebar
);
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: CMO_VIEW_ID,
	name: localize2('cmo.view', 'CMO'),
	containerIcon: Codicon.megaphone,
	ctorDescriptor: new SyncDescriptor(CMOView),
	canMoveView: true,
	canToggleVisibility: true,
	when: undefined,
}], cmoViewContainer);


// CCO View: Sidebar container and view wired to Compass
const CCO_VIEW_CONTAINER_ID = 'workbench.view.cco';
const CCO_VIEW_ID = 'workbench.view.ccoView';

interface CCOCompanyInfo {
	name: string;
	industry: string;
}

class CCOView extends ViewPane {
	static readonly ID = CCO_VIEW_ID;

	private companyNameInput!: HTMLInputElement;
	private industryInput!: HTMLInputElement;
	private companyNameDisplay!: HTMLElement;
	private industryDisplay!: HTMLElement;

	private reportChecklist!: HTMLElement;
	private contentContainer!: HTMLElement;

	private companyInfo: CCOCompanyInfo = { name: '', industry: '' };

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
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super(
			{ ...options, titleMenuId: MenuId.ViewTitle, singleViewPaneContainerTitle: 'CCO View' },
			keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService,
			instantiationService, openerService, themeService, hoverService
		);
		this._register(this.onDidChangeBodyVisibility(() => this.onBodyVisibilityChange()));
	}

	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);
		if (!this.contentContainer) {
			this.contentContainer = document.createElement('div');
			this.contentContainer.className = 'ceo-view-content';
			parent.appendChild(this.contentContainer);
		} else {
			while (this.contentContainer.firstChild) { this.contentContainer.removeChild(this.contentContainer.firstChild); }
		}

		// Company Info
		const companyInfoSection = document.createElement('div');
		companyInfoSection.className = 'ceo-company-info-section';
		this.contentContainer.appendChild(companyInfoSection);

		const companyOverviewTitle = document.createElement('div');
		companyOverviewTitle.className = 'ceo-section-title';
		companyOverviewTitle.textContent = localize('companyOverviewTitle', "Company Overview");
		companyInfoSection.appendChild(companyOverviewTitle);


		const companyLabel = document.createElement('label');
		companyLabel.textContent = localize('cco.companyLabel', "Company");
		companyLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(companyLabel);

		this.companyNameDisplay = document.createElement('h1');
		this.companyNameDisplay.className = 'ceo-company-name-display';
		this.companyNameDisplay.addEventListener('dblclick', () => this.toggleEditMode('name', true));
		this.companyNameDisplay.addEventListener('click', () => this.toggleEditMode('name', true));
		companyInfoSection.appendChild(this.companyNameDisplay);

		this.companyNameInput = document.createElement('input');
		this.companyNameInput.type = 'text';
		this.companyNameInput.placeholder = localize('cco.companyNamePlaceholder', "Enter company name");
		this.companyNameInput.className = 'ceo-input ceo-hidden';
		this.companyNameInput.addEventListener('change', () => this.saveCompanyInfo());
		this.companyNameInput.addEventListener('blur', () => this.toggleEditMode('name', false));
		companyInfoSection.appendChild(this.companyNameInput);

		const industryLabel = document.createElement('label');
		industryLabel.textContent = localize('cco.industryLabel', "Industry");
		industryLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(industryLabel);

		this.industryDisplay = document.createElement('h2');
		this.industryDisplay.className = 'ceo-industry-display';
		this.industryDisplay.addEventListener('dblclick', () => this.toggleEditMode('industry', true));
		this.industryDisplay.addEventListener('click', () => this.toggleEditMode('industry', true));
		companyInfoSection.appendChild(this.industryDisplay);

		this.industryInput = document.createElement('input');
		this.industryInput.type = 'text';
		this.industryInput.placeholder = localize('cco.industryPlaceholder', "Enter industry");
		this.industryInput.className = 'ceo-input ceo-hidden';
		this.industryInput.addEventListener('change', () => this.saveCompanyInfo());
		this.industryInput.addEventListener('blur', () => this.toggleEditMode('industry', false));
		companyInfoSection.appendChild(this.industryInput);

		// Description Section
		const descriptionSection = document.createElement('div');
		descriptionSection.className = 'ceo-description-section';
		this.contentContainer.appendChild(descriptionSection);

		const descriptionTitle = document.createElement('div');
		descriptionTitle.className = 'ceo-section-title';
		descriptionTitle.textContent = localize('cco.descriptionTitle', "Coding & Test Engineering");
		descriptionSection.appendChild(descriptionTitle);

		const description = document.createElement('div');
		description.className = 'ceo-description';
		description.textContent = localize('cco.descriptionText', "Coordinate engineering delivery. Use Full-Stack Planner, User Interface, GraphAI Workflows, and Test Engineering to plan, implement, and validate end-to-end quality.");
		descriptionSection.appendChild(description);

		// Reports Checklist Section
		const reportsSection = document.createElement('div');
		reportsSection.className = 'ceo-reports-section';
		this.contentContainer.appendChild(reportsSection);

		const reportsTitle = document.createElement('div');
		reportsTitle.textContent = localize('cco.reportsTitle', "Status");
		reportsTitle.className = 'ceo-section-title';
		reportsSection.appendChild(reportsTitle);

		this.reportChecklist = document.createElement('div');
		this.reportChecklist.className = 'ceo-report-checklist';
		reportsSection.appendChild(this.reportChecklist);

		this.loadCompanyInfo();
		this.updateReportChecklist();
	}

	private onBodyVisibilityChange(): void {
		if (this.isBodyVisible()) {
			this.loadCompanyInfo();
			this.updateReportChecklist();
		}
	}

	private async getCompanyInfoFilePath(): Promise<URI> {
		const tne = await this.getTNEContextPath();
		return joinPath(tne, 'company-info.json');
	}

	private async getTNEContextPath(): Promise<URI> {
		const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
		return workspaceFolders.length > 0 ? joinPath(workspaceFolders[0].uri, 'TNE-CONTEXT') : URI.file('/tmp/TNE-CONTEXT');
	}

	private async loadCompanyInfo(): Promise<void> {
		const filePath = await this.getCompanyInfoFilePath();
		try {
			const content = await this.fileService.readFile(filePath);
			this.companyInfo = JSON.parse(content.value.toString());
			this.companyNameInput.value = this.companyInfo.name;
			this.industryInput.value = this.companyInfo.industry;

			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			if ((error as any).fileOperationResult === 1 /* FILE_NOT_FOUND */) {
				this.companyInfo = { name: '', industry: '' };
				this.companyNameInput.value = '';
				this.industryInput.value = '';
				this.toggleEditMode('name', true);
				this.toggleEditMode('industry', true);
			} else {
				this.notificationService.error(localize('cco.companyInfo.loadError', "Failed to load company-info.json: {0}", (error as any).message));
			}
		}
	}

	private async saveCompanyInfo(): Promise<void> {
		this.companyInfo.name = this.companyNameInput.value.trim();
		this.companyInfo.industry = this.industryInput.value.trim();
		const filePath = await this.getCompanyInfoFilePath();
		try {
			await this.fileService.writeFile(filePath, VSBuffer.fromString(JSON.stringify(this.companyInfo, null, 2)));
			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			this.notificationService.error(localize('cco.companyInfo.saveError', "Failed to save company-info.json: {0}", (error as any).message));
		}
	}

	private toggleEditMode(field: 'name' | 'industry', enable: boolean): void {
		if (field === 'name') {
			if (enable) {
				this.companyNameDisplay.classList.add('ceo-hidden');
				this.companyNameInput.classList.remove('ceo-hidden');
				this.companyNameInput.focus();
			} else {
				this.companyNameDisplay.classList.remove('ceo-hidden');
				this.companyNameInput.classList.add('ceo-hidden');
			}
		} else {
			if (enable) {
				this.industryDisplay.classList.add('ceo-hidden');
				this.industryInput.classList.remove('ceo-hidden');
				this.industryInput.focus();
			} else {
				this.industryDisplay.classList.remove('ceo-hidden');
				this.industryInput.classList.add('ceo-hidden');
			}
		}
	}


	private async updateReportChecklist(): Promise<void> {
		while (this.reportChecklist.firstChild) { this.reportChecklist.removeChild(this.reportChecklist.firstChild); }
		const tneContextPath = await this.getTNEContextPath();
		const reports = [
			'cco1-fullstack.md',
			'cco2-uiux.md',
			'cco3-graphai.md',
			'cco4-test.md'
		];
		for (const report of reports) {
			const listItem = document.createElement('div');
			listItem.className = 'ceo-report-item';
			const statusIndicator = document.createElement('span');
			statusIndicator.className = 'status-indicator';
			const label = document.createElement('label');
			let displayReportName: string;
			if (report === 'cco1-fullstack.md') {
				displayReportName = 'Full Stack Planner';
			} else if (report === 'cco2-uiux.md') {
				displayReportName = 'User Interface';
			} else if (report === 'cco3-graphai.md') {
				displayReportName = 'GraphAI Workflows';
			} else if (report === 'cco4-test.md') {
				displayReportName = 'Test Engineering';
			} else {
				displayReportName = report.replace(/cco\d-/, '').replace(/-/g, ' ').replace(/\.md$/, '')
					.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
			}
			label.textContent = displayReportName;

			try {
				const reportUri = joinPath(tneContextPath, report);
				await this.fileService.resolve(reportUri);
				statusIndicator.classList.add('checked');
				label.classList.add('checked');
			} catch {
				statusIndicator.classList.add('unchecked');
				label.classList.add('unchecked');
			}
			listItem.appendChild(statusIndicator);
			listItem.appendChild(label);
			listItem.addEventListener('click', () => this.handleReportClick(report, statusIndicator.classList.contains('checked')));
			this.reportChecklist.appendChild(listItem);
		}
	}

	private async handleReportClick(report: string, isCompleted: boolean): Promise<void> {
		const reportToModeMap: { [key: string]: { slug: string; name: string } } = {
			'cco1-fullstack.md': { slug: 'cco1-fullstack', name: 'Full Stack Planner' },
			'cco2-uiux.md': { slug: 'cco2-uiux', name: 'User Interface' },
			'cco3-graphai.md': { slug: 'cco3-graphai', name: 'GraphAI Workflows' },
			'cco4-test.md': { slug: 'cco4-test', name: 'Test Engineering' },
		};
		if (isCompleted) {
			const tneContextPath = await this.getTNEContextPath();
			const reportUri = joinPath(tneContextPath, report);
			try {
				await this.commandService.executeCommand('vscode.open', reportUri);
				this.notificationService.info(localize('cco.report.opened', "Opened report: {0}", report));
			} catch (error) {
				this.notificationService.error(localize('cco.report.openError', "Failed to open report {0}: {1}", report, (error as any).message));
			}
		} else {
			const modeInfo = reportToModeMap[report];
			if (modeInfo) {
				const message = localize('cco.mode.switchMessage', "Begin: {0}", modeInfo.name);
				try {
					await this.commandService.executeCommand('compass.service.startTask', { message, newTask: false, mode: modeInfo.slug });
					this.notificationService.info(localize('cco.mode.switchTriggered', "Triggered mode switch to: {0}", modeInfo.name));
				} catch (error) {
					this.notificationService.error(localize('cco.mode.switchError', "Failed to trigger mode switch: {0}", (error as any).message));
				}
			}
		}
	}
}

const ccoViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: CCO_VIEW_CONTAINER_ID,
		title: localize2('cco', 'CCO'),
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CCO_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
		icon: Codicon.terminal,
		storageId: CCO_VIEW_CONTAINER_ID,
		order: 14
	},
	ViewContainerLocation.Sidebar
);
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: CCO_VIEW_ID,
	name: localize2('cco.view', 'CCO'),
	containerIcon: Codicon.terminal,
	ctorDescriptor: new SyncDescriptor(CCOView),
	canMoveView: true,
	canToggleVisibility: true,
	when: undefined,
}], ccoViewContainer);


// CTO-Core View: Sidebar container and view wired to Compass
const CTO_VIEW_CONTAINER_ID = 'workbench.view.cto';
const CTO_VIEW_ID = 'workbench.view.ctoView';

interface CTOCompanyInfo {
	name: string;
	industry: string;
}

class CTOView extends ViewPane {
	static readonly ID = CTO_VIEW_ID;

	private companyNameInput!: HTMLInputElement;
	private industryInput!: HTMLInputElement;
	private reportChecklist!: HTMLElement;
	private contentContainer!: HTMLElement;
	private companyNameDisplay!: HTMLElement;
	private industryDisplay!: HTMLElement;

	private companyInfo: CTOCompanyInfo = { name: '', industry: '' };

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
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super(
			{ ...options, titleMenuId: MenuId.ViewTitle, singleViewPaneContainerTitle: 'CTO View' },
			keybindingService,
			contextMenuService,
			configurationService,
			contextKeyService,
			viewDescriptorService,
			instantiationService,
			openerService,
			themeService,
			hoverService
		);
		this._register(this.onDidChangeBodyVisibility(() => this.onBodyVisibilityChange()));
	}

	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);

		if (!this.contentContainer) {
			this.contentContainer = document.createElement('div');
			this.contentContainer.className = 'ceo-view-content';
			parent.appendChild(this.contentContainer);
		} else {
			while (this.contentContainer.firstChild) {
				this.contentContainer.removeChild(this.contentContainer.firstChild);
			}
		}

		// Company Info Section
		const companyInfoSection = document.createElement('div');
		companyInfoSection.className = 'ceo-company-info-section';
		this.contentContainer.appendChild(companyInfoSection);

		const companyOverviewTitle = document.createElement('div');
		companyOverviewTitle.className = 'ceo-section-title';
		companyOverviewTitle.textContent = localize('companyOverviewTitle', "Company Overview");
		companyInfoSection.appendChild(companyOverviewTitle);


		const companyLabel = document.createElement('label');
		companyLabel.textContent = localize('cto.companyLabel', "Company");
		companyLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(companyLabel);

		this.companyNameDisplay = document.createElement('h1');
		this.companyNameDisplay.className = 'ceo-company-name-display';
		this.companyNameDisplay.addEventListener('dblclick', () => this.toggleEditMode('name', true));
		this.companyNameDisplay.addEventListener('click', () => this.toggleEditMode('name', true));
		companyInfoSection.appendChild(this.companyNameDisplay);

		this.companyNameInput = document.createElement('input');
		this.companyNameInput.type = 'text';
		this.companyNameInput.placeholder = localize('cto.companyNamePlaceholder', "Enter company name");
		this.companyNameInput.className = 'ceo-input ceo-hidden';
		this.companyNameInput.addEventListener('change', () => this.saveCompanyInfo());
		this.companyNameInput.addEventListener('blur', () => this.toggleEditMode('name', false));
		companyInfoSection.appendChild(this.companyNameInput);

		const industryLabel = document.createElement('label');
		industryLabel.textContent = localize('cto.industryLabel', "Industry");
		industryLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(industryLabel);

		this.industryDisplay = document.createElement('h2');
		this.industryDisplay.className = 'ceo-industry-display';
		this.industryDisplay.addEventListener('dblclick', () => this.toggleEditMode('industry', true));
		this.industryDisplay.addEventListener('click', () => this.toggleEditMode('industry', true));
		companyInfoSection.appendChild(this.industryDisplay);

		this.industryInput = document.createElement('input');
		this.industryInput.type = 'text';
		this.industryInput.placeholder = localize('cto.industryPlaceholder', "Enter industry");
		this.industryInput.className = 'ceo-input ceo-hidden';
		this.industryInput.addEventListener('change', () => this.saveCompanyInfo());
		this.industryInput.addEventListener('blur', () => this.toggleEditMode('industry', false));
		companyInfoSection.appendChild(this.industryInput);

		// Reports Checklist Section
		// Description Section
		const descriptionSection = document.createElement('div');
		descriptionSection.className = 'ceo-description-section';
		this.contentContainer.appendChild(descriptionSection);

		const descriptionTitle = document.createElement('div');
		descriptionTitle.className = 'ceo-section-title';
		descriptionTitle.textContent = localize('cto.descriptionTitle', "Technical Strategy");
		descriptionSection.appendChild(descriptionTitle);

		const description = document.createElement('div');
		description.className = 'ceo-description';
		description.textContent = localize('cto.descriptionText', "Drive technology direction and alignment.\n\nEstablish an accurate baseline of the existing environment: code, data, technology, applications, and standards. The agnet will then identify constraints, risks, and opportunities for improvement.");
		descriptionSection.appendChild(description);

		// Reports Checklist Section
		const reportsSection = document.createElement('div');
		reportsSection.className = 'ceo-reports-section';
		this.contentContainer.appendChild(reportsSection);

		const reportsTitle = document.createElement('div');
		reportsTitle.textContent = localize('cto.reportsTitle', "Status");
		reportsTitle.className = 'ceo-section-title';
		reportsSection.appendChild(reportsTitle);

		this.reportChecklist = document.createElement('div');
		this.reportChecklist.className = 'ceo-report-checklist';
		reportsSection.appendChild(this.reportChecklist);

		this.loadCompanyInfo();
		this.updateReportChecklist();
	}

	private onBodyVisibilityChange(): void {
		if (this.isBodyVisible()) {
			this.loadCompanyInfo();
			this.updateReportChecklist();
		}
	}

	private async getCompanyInfoFilePath(): Promise<URI> {
		const tneContextPath = await this.getTNEContextPath();
		return joinPath(tneContextPath, 'company-info.json');
	}

	private async loadCompanyInfo(): Promise<void> {
		const filePath = await this.getCompanyInfoFilePath();
		try {
			const content = await this.fileService.readFile(filePath);
			this.companyInfo = JSON.parse(content.value.toString());
			this.companyNameInput.value = this.companyInfo.name;
			this.industryInput.value = this.companyInfo.industry;

			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);

		} catch (error) {
			if ((error as any).fileOperationResult === 1 /* FILE_NOT_FOUND */) {
				this.notificationService.info(localize('cto.companyInfo.notFound', "company-info.json not found in TNE-CONTEXT. Please enter company details."));
				this.companyInfo = { name: '', industry: '' };
				this.companyNameInput.value = '';
				this.industryInput.value = '';
				this.toggleEditMode('name', true);
				this.toggleEditMode('industry', true);
			} else {
				this.notificationService.error(localize('cto.companyInfo.loadError', "Failed to load company-info.json: {0}", (error as any).message));
			}
		}
	}

	private async saveCompanyInfo(): Promise<void> {
		this.companyInfo.name = this.companyNameInput.value.trim();
		this.companyInfo.industry = this.industryInput.value.trim();
		const filePath = await this.getCompanyInfoFilePath();
		try {
			await this.fileService.writeFile(filePath, VSBuffer.fromString(JSON.stringify(this.companyInfo, null, 2)));
			this.notificationService.info(localize('cto.companyInfo.saveSuccess', "Company info saved to TNE-CONTEXT/company-info.json."));
			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			this.notificationService.error(localize('cto.companyInfo.saveError', "Failed to save company-info.json: {0}", (error as any).message));
		}
	}

	private toggleEditMode(field: 'name' | 'industry', enable: boolean): void {
		if (field === 'name') {
			if (enable) {
				this.companyNameDisplay.classList.add('ceo-hidden');
				this.companyNameInput.classList.remove('ceo-hidden');
				this.companyNameInput.focus();
			} else {
				this.companyNameDisplay.classList.remove('ceo-hidden');
				this.companyNameInput.classList.add('ceo-hidden');
			}
		} else {
			if (enable) {
				this.industryDisplay.classList.add('ceo-hidden');
				this.industryInput.classList.remove('ceo-hidden');
				this.industryInput.focus();
			} else {
				this.industryDisplay.classList.remove('ceo-hidden');
				this.industryInput.classList.add('ceo-hidden');
			}
		}
	}

	private async updateReportChecklist(): Promise<void> {
		while (this.reportChecklist.firstChild) {
			this.reportChecklist.removeChild(this.reportChecklist.firstChild);
		}
		const tneContextPath = await this.getTNEContextPath();
		const reports = [
			'cto1-external-research.md',
			'cto2-existing-code.md',
			'cto3-existing-data.md',
			'cto4-existing-technology.md',
			'cto5-existing-applications.md',
			'cto6-existing-standards.md',
			'cto7-technical-choices.md',
			'cto8-key-decisions.md',
			'cto9-reco-memo.md',
			'cto10-project-brief.md'
		];

		for (const report of reports) {
			const listItem = document.createElement('div');
			listItem.className = 'ceo-report-item';

			const statusIndicator = document.createElement('span');
			statusIndicator.className = 'status-indicator';

			const label = document.createElement('label');
			let displayReportName = report
				.replace(/cto\d-/, '')
				.replace(/-/g, ' ')
				.replace(/\.md$/, '')
				.split(' ')
				.map(word => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');

			// Special handling for specific reports to match the desired display names
			if (report === 'cto2-existing-code.md') {
				displayReportName = 'Existing Code';
			} else if (report === 'cto3-existing-data.md') {
				displayReportName = 'Existing Data';
			} else if (report === 'cto4-existing-technology.md') {
				displayReportName = 'Existing Technology';
			} else if (report === 'cto5-existing-applications.md') {
				displayReportName = 'Existing Apps';
			} else if (report === 'cto6-existing-standards.md') {
				displayReportName = 'Existing Standards';
			}
			label.textContent = displayReportName;

			try {
				const reportUri = joinPath(tneContextPath, report);
				await this.fileService.resolve(reportUri);
				statusIndicator.classList.add('checked');
				label.classList.add('checked');
			} catch {
				statusIndicator.classList.add('unchecked');
				label.classList.add('unchecked');
			}

			listItem.appendChild(statusIndicator);
			listItem.appendChild(label);
			listItem.addEventListener('click', () => this.handleReportClick(report, statusIndicator.classList.contains('checked')));
			this.reportChecklist.appendChild(listItem);
		}
	}

	private async handleReportClick(report: string, isCompleted: boolean): Promise<void> {
		const reportToModeMap: { [key: string]: { slug: string; name: string } } = {
			'cto1-external-research.md': { slug: 'cto1-external-research', name: 'External Research' },
			'cto2-existing-code.md': { slug: 'cto2-existing-code', name: 'Existing Code' },
			'cto3-existing-data.md': { slug: 'cto3-existing-data', name: 'Existing Data' },
			'cto4-existing-technology.md': { slug: 'cto4-existing-technology', name: 'Existing Technology' },
			'cto5-existing-applications.md': { slug: 'cto5-existing-applications', name: 'Existing Apps' },
			'cto6-existing-standards.md': { slug: 'cto6-existing-standards', name: 'Existing Standards' },
			'cto7-technical-choices.md': { slug: 'cto7-technical-choices', name: 'Technical Choices' },
			'cto8-key-decisions.md': { slug: 'cto8-key-decisions', name: 'Key Decisions' },
			'cto9-reco-memo.md': { slug: 'cto9-reco-memo', name: 'Recommendation Memo' },
			'cto10-project-brief.md': { slug: 'cto10-project-brief', name: 'Project Brief' },
		};

		if (isCompleted) {
			const tneContextPath = await this.getTNEContextPath();
			const reportUri = joinPath(tneContextPath, report);
			try {
				await this.commandService.executeCommand('vscode.open', reportUri);
				this.notificationService.info(localize('cto.report.opened', "Opened report: {0}", report));
			} catch (error) {
				this.notificationService.error(localize('cto.report.openError', "Failed to open report {0}: {1}", report, (error as any).message));
			}
		} else {
			const modeInfo = reportToModeMap[report];
			if (modeInfo) {
				const companyName = this.companyInfo.name || 'the company';
				const industry = this.companyInfo.industry || 'unspecified';
				const message = localize(
					'cto.mode.switchMessage',
					"The user requests {0} for {1} in the {2} industry. Switch to the {0} mode and begin.",
					modeInfo.name,
					companyName,
					industry
				);

				try {
					await this.commandService.executeCommand('compass.service.startTask', { message, newTask: false, mode: modeInfo.slug });
					this.notificationService.info(localize('cto.mode.switchTriggered', "Triggered mode switch to: {0}", modeInfo.name));
				} catch (error) {
					this.notificationService.error(localize('cto.mode.switchError', "Failed to trigger mode switch to {0}: {1}", modeInfo.name, (error as any).message));
				}
			} else {
				this.notificationService.warn(localize('cto.mode.noMapping', "No mode mapping found for report: {0}", report));
			}
		}
	}

	private async getTNEContextPath(): Promise<URI> {
		const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
		let tneContextUri: URI;
		if (workspaceFolders.length > 0) {
			tneContextUri = joinPath(workspaceFolders[0].uri, 'TNE-CONTEXT');
		} else {
			tneContextUri = URI.file('/tmp/TNE-CONTEXT');
		}
		try {
			await this.fileService.resolve(tneContextUri);
		} catch (error) {
			if ((error as any).fileOperationResult === 1 /* FILE_NOT_FOUND */) {
				await this.fileService.createFolder(tneContextUri);
				this.notificationService.info(localize('cto.tneContext.created', "TNE-CONTEXT directory created."));
			} else {
				this.notificationService.error(localize('cto.tneContext.error', "Error resolving/creating TNE-CONTEXT directory: {0}", (error as any).message));
			}
		}
		return tneContextUri;
	}

	override shouldShowWelcome(): boolean {
		return false;
	}
}

// Register CTO-Core container in the primary Side Bar
const ctoViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: CTO_VIEW_CONTAINER_ID,
		title: localize2('cto', 'CTO'),
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CTO_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
		icon: Codicon.tools,
		storageId: CTO_VIEW_CONTAINER_ID,
		order: 8
	},
	ViewContainerLocation.Sidebar
);

// Register the CTO-Core view inside the container
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: CTO_VIEW_ID,
	name: localize2('cto.view', 'CTO'),
	containerIcon: Codicon.tools,
	ctorDescriptor: new SyncDescriptor(CTOView),
	canMoveView: true,
	canToggleVisibility: true,
	when: undefined,
}], ctoViewContainer);


// CAO View: Sidebar container and view wired to Compass
const CAO_VIEW_CONTAINER_ID = 'workbench.view.cao';
const CAO_VIEW_ID = 'workbench.view.caoView';

interface CAOCompanyInfo {
	name: string;
	industry: string;
}

class CAOView extends ViewPane {
	static readonly ID = CAO_VIEW_ID;

	private companyNameInput!: HTMLInputElement;
	private industryInput!: HTMLInputElement;
	private reportChecklist!: HTMLElement;
	private contentContainer!: HTMLElement;
	private companyNameDisplay!: HTMLElement;
	private industryDisplay!: HTMLElement;

	private companyInfo: CAOCompanyInfo = { name: '', industry: '' };

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
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super(
			{ ...options, titleMenuId: MenuId.ViewTitle, singleViewPaneContainerTitle: 'CAO View' },
			keybindingService,
			contextMenuService,
			configurationService,
			contextKeyService,
			viewDescriptorService,
			instantiationService,
			openerService,
			themeService,
			hoverService
		);
		this._register(this.onDidChangeBodyVisibility(() => this.onBodyVisibilityChange()));
	}

	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);

		if (!this.contentContainer) {
			this.contentContainer = document.createElement('div');
			this.contentContainer.className = 'ceo-view-content';
			parent.appendChild(this.contentContainer);
		} else {
			while (this.contentContainer.firstChild) {
				this.contentContainer.removeChild(this.contentContainer.firstChild);
			}
		}

		const companyInfoSection = document.createElement('div');
		companyInfoSection.className = 'ceo-company-info-section';
		this.contentContainer.appendChild(companyInfoSection);

		const companyOverviewTitle = document.createElement('div');
		companyOverviewTitle.className = 'ceo-section-title';
		companyOverviewTitle.textContent = localize('companyOverviewTitle', "Company Overview");
		companyInfoSection.appendChild(companyOverviewTitle);


		const companyLabel = document.createElement('label');
		companyLabel.textContent = localize('cao.companyLabel', "Company");
		companyLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(companyLabel);

		this.companyNameDisplay = document.createElement('h1');
		this.companyNameDisplay.className = 'ceo-company-name-display';
		this.companyNameDisplay.addEventListener('dblclick', () => this.toggleEditMode('name', true));
		this.companyNameDisplay.addEventListener('click', () => this.toggleEditMode('name', true));
		companyInfoSection.appendChild(this.companyNameDisplay);

		this.companyNameInput = document.createElement('input');
		this.companyNameInput.type = 'text';
		this.companyNameInput.placeholder = localize('cao.companyNamePlaceholder', "Enter company name");
		this.companyNameInput.className = 'ceo-input ceo-hidden';
		this.companyNameInput.addEventListener('change', () => this.saveCompanyInfo());
		this.companyNameInput.addEventListener('blur', () => this.toggleEditMode('name', false));
		companyInfoSection.appendChild(this.companyNameInput);

		const industryLabel = document.createElement('label');
		industryLabel.textContent = localize('cao.industryLabel', "Industry");
		industryLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(industryLabel);

		this.industryDisplay = document.createElement('h2');
		this.industryDisplay.className = 'ceo-industry-display';
		this.industryDisplay.addEventListener('dblclick', () => this.toggleEditMode('industry', true));
		this.industryDisplay.addEventListener('click', () => this.toggleEditMode('industry', true));
		companyInfoSection.appendChild(this.industryDisplay);

		this.industryInput = document.createElement('input');
		this.industryInput.type = 'text';
		this.industryInput.placeholder = localize('cao.industryPlaceholder', "Enter industry");
		this.industryInput.className = 'ceo-input ceo-hidden';
		this.industryInput.addEventListener('change', () => this.saveCompanyInfo());
		this.industryInput.addEventListener('blur', () => this.toggleEditMode('industry', false));
		companyInfoSection.appendChild(this.industryInput);

		// Description Section
		const descriptionSection = document.createElement('div');
		descriptionSection.className = 'ceo-description-section';
		this.contentContainer.appendChild(descriptionSection);

		const descriptionTitle = document.createElement('div');
		descriptionTitle.className = 'ceo-section-title';
		descriptionTitle.textContent = localize('cao.descriptionTitle', "Assurance & Compliance Overview");
		descriptionSection.appendChild(descriptionTitle);

		const description = document.createElement('div');
		description.className = 'ceo-description';
		description.textContent = localize('cao.descriptionText', "Raise trust and maintain rigor.\n\nThis agent will fact-check your documents and ensure proper citations, verify that your code is properly formatted, and establish standards compliance.");
		descriptionSection.appendChild(description);

		// Reports Checklist Section
		const reportsSection = document.createElement('div');
		reportsSection.className = 'ceo-reports-section';
		this.contentContainer.appendChild(reportsSection);

		const reportsTitle = document.createElement('div');
		reportsTitle.textContent = localize('cao.reportsTitle', "Status");
		reportsTitle.className = 'ceo-section-title';
		reportsSection.appendChild(reportsTitle);

		this.reportChecklist = document.createElement('div');
		this.reportChecklist.className = 'ceo-report-checklist';
		reportsSection.appendChild(this.reportChecklist);

		this.loadCompanyInfo();
		this.updateReportChecklist();
	}

	private onBodyVisibilityChange(): void {
		if (this.isBodyVisible()) {
			this.loadCompanyInfo();
			this.updateReportChecklist();
		}
	}

	private async getCompanyInfoFilePath(): Promise<URI> {
		const tneContextPath = await this.getTNEContextPath();
		return joinPath(tneContextPath, 'company-info.json');
	}

	private async loadCompanyInfo(): Promise<void> {
		const filePath = await this.getCompanyInfoFilePath();
		try {
			const content = await this.fileService.readFile(filePath);
			this.companyInfo = JSON.parse(content.value.toString());
			this.companyNameInput.value = this.companyInfo.name;
			this.industryInput.value = this.companyInfo.industry;

			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);

		} catch (error) {
			if ((error as any).fileOperationResult === 1 /* FILE_NOT_FOUND */) {
				this.notificationService.info(localize('cao.companyInfo.notFound', "company-info.json not found in TNE-CONTEXT. Please enter company details."));
				this.companyInfo = { name: '', industry: '' };
				this.companyNameInput.value = '';
				this.industryInput.value = '';
				this.toggleEditMode('name', true);
				this.toggleEditMode('industry', true);
			} else {
				this.notificationService.error(localize('cao.companyInfo.loadError', "Failed to load company-info.json: {0}", (error as any).message));
			}
		}
	}

	private async saveCompanyInfo(): Promise<void> {
		this.companyInfo.name = this.companyNameInput.value.trim();
		this.companyInfo.industry = this.industryInput.value.trim();
		const filePath = await this.getCompanyInfoFilePath();
		try {
			await this.fileService.writeFile(filePath, VSBuffer.fromString(JSON.stringify(this.companyInfo, null, 2)));
			this.notificationService.info(localize('cao.companyInfo.saveSuccess', "Company info saved to TNE-CONTEXT/company-info.json."));
			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			this.notificationService.error(localize('cao.companyInfo.saveError', "Failed to save company-info.json: {0}", (error as any).message));
		}
	}

	private toggleEditMode(field: 'name' | 'industry', enable: boolean): void {
		if (field === 'name') {
			if (enable) {
				this.companyNameDisplay.classList.add('ceo-hidden');
				this.companyNameInput.classList.remove('ceo-hidden');
				this.companyNameInput.focus();
			} else {
				this.companyNameDisplay.classList.remove('ceo-hidden');
				this.companyNameInput.classList.add('ceo-hidden');
			}
		} else {
			if (enable) {
				this.industryDisplay.classList.add('ceo-hidden');
				this.industryInput.classList.remove('ceo-hidden');
				this.industryInput.focus();
			} else {
				this.industryDisplay.classList.remove('ceo-hidden');
				this.industryInput.classList.add('ceo-hidden');
			}
		}
	}

	private async updateReportChecklist(): Promise<void> {
		while (this.reportChecklist.firstChild) {
			this.reportChecklist.removeChild(this.reportChecklist.firstChild);
		}
		const tneContextPath = await this.getTNEContextPath();
		const reports = [
			'cao1-skeptics-and-citations.md',
			'cao2-lint-generate.md',
			'cao3-reorg-files.md'
		];

		for (const report of reports) {
			const listItem = document.createElement('div');
			listItem.className = 'ceo-report-item';

			const statusIndicator = document.createElement('span');
			statusIndicator.className = 'status-indicator';

			const label = document.createElement('label');
			const displayReportName = report
				.replace(/cao\d-/, '')
				.replace(/-/g, ' ')
				.replace(/\.md$/, '')
				.split(' ')
				.map(word => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');
			label.textContent = displayReportName;

			try {
				const reportUri = joinPath(tneContextPath, report);
				await this.fileService.resolve(reportUri);
				statusIndicator.classList.add('checked');
				label.classList.add('checked');
			} catch {
				statusIndicator.classList.add('unchecked');
				label.classList.add('unchecked');
			}

			listItem.appendChild(statusIndicator);
			listItem.appendChild(label);
			listItem.addEventListener('click', () => this.handleReportClick(report, statusIndicator.classList.contains('checked')));
			this.reportChecklist.appendChild(listItem);
		}
	}

	private async handleReportClick(report: string, isCompleted: boolean): Promise<void> {
		const reportToModeMap: { [key: string]: { slug: string; name: string } } = {
			'cao1-skeptics-and-citations.md': { slug: 'cao1-skeptics-and-citations', name: 'Verification and Methods' },
			'cao2-lint-generate.md': { slug: 'cao2-lint-generate', name: 'Linting and Document Generation' },
			'cao3-reorg-files.md': { slug: 'cao3-reorg-files', name: 'Reorganize Files' },
		};

		if (isCompleted) {
			const tneContextPath = await this.getTNEContextPath();
			const reportUri = joinPath(tneContextPath, report);
			try {
				await this.commandService.executeCommand('vscode.open', reportUri);
				this.notificationService.info(localize('cao.report.opened', "Opened report: {0}", report));
			} catch (error) {
				this.notificationService.error(localize('cao.report.openError', "Failed to open report {0}: {1}", report, (error as any).message));
			}
		} else {
			const modeInfo = reportToModeMap[report];
			if (modeInfo) {
				const companyName = this.companyInfo.name || 'the company';
				const industry = this.companyInfo.industry || 'unspecified';
				const message = localize(
					'cao.mode.switchMessage',
					"The user requests {0} for {1} in the {2} industry. Switch to the {0} mode and begin.",
					modeInfo.name,
					companyName,
					industry
				);

				try {
					await this.commandService.executeCommand('compass.service.startTask', { message, newTask: false, mode: modeInfo.slug });
					this.notificationService.info(localize('cao.mode.switchTriggered', "Triggered mode switch to: {0}", modeInfo.name));
				} catch (error) {
					this.notificationService.error(localize('cao.mode.switchError', "Failed to trigger mode switch to {0}: {1}", modeInfo.name, (error as any).message));
				}
			} else {
				this.notificationService.warn(localize('cao.mode.noMapping', "No mode mapping found for report: {0}", report));
			}
		}
	}

	private async getTNEContextPath(): Promise<URI> {
		const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
		let tneContextUri: URI;
		if (workspaceFolders.length > 0) {
			tneContextUri = joinPath(workspaceFolders[0].uri, 'TNE-CONTEXT');
		} else {
			tneContextUri = URI.file('/tmp/TNE-CONTEXT');
		}
		try {
			await this.fileService.resolve(tneContextUri);
		} catch (error) {
			if ((error as any).fileOperationResult === 1 /* FILE_NOT_FOUND */) {
				await this.fileService.createFolder(tneContextUri);
				this.notificationService.info(localize('cao.tneContext.created', "TNE-CONTEXT directory created."));
			} else {
				this.notificationService.error(localize('cao.tneContext.error', "Error resolving/creating TNE-CONTEXT directory: {0}", (error as any).message));
			}
		}
		return tneContextUri;
	}

	override shouldShowWelcome(): boolean {
		return false;
	}
}

// Register CAO container in the primary Side Bar
const caoViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: CAO_VIEW_CONTAINER_ID,
		title: localize2('cao', 'CAO'),
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CAO_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
		icon: Codicon.verified,
		storageId: CAO_VIEW_CONTAINER_ID,
		order: 15
	},
	ViewContainerLocation.Sidebar
);

// Register the CAO view inside the container
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: CAO_VIEW_ID,
	name: localize2('cao.view', 'CAO'),
	containerIcon: Codicon.verified,
	ctorDescriptor: new SyncDescriptor(CAOView),
	canMoveView: true,
	canToggleVisibility: true,
	when: undefined,
}], caoViewContainer);


// CIO View: Sidebar container and view wired to Compass
const CIO_VIEW_CONTAINER_ID = 'workbench.view.cio';
const CIO_VIEW_ID = 'workbench.view.cioView';

interface CIOCompanyInfo {
	name: string;
	industry: string;
}

class CIOView extends ViewPane {
	static readonly ID = CIO_VIEW_ID;

	private companyNameInput!: HTMLInputElement;
	private industryInput!: HTMLInputElement;
	private reportChecklist!: HTMLElement;
	private contentContainer!: HTMLElement;
	private companyNameDisplay!: HTMLElement;
	private industryDisplay!: HTMLElement;

	private companyInfo: CIOCompanyInfo = { name: '', industry: '' };

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
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super(
			{ ...options, titleMenuId: MenuId.ViewTitle, singleViewPaneContainerTitle: 'CIO View' },
			keybindingService,
			contextMenuService,
			configurationService,
			contextKeyService,
			viewDescriptorService,
			instantiationService,
			openerService,
			themeService,
			hoverService
		);
		this._register(this.onDidChangeBodyVisibility(() => this.onBodyVisibilityChange()));
	}

	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);

		if (!this.contentContainer) {
			this.contentContainer = document.createElement('div');
			this.contentContainer.className = 'ceo-view-content';
			parent.appendChild(this.contentContainer);
		} else {
			while (this.contentContainer.firstChild) {
				this.contentContainer.removeChild(this.contentContainer.firstChild);
			}
		}

		const companyInfoSection = document.createElement('div');
		companyInfoSection.className = 'ceo-company-info-section';
		this.contentContainer.appendChild(companyInfoSection);

		const companyOverviewTitle = document.createElement('div');
		companyOverviewTitle.className = 'ceo-section-title';
		companyOverviewTitle.textContent = localize('companyOverviewTitle', "Company Overview");
		companyInfoSection.appendChild(companyOverviewTitle);


		const companyLabel = document.createElement('label');
		companyLabel.textContent = localize('cio.companyLabel', "Company");
		companyLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(companyLabel);

		this.companyNameDisplay = document.createElement('h1');
		this.companyNameDisplay.className = 'ceo-company-name-display';
		this.companyNameDisplay.addEventListener('dblclick', () => this.toggleEditMode('name', true));
		this.companyNameDisplay.addEventListener('click', () => this.toggleEditMode('name', true));
		companyInfoSection.appendChild(this.companyNameDisplay);

		this.companyNameInput = document.createElement('input');
		this.companyNameInput.type = 'text';
		this.companyNameInput.placeholder = localize('cio.companyNamePlaceholder', "Enter company name");
		this.companyNameInput.className = 'ceo-input ceo-hidden';
		this.companyNameInput.addEventListener('change', () => this.saveCompanyInfo());
		this.companyNameInput.addEventListener('blur', () => this.toggleEditMode('name', false));
		companyInfoSection.appendChild(this.companyNameInput);

		const industryLabel = document.createElement('label');
		industryLabel.textContent = localize('cio.industryLabel', "Industry");
		industryLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(industryLabel);

		this.industryDisplay = document.createElement('h2');
		this.industryDisplay.className = 'ceo-industry-display';
		this.industryDisplay.addEventListener('dblclick', () => this.toggleEditMode('industry', true));
		this.industryDisplay.addEventListener('click', () => this.toggleEditMode('industry', true));
		companyInfoSection.appendChild(this.industryDisplay);

		this.industryInput = document.createElement('input');
		this.industryInput.type = 'text';
		this.industryInput.placeholder = localize('cio.industryPlaceholder', "Enter industry");
		this.industryInput.className = 'ceo-input ceo-hidden';
		this.industryInput.addEventListener('change', () => this.saveCompanyInfo());
		this.industryInput.addEventListener('blur', () => this.toggleEditMode('industry', false));
		companyInfoSection.appendChild(this.industryInput);

		// Description Section
		const descriptionSection = document.createElement('div');
		descriptionSection.className = 'ceo-description-section';
		this.contentContainer.appendChild(descriptionSection);

		const descriptionTitle = document.createElement('div');
		descriptionTitle.className = 'ceo-section-title';
		descriptionTitle.textContent = localize('cio.descriptionTitle', "IT Operations");
		descriptionSection.appendChild(descriptionTitle);

		const description = document.createElement('div');
		description.className = 'ceo-description';
		description.textContent = localize('cio.descriptionText', "Run stable, secure operations. Standardize runbooks, environments, observability, and SLAs.");
		descriptionSection.appendChild(description);

		// Reports Checklist Section
		const reportsSection = document.createElement('div');
		reportsSection.className = 'ceo-reports-section';
		this.contentContainer.appendChild(reportsSection);

		const reportsTitle = document.createElement('div');
		reportsTitle.textContent = localize('cio.reportsTitle', "Status");
		reportsTitle.className = 'ceo-section-title';
		reportsSection.appendChild(reportsTitle);

		this.reportChecklist = document.createElement('div');
		this.reportChecklist.className = 'ceo-report-checklist';
		reportsSection.appendChild(this.reportChecklist);

		this.loadCompanyInfo();
		this.updateReportChecklist();
	}

	private onBodyVisibilityChange(): void {
		if (this.isBodyVisible()) {
			this.loadCompanyInfo();
			this.updateReportChecklist();
		}
	}

	private async getCompanyInfoFilePath(): Promise<URI> {
		const tneContextPath = await this.getTNEContextPath();
		return joinPath(tneContextPath, 'company-info.json');
	}

	private async loadCompanyInfo(): Promise<void> {
		const filePath = await this.getCompanyInfoFilePath();
		try {
			const content = await this.fileService.readFile(filePath);
			this.companyInfo = JSON.parse(content.value.toString());
			this.companyNameInput.value = this.companyInfo.name;
			this.industryInput.value = this.companyInfo.industry;

			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);

		} catch (error) {
			if ((error as any).fileOperationResult === 1) {
				this.notificationService.info(localize('cio.companyInfo.notFound', "company-info.json not found in TNE-CONTEXT. Please enter company details."));
				this.companyInfo = { name: '', industry: '' };
				this.companyNameInput.value = '';
				this.industryInput.value = '';
				this.toggleEditMode('name', true);
				this.toggleEditMode('industry', true);
			} else {
				this.notificationService.error(localize('cio.companyInfo.loadError', "Failed to load company-info.json: {0}", (error as any).message));
			}
		}
	}

	private async saveCompanyInfo(): Promise<void> {
		this.companyInfo.name = this.companyNameInput.value.trim();
		this.companyInfo.industry = this.industryInput.value.trim();
		const filePath = await this.getCompanyInfoFilePath();
		try {
			await this.fileService.writeFile(filePath, VSBuffer.fromString(JSON.stringify(this.companyInfo, null, 2)));
			this.notificationService.info(localize('cio.companyInfo.saveSuccess', "Company info saved to TNE-CONTEXT/company-info.json."));
			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			this.notificationService.error(localize('cio.companyInfo.saveError', "Failed to save company-info.json: {0}", (error as any).message));
		}
	}

	private toggleEditMode(field: 'name' | 'industry', enable: boolean): void {
		if (field === 'name') {
			if (enable) {
				this.companyNameDisplay.classList.add('ceo-hidden');
				this.companyNameInput.classList.remove('ceo-hidden');
				this.companyNameInput.focus();
			} else {
				this.companyNameDisplay.classList.remove('ceo-hidden');
				this.companyNameInput.classList.add('ceo-hidden');
			}
		} else {
			if (enable) {
				this.industryDisplay.classList.add('ceo-hidden');
				this.industryInput.classList.remove('ceo-hidden');
				this.industryInput.focus();
			} else {
				this.industryDisplay.classList.remove('ceo-hidden');
				this.industryInput.classList.add('ceo-hidden');
			}
		}
	}

	private async updateReportChecklist(): Promise<void> {
		while (this.reportChecklist.firstChild) {
			this.reportChecklist.removeChild(this.reportChecklist.firstChild);
		}
		const tneContextPath = await this.getTNEContextPath();
		const reports = [
			'cio1-operation-plan.md',
			'cio2-azure-operation-plan.md',
		];

		for (const report of reports) {
			const listItem = document.createElement('div');
			listItem.className = 'ceo-report-item';

			const statusIndicator = document.createElement('span');
			statusIndicator.className = 'status-indicator';

			const label = document.createElement('label');
			const displayReportName = report
				.replace(/cio\d-/, '')
				.replace(/-/g, ' ')
				.replace(/\.md$/, '')
				.split(' ')
				.map(w => w.charAt(0).toUpperCase() + w.slice(1))
				.join(' ');
			label.textContent = displayReportName;

			try {
				const reportUri = joinPath(tneContextPath, report);
				await this.fileService.resolve(reportUri);
				statusIndicator.classList.add('checked');
				label.classList.add('checked');
			} catch {
				statusIndicator.classList.add('unchecked');
				label.classList.add('unchecked');
			}

			listItem.appendChild(statusIndicator);
			listItem.appendChild(label);
			listItem.addEventListener('click', () => this.handleReportClick(report, statusIndicator.classList.contains('checked')));
			this.reportChecklist.appendChild(listItem);
		}
	}

	private async handleReportClick(report: string, isCompleted: boolean): Promise<void> {
		const reportToModeMap: { [key: string]: { slug: string; name: string } } = {
			'cio1-operation-plan.md': { slug: 'cio1-operation-plan', name: 'Operation Plan' },
			'cio2-azure-operation-plan.md': { slug: 'cio2-azure-operation-plan', name: 'Operations Plan Azure' },
		};

		if (isCompleted) {
			const tneContextPath = await this.getTNEContextPath();
			const reportUri = joinPath(tneContextPath, report);
			try {
				await this.commandService.executeCommand('vscode.open', reportUri);
				this.notificationService.info(localize('cio.report.opened', "Opened report: {0}", report));
			} catch (error) {
				this.notificationService.error(localize('cio.report.openError', "Failed to open report {0}: {1}", report, (error as any).message));
			}
		} else {
			const modeInfo = reportToModeMap[report];
			if (modeInfo) {
				const companyName = this.companyInfo.name || 'the company';
				const industry = this.companyInfo.industry || 'unspecified';
				const message = localize(
					'cio.mode.switchMessage',
					"The user requests {0} for {1} in the {2} industry. Switch to the {0} mode and begin.",
					modeInfo.name,
					companyName,
					industry
				);

				try {
					await this.commandService.executeCommand('compass.service.startTask', { message, newTask: false, mode: modeInfo.slug });
					this.notificationService.info(localize('cio.mode.switchTriggered', "Triggered mode switch to: {0}", modeInfo.name));
				} catch (error) {
					this.notificationService.error(localize('cio.mode.switchError', "Failed to trigger mode switch to {0}: {1}", modeInfo.name, (error as any).message));
				}
			} else {
				this.notificationService.warn(localize('cio.mode.noMapping', "No mode mapping found for report: {0}", report));
			}
		}
	}

	private async getTNEContextPath(): Promise<URI> {
		const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
		let tneContextUri: URI;
		if (workspaceFolders.length > 0) {
			tneContextUri = joinPath(workspaceFolders[0].uri, 'TNE-CONTEXT');
		} else {
			tneContextUri = URI.file('/tmp/TNE-CONTEXT');
		}
		try {
			await this.fileService.resolve(tneContextUri);
		} catch (error) {
			if ((error as any).fileOperationResult === 1) {
				await this.fileService.createFolder(tneContextUri);
				this.notificationService.info(localize('cio.tneContext.created', "TNE-CONTEXT directory created."));
			} else {
				this.notificationService.error(localize('cio.tneContext.error', "Error resolving/creating TNE-CONTEXT directory: {0}", (error as any).message));
			}
		}
		return tneContextUri;
	}

	override shouldShowWelcome(): boolean { return false; }
}

// Register CIO container
const cioViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: CIO_VIEW_CONTAINER_ID,
		title: localize2('cio', 'CIO'),
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CIO_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
		icon: Codicon.server,
		storageId: CIO_VIEW_CONTAINER_ID,
		order: 16
	},
	ViewContainerLocation.Sidebar
);
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: CIO_VIEW_ID,
	name: localize2('cio.view', 'CIO'),
	containerIcon: Codicon.server,
	ctorDescriptor: new SyncDescriptor(CIOView),
	canMoveView: true,
	canToggleVisibility: true,
	when: undefined,
}], cioViewContainer);


// CDO View: Sidebar container and view wired to Compass
const CDO_VIEW_CONTAINER_ID = 'workbench.view.cdo';
const CDO_VIEW_ID = 'workbench.view.cdoView';

interface CDOCompanyInfo {
	name: string;
	industry: string;
}

class CDOView extends ViewPane {
	static readonly ID = CDO_VIEW_ID;

	private companyNameInput!: HTMLInputElement;
	private industryInput!: HTMLInputElement;
	private reportChecklist!: HTMLElement;
	private contentContainer!: HTMLElement;
	private companyNameDisplay!: HTMLElement;
	private industryDisplay!: HTMLElement;

	private companyInfo: CDOCompanyInfo = { name: '', industry: '' };

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
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super(
			{ ...options, titleMenuId: MenuId.ViewTitle, singleViewPaneContainerTitle: 'CDO View' },
			keybindingService,
			contextMenuService,
			configurationService,
			contextKeyService,
			viewDescriptorService,
			instantiationService,
			openerService,
			themeService,
			hoverService
		);
		this._register(this.onDidChangeBodyVisibility(() => this.onBodyVisibilityChange()));
	}

	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);

		if (!this.contentContainer) {
			this.contentContainer = document.createElement('div');
			this.contentContainer.className = 'ceo-view-content';
			parent.appendChild(this.contentContainer);
		} else {
			while (this.contentContainer.firstChild) {
				this.contentContainer.removeChild(this.contentContainer.firstChild);
			}
		}

		const companyInfoSection = document.createElement('div');
		companyInfoSection.className = 'ceo-company-info-section';
		this.contentContainer.appendChild(companyInfoSection);

		const companyOverviewTitle = document.createElement('div');
		companyOverviewTitle.className = 'ceo-section-title';
		companyOverviewTitle.textContent = localize('companyOverviewTitle', "Company Overview");
		companyInfoSection.appendChild(companyOverviewTitle);


		const companyLabel = document.createElement('label');
		companyLabel.textContent = localize('cdo.companyLabel', "Company");
		companyLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(companyLabel);

		this.companyNameDisplay = document.createElement('h1');
		this.companyNameDisplay.className = 'ceo-company-name-display';
		this.companyNameDisplay.addEventListener('dblclick', () => this.toggleEditMode('name', true));
		this.companyNameDisplay.addEventListener('click', () => this.toggleEditMode('name', true));
		companyInfoSection.appendChild(this.companyNameDisplay);

		this.companyNameInput = document.createElement('input');
		this.companyNameInput.type = 'text';
		this.companyNameInput.placeholder = localize('cdo.companyNamePlaceholder', "Enter company name");
		this.companyNameInput.className = 'ceo-input ceo-hidden';
		this.companyNameInput.addEventListener('change', () => this.saveCompanyInfo());
		this.companyNameInput.addEventListener('blur', () => this.toggleEditMode('name', false));
		companyInfoSection.appendChild(this.companyNameInput);

		const industryLabel = document.createElement('label');
		industryLabel.textContent = localize('cdo.industryLabel', "Industry");
		industryLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(industryLabel);

		this.industryDisplay = document.createElement('h2');
		this.industryDisplay.className = 'ceo-industry-display';
		this.industryDisplay.addEventListener('dblclick', () => this.toggleEditMode('industry', true));
		this.industryDisplay.addEventListener('click', () => this.toggleEditMode('industry', true));
		companyInfoSection.appendChild(this.industryDisplay);

		this.industryInput = document.createElement('input');
		this.industryInput.type = 'text';
		this.industryInput.placeholder = localize('cdo.industryPlaceholder', "Enter industry");
		this.industryInput.className = 'ceo-input ceo-hidden';
		this.industryInput.addEventListener('change', () => this.saveCompanyInfo());
		this.industryInput.addEventListener('blur', () => this.toggleEditMode('industry', false));
		companyInfoSection.appendChild(this.industryInput);

		// Description Section
		const descriptionSection = document.createElement('div');
		descriptionSection.className = 'ceo-description-section';
		this.contentContainer.appendChild(descriptionSection);

		const descriptionTitle = document.createElement('div');
		descriptionTitle.className = 'ceo-section-title';
		descriptionTitle.textContent = localize('cdo.descriptionTitle', "Deployment Strategy");
		descriptionSection.appendChild(descriptionTitle);

		const description = document.createElement('div');
		description.className = 'ceo-description';
		description.textContent = localize('cdo.descriptionText', "Plan and execute deployments across targets. Produce guides for Cloud (Azure), On-Premise, and Cloud (AWS) to ensure consistent, repeatable releases.");
		descriptionSection.appendChild(description);

		// Reports Checklist Section
		const reportsSection = document.createElement('div');
		reportsSection.className = 'ceo-reports-section';
		this.contentContainer.appendChild(reportsSection);

		const reportsTitle = document.createElement('div');
		reportsTitle.textContent = localize('cdo.reportsTitle', "Status");
		reportsTitle.className = 'ceo-section-title';
		reportsSection.appendChild(reportsTitle);

		this.reportChecklist = document.createElement('div');
		this.reportChecklist.className = 'ceo-report-checklist';
		reportsSection.appendChild(this.reportChecklist);

		this.loadCompanyInfo();
		this.updateReportChecklist();
	}

	private onBodyVisibilityChange(): void {
		if (this.isBodyVisible()) {
			this.loadCompanyInfo();
			this.updateReportChecklist();
		}
	}

	private async getCompanyInfoFilePath(): Promise<URI> {
		const tneContextPath = await this.getTNEContextPath();
		return joinPath(tneContextPath, 'company-info.json');
	}

	private async loadCompanyInfo(): Promise<void> {
		const filePath = await this.getCompanyInfoFilePath();
		try {
			const content = await this.fileService.readFile(filePath);
			this.companyInfo = JSON.parse(content.value.toString());
			this.companyNameInput.value = this.companyInfo.name;
			this.industryInput.value = this.companyInfo.industry;

			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);

		} catch (error) {
			if ((error as any).fileOperationResult === 1) {
				this.notificationService.info(localize('cdo.companyInfo.notFound', "company-info.json not found in TNE-CONTEXT. Please enter company details."));
				this.companyInfo = { name: '', industry: '' };
				this.companyNameInput.value = '';
				this.industryInput.value = '';
				this.toggleEditMode('name', true);
				this.toggleEditMode('industry', true);
			} else {
				this.notificationService.error(localize('cdo.companyInfo.loadError', "Failed to load company-info.json: {0}", (error as any).message));
			}
		}
	}

	private async saveCompanyInfo(): Promise<void> {
		this.companyInfo.name = this.companyNameInput.value.trim();
		this.companyInfo.industry = this.industryInput.value.trim();
		const filePath = await this.getCompanyInfoFilePath();
		try {
			await this.fileService.writeFile(filePath, VSBuffer.fromString(JSON.stringify(this.companyInfo, null, 2)));
			this.notificationService.info(localize('cdo.companyInfo.saveSuccess', "Company info saved to TNE-CONTEXT/company-info.json."));
			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			this.notificationService.error(localize('cdo.companyInfo.saveError', "Failed to save company-info.json: {0}", (error as any).message));
		}
	}

	private toggleEditMode(field: 'name' | 'industry', enable: boolean): void {
		if (field === 'name') {
			if (enable) {
				this.companyNameDisplay.classList.add('ceo-hidden');
				this.companyNameInput.classList.remove('ceo-hidden');
				this.companyNameInput.focus();
			} else {
				this.companyNameDisplay.classList.remove('ceo-hidden');
				this.companyNameInput.classList.add('ceo-hidden');
			}
		} else {
			if (enable) {
				this.industryDisplay.classList.add('ceo-hidden');
				this.industryInput.classList.remove('ceo-hidden');
				this.industryInput.focus();
			} else {
				this.industryDisplay.classList.remove('ceo-hidden');
				this.industryInput.classList.add('ceo-hidden');
			}
		}
	}

	private async updateReportChecklist(): Promise<void> {
		while (this.reportChecklist.firstChild) {
			this.reportChecklist.removeChild(this.reportChecklist.firstChild);
		}
		const tneContextPath = await this.getTNEContextPath();
		const reports = [
			'cdo1-deploy-azure.md',
			'cdo2-deploy-self-host.md',
			'cdo3-deploy-aws.md',
		];

		for (const report of reports) {
			const listItem = document.createElement('div');
			listItem.className = 'ceo-report-item';

			const statusIndicator = document.createElement('span');
			statusIndicator.className = 'status-indicator';

			const label = document.createElement('label');
			const displayReportName = report
				.replace(/cdo\d-/, '')
				.replace(/-/g, ' ')
				.replace(/\.md$/, '')
				.split(' ')
				.map(w => w.charAt(0).toUpperCase() + w.slice(1))
				.join(' ');
			label.textContent = displayReportName;

			try {
				const reportUri = joinPath(tneContextPath, report);
				await this.fileService.resolve(reportUri);
				statusIndicator.classList.add('checked');
				label.classList.add('checked');
			} catch {
				statusIndicator.classList.add('unchecked');
				label.classList.add('unchecked');
			}

			listItem.appendChild(statusIndicator);
			listItem.appendChild(label);
			listItem.addEventListener('click', () => this.handleReportClick(report, statusIndicator.classList.contains('checked')));
			this.reportChecklist.appendChild(listItem);
		}
	}

	private async handleReportClick(report: string, isCompleted: boolean): Promise<void> {
		const reportToModeMap: { [key: string]: { slug: string; name: string } } = {
			'cdo1-deploy-azure.md': { slug: 'cdo1-deploy-azure', name: 'Cloud Deployment (Azure)' },
			'cdo2-deploy-self-host.md': { slug: 'cdo2-deploy-self-host', name: 'On-Premise Deployment' },
			'cdo3-deploy-aws.md': { slug: 'cdo3-deploy-aws', name: 'Cloud Deployment (AWS)' },
		};

		if (isCompleted) {
			const tneContextPath = await this.getTNEContextPath();
			const reportUri = joinPath(tneContextPath, report);
			try {
				await this.commandService.executeCommand('vscode.open', reportUri);
				this.notificationService.info(localize('cdo.report.opened', "Opened report: {0}", report));
			} catch (error) {
				this.notificationService.error(localize('cdo.report.openError', "Failed to open report {0}: {1}", report, (error as any).message));
			}
		} else {
			const modeInfo = reportToModeMap[report];
			if (modeInfo) {
				const companyName = this.companyInfo.name || 'the company';
				const industry = this.companyInfo.industry || 'unspecified';
				const message = localize(
					'cdo.mode.switchMessage',
					"The user requests {0} for {1} in the {2} industry. Switch to the {0} mode and begin.",
					modeInfo.name,
					companyName,
					industry
				);

				try {
					await this.commandService.executeCommand('compass.service.startTask', { message, newTask: false, mode: modeInfo.slug });
					this.notificationService.info(localize('cdo.mode.switchTriggered', "Triggered mode switch to: {0}", modeInfo.name));
				} catch (error) {
					this.notificationService.error(localize('cdo.mode.switchError', "Failed to trigger mode switch to {0}: {1}", modeInfo.name, (error as any).message));
				}
			} else {
				this.notificationService.warn(localize('cdo.mode.noMapping', "No mode mapping found for report: {0}", report));
			}
		}
	}

	private async getTNEContextPath(): Promise<URI> {
		const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
		let tneContextUri: URI;
		if (workspaceFolders.length > 0) {
			tneContextUri = joinPath(workspaceFolders[0].uri, 'TNE-CONTEXT');
		} else {
			tneContextUri = URI.file('/tmp/TNE-CONTEXT');
		}
		try {
			await this.fileService.resolve(tneContextUri);
		} catch (error) {
			if ((error as any).fileOperationResult === 1) {
				await this.fileService.createFolder(tneContextUri);
				this.notificationService.info(localize('cdo.tneContext.created', "TNE-CONTEXT directory created."));
			} else {
				this.notificationService.error(localize('cdo.tneContext.error', "Error resolving/creating TNE-CONTEXT directory: {0}", (error as any).message));
			}
		}
		return tneContextUri;
	}

	override shouldShowWelcome(): boolean { return false; }
}

// Register CDO container
const cdoViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: CDO_VIEW_CONTAINER_ID,
		title: localize2('cdo', 'CDO'),
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CDO_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
		icon: Codicon.cloud,
		storageId: CDO_VIEW_CONTAINER_ID,
		order: 17
	},
	ViewContainerLocation.Sidebar
);
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: CDO_VIEW_ID,
	name: localize2('cdo.view', 'CDO'),
	containerIcon: Codicon.cloud,
	ctorDescriptor: new SyncDescriptor(CDOView),
	canMoveView: true,
	canToggleVisibility: true,
	when: undefined,
}], cdoViewContainer);


// CRO View: Sidebar container and view wired to Compass
const CRO_VIEW_CONTAINER_ID = 'workbench.view.cro';
const CRO_VIEW_ID = 'workbench.view.croView';

interface CROCompanyInfo {
	name: string;
	industry: string;
}

class CROView extends ViewPane {
	static readonly ID = CRO_VIEW_ID;

	private companyNameInput!: HTMLInputElement;
	private industryInput!: HTMLInputElement;
	private reportChecklist!: HTMLElement;
	private contentContainer!: HTMLElement;
	private companyNameDisplay!: HTMLElement;
	private industryDisplay!: HTMLElement;

	private companyInfo: CROCompanyInfo = { name: '', industry: '' };

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
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super(
			{ ...options, titleMenuId: MenuId.ViewTitle, singleViewPaneContainerTitle: 'CRO View' },
			keybindingService,
			contextMenuService,
			configurationService,
			contextKeyService,
			viewDescriptorService,
			instantiationService,
			openerService,
			themeService,
			hoverService
		);
		this._register(this.onDidChangeBodyVisibility(() => this.onBodyVisibilityChange()));
	}

	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);

		if (!this.contentContainer) {
			this.contentContainer = document.createElement('div');
			this.contentContainer.className = 'ceo-view-content';
			parent.appendChild(this.contentContainer);
		} else {
			while (this.contentContainer.firstChild) {
				this.contentContainer.removeChild(this.contentContainer.firstChild);
			}
		}

		const companyInfoSection = document.createElement('div');
		companyInfoSection.className = 'ceo-company-info-section';
		this.contentContainer.appendChild(companyInfoSection);

		const companyOverviewTitle = document.createElement('div');
		companyOverviewTitle.className = 'ceo-section-title';
		companyOverviewTitle.textContent = localize('companyOverviewTitle', "Company Overview");
		companyInfoSection.appendChild(companyOverviewTitle);


		const companyLabel = document.createElement('label');
		companyLabel.textContent = localize('cro.companyLabel', "Company");
		companyLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(companyLabel);

		this.companyNameDisplay = document.createElement('h1');
		this.companyNameDisplay.className = 'ceo-company-name-display';
		this.companyNameDisplay.addEventListener('dblclick', () => this.toggleEditMode('name', true));
		this.companyNameDisplay.addEventListener('click', () => this.toggleEditMode('name', true));
		companyInfoSection.appendChild(this.companyNameDisplay);

		this.companyNameInput = document.createElement('input');
		this.companyNameInput.type = 'text';
		this.companyNameInput.placeholder = localize('cro.companyNamePlaceholder', "Enter company name");
		this.companyNameInput.className = 'ceo-input ceo-hidden';
		this.companyNameInput.addEventListener('change', () => this.saveCompanyInfo());
		this.companyNameInput.addEventListener('blur', () => this.toggleEditMode('name', false));
		companyInfoSection.appendChild(this.companyNameInput);

		const industryLabel = document.createElement('label');
		industryLabel.textContent = localize('cro.industryLabel', "Industry");
		industryLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(industryLabel);

		this.industryDisplay = document.createElement('h2');
		this.industryDisplay.className = 'ceo-industry-display';
		this.industryDisplay.addEventListener('dblclick', () => this.toggleEditMode('industry', true));
		this.industryDisplay.addEventListener('click', () => this.toggleEditMode('industry', true));
		companyInfoSection.appendChild(this.industryDisplay);

		this.industryInput = document.createElement('input');
		this.industryInput.type = 'text';
		this.industryInput.placeholder = localize('cro.industryPlaceholder', "Enter industry");
		this.industryInput.className = 'ceo-input ceo-hidden';
		this.industryInput.addEventListener('change', () => this.saveCompanyInfo());
		this.industryInput.addEventListener('blur', () => this.toggleEditMode('industry', false));
		companyInfoSection.appendChild(this.industryInput);

		// Description Section
		const descriptionSection = document.createElement('div');
		descriptionSection.className = 'ceo-description-section';
		this.contentContainer.appendChild(descriptionSection);

		const descriptionTitle = document.createElement('div');
		descriptionTitle.className = 'ceo-section-title';
		descriptionTitle.textContent = localize('cro.descriptionTitle', "Customer Readiness Overview");
		descriptionSection.appendChild(descriptionTitle);

		const description = document.createElement('div');
		description.className = 'ceo-description';
		description.textContent = localize('cro.descriptionText', "Understand the customer and articulate the offer. Produce the Customer Background, One-Pager, and Concept One-Pager for clear, tailored outreach.");
		descriptionSection.appendChild(description);

		// Reports Checklist Section
		const reportsSection = document.createElement('div');
		reportsSection.className = 'ceo-reports-section';
		this.contentContainer.appendChild(reportsSection);

		const reportsTitle = document.createElement('div');
		reportsTitle.textContent = localize('cro.reportsTitle', "Status");
		reportsTitle.className = 'ceo-section-title';
		reportsSection.appendChild(reportsTitle);

		this.reportChecklist = document.createElement('div');
		this.reportChecklist.className = 'ceo-report-checklist';
		reportsSection.appendChild(this.reportChecklist);

		this.loadCompanyInfo();
		this.updateReportChecklist();
	}

	private onBodyVisibilityChange(): void {
		if (this.isBodyVisible()) {
			this.loadCompanyInfo();
			this.updateReportChecklist();
		}
	}

	private async getCompanyInfoFilePath(): Promise<URI> {
		const tneContextPath = await this.getTNEContextPath();
		return joinPath(tneContextPath, 'company-info.json');
	}

	private async loadCompanyInfo(): Promise<void> {
		const filePath = await this.getCompanyInfoFilePath();
		try {
			const content = await this.fileService.readFile(filePath);
			this.companyInfo = JSON.parse(content.value.toString());
			this.companyNameInput.value = this.companyInfo.name;
			this.industryInput.value = this.companyInfo.industry;

			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);

		} catch (error) {
			if ((error as any).fileOperationResult === 1) {
				this.notificationService.info(localize('cro.companyInfo.notFound', "company-info.json not found in TNE-CONTEXT. Please enter company details."));
				this.companyInfo = { name: '', industry: '' };
				this.companyNameInput.value = '';
				this.industryInput.value = '';
				this.toggleEditMode('name', true);
				this.toggleEditMode('industry', true);
			} else {
				this.notificationService.error(localize('cro.companyInfo.loadError', "Failed to load company-info.json: {0}", (error as any).message));
			}
		}
	}

	private async saveCompanyInfo(): Promise<void> {
		this.companyInfo.name = this.companyNameInput.value.trim();
		this.companyInfo.industry = this.industryInput.value.trim();
		const filePath = await this.getCompanyInfoFilePath();
		try {
			await this.fileService.writeFile(filePath, VSBuffer.fromString(JSON.stringify(this.companyInfo, null, 2)));
			this.notificationService.info(localize('cro.companyInfo.saveSuccess', "Company info saved to TNE-CONTEXT/company-info.json."));
			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			this.notificationService.error(localize('cro.companyInfo.saveError', "Failed to save company-info.json: {0}", (error as any).message));
		}
	}

	private toggleEditMode(field: 'name' | 'industry', enable: boolean): void {
		if (field === 'name') {
			if (enable) {
				this.companyNameDisplay.classList.add('ceo-hidden');
				this.companyNameInput.classList.remove('ceo-hidden');
				this.companyNameInput.focus();
			} else {
				this.companyNameDisplay.classList.remove('ceo-hidden');
				this.companyNameInput.classList.add('ceo-hidden');
			}
		} else {
			if (enable) {
				this.industryDisplay.classList.add('ceo-hidden');
				this.industryInput.classList.remove('ceo-hidden');
				this.industryInput.focus();
			} else {
				this.industryDisplay.classList.remove('ceo-hidden');
				this.industryInput.classList.add('ceo-hidden');
			}
		}
	}

	private async updateReportChecklist(): Promise<void> {
		while (this.reportChecklist.firstChild) {
			this.reportChecklist.removeChild(this.reportChecklist.firstChild);
		}
		const tneContextPath = await this.getTNEContextPath();
		const reports = [
			'cro1-customer-background.md',
			'cro2-one-pager.md',
			'cro3-concept-one-pager.md',
		];

		for (const report of reports) {
			const listItem = document.createElement('div');
			listItem.className = 'ceo-report-item';

			const statusIndicator = document.createElement('span');
			statusIndicator.className = 'status-indicator';

			const label = document.createElement('label');
			const displayReportName = report
				.replace(/cro\d-/, '')
				.replace(/-/g, ' ')
				.replace(/\.md$/, '')
				.split(' ')
				.map(w => w.charAt(0).toUpperCase() + w.slice(1))
				.join(' ');
			label.textContent = displayReportName;

			try {
				const reportUri = joinPath(tneContextPath, report);
				await this.fileService.resolve(reportUri);
				statusIndicator.classList.add('checked');
				label.classList.add('checked');
			} catch {
				statusIndicator.classList.add('unchecked');
				label.classList.add('unchecked');
			}

			listItem.appendChild(statusIndicator);
			listItem.appendChild(label);
			listItem.addEventListener('click', () => this.handleReportClick(report, statusIndicator.classList.contains('checked')));
			this.reportChecklist.appendChild(listItem);
		}
	}

	private async handleReportClick(report: string, isCompleted: boolean): Promise<void> {
		const reportToModeMap: { [key: string]: { slug: string; name: string } } = {
			'cro1-customer-background.md': { slug: 'cro1-customer-background', name: 'Customer Background' },
			'cro2-one-pager.md': { slug: 'cro2-one-pager', name: 'One-Pager' },
			'cro3-concept-one-pager.md': { slug: 'cro3-concept-one-pager', name: 'Concept One-Pager' },
		};

		if (isCompleted) {
			const tneContextPath = await this.getTNEContextPath();
			const reportUri = joinPath(tneContextPath, report);
			try {
				await this.commandService.executeCommand('vscode.open', reportUri);
				this.notificationService.info(localize('cro.report.opened', "Opened report: {0}", report));
			} catch (error) {
				this.notificationService.error(localize('cro.report.openError', "Failed to open report {0}: {1}", report, (error as any).message));
			}
		} else {
			const modeInfo = reportToModeMap[report];
			if (modeInfo) {
				const companyName = this.companyInfo.name || 'the company';
				const industry = this.companyInfo.industry || 'unspecified';
				const message = localize(
					'cro.mode.switchMessage',
					"The user requests {0} for {1} in the {2} industry. Switch to the {0} mode and begin.",
					modeInfo.name,
					companyName,
					industry
				);

				try {
					await this.commandService.executeCommand('compass.service.startTask', { message, newTask: false, mode: modeInfo.slug });
					this.notificationService.info(localize('cro.mode.switchTriggered', "Triggered mode switch to: {0}", modeInfo.name));
				} catch (error) {
					this.notificationService.error(localize('cro.mode.switchError', "Failed to trigger mode switch to {0}: {1}", modeInfo.name, (error as any).message));
				}
			} else {
				this.notificationService.warn(localize('cro.mode.noMapping', "No mode mapping found for report: {0}", report));
			}
		}
	}

	private async getTNEContextPath(): Promise<URI> {
		const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
		let tneContextUri: URI;
		if (workspaceFolders.length > 0) {
			tneContextUri = joinPath(workspaceFolders[0].uri, 'TNE-CONTEXT');
		} else {
			tneContextUri = URI.file('/tmp/TNE-CONTEXT');
		}
		try {
			await this.fileService.resolve(tneContextUri);
		} catch (error) {
			if ((error as any).fileOperationResult === 1) {
				await this.fileService.createFolder(tneContextUri);
				this.notificationService.info(localize('cro.tneContext.created', "TNE-CONTEXT directory created."));
			} else {
				this.notificationService.error(localize('cro.tneContext.error', "Error resolving/creating TNE-CONTEXT directory: {0}", (error as any).message));
			}
		}
		return tneContextUri;
	}

	override shouldShowWelcome(): boolean { return false; }
}

// Register CRO container
const croViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: CRO_VIEW_CONTAINER_ID,
		title: localize2('cro', 'CRO'),
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CRO_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
		icon: Codicon.account,
		storageId: CRO_VIEW_CONTAINER_ID,
		order: 18
	},
	ViewContainerLocation.Sidebar
);
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: CRO_VIEW_ID,
	name: localize2('cro.view', 'CRO'),
	containerIcon: Codicon.account,
	ctorDescriptor: new SyncDescriptor(CROView),
	canMoveView: true,
	canToggleVisibility: true,
	when: undefined,
}], croViewContainer);


// CBDO View: Sidebar container and view wired to Compass
const CBDO_VIEW_CONTAINER_ID = 'workbench.view.cbdo';
const CBDO_VIEW_ID = 'workbench.view.cbdoView';

interface CBDOCompanyInfo {
	name: string;
	industry: string;
}

class CBDOView extends ViewPane {
	static readonly ID = CBDO_VIEW_ID;

	private companyNameInput!: HTMLInputElement;
	private industryInput!: HTMLInputElement;
	private reportChecklist!: HTMLElement;
	private contentContainer!: HTMLElement;
	private companyNameDisplay!: HTMLElement;
	private industryDisplay!: HTMLElement;

	private companyInfo: CBDOCompanyInfo = { name: '', industry: '' };

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
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super(
			{ ...options, titleMenuId: MenuId.ViewTitle, singleViewPaneContainerTitle: 'CBDO View' },
			keybindingService,
			contextMenuService,
			configurationService,
			contextKeyService,
			viewDescriptorService,
			instantiationService,
			openerService,
			themeService,
			hoverService
		);
		this._register(this.onDidChangeBodyVisibility(() => this.onBodyVisibilityChange()));
	}

	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);

		if (!this.contentContainer) {
			this.contentContainer = document.createElement('div');
			this.contentContainer.className = 'ceo-view-content';
			parent.appendChild(this.contentContainer);
		} else {
			while (this.contentContainer.firstChild) {
				this.contentContainer.removeChild(this.contentContainer.firstChild);
			}
		}

		const companyInfoSection = document.createElement('div');
		companyInfoSection.className = 'ceo-company-info-section';
		this.contentContainer.appendChild(companyInfoSection);

		const companyOverviewTitle = document.createElement('div');
		companyOverviewTitle.className = 'ceo-section-title';
		companyOverviewTitle.textContent = localize('companyOverviewTitle', "Company Overview");
		companyInfoSection.appendChild(companyOverviewTitle);


		const companyLabel = document.createElement('label');
		companyLabel.textContent = localize('cbdo.companyLabel', "Company");
		companyLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(companyLabel);

		this.companyNameDisplay = document.createElement('h1');
		this.companyNameDisplay.className = 'ceo-company-name-display';
		this.companyNameDisplay.addEventListener('dblclick', () => this.toggleEditMode('name', true));
		this.companyNameDisplay.addEventListener('click', () => this.toggleEditMode('name', true));
		companyInfoSection.appendChild(this.companyNameDisplay);

		this.companyNameInput = document.createElement('input');
		this.companyNameInput.type = 'text';
		this.companyNameInput.placeholder = localize('cbdo.companyNamePlaceholder', "Enter company name");
		this.companyNameInput.className = 'ceo-input ceo-hidden';
		this.companyNameInput.addEventListener('change', () => this.saveCompanyInfo());
		this.companyNameInput.addEventListener('blur', () => this.toggleEditMode('name', false));
		companyInfoSection.appendChild(this.companyNameInput);

		const industryLabel = document.createElement('label');
		industryLabel.textContent = localize('cbdo.industryLabel', "Industry");
		industryLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(industryLabel);

		this.industryDisplay = document.createElement('h2');
		this.industryDisplay.className = 'ceo-industry-display';
		this.industryDisplay.addEventListener('dblclick', () => this.toggleEditMode('industry', true));
		this.industryDisplay.addEventListener('click', () => this.toggleEditMode('industry', true));
		companyInfoSection.appendChild(this.industryDisplay);

		this.industryInput = document.createElement('input');
		this.industryInput.type = 'text';
		this.industryInput.placeholder = localize('cbdo.industryPlaceholder', "Enter industry");
		this.industryInput.className = 'ceo-input ceo-hidden';
		this.industryInput.addEventListener('change', () => this.saveCompanyInfo());
		this.industryInput.addEventListener('blur', () => this.toggleEditMode('industry', false));
		companyInfoSection.appendChild(this.industryInput);

		// Description Section
		const descriptionSection = document.createElement('div');
		descriptionSection.className = 'ceo-description-section';
		this.contentContainer.appendChild(descriptionSection);

		const descriptionTitle = document.createElement('div');
		descriptionTitle.className = 'ceo-section-title';
		descriptionTitle.textContent = localize('cbdo.descriptionTitle', "Partnership Strategy");
		descriptionSection.appendChild(descriptionTitle);

		const description = document.createElement('div');
		description.className = 'ceo-description';
		description.textContent = localize('cbdo.descriptionText', "Identify and structure partnerships. Analyze your fit with another company and produce presentations to pitch your partnership, align incentives, and accelerate growth.");
		descriptionSection.appendChild(description);

		// Reports Checklist Section
		const reportsSection = document.createElement('div');
		reportsSection.className = 'ceo-reports-section';
		this.contentContainer.appendChild(reportsSection);

		const reportsTitle = document.createElement('div');
		reportsTitle.textContent = localize('cbdo.reportsTitle', "Status");
		reportsTitle.className = 'ceo-section-title';
		reportsSection.appendChild(reportsTitle);

		this.reportChecklist = document.createElement('div');
		this.reportChecklist.className = 'ceo-report-checklist';
		reportsSection.appendChild(this.reportChecklist);

		this.loadCompanyInfo();
		this.updateReportChecklist();
	}

	private onBodyVisibilityChange(): void {
		if (this.isBodyVisible()) {
			this.loadCompanyInfo();
			this.updateReportChecklist();
		}
	}

	private async getCompanyInfoFilePath(): Promise<URI> {
		const tneContextPath = await this.getTNEContextPath();
		return joinPath(tneContextPath, 'company-info.json');
	}

	private async loadCompanyInfo(): Promise<void> {
		const filePath = await this.getCompanyInfoFilePath();
		try {
			const content = await this.fileService.readFile(filePath);
			this.companyInfo = JSON.parse(content.value.toString());
			this.companyNameInput.value = this.companyInfo.name;
			this.industryInput.value = this.companyInfo.industry;

			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);

		} catch (error) {
			if ((error as any).fileOperationResult === 1) {
				this.notificationService.info(localize('cbdo.companyInfo.notFound', "company-info.json not found in TNE-CONTEXT. Please enter company details."));
				this.companyInfo = { name: '', industry: '' };
				this.companyNameInput.value = '';
				this.industryInput.value = '';
				this.toggleEditMode('name', true);
				this.toggleEditMode('industry', true);
			} else {
				this.notificationService.error(localize('cbdo.companyInfo.loadError', "Failed to load company-info.json: {0}", (error as any).message));
			}
		}
	}

	private async saveCompanyInfo(): Promise<void> {
		this.companyInfo.name = this.companyNameInput.value.trim();
		this.companyInfo.industry = this.industryInput.value.trim();
		const filePath = await this.getCompanyInfoFilePath();
		try {
			await this.fileService.writeFile(filePath, VSBuffer.fromString(JSON.stringify(this.companyInfo, null, 2)));
			this.notificationService.info(localize('cbdo.companyInfo.saveSuccess', "Company info saved to TNE-CONTEXT/company-info.json."));
			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			this.notificationService.error(localize('cbdo.companyInfo.saveError', "Failed to save company-info.json: {0}", (error as any).message));
		}
	}

	private toggleEditMode(field: 'name' | 'industry', enable: boolean): void {
		if (field === 'name') {
			if (enable) {
				this.companyNameDisplay.classList.add('ceo-hidden');
				this.companyNameInput.classList.remove('ceo-hidden');
				this.companyNameInput.focus();
			} else {
				this.companyNameDisplay.classList.remove('ceo-hidden');
				this.companyNameInput.classList.add('ceo-hidden');
			}
		} else {
			if (enable) {
				this.industryDisplay.classList.add('ceo-hidden');
				this.industryInput.classList.remove('ceo-hidden');
				this.industryInput.focus();
			} else {
				this.industryDisplay.classList.remove('ceo-hidden');
				this.industryInput.classList.add('ceo-hidden');
			}
		}
	}

	private async updateReportChecklist(): Promise<void> {
		while (this.reportChecklist.firstChild) {
			this.reportChecklist.removeChild(this.reportChecklist.firstChild);
		}
		const tneContextPath = await this.getTNEContextPath();
		const reports = [
			'cbdo1-synergy-with-another-company.md',
			'cbdo2-teaser-deck.md',
			'cbdo3-partner-business-plan.md',
		];

		for (const report of reports) {
			const listItem = document.createElement('div');
			listItem.className = 'ceo-report-item';

			const statusIndicator = document.createElement('span');
			statusIndicator.className = 'status-indicator';

			const label = document.createElement('label');
			const displayReportName = report
				.replace(/cbdo\d-/, '')
				.replace(/-/g, ' ')
				.replace(/\.md$/, '')
				.split(' ')
				.map(w => w.charAt(0).toUpperCase() + w.slice(1))
				.join(' ');
			label.textContent = displayReportName;

			try {
				const reportUri = joinPath(tneContextPath, report);
				await this.fileService.resolve(reportUri);
				statusIndicator.classList.add('checked');
				label.classList.add('checked');
			} catch {
				statusIndicator.classList.add('unchecked');
				label.classList.add('unchecked');
			}

			listItem.appendChild(statusIndicator);
			listItem.appendChild(label);
			listItem.addEventListener('click', () => this.handleReportClick(report, statusIndicator.classList.contains('checked')));
			this.reportChecklist.appendChild(listItem);
		}
	}

	private async handleReportClick(report: string, isCompleted: boolean): Promise<void> {
		const reportToModeMap: { [key: string]: { slug: string; name: string } } = {
			'cbdo1-synergy-with-another-company.md': { slug: 'cbdo1-synergy-with-another-company', name: 'Partner Strategy' },
			'cbdo2-teaser-deck.md': { slug: 'cbdo2-teaser-deck', name: 'Teaser Deck' },
			'cbdo3-partner-business-plan.md': { slug: 'cbdo3-partner-business-plan', name: 'Partner Business Plan' },
		};

		if (isCompleted) {
			const tneContextPath = await this.getTNEContextPath();
			const reportUri = joinPath(tneContextPath, report);
			try {
				await this.commandService.executeCommand('vscode.open', reportUri);
				this.notificationService.info(localize('cbdo.report.opened', "Opened report: {0}", report));
			} catch (error) {
				this.notificationService.error(localize('cbdo.report.openError', "Failed to open report {0}: {1}", report, (error as any).message));
			}
		} else {
			const modeInfo = reportToModeMap[report];
			if (modeInfo) {
				const companyName = this.companyInfo.name || 'the company';
				const industry = this.companyInfo.industry || 'unspecified';
				const message = localize(
					'cbdo.mode.switchMessage',
					"The user requests {0} for {1} in the {2} industry. Switch to the {0} mode and begin.",
					modeInfo.name,
					companyName,
					industry
				);

				try {
					await this.commandService.executeCommand('compass.service.startTask', { message, newTask: false, mode: modeInfo.slug });
					this.notificationService.info(localize('cbdo.mode.switchTriggered', "Triggered mode switch to: {0}", modeInfo.name));
				} catch (error) {
					this.notificationService.error(localize('cbdo.mode.switchError', "Failed to trigger mode switch to {0}: {1}", modeInfo.name, (error as any).message));
				}
			} else {
				this.notificationService.warn(localize('cbdo.mode.noMapping', "No mode mapping found for report: {0}", report));
			}
		}
	}

	private async getTNEContextPath(): Promise<URI> {
		const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
		let tneContextUri: URI;
		if (workspaceFolders.length > 0) {
			tneContextUri = joinPath(workspaceFolders[0].uri, 'TNE-CONTEXT');
		} else {
			tneContextUri = URI.file('/tmp/TNE-CONTEXT');
		}
		try {
			await this.fileService.resolve(tneContextUri);
		} catch (error) {
			if ((error as any).fileOperationResult === 1) {
				await this.fileService.createFolder(tneContextUri);
				this.notificationService.info(localize('cbdo.tneContext.created', "TNE-CONTEXT directory created."));
			} else {
				this.notificationService.error(localize('cbdo.tneContext.error', "Error resolving/creating TNE-CONTEXT directory: {0}", (error as any).message));
			}
		}
		return tneContextUri;
	}

	override shouldShowWelcome(): boolean { return false; }
}

// Register CBDO container
const cbdoViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: CBDO_VIEW_CONTAINER_ID,
		title: localize2('cbdo', 'CBDO'),
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CBDO_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
		icon: Codicon.link,
		storageId: CBDO_VIEW_CONTAINER_ID,
		order: 19
	},
	ViewContainerLocation.Sidebar
);
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: CBDO_VIEW_ID,
	name: localize2('cbdo.view', 'CBDO'),
	containerIcon: Codicon.link,
	ctorDescriptor: new SyncDescriptor(CBDOView),
	canMoveView: true,
	canToggleVisibility: true,
	when: undefined,
}], cbdoViewContainer);


// CPO View: Sidebar container and view wired to Compass
const CPO_VIEW_CONTAINER_ID = 'workbench.view.cpo';
const CPO_VIEW_ID = 'workbench.view.cpoView';

interface CPOCompanyInfo {
	name: string;
	industry: string;
}

class CPOView extends ViewPane {
	static readonly ID = CPO_VIEW_ID;

	private companyNameInput!: HTMLInputElement;
	private industryInput!: HTMLInputElement;
	private reportChecklist!: HTMLElement;
	private contentContainer!: HTMLElement;
	private companyNameDisplay!: HTMLElement;
	private industryDisplay!: HTMLElement;

	private companyInfo: CPOCompanyInfo = { name: '', industry: '' };

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
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super(
			{ ...options, titleMenuId: MenuId.ViewTitle, singleViewPaneContainerTitle: 'CPO View' },
			keybindingService,
			contextMenuService,
			configurationService,
			contextKeyService,
			viewDescriptorService,
			instantiationService,
			openerService,
			themeService,
			hoverService
		);
		this._register(this.onDidChangeBodyVisibility(() => this.onBodyVisibilityChange()));
	}

	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);

		if (!this.contentContainer) {
			this.contentContainer = document.createElement('div');
			this.contentContainer.className = 'ceo-view-content';
			parent.appendChild(this.contentContainer);
		} else {
			while (this.contentContainer.firstChild) {
				this.contentContainer.removeChild(this.contentContainer.firstChild);
			}
		}

		const companyInfoSection = document.createElement('div');
		companyInfoSection.className = 'ceo-company-info-section';
		this.contentContainer.appendChild(companyInfoSection);

		const companyOverviewTitle = document.createElement('div');
		companyOverviewTitle.className = 'ceo-section-title';
		companyOverviewTitle.textContent = localize('companyOverviewTitle', "Company Overview");
		companyInfoSection.appendChild(companyOverviewTitle);


		const companyLabel = document.createElement('label');
		companyLabel.textContent = localize('cpo.companyLabel', "Company");
		companyLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(companyLabel);

		this.companyNameDisplay = document.createElement('h1');
		this.companyNameDisplay.className = 'ceo-company-name-display';
		this.companyNameDisplay.addEventListener('dblclick', () => this.toggleEditMode('name', true));
		this.companyNameDisplay.addEventListener('click', () => this.toggleEditMode('name', true));
		companyInfoSection.appendChild(this.companyNameDisplay);

		this.companyNameInput = document.createElement('input');
		this.companyNameInput.type = 'text';
		this.companyNameInput.placeholder = localize('cpo.companyNamePlaceholder', "Enter company name");
		this.companyNameInput.className = 'ceo-input ceo-hidden';
		this.companyNameInput.addEventListener('change', () => this.saveCompanyInfo());
		this.companyNameInput.addEventListener('blur', () => this.toggleEditMode('name', false));
		companyInfoSection.appendChild(this.companyNameInput);

		const industryLabel = document.createElement('label');
		industryLabel.textContent = localize('cpo.industryLabel', "Industry");
		industryLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(industryLabel);

		this.industryDisplay = document.createElement('h2');
		this.industryDisplay.className = 'ceo-industry-display';
		this.industryDisplay.addEventListener('dblclick', () => this.toggleEditMode('industry', true));
		this.industryDisplay.addEventListener('click', () => this.toggleEditMode('industry', true));
		companyInfoSection.appendChild(this.industryDisplay);

		this.industryInput = document.createElement('input');
		this.industryInput.type = 'text';
		this.industryInput.placeholder = localize('cpo.industryPlaceholder', "Enter industry");
		this.industryInput.className = 'ceo-input ceo-hidden';
		this.industryInput.addEventListener('change', () => this.saveCompanyInfo());
		this.industryInput.addEventListener('blur', () => this.toggleEditMode('industry', false));
		companyInfoSection.appendChild(this.industryInput);

		// Description Section
		const descriptionSection = document.createElement('div');
		descriptionSection.className = 'ceo-description-section';
		this.contentContainer.appendChild(descriptionSection);

		const descriptionTitle = document.createElement('div');
		descriptionTitle.className = 'ceo-section-title';
		descriptionTitle.textContent = localize('cpo.descriptionTitle', "Product Operations Overview");
		descriptionSection.appendChild(descriptionTitle);

		const description = document.createElement('div');
		description.className = 'ceo-description';
		description.textContent = localize('cpo.descriptionText', "Document how the product works and what can be improved.\n\nSave your development team crucial time by documenting code, and align engineering and product descisions.");
		descriptionSection.appendChild(description);

		// Reports Checklist Section
		const reportsSection = document.createElement('div');
		reportsSection.className = 'ceo-reports-section';
		this.contentContainer.appendChild(reportsSection);

		const reportsTitle = document.createElement('div');
		reportsTitle.textContent = localize('cpo.reportsTitle', "Status");
		reportsTitle.className = 'ceo-section-title';
		reportsSection.appendChild(reportsTitle);

		this.reportChecklist = document.createElement('div');
		this.reportChecklist.className = 'ceo-report-checklist';
		reportsSection.appendChild(this.reportChecklist);

		this.loadCompanyInfo();
		this.updateReportChecklist();
	}

	private onBodyVisibilityChange(): void {
		if (this.isBodyVisible()) {
			this.loadCompanyInfo();
			this.updateReportChecklist();
		}
	}

	private async getCompanyInfoFilePath(): Promise<URI> {
		const tneContextPath = await this.getTNEContextPath();
		return joinPath(tneContextPath, 'company-info.json');
	}

	private async loadCompanyInfo(): Promise<void> {
		const filePath = await this.getCompanyInfoFilePath();
		try {
			const content = await this.fileService.readFile(filePath);
			this.companyInfo = JSON.parse(content.value.toString());
			this.companyNameInput.value = this.companyInfo.name;
			this.industryInput.value = this.companyInfo.industry;

			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);

		} catch (error) {
			if ((error as any).fileOperationResult === 1) {
				this.notificationService.info(localize('cpo.companyInfo.notFound', "company-info.json not found in TNE-CONTEXT. Please enter company details."));
				this.companyInfo = { name: '', industry: '' };
				this.companyNameInput.value = '';
				this.industryInput.value = '';
				this.toggleEditMode('name', true);
				this.toggleEditMode('industry', true);
			} else {
				this.notificationService.error(localize('cpo.companyInfo.loadError', "Failed to load company-info.json: {0}", (error as any).message));
			}
		}
	}

	private async saveCompanyInfo(): Promise<void> {
		this.companyInfo.name = this.companyNameInput.value.trim();
		this.companyInfo.industry = this.industryInput.value.trim();
		const filePath = await this.getCompanyInfoFilePath();
		try {
			await this.fileService.writeFile(filePath, VSBuffer.fromString(JSON.stringify(this.companyInfo, null, 2)));
			this.notificationService.info(localize('cpo.companyInfo.saveSuccess', "Company info saved to TNE-CONTEXT/company-info.json."));
			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			this.notificationService.error(localize('cpo.companyInfo.saveError', "Failed to save company-info.json: {0}", (error as any).message));
		}
	}

	private toggleEditMode(field: 'name' | 'industry', enable: boolean): void {
		if (field === 'name') {
			if (enable) {
				this.companyNameDisplay.classList.add('ceo-hidden');
				this.companyNameInput.classList.remove('ceo-hidden');
				this.companyNameInput.focus();
			} else {
				this.companyNameDisplay.classList.remove('ceo-hidden');
				this.companyNameInput.classList.add('ceo-hidden');
			}
		} else {
			if (enable) {
				this.industryDisplay.classList.add('ceo-hidden');
				this.industryInput.classList.remove('ceo-hidden');
				this.industryInput.focus();
			} else {
				this.industryDisplay.classList.remove('ceo-hidden');
				this.industryInput.classList.add('ceo-hidden');
			}
		}
	}

	private async updateReportChecklist(): Promise<void> {
		while (this.reportChecklist.firstChild) {
			this.reportChecklist.removeChild(this.reportChecklist.firstChild);
		}
		const tneContextPath = await this.getTNEContextPath();
		const reports = [
			'cpo1-document-technology.md',
			'cpo2-internal-recommendations.md',
		];

		for (const report of reports) {
			const listItem = document.createElement('div');
			listItem.className = 'ceo-report-item';

			const statusIndicator = document.createElement('span');
			statusIndicator.className = 'status-indicator';

			const label = document.createElement('label');
			const displayReportName = report
				.replace(/cpo\d-/, '')
				.replace(/-/g, ' ')
				.replace(/\.md$/, '')
				.split(' ')
				.map(w => w.charAt(0).toUpperCase() + w.slice(1))
				.join(' ');
			label.textContent = displayReportName;

			try {
				const reportUri = joinPath(tneContextPath, report);
				await this.fileService.resolve(reportUri);
				statusIndicator.classList.add('checked');
				label.classList.add('checked');
			} catch {
				statusIndicator.classList.add('unchecked');
				label.classList.add('unchecked');
			}

			listItem.appendChild(statusIndicator);
			listItem.appendChild(label);
			listItem.addEventListener('click', () => this.handleReportClick(report, statusIndicator.classList.contains('checked')));
			this.reportChecklist.appendChild(listItem);
		}
	}

	private async handleReportClick(report: string, isCompleted: boolean): Promise<void> {
		const reportToModeMap: { [key: string]: { slug: string; name: string } } = {
			'cpo1-document-technology.md': { slug: 'cpo1-document-technology', name: 'Document Technology' },
			'cpo2-internal-recommendations.md': { slug: 'cpo2-internal-recommendations', name: 'Internal Recommendations' },
		};

		if (isCompleted) {
			const tneContextPath = await this.getTNEContextPath();
			const reportUri = joinPath(tneContextPath, report);
			try {
				await this.commandService.executeCommand('vscode.open', reportUri);
				this.notificationService.info(localize('cpo.report.opened', "Opened report: {0}", report));
			} catch (error) {
				this.notificationService.error(localize('cpo.report.openError', "Failed to open report {0}: {1}", report, (error as any).message));
			}
		} else {
			const modeInfo = reportToModeMap[report];
			if (modeInfo) {
				const companyName = this.companyInfo.name || 'the company';
				const industry = this.companyInfo.industry || 'unspecified';
				const message = localize(
					'cpo.mode.switchMessage',
					"The user requests {0} for {1} in the {2} industry. Switch to the {0} mode and begin.",
					modeInfo.name,
					companyName,
					industry
				);

				try {
					await this.commandService.executeCommand('compass.service.startTask', { message, newTask: false, mode: modeInfo.slug });
					this.notificationService.info(localize('cpo.mode.switchTriggered', "Triggered mode switch to: {0}", modeInfo.name));
				} catch (error) {
					this.notificationService.error(localize('cpo.mode.switchError', "Failed to trigger mode switch to {0}: {1}", modeInfo.name, (error as any).message));
				}
			} else {
				this.notificationService.warn(localize('cpo.mode.noMapping', "No mode mapping found for report: {0}", report));
			}
		}
	}

	private async getTNEContextPath(): Promise<URI> {
		const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
		let tneContextUri: URI;
		if (workspaceFolders.length > 0) {
			tneContextUri = joinPath(workspaceFolders[0].uri, 'TNE-CONTEXT');
		} else {
			tneContextUri = URI.file('/tmp/TNE-CONTEXT');
		}
		try {
			await this.fileService.resolve(tneContextUri);
		} catch (error) {
			if ((error as any).fileOperationResult === 1) {
				await this.fileService.createFolder(tneContextUri);
				this.notificationService.info(localize('cpo.tneContext.created', "TNE-CONTEXT directory created."));
			} else {
				this.notificationService.error(localize('cpo.tneContext.error', "Error resolving/creating TNE-CONTEXT directory: {0}", (error as any).message));
			}
		}
		return tneContextUri;
	}

	override shouldShowWelcome(): boolean { return false; }
}

// Register CPO container
const cpoViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: CPO_VIEW_CONTAINER_ID,
		title: localize2('cpo', 'CPO'),
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CPO_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
		icon: Codicon.package,
		storageId: CPO_VIEW_CONTAINER_ID,
		order: 20
	},
	ViewContainerLocation.Sidebar
);
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: CPO_VIEW_ID,
	name: localize2('cpo.view', 'CPO'),
	containerIcon: Codicon.package,
	ctorDescriptor: new SyncDescriptor(CPOView),
	canMoveView: true,
	canToggleVisibility: true,
	when: undefined,
}], cpoViewContainer);


// CLO View: Sidebar container and view wired to Compass
const CLO_VIEW_CONTAINER_ID = 'workbench.view.clo';
const CLO_VIEW_ID = 'workbench.view.cloView';

interface CLOCompanyInfo {
	name: string;
	industry: string;
}

class CLOView extends ViewPane {
	static readonly ID = CLO_VIEW_ID;

	private companyNameInput!: HTMLInputElement;
	private industryInput!: HTMLInputElement;
	private reportChecklist!: HTMLElement;
	private contentContainer!: HTMLElement;
	private companyNameDisplay!: HTMLElement;
	private industryDisplay!: HTMLElement;

	private companyInfo: CLOCompanyInfo = { name: '', industry: '' };

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
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super(
			{ ...options, titleMenuId: MenuId.ViewTitle, singleViewPaneContainerTitle: 'CLO View' },
			keybindingService,
			contextMenuService,
			configurationService,
			contextKeyService,
			viewDescriptorService,
			instantiationService,
			openerService,
			themeService,
			hoverService
		);
		this._register(this.onDidChangeBodyVisibility(() => this.onBodyVisibilityChange()));
	}

	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);

		if (!this.contentContainer) {
			this.contentContainer = document.createElement('div');
			this.contentContainer.className = 'ceo-view-content';
			parent.appendChild(this.contentContainer);
		} else {
			while (this.contentContainer.firstChild) {
				this.contentContainer.removeChild(this.contentContainer.firstChild);
			}
		}

		const companyInfoSection = document.createElement('div');
		companyInfoSection.className = 'ceo-company-info-section';
		this.contentContainer.appendChild(companyInfoSection);

		const companyOverviewTitle = document.createElement('div');
		companyOverviewTitle.className = 'ceo-section-title';
		companyOverviewTitle.textContent = localize('companyOverviewTitle', "Company Overview");
		companyInfoSection.appendChild(companyOverviewTitle);


		const companyLabel = document.createElement('label');
		companyLabel.textContent = localize('clo.companyLabel', "Company");
		companyLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(companyLabel);

		this.companyNameDisplay = document.createElement('h1');
		this.companyNameDisplay.className = 'ceo-company-name-display';
		this.companyNameDisplay.addEventListener('dblclick', () => this.toggleEditMode('name', true));
		this.companyNameDisplay.addEventListener('click', () => this.toggleEditMode('name', true));
		companyInfoSection.appendChild(this.companyNameDisplay);

		this.companyNameInput = document.createElement('input');
		this.companyNameInput.type = 'text';
		this.companyNameInput.placeholder = localize('clo.companyNamePlaceholder', "Enter company name");
		this.companyNameInput.className = 'ceo-input ceo-hidden';
		this.companyNameInput.addEventListener('change', () => this.saveCompanyInfo());
		this.companyNameInput.addEventListener('blur', () => this.toggleEditMode('name', false));
		companyInfoSection.appendChild(this.companyNameInput);

		const industryLabel = document.createElement('label');
		industryLabel.textContent = localize('clo.industryLabel', "Industry");
		industryLabel.className = 'ceo-info-label';
		companyInfoSection.appendChild(industryLabel);

		this.industryDisplay = document.createElement('h2');
		this.industryDisplay.className = 'ceo-industry-display';
		this.industryDisplay.addEventListener('dblclick', () => this.toggleEditMode('industry', true));
		this.industryDisplay.addEventListener('click', () => this.toggleEditMode('industry', true));
		companyInfoSection.appendChild(this.industryDisplay);

		this.industryInput = document.createElement('input');
		this.industryInput.type = 'text';
		this.industryInput.placeholder = localize('clo.industryPlaceholder', "Enter industry");
		this.industryInput.className = 'ceo-input ceo-hidden';
		this.industryInput.addEventListener('change', () => this.saveCompanyInfo());
		this.industryInput.addEventListener('blur', () => this.toggleEditMode('industry', false));
		companyInfoSection.appendChild(this.industryInput);

		// Description Section
		const descriptionSection = document.createElement('div');
		descriptionSection.className = 'ceo-description-section';
		this.contentContainer.appendChild(descriptionSection);

		const descriptionTitle = document.createElement('div');
		descriptionTitle.className = 'ceo-section-title';
		descriptionTitle.textContent = localize('clo.descriptionTitle', "Legal & Regulatory Overview");
		descriptionSection.appendChild(descriptionTitle);

		const description = document.createElement('div');
		description.className = 'ceo-description';
		description.textContent = localize('clo.descriptionText', "Assess regulatory obligations and risks. Ensure that your architecture is compliant with existing regulatory frameworks.");
		descriptionSection.appendChild(description);

		// Reports Checklist Section
		const reportsSection = document.createElement('div');
		reportsSection.className = 'ceo-reports-section';
		this.contentContainer.appendChild(reportsSection);

		const reportsTitle = document.createElement('div');
		reportsTitle.textContent = localize('clo.reportsTitle', "Status");
		reportsTitle.className = 'ceo-section-title';
		reportsSection.appendChild(reportsTitle);

		this.reportChecklist = document.createElement('div');
		this.reportChecklist.className = 'ceo-report-checklist';
		reportsSection.appendChild(this.reportChecklist);

		this.loadCompanyInfo();
		this.updateReportChecklist();
	}

	private onBodyVisibilityChange(): void {
		if (this.isBodyVisible()) {
			this.loadCompanyInfo();
			this.updateReportChecklist();
		}
	}

	private async getCompanyInfoFilePath(): Promise<URI> {
		const tneContextPath = await this.getTNEContextPath();
		return joinPath(tneContextPath, 'company-info.json');
	}

	private async loadCompanyInfo(): Promise<void> {
		const filePath = await this.getCompanyInfoFilePath();
		try {
			const content = await this.fileService.readFile(filePath);
			this.companyInfo = JSON.parse(content.value.toString());
			this.companyNameInput.value = this.companyInfo.name;
			this.industryInput.value = this.companyInfo.industry;

			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);

		} catch (error) {
			if ((error as any).fileOperationResult === 1) {
				this.notificationService.info(localize('clo.companyInfo.notFound', "company-info.json not found in TNE-CONTEXT. Please enter company details."));
				this.companyInfo = { name: '', industry: '' };
				this.companyNameInput.value = '';
				this.industryInput.value = '';
				this.toggleEditMode('name', true);
				this.toggleEditMode('industry', true);
			} else {
				this.notificationService.error(localize('clo.companyInfo.loadError', "Failed to load company-info.json: {0}", (error as any).message));
			}
		}
	}

	private async saveCompanyInfo(): Promise<void> {
		this.companyInfo.name = this.companyNameInput.value.trim();
		this.companyInfo.industry = this.industryInput.value.trim();
		const filePath = await this.getCompanyInfoFilePath();
		try {
			await this.fileService.writeFile(filePath, VSBuffer.fromString(JSON.stringify(this.companyInfo, null, 2)));
			this.notificationService.info(localize('clo.companyInfo.saveSuccess', "Company info saved to TNE-CONTEXT/company-info.json."));
			this.companyNameDisplay.textContent = this.companyInfo.name;
			this.industryDisplay.textContent = this.companyInfo.industry;
			this.toggleEditMode('name', false);
			this.toggleEditMode('industry', false);
		} catch (error) {
			this.notificationService.error(localize('clo.companyInfo.saveError', "Failed to save company-info.json: {0}", (error as any).message));
		}
	}

	private toggleEditMode(field: 'name' | 'industry', enable: boolean): void {
		if (field === 'name') {
			if (enable) {
				this.companyNameDisplay.classList.add('ceo-hidden');
				this.companyNameInput.classList.remove('ceo-hidden');
				this.companyNameInput.focus();
			} else {
				this.companyNameDisplay.classList.remove('ceo-hidden');
				this.companyNameInput.classList.add('ceo-hidden');
			}
		} else {
			if (enable) {
				this.industryDisplay.classList.add('ceo-hidden');
				this.industryInput.classList.remove('ceo-hidden');
				this.industryInput.focus();
			} else {
				this.industryDisplay.classList.remove('ceo-hidden');
				this.industryInput.classList.add('ceo-hidden');
			}
		}
	}

	private async updateReportChecklist(): Promise<void> {
		while (this.reportChecklist.firstChild) {
			this.reportChecklist.removeChild(this.reportChecklist.firstChild);
		}
		const tneContextPath = await this.getTNEContextPath();
		const reports = [
			'clo1-regulatory-analysis.md',
		];

		for (const report of reports) {
			const listItem = document.createElement('div');
			listItem.className = 'ceo-report-item';

			const statusIndicator = document.createElement('span');
			statusIndicator.className = 'status-indicator';

			const label = document.createElement('label');
			const displayReportName = report
				.replace(/clo\d-/, '')
				.replace(/-/g, ' ')
				.replace(/\.md$/, '')
				.split(' ')
				.map(w => w.charAt(0).toUpperCase() + w.slice(1))
				.join(' ');
			label.textContent = displayReportName;

			try {
				const reportUri = joinPath(tneContextPath, report);
				await this.fileService.resolve(reportUri);
				statusIndicator.classList.add('checked');
				label.classList.add('checked');
			} catch {
				statusIndicator.classList.add('unchecked');
				label.classList.add('unchecked');
			}

			listItem.appendChild(statusIndicator);
			listItem.appendChild(label);
			listItem.addEventListener('click', () => this.handleReportClick(report, statusIndicator.classList.contains('checked')));
			this.reportChecklist.appendChild(listItem);
		}
	}

	private async handleReportClick(report: string, isCompleted: boolean): Promise<void> {
		const reportToModeMap: { [key: string]: { slug: string; name: string } } = {
			'clo1-regulatory-analysis.md': { slug: 'clo1-regulatory-analysis', name: 'Regulatory analysis' },
		};

		if (isCompleted) {
			const tneContextPath = await this.getTNEContextPath();
			const reportUri = joinPath(tneContextPath, report);
			try {
				await this.commandService.executeCommand('vscode.open', reportUri);
				this.notificationService.info(localize('clo.report.opened', "Opened report: {0}", report));
			} catch (error) {
				this.notificationService.error(localize('clo.report.openError', "Failed to open report {0}: {1}", report, (error as any).message));
			}
		} else {
			const modeInfo = reportToModeMap[report];
			if (modeInfo) {
				const companyName = this.companyInfo.name || 'the company';
				const industry = this.companyInfo.industry || 'unspecified';
				const message = localize(
					'clo.mode.switchMessage',
					"The user requests {0} for {1} in the {2} industry. Switch to the {0} mode and begin.",
					modeInfo.name,
					companyName,
					industry
				);

				try {
					await this.commandService.executeCommand('compass.service.startTask', { message, newTask: false, mode: modeInfo.slug });
					this.notificationService.info(localize('clo.mode.switchTriggered', "Triggered mode switch to: {0}", modeInfo.name));
				} catch (error) {
					this.notificationService.error(localize('clo.mode.switchError', "Failed to trigger mode switch to {0}: {1}", modeInfo.name, (error as any).message));
				}
			} else {
				this.notificationService.warn(localize('clo.mode.noMapping', "No mode mapping found for report: {0}", report));
			}
		}
	}

	private async getTNEContextPath(): Promise<URI> {
		const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
		let tneContextUri: URI;
		if (workspaceFolders.length > 0) {
			tneContextUri = joinPath(workspaceFolders[0].uri, 'TNE-CONTEXT');
		} else {
			tneContextUri = URI.file('/tmp/TNE-CONTEXT');
		}
		try {
			await this.fileService.resolve(tneContextUri);
		} catch (error) {
			if ((error as any).fileOperationResult === 1) {
				await this.fileService.createFolder(tneContextUri);
				this.notificationService.info(localize('clo.tneContext.created', "TNE-CONTEXT directory created."));
			} else {
				this.notificationService.error(localize('clo.tneContext.error', "Error resolving/creating TNE-CONTEXT directory: {0}", (error as any).message));
			}
		}
		return tneContextUri;
	}

	override shouldShowWelcome(): boolean { return false; }
}

// Register CLO container
const cloViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: CLO_VIEW_CONTAINER_ID,
		title: localize2('clo', 'CLO'),
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CLO_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
		icon: Codicon.shield,
		storageId: CLO_VIEW_CONTAINER_ID,
		order: 21
	},
	ViewContainerLocation.Sidebar
);
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: CLO_VIEW_ID,
	name: localize2('clo.view', 'CLO'),
	containerIcon: Codicon.shield,
	ctorDescriptor: new SyncDescriptor(CLOView),
	canMoveView: true,
	canToggleVisibility: true,
	when: undefined,
}], cloViewContainer);
