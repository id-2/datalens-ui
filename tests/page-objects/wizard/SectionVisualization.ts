import {ElementHandle, Page} from '@playwright/test';
import {AddFieldQA} from '../../../src/shared/constants';

import {dragAndDrop, getParentByQARole, slct, waitForCondition} from '../../utils';
import {waitForSuccessfulResponse} from '../BasePage';
import {WizardVisualizationId} from '../common/Visualization';

export enum PlaceholderName {
    X = 'placeholder-x',
    Y = 'placeholder-y',
    Y2 = 'placeholder-y2',
    FlatTableColumns = 'placeholder-flat-table-columns',
    Geopoint = 'placeholder-geopoint',
    Geopoligon = 'placeholder-geopolygon',
    Measures = 'placeholder-measures',
    Colors = 'placeholder-colors',
    Labels = 'placeholder-labels',
    Tooltips = 'placeholder-tooltips',
    Filters = 'placeholder-filters',
    DashboardFilters = 'placeholder-dashboard-filters',
    DashboardParameters = 'placeholder-dashboard-parameters',
    LayerFilters = 'placeholder-layer-filters',
    Size = 'placeholder-size',
    Shapes = 'placeholder-shapes',
    Points = 'placeholder-points',
    Dimensions = 'placeholder-dimensions',
    PivotTableColumns = 'placeholder-pivot-table-columns',
    Rows = 'placeholder-rows',
    Polyline = 'placeholder-polyline',
    Grouping = 'placeholder-grouping',
    Heatmap = 'placeholder-heatmap',
    Sort = 'placeholder-sort',
    Segments = 'placeholder-segments',
}

export enum GeopointType {
    Geopoints = 'geopoint',
    Geopoligons = 'geopolygon',
    GeopointsHeatMap = 'heatmap',
    Polyline = 'polyline',
}

export default class SectionVisualization {
    private page: Page;
    private layersSelectSelector = slct('geolayers-select');
    private layerPopupItemSelector = '.geolayers-select__popup-item';
    private geotypeControlSelector = slct('geotype-select');

    constructor(page: Page) {
        this.page = page;
    }

    getPlaceholderItems(placeholder: PlaceholderName) {
        return this.page.$$(`${slct(placeholder)} .data-qa-placeholder-item`);
    }

    async removeFieldByClick(placeholder: PlaceholderName, fieldTitle: string) {
        await this.page.hover(`${slct(placeholder)} ${slct(fieldTitle)}`);

        return this.page.click(`${slct(placeholder)} ${slct(fieldTitle)} .cross-icon`);
    }

    async removeFieldByDragAndDrop(placeholder: PlaceholderName, fieldName: string) {
        const source = (await this.page.$(
            `${slct(placeholder)} ${slct('dnd-container')} >> text=${fieldName}`,
        ))!;

        const target = (await this.page.$(
            `${slct('datasets-container')} ${slct('dnd-container')}`,
        ))!;

        await dragAndDrop(this.page, source, target);
    }

    async dragAndDropFieldBetweenPlaceholders({
        from,
        to,
        fieldName,
    }: {
        from: PlaceholderName;
        to: PlaceholderName;
        fieldName: string;
    }) {
        const dndContainerSelector = slct('dnd-container');
        const sourceLocator = await this.page.locator(
            `${slct(from)} ${dndContainerSelector} >> text=${fieldName}`,
        );
        const targetLocator = await this.page.locator(`${slct(to)} ${dndContainerSelector}`);

        const source = await sourceLocator.elementHandle();
        const target = await targetLocator.elementHandle();

        if (!source) {
            throw new Error(`dnd-container for field '${fieldName}' not found`);
        }

        if (!target) {
            throw new Error(`target dnd-container not found`);
        }

        await dragAndDrop(this.page, source, target);
    }

    async addFieldByDragAndDrop(placeholder: PlaceholderName, fieldName: string) {
        await this.page.waitForSelector(slct('section-dataset-draggable-item-title'));

        const source = (await this.page.$(
            slct('section-dataset-draggable-item-title', fieldName),
        ))!;

        const target = (await this.page.$(`${slct(placeholder)} ${slct('dnd-container')}`))!;

        await dragAndDrop(this.page, source, target);
    }

    async replaceFieldByDragAndDrop(
        placeholder: PlaceholderName,
        oldField: string,
        newField: string,
    ) {
        const sourceSelector = slct('section-dataset-draggable-item-title', newField);
        const targetSelector = `${slct(placeholder)} ${slct('dnd-container')} >> text=${oldField}`;
        await this.page.waitForSelector(sourceSelector);
        await this.page.waitForSelector(targetSelector);

        const source = (await this.page.$(sourceSelector))!;

        const target = (await this.page.$(targetSelector))!;

        await dragAndDrop(this.page, source, target);
    }

