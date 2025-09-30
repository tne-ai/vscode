/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './aiSummaryView.css';

import { localize } from '../../../../nls.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService } from '../../../../workbench/common/views.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ViewPane, IViewPaneOptions } from '../../../browser/parts/views/viewPane.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { URI } from '../../../../base/common/uri.js';
import { joinPath } from '../../../../base/common/resources.js';
import { VSBuffer } from '../../../../base/common/buffer.js';

import * as DOM from '../../../../base/browser/dom.js';

interface AiSummaryInfo {
    companyName: string;
    industry: string;
    status: string;
    generatedReports: string[];
    nextSteps: string[];
}

export const AI_SUMMARY_VIEW_ID = 'compass.aiSummaryView';

export class AiSummaryView extends ViewPane {
    static readonly ID = AI_SUMMARY_VIEW_ID;

    private readonly modeNameToSlugMap: { [key: string]: string } = {
        'CEO1. Existing Documents': 'ceo1-existing-documents',
        'CEO2. Background and Framework': 'ceo2-background-and-framework',
        'CEO3. Disruption Playbook': 'ceo3-disruption-playbook',
        // Add other modes as needed
    };

    private contentContainer!: HTMLElement;
    private companyNameDisplay!: HTMLElement;
    private industryDisplay!: HTMLElement;
    private statusDisplay!: HTMLElement;
    private generatedReportsList!: HTMLElement;
    private nextStepsList!: HTMLElement;
    private _refreshInterval: any;

