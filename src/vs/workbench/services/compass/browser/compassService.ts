/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Compass Service (browser) - bridges to extension commands for initial functionality

import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';

import { ICompassService, CompassMode, ProviderSettings } from '../common/compass.js';

export class CompassService implements ICompassService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
	) { }

	// AI Mode Management

	async switchMode(mode: CompassMode): Promise<void> {
		try {
			await this.commandService.executeCommand('compass.service.switchMode', mode);
		} catch (error) {
			this.notificationService.error(`Compass: failed to switch mode: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	async getCurrentMode(): Promise<CompassMode | undefined> {
		// TODO: Bridge a read API from the extension adapter when available.
		return undefined;
	}

	// Message Processing

	async sendMessage(message: string, options?: { images?: string[]; newTask?: boolean }): Promise<{ taskId?: string }> {
		try {
			// Pass args optimistically; current shim may ignore them until updated.
			await this.commandService.executeCommand('compass.service.startTask', { message, ...options });
			return {};
		} catch (error) {
			this.notificationService.error(`Compass: failed to start task: ${error instanceof Error ? error.message : String(error)}`);
			return {};
		}
	}

	// Provider Management (profile-based)

	async getAvailableProfiles(): Promise<Array<{ name: string }>> {
		// TODO: Implement via shim exposure
		return [];
	}

	async getActiveProfileName(): Promise<string | undefined> {
		// TODO: Implement via shim exposure
		return undefined;
	}

	async activateProfileByName(name: string): Promise<string | undefined> {
		// TODO: Implement via shim exposure
		this.notificationService.info(`Compass: activateProfileByName("${name}") not yet available`);
		return undefined;
	}

	async upsertProfile(_name: string, _settings: ProviderSettings, _activate?: boolean): Promise<string | undefined> {
		// TODO: Implement via shim exposure
		this.notificationService.info('Compass: upsertProfile not yet available');
		return undefined;
	}

	// MCP Integration

	async getMCPServers(): Promise<Array<{ name: string; description?: string; state?: string }>> {
		// TODO: Implement via shim exposure
		return [];
	}

	async addMCPServer(_config: { name: string; command: string; args?: string[]; env?: Record<string, string> }): Promise<void> {
		// TODO: Implement via shim exposure
		this.notificationService.info('Compass: addMCPServer not yet available');
	}
}

// Register the service singleton (lazy)
registerSingleton(ICompassService, CompassService, InstantiationType.Delayed);