    async addFieldByClick(
        placeholder: PlaceholderName,
        field: string,
        options?: {waitForApiRun?: boolean},
    ) {
        const promise: Promise<void> = options?.waitForApiRun
            ? waitForSuccessfulResponse('/api/run', this.page)
            : Promise.resolve();

        await Promise.all([
            this.page.waitForSelector('.dimensions-subcontainer'),
            this.page.waitForSelector('.dimensions-subheader'),
        ]);

        await this.page.hover(slct(placeholder), {force: true});

        await this.page.click(`${slct(placeholder)} ${slct(AddFieldQA.AddFieldButton)}`, {
            force: true,
        });

        await this.page.click(`${slct('select-list')} >> text=${field}`);

        await promise;
    }

    async waitForPlaceholderFields(placeholder: PlaceholderName, fields: string[]) {
        let itemTexts: string[] = [];

        try {
            await waitForCondition(async () => {
                const items = await this.page.$$(`${slct(placeholder)} .data-qa-placeholder-item`);

                itemTexts = await Promise.all(items.map((item) => item.innerText()));

                return itemTexts.join().includes(fields.join());
            });
        } catch {
            throw new Error(`Expected: ${fields.join()}, got: ${itemTexts.join()}`);
        }
    }

    async addLayer() {
        await this.page.click(slct('add-layer'));
    }

    async openLayerList() {
        await this.page.click(this.layersSelectSelector);
    }

    async switchLayer(layerQa: string) {
        await this.openLayerList();

        await this.page.click(slct(layerQa));
    }

    async selectCombinedChartLayerVisualization(
        visualization:
            | WizardVisualizationId.Line
            | WizardVisualizationId.Column
            | WizardVisualizationId.Area,
    ) {
        await this.page.click(`.combined-chart-layer-type-switcher [value="${visualization}"]`);
    }

    async renameGeoLayer(oldGeoLayerQa: string, newName: string) {
        const oldLayerName = await this.page.waitForSelector(slct(oldGeoLayerQa));

        const oldLayerItem = (await getParentByQARole(oldLayerName, 'geolayer-select-item'))!;

        await oldLayerItem.hover();

        const oldLayerActions = (await oldLayerItem.$('[data-qa="geolayer-item-actions"]'))!;

        await oldLayerActions.click();

        await this.page.click(slct('geolayer-select-option-menu-rename'));

        await this.page.fill(`${slct('layer-name-input')} input`, newName);

        await this.page.click(slct('apply-layer-settings-button'));
    }

    async removeGeoLayer(name: string) {
        await this.page.click(this.layersSelectSelector);

        const oldLayerName = await this.page.waitForSelector(slct(name));

        const oldLayerItem = (await getParentByQARole(oldLayerName, 'geolayer-select-item'))!;

        await oldLayerItem.hover();

        const oldLayerActions = (await oldLayerItem.$('[data-qa="geolayer-item-actions"]'))!;

        await oldLayerActions.click();

        await this.page.click(slct('geolayer-select-option-menu-remove'));

        await this.page.click('.dl-dialog-confirm__button_action_apply');
    }

    async setGeotype(type: GeopointType) {
        await this.page.click(this.geotypeControlSelector);
        await this.page.click(`[data-qa="${type}"]`);
    }

    async waitForLayers(layers: string[]) {
        let layersNames: (string | null | undefined)[] = [];

        try {
            await waitForCondition(async () => {
                const layersElements: ElementHandle<HTMLElement>[] =
                    await this.getLayersSelectItems();

                layersNames = await Promise.all(
                    layersElements.map(async (layer) =>
                        (
                            await layer.$('.geolayers-select__popup-item-label')
                        )?.getAttribute('data-qa'),
                    ),
                );

                return layersNames.join() === layers.join();
            });
        } catch {
            throw new Error(`waitForLayers error: expected: ${layers}, got: ${layersNames}`);
        }
    }

    async getAddFieldItemsList(placeholderName: PlaceholderName) {
        let itemsList: string[] = [];

        await waitForCondition(async () => {
            const placeholderSelector = slct(placeholderName);
            await this.page.hover(placeholderSelector);

            await this.page.click(`${placeholderSelector} ${slct(AddFieldQA.AddFieldButton)}`);

            const itemNodes = await this.page.$$(`${slct('select-list')} .add-field__option-text`);

            itemsList = await Promise.all(itemNodes.map((node) => node.innerText()));

            return itemsList.length;
        });

        return itemsList;
    }

