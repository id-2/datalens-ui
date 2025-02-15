import {EMBEDDED_CHART_MESSAGE_NAME} from 'constants/common';

import React from 'react';

import block from 'bem-cn-lite';
import {useDispatch} from 'react-redux';
import {RouteComponentProps} from 'react-router-dom';
import {extractEntryId} from 'shared';
import {DL, PageTitle, SlugifyUrl, Utils} from 'ui';
import {pushStats} from 'ui/components/Widgets/Chart/helpers/helpers';
import type {ChartsChartKit} from 'ui/libs/DatalensChartkit/types/charts';
import {getSdk} from 'ui/libs/schematic-sdk';
import {fetchEntryById} from 'ui/store/actions/entryContent';
import {addWorkbookInfo, resetWorkbookPermissions} from 'ui/units/workbooks/store/actions';

import {ChartWrapper} from '../../../../components/Widgets/Chart/ChartWidgetWithProvider';
import type {ChartKit as ChartKitType} from '../../../../libs/DatalensChartkit/ChartKit/ChartKit';
import {CHARTKIT_SCROLLABLE_NODE_CLASSNAME} from '../../../../libs/DatalensChartkit/ChartKit/helpers/constants';
import {
    ChartKitDataProvider,
    ChartKitWrapperLoadStatusUnknown,
    ChartKitWrapperOnLoadProps,
} from '../../../../libs/DatalensChartkit/components/ChartKitBase/types';
import {ChartsData} from '../../../../libs/DatalensChartkit/modules/data-provider/charts';
import {registry} from '../../../../registry';
import {SNAPTER_DESIRED_CLASS} from '../../modules/constants/constants';

import './Preview.scss';

const b = block('preview');

interface PreviewProps extends RouteComponentProps<{idOrSource: string}> {
    asideHeaderSize: number;
    setPageEntry: (pageEntry: {entryId: string; key: string}) => void;
    isEmbedded?: boolean;
}

function sendEmbedHeight(previewRef: React.RefObject<HTMLDivElement>) {
    if (!previewRef.current) {
        return;
    }

    const scrollableNodesCollection = previewRef.current.getElementsByClassName(
        CHARTKIT_SCROLLABLE_NODE_CLASSNAME,
    );

    if (scrollableNodesCollection.length) {
        const height = scrollableNodesCollection[0].scrollHeight;

        window.parent.postMessage({iFrameName: window.name, embedHeight: height}, '*');
    }
}

const Preview: React.FC<PreviewProps> = (props) => {
    const dispatch = useDispatch();

    const {
        location: {search},
        match: {
            params: {idOrSource},
        },
        history,
        asideHeaderSize,
        setPageEntry,
        isEmbedded,
    } = props;

    const {noControls} = Utils.getOptionsFromSearch(search);

    const possibleEntryId = React.useMemo(() => extractEntryId(idOrSource), [idOrSource]);

    const [title, setTitle] = React.useState(idOrSource);

    const [name, setName] = React.useState<string | null>(null);

    const params = React.useMemo(() => Utils.getParamsFromSearch(search), [search]);

    const previewRef = React.useRef<HTMLDivElement>(null);
    const chartKitRef = React.useRef<ChartsChartKit>(null);

    React.useEffect(() => {
        let concurrentId = '';

        if (possibleEntryId) {
            concurrentId = `fetchEntryById-${possibleEntryId}`;

            dispatch(
                fetchEntryById(possibleEntryId, concurrentId, (entryItem) => {
                    const workbookId = entryItem.workbookId;
                    concurrentId = '';
                    if (workbookId) {
                        dispatch(addWorkbookInfo(workbookId));
                    }
                }),
            );
        }

        return () => {
            getSdk().cancelRequest(concurrentId);
            dispatch(resetWorkbookPermissions());
        };
    }, [dispatch, possibleEntryId]);

    React.useEffect(() => {
        if (chartKitRef.current && typeof chartKitRef.current.reflow === 'function') {
            chartKitRef.current.reflow();
        }
    }, [asideHeaderSize]);

    React.useEffect(() => {
        if (!isEmbedded || !window.name) {
            return;
        }

        const handleMessageSend = (event: MessageEvent<string>) => {
            if (event.data === EMBEDDED_CHART_MESSAGE_NAME) {
                sendEmbedHeight(previewRef);
            }
        };

        window.addEventListener('message', handleMessageSend);

        return () => {
            window.removeEventListener('message', handleMessageSend);
        };
    }, [isEmbedded, previewRef]);

    const onChartLoad = React.useCallback((load: ChartKitWrapperOnLoadProps) => {
        const {status, data} = load;
        if (status === 'success') {
            const {key, entryId} = data.loadedData as unknown as ChartsData;

            if (key) {
                setTitle(key);
                setName(Utils.getEntryNameFromKey(key));

                setPageEntry({entryId, key});
            }
        }
    }, []);

    const onChartRender = React.useCallback(
        (
            load: ChartKitWrapperOnLoadProps | ChartKitWrapperLoadStatusUnknown,
            dataProvider: ChartKitDataProvider,
        ) => {
            const {status} = load;
            let event;
            if (status === 'success') {
                pushStats(
                    load,
                    navigator.userAgent === 'StatScreenshooter' ? 'snapter' : 'preview',
                    dataProvider,
                );

                event = new CustomEvent('chart-preview.done', {detail: load, bubbles: true});
            } else {
                event = new CustomEvent('chart-preview.error', {detail: load, bubbles: true});
            }

            if (previewRef.current) {
                previewRef.current.dispatchEvent(event);

                if (isEmbedded && window.name) {
                    sendEmbedHeight(previewRef);
                }
            }
        },
        [isEmbedded, previewRef],
    );

    const chartKitProps: {id?: string; source?: string} = {};
    // the source is here in particular in order to display the 403 and 404 ChartKit errors,
    // and not the layout of DataLens, as a result of the fall of getEntryInfo in legacy-redirect-middleware
    if (possibleEntryId) {
        chartKitProps.id = possibleEntryId;
    } else {
        chartKitProps.source = '/' + idOrSource;
    }

    const entry = React.useMemo(() => ({key: title}), [title]);
    const hasSplitTooltip = React.useMemo(() => !isEmbedded && DL.IS_MOBILE, [isEmbedded]);

    const {PreviewExtension} = registry.preview.components.getAll();

    return (
        <React.Fragment>
            <PageTitle entry={entry} />
            {Boolean(possibleEntryId) && (
                <SlugifyUrl entryId={possibleEntryId} name={name} history={history} />
            )}
            <div className={b(null, SNAPTER_DESIRED_CLASS)} ref={previewRef}>
                <ChartWrapper
                    usageType="chart"
                    {...chartKitProps}
                    params={params}
                    onChartLoad={onChartLoad}
                    onChartRender={onChartRender}
                    noControls={noControls}
                    forwardedRef={chartKitRef as unknown as React.RefObject<ChartKitType>}
                    splitTooltip={hasSplitTooltip}
                    menuType="preview"
                />
                <PreviewExtension />
            </div>
        </React.Fragment>
    );
};

export default Preview;
