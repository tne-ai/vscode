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
		try {
			const mode = await this.commandService.executeCommand<CompassMode | undefined>('compass.service.getCurrentMode');
			return mode;
		} catch (error) {
			this.notificationService.error(`Compass: failed to get current mode: ${error instanceof Error ? error.message : String(error)}`);
			return undefined;
		}
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
		try {
			const profiles = await this.commandService.executeCommand<Array<{ name: string }>>('compass.service.getAvailableProfiles');
			return profiles ?? [];
		} catch (error) {
			this.notificationService.error(`Compass: failed to list provider profiles: ${error instanceof Error ? error.message : String(error)}`);
			return [];
		}
	}

	async getActiveProfileName(): Promise<string | undefined> {
		try {
			return await this.commandService.executeCommand<string | undefined>('compass.service.getActiveProfileName');
		} catch (error) {
			this.notificationService.error(`Compass: failed to get active profile: ${error instanceof Error ? error.message : String(error)}`);
			return undefined;
		}
	}

	async activateProfileByName(name: string): Promise<string | undefined> {
		try {
			return await this.commandService.executeCommand<string | undefined>('compass.service.activateProfileByName', name);
		} catch (error) {
			this.notificationService.error(`Compass: failed to activate profile "${name}": ${error instanceof Error ? error.message : String(error)}`);
			return undefined;
		}
	}

	async upsertProfile(name: string, settings: ProviderSettings, activate?: boolean): Promise<string | undefined> {
		try {
			return await this.commandService.executeCommand<string | undefined>('compass.service.upsertProfile', { name, settings, activate });
		} catch (error) {
			this.notificationService.error(`Compass: failed to upsert profile "${name}": ${error instanceof Error ? error.message : String(error)}`);
			return undefined;
		}
	}

	// MCP Integration

	async getMCPServers(): Promise<Array<{ name: string; description?: string; state?: string }>> {
		try {
			const servers = await this.commandService.executeCommand<Array<{ name: string; description?: string; state?: string }>>('compass.service.getMCPServers');
			return servers ?? [];
		} catch (error) {
			this.notificationService.error(`Compass: failed to list MCP servers: ${error instanceof Error ? error.message : String(error)}`);
			return [];
		}
	}

	async addMCPServer(config: { name: string; command: string; args?: string[]; env?: Record<string, string> }): Promise<void> {
		try {
			await this.commandService.executeCommand('compass.service.addMCPServer', config);
		} catch (error) {
			this.notificationService.error(`Compass: failed to add MCP server "${config?.name ?? ''}": ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}

// Register the service singleton (lazy)
registerSingleton(ICompassService, CompassService, InstantiationType.Delayed);