    private aiSummaryInfo: AiSummaryInfo = {
        companyName: '',
        industry: '',
        status: '',
        generatedReports: [],
        nextSteps: []
    };

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
            { ...options, titleMenuId: MenuId.ViewTitle, singleViewPaneContainerTitle: 'AI Summary' },
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
        this.setupFileWatcher(); // Setup file watcher
    }

    private async setupFileWatcher(): Promise<void> {
        const filePath = await this.getAiSummaryFilePath();
        this._register(this.fileService.watch(filePath));
        this._register(this.fileService.onDidFilesChange(e => this._onFilesChange(e, filePath)));
    }

    private _onFilesChange(e: any, watchedFilePath: URI): void {
        console.log('AI Summary: File change event detected.', e.changes);
        if (e.changes.some((change: any) => {
            console.log(`  Change resource: ${change.resource.toString()}, Watched path: ${watchedFilePath.toString()}`);
            return change.resource.toString() === watchedFilePath.toString();
        })) {
            console.log('AI Summary: summary.json changed, reloading AI Summary info.');
            this.loadAiSummaryInfo();
        } else {
            console.log('AI Summary: Change event not for summary.json or path mismatch.');
        }
    }

    protected override renderBody(parent: HTMLElement): void {
        super.renderBody(parent);

        if (!this.contentContainer) {
            this.contentContainer = document.createElement('div');
            this.contentContainer.className = 'ai-summary-view-content';
            parent.appendChild(this.contentContainer);
        } else {
            while (this.contentContainer.firstChild) {
                this.contentContainer.removeChild(this.contentContainer.firstChild);
            }
        }

        // Company Name
        this.companyNameDisplay = document.createElement('h1');
        this.companyNameDisplay.className = 'ai-summary-company-name-display';
        this.companyNameDisplay.contentEditable = 'true';
        this.companyNameDisplay.setAttribute('aria-label', localize('aiSummary.companyNameLabel', "Company Name"));
        this.companyNameDisplay.onblur = (e) => this._onHeaderEdit(e, 'companyName');
        this.companyNameDisplay.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.companyNameDisplay.blur();
            }
        };
        this.contentContainer.appendChild(this.companyNameDisplay);

        // Industry
        this.industryDisplay = document.createElement('h2');
        this.industryDisplay.className = 'ai-summary-industry-display';
        this.industryDisplay.contentEditable = 'true';
        this.industryDisplay.setAttribute('aria-label', localize('aiSummary.industryLabel', "Industry"));
        this.industryDisplay.onblur = (e) => this._onHeaderEdit(e, 'industry');
        this.industryDisplay.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.industryDisplay.blur();
            }
        };
        this.contentContainer.appendChild(this.industryDisplay);

        // Status
        const statusTitle = document.createElement('h3');
        statusTitle.textContent = localize('aiSummary.statusTitle', "Status");
        statusTitle.className = 'ai-summary-section-title';
        this.contentContainer.appendChild(statusTitle);

        this.statusDisplay = document.createElement('p');
        this.statusDisplay.className = 'ai-summary-info-label'; // Using info-label for status body
        this.contentContainer.appendChild(this.statusDisplay);

        // Generated Reports
        const generatedReportsTitle = document.createElement('h3');
        generatedReportsTitle.textContent = localize('aiSummary.generatedReportsTitle', "Generated Reports");
        generatedReportsTitle.className = 'ai-summary-section-title';
        this.contentContainer.appendChild(generatedReportsTitle);

        this.generatedReportsList = document.createElement('div'); // Changed to div for checklist styling
        this.generatedReportsList.className = 'ai-summary-report-checklist';
        this.contentContainer.appendChild(this.generatedReportsList);

        // Next Steps
        const nextStepsTitle = document.createElement('h3');
        nextStepsTitle.textContent = localize('aiSummary.nextStepsTitle', "Next Steps");
        nextStepsTitle.className = 'ai-summary-section-title';
        this.contentContainer.appendChild(nextStepsTitle);

        this.nextStepsList = document.createElement('div'); // Changed to div for checklist styling
        this.nextStepsList.className = 'ai-summary-report-checklist';
        this.contentContainer.appendChild(this.nextStepsList);

        this.loadAiSummaryInfo();

    }


    private onBodyVisibilityChange(): void {
        if (this.isBodyVisible()) {
            this.loadAiSummaryInfo();
            // Start timer-based refresh as a fallback
            if (!this._refreshInterval) {
                const targetWindow = DOM.getActiveWindow();
                this._refreshInterval = targetWindow.setInterval(() => {
                    console.log('Timer-based refresh: reloading AI Summary info.');
                    this.loadAiSummaryInfo();
                }, 10000); // 10 seconds
            }
        } else {
            // Clear interval when view is not visible
            if (this._refreshInterval) {
                const targetWindow = DOM.getActiveWindow();
                targetWindow.clearInterval(this._refreshInterval);
                this._refreshInterval = undefined;
            }
        }
    }

    private async getAiSummaryFilePath(): Promise<URI> {
        const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
        if (workspaceFolders.length > 0) {
            const path = joinPath(workspaceFolders[0].uri, 'TNE-CONTEXT', 'summary.json');
            console.log('AI Summary: Watching file at:', path.toString());
            return path;
        }
        // Fallback if no workspace is open, though in a real scenario, TNE-CONTEXT should be in a workspace.
        const fallbackPath = URI.file('/tmp/TNE-CONTEXT/summary.json');
        console.log('AI Summary: Watching fallback file at:', fallbackPath.toString());
        return fallbackPath;
    }

    private async loadAiSummaryInfo(): Promise<void> {
        const filePath = await this.getAiSummaryFilePath();
        try {
            const content = await this.fileService.readFile(filePath);
            this.aiSummaryInfo = JSON.parse(content.value.toString());
            // Ensure companyName and industry always have a value
            if (!this.aiSummaryInfo.companyName) {
                this.aiSummaryInfo.companyName = 'Company Name';
            }
            if (!this.aiSummaryInfo.industry) {
                this.aiSummaryInfo.industry = 'Industry';
            }
            console.log('AI Summary Info loaded:', this.aiSummaryInfo);
            this.updateViewContent();
        } catch (error) {
            if ((error as any).fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.notificationService.warn(localize('aiSummary.fileNotFound', "TNE-CONTEXT/summary.json not found. Displaying default content."));
                this.aiSummaryInfo = {
                    companyName: 'Company Name',
                    industry: 'Industry',
                    status: 'No summary data available.',
                    generatedReports: [],
                    nextSteps: ['[CEO1. Existing Documents] Start Analysis']
                };
                this.updateViewContent();
            } else {
                console.error('Error loading AI Summary data:', error);
                this.notificationService.error(localize('aiSummary.loadError', "Failed to load AI Summary data: {0}", (error as Error).message));
            }
        }
    }

    private updateViewContent(): void {
        this.companyNameDisplay.textContent = this.aiSummaryInfo.companyName || 'Company Name';
        this.industryDisplay.textContent = this.aiSummaryInfo.industry || 'Industry';
        this.statusDisplay.textContent = this.aiSummaryInfo.status;

        // Clear existing lists
        while (this.generatedReportsList.firstChild) {
            this.generatedReportsList.removeChild(this.generatedReportsList.firstChild);
        }
        while (this.nextStepsList.firstChild) {
            this.nextStepsList.removeChild(this.nextStepsList.firstChild);
        }

        // Populate Generated Reports
        this.aiSummaryInfo.generatedReports.forEach(report => {
            const reportItem = document.createElement('div');
            reportItem.className = 'ai-summary-report-item';

            const statusIndicator = document.createElement('span');
            statusIndicator.className = 'status-indicator checked'; // Assuming generated reports are "checked"
            reportItem.appendChild(statusIndicator);

            const label = document.createElement('label');
            label.textContent = report;
            label.className = 'checked';
            reportItem.appendChild(label);

            this.generatedReportsList.appendChild(reportItem);
        });

        // Populate Next Steps
        this.aiSummaryInfo.nextSteps.forEach(step => {
            const stepItem = document.createElement('div');
            stepItem.className = 'ai-summary-report-item';

            const statusIndicator = document.createElement('span');
            statusIndicator.className = 'status-indicator unchecked'; // Assuming next steps are "unchecked"
            stepItem.appendChild(statusIndicator);

            const modeRegex = /^\[(.*?)\]\s*(.*)$/;
            const match = step.match(modeRegex);

            let displayStep = step;
            let modeName: string | undefined;

            if (match && match[1]) {
                modeName = match[1];
                displayStep = match[2];

                const modeBox = document.createElement('span');
                modeBox.className = 'ai-summary-mode-box';
                modeBox.textContent = modeName;
                stepItem.appendChild(modeBox);

                // Attach onclick listener immediately after creating modeBox
                modeBox.onclick = () => this._sendModeTaskMessage(modeName!, displayStep);
            }

            const label = document.createElement('label');
            label.textContent = displayStep;
            label.className = 'unchecked';
            stepItem.appendChild(label);

            this.nextStepsList.appendChild(stepItem);
        });
    }

    private async _sendModeTaskMessage(modeName: string, todoDescription: string): Promise<void> {
        const modeSlug = this.modeNameToSlugMap[modeName];
        if (!modeSlug) {
            this.notificationService.error(localize('aiSummary.modeNotFound', "Mode '{0}' not found. Cannot switch mode.", modeName));
            return;
        }

        const message = localize(
            'aiSummary.modeTaskMessage',
            "Switch to {0} mode and work on {1}",
            modeName,
            todoDescription
        );
        await this.commandService.executeCommand('compass.service.startTask', { message, newTask: true, mode: modeSlug });
        this.notificationService.info(localize('aiSummary.modeTaskSent', "Task sent: Switch to {0} mode and work on {1}.", modeName, todoDescription));
    }

    private async _onHeaderEdit(event: Event, field: 'companyName' | 'industry'): Promise<void> {
        const target = event.target as HTMLElement;
        const newValue = target.textContent?.trim() || '';

        if (this.aiSummaryInfo[field] !== newValue) {
            this.aiSummaryInfo[field] = newValue;
            await this.saveAiSummaryInfo();
        }
    }

    private async saveAiSummaryInfo(): Promise<void> {
        const filePath = await this.getAiSummaryFilePath();
        try {
            const content = JSON.stringify(this.aiSummaryInfo, null, 4);
            await this.fileService.writeFile(filePath, VSBuffer.fromString(content));
            this.notificationService.info(localize('aiSummary.saveSuccess', "AI Summary data saved successfully."));
        } catch (error) {
            console.error('Error saving AI Summary data:', error);
            this.notificationService.error(localize('aiSummary.saveError', "Failed to save AI Summary data: {0}", (error as Error).message));
        }
    }

    override shouldShowWelcome(): boolean {
        return false;
    }
}