    async getPlaceholderAddItemTooltipValue(placeholderName: PlaceholderName) {
        const placeholderSelector = slct(placeholderName);
        await this.page.hover(placeholderSelector);

        await this.page.hover(`${placeholderSelector} .add-field`);

        const content = await this.page.$('.yc-popover__tooltip-content > span');
        return content?.getAttribute('data-qa');
    }

    async getPlaceholderItemsInnerText(placeholderName: PlaceholderName) {
        const items = await this.getPlaceholderItems(placeholderName);

        const titles = await Promise.all(items.map((item) => item.$('.item-title span')));

        const titleTexts = await Promise.all(titles.map((title) => title?.innerText()));

        return titleTexts.filter(Boolean) as string[];
    }

    async clickOnSortIcon() {
        await this.page.click('.sort-icon');
    }

    async setLayerOpacity(opacityValue: string) {
        this.page.fill('.visualization-layers-control__range input', opacityValue);
    }

    async getLayersSelectItems(): Promise<ElementHandle<HTMLElement>[]> {
        await this.page.click(this.layersSelectSelector);
        const layerSelectItems = await this.page.$$(this.layerPopupItemSelector);
        await this.page.click(this.layersSelectSelector);
        return layerSelectItems as ElementHandle<HTMLElement>[];
    }
}

export const VISUALIZATION_PLACEHOLDERS = {
    line: [
        'placeholder-x',
        'placeholder-y',
        'placeholder-y2',
        'placeholder-colors',
        'placeholder-shapes',
        'placeholder-sort',
        'placeholder-labels',
        'placeholder-segments',
        'placeholder-filters',
    ],
    area: [
        'placeholder-x',
        'placeholder-y',
        'placeholder-colors',
        'placeholder-sort',
        'placeholder-labels',
        'placeholder-segments',
        'placeholder-filters',
    ],
    area100p: [
        'placeholder-x',
        'placeholder-y',
        'placeholder-colors',
        'placeholder-sort',
        'placeholder-labels',
        'placeholder-segments',
        'placeholder-filters',
    ],
    column: [
        'placeholder-x',
        'placeholder-y',
        'placeholder-colors',
        'placeholder-sort',
        'placeholder-labels',
        'placeholder-segments',
        'placeholder-filters',
    ],
    column100p: [
        'placeholder-x',
        'placeholder-y',
        'placeholder-colors',
        'placeholder-sort',
        'placeholder-labels',
        'placeholder-segments',
        'placeholder-filters',
    ],
    bar: [
        'placeholder-y',
        'placeholder-x',
        'placeholder-colors',
        'placeholder-sort',
        'placeholder-labels',
        'placeholder-filters',
    ],
    bar100p: [
        'placeholder-y',
        'placeholder-x',
        'placeholder-colors',
        'placeholder-sort',
        'placeholder-labels',
        'placeholder-filters',
    ],
    pie: [
        'placeholder-dimensions',
        'placeholder-measures',
        'placeholder-sort',
        'placeholder-labels',
        'placeholder-filters',
    ],
    donut: [
        'placeholder-dimensions',
        'placeholder-measures',
        'placeholder-sort',
        'placeholder-labels',
        'placeholder-filters',
    ],
    metric: ['placeholder-measures', 'placeholder-filters'],
    scatter: [
        'placeholder-x',
        'placeholder-y',
        'placeholder-points',
        'placeholder-size',
        'placeholder-colors',
        'placeholder-shapes',
        'placeholder-sort',
        'placeholder-filters',
    ],
    treemap: [
        'placeholder-dimensions',
        'placeholder-measures',
        'placeholder-colors',
        'placeholder-filters',
    ],
    flatTable: [
        'placeholder-flat-table-columns',
        'placeholder-colors',
        'placeholder-sort',
        'placeholder-filters',
    ],
    pivotTable: [
        'placeholder-pivot-table-columns',
        'placeholder-rows',
        'placeholder-measures',
        'placeholder-colors',
        'placeholder-sort',
        'placeholder-filters',
    ],
    geopoint: [
        'placeholder-geopoint',
        'placeholder-size',
        'placeholder-colors',
        'placeholder-labels',
        'placeholder-tooltips',
        'placeholder-layer-filters',
        'placeholder-filters',
    ],
    geopolygon: [
        'placeholder-geopolygon',
        'placeholder-colors',
        'placeholder-tooltips',
        'placeholder-layer-filters',
        'placeholder-filters',
    ],
    heatmap: [
        'placeholder-heatmap',
        'placeholder-colors',
        'placeholder-layer-filters',
        'placeholder-filters',
    ],
    polyline: [
        'placeholder-polyline',
        'placeholder-measures',
        'placeholder-grouping',
        'placeholder-colors',
        'placeholder-sort',
        'placeholder-layer-filters',
        'placeholder-filters',
    ],
};
