import {slct, waitForCondition} from '../../utils';
import {BasePageProps} from '../BasePage';
import {ChartPage, ChartType} from '../ChartPage';
import ChartKit from '../wizard/ChartKit';
import ChartSettings from '../wizard/ChartSettings';
import NavigationMinimal, {Ownership} from '../wizard/NavigationMinimal';
import VisualizationItemDialog from '../wizard/VisualizationItemDialog';

import PreviewTable from './PreviewTable';
import {NavigationMinimalPlaceSelectQa} from '../../../src/shared/constants/qa/components';

interface QLPageProps extends BasePageProps {}

class QLPage extends ChartPage {
    previewTable: PreviewTable;
    chartkit: ChartKit;
    chartSettings: ChartSettings;
    visualizationItemDialog: VisualizationItemDialog;
    private selectConnectionButtonSelector = slct('select-connection');
    private navigationMinimal: NavigationMinimal;

    constructor({page}: QLPageProps) {
        super({page});
        this.navigationMinimal = new NavigationMinimal(page);
        this.chartkit = new ChartKit(page);
        this.chartSettings = new ChartSettings(page);
        this.previewTable = new PreviewTable(page);
        this.visualizationItemDialog = new VisualizationItemDialog(page);
    }

    async clickCreate() {
        await this.page.click(slct('view-setup-create'));
    }

    async selectConnection(connectionName: string) {
        await this.page.click(this.selectConnectionButtonSelector);

        await this.navigationMinimal.selectNamespace(NavigationMinimalPlaceSelectQa.Connections);

        await this.navigationMinimal.typeToSearch(connectionName);

        await this.navigationMinimal.selectOwnership(Ownership.All);

        await this.navigationMinimal.clickToItem(connectionName);
    }

    async waitForConnectionName(expectedName: string) {
        let actualName = '';

        await waitForCondition(async () => {
            actualName = await this.page.innerText(this.selectConnectionButtonSelector);

            return expectedName === actualName;
        }).catch((error) => {
            console.error(error);
            throw new Error(`expectedName: ${expectedName} !== actualName: ${actualName}`);
        });
    }

    async selectChartType(chartType: string) {
        await this.page.click(`.ql-view-setup__chart-type-select >> text=${chartType}`, {
            force: true,
        });
    }

    async setScript(sqlScript: string) {
        await this.page.click('.react-monaco-editor-container');

        await this.page.keyboard.insertText(sqlScript);
    }

    async clearScript() {
        await waitForCondition(async () => {
            await this.page.click('.react-monaco-editor-container');

            // for Windows/Linux select all text
            await this.page.keyboard.press('Control+A');

            await this.page.keyboard.press('Backspace');

            const script: string | null = await this.getScript();

            const isEditorEmpty = this.compareScripts('', script);

            if (isEditorEmpty) {
                return true;
            } else {
                // for mac os select all text
                await this.page.keyboard.press('Meta+A');

                await this.page.keyboard.press('Backspace');

                const scriptAfterRetry = await this.getScript();

                return this.compareScripts('', scriptAfterRetry);
            }
        }).catch(() => {
            throw new Error('Could not clear the editor');
        });
    }

    async runScript() {
        await this.page.click(slct('run-ql-script'));
    }

    async saveQlEntry(entryName: string) {
        await this.saveEntry({entryName, chartType: ChartType.QL});
    }

    async saveExistentQlEntry() {
        await this.saveExistentEntry();
    }

    async switchToQlInitialRevision(initialState: string): Promise<void> {
        const waitForConditionPromise = waitForCondition(async () => {
            const currentState = await this.getScript();
            if (currentState) {
                return this.compareScripts(initialState, currentState);
            }

            return false;
        }).catch(() => {
            throw new Error('There should be another script in the editor');
        });

        await this.switchToSecondRevision({waitForConditionPromise});
    }

    async getScript(): Promise<string | null> {
        const editor = await this.page.$('.ql-screen-sql__query-editor .lines-content');

        if (!editor) {
            return null;
        }

        return editor.textContent();
    }

    async saveQlChartAsNew(entryName: string) {
        await this.saveAsNewChart(entryName);
    }

    waitForSomeSuccessfulRender() {
        return new Promise((resolve, reject) => {
            this.page.waitForSelector('.chartkit .chartkit-graph').then(resolve, () => undefined);

            this.page
                .waitForSelector('.chartkit .chartkit-metric-2, .chartkit .chartkit-indicator')
                .then(resolve, () => undefined);

            this.page.waitForSelector('.chartkit .chartkit-table').then(resolve, () => undefined);

            setTimeout(reject, 30 * 1000);
        });
    }

    compareScripts(s1: string | null, s2: string | null) {
        if (s1 === null || s2 === null) {
            return false;
        }
        const s1WithoutFormatting = s1
            .split('')
            .filter((s) => s.trim())
            .join('');
        const s2WithoutFormatting = s2
            .split('')
            .filter((s) => s.trim())
            .join('');

        return s1WithoutFormatting === s2WithoutFormatting;
    }
}

export default QLPage;
