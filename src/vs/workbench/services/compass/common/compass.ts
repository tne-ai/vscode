/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Compass Service Contract (common)

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export type CompassMode = string;

export type ProviderSettings = Record<string, unknown>;

export interface ICompassService {
	readonly _serviceBrand: undefined;

	// AI Mode Management
	switchMode(mode: CompassMode): Promise<void>;
	getCurrentMode(): Promise<CompassMode | undefined>;

	// Message Processing
	sendMessage(message: string, options?: { images?: string[]; newTask?: boolean }): Promise<{ taskId?: string }>;

	// Provider Management (profile-based)
	getAvailableProfiles(): Promise<Array<{ name: string }>>;
	getActiveProfileName(): Promise<string | undefined>;
	activateProfileByName(name: string): Promise<string | undefined>;
	upsertProfile(name: string, settings: ProviderSettings, activate?: boolean): Promise<string | undefined>;

	// MCP Integration
	getMCPServers(): Promise<Array<{ name: string; description?: string; state?: string }>>;
	addMCPServer(config: { name: string; command: string; args?: string[]; env?: Record<string, string> }): Promise<void>;
}

export const ICompassService = createDecorator<ICompassService>('compassService');