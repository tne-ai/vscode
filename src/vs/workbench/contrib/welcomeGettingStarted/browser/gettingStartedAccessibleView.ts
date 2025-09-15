/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AccessibleContentProvider, AccessibleViewType } from '../../../../platform/accessibility/browser/accessibleView.js';
import { IAccessibleViewImplementation } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { inWelcomeContext } from './gettingStarted.js';

/**
 * Walkthroughs have been removed from the Welcome experience.
 * Keep a no-op Accessible View provider to satisfy registrations without referencing walkthrough types.
 */
export class GettingStartedAccessibleView implements IAccessibleViewImplementation {
	readonly type = AccessibleViewType.View;
	readonly priority = 110;
	readonly name = 'welcome';
	readonly when = inWelcomeContext;

	// Return no provider; there is no walkthrough content to expose to the Accessible View.
	getProvider = (_accessor: ServicesAccessor): AccessibleContentProvider | undefined => {
		return undefined;
	};
}
