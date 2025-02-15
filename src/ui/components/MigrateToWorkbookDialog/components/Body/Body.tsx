import React from 'react';

import {Alert, Text} from '@gravity-ui/uikit';
import block from 'bem-cn-lite';
import {I18n} from 'i18n';

import {GetEntryResponse, GetRelationsGraphResponse} from '../../../../../shared/schema';
import {Scope} from '../../../../constants';
import Utils from '../../../../utils';
import {YfmWrapperContent as YfmWrapper} from '../../../YfmWrapper/YfmWrapperContent';
import {EntriesGroup} from '../EntriesGroup';
import {EntryRow} from '../EntryRow';

import './Body.scss';

const b = block('dl-migrate-to-workbook-dialog-body');

const i18n = I18n.keyset('component.migrate-to-workbook-dialog');

export type BodyProps = {
    targetEntry: GetEntryResponse;
    relationsGraph: GetRelationsGraphResponse;
};

export const Body: React.FC<BodyProps> = ({targetEntry, relationsGraph}) => {
    const groups = React.useMemo(() => {
        return {
            dashboards: relationsGraph.filter((entry) => entry.scope === Scope.Dash),
            charts: relationsGraph.filter((entry) => entry.scope === Scope.Widget),
            datasets: relationsGraph.filter((entry) => entry.scope === Scope.Dataset),
            connections: relationsGraph.filter((entry) => entry.scope === Scope.Connection),
        };
    }, [relationsGraph]);

    return (
        <div className={b()}>
            <Text variant="subheader-1">{i18n('label_current-entry')}</Text>
            <EntryRow
                className={b('target-entry')}
                entry={{
                    ...targetEntry,
                    name: Utils.getEntryNameFromKey(targetEntry.key),
                }}
            />
            <div className={b('alert')}>
                <Alert
                    theme="info"
                    message={<YfmWrapper content={i18n('md_label_copy-warning')} setByInnerHtml />}
                />
            </div>
            <div className={b('relations')}>
                <Text variant="subheader-1">{i18n('label_linked-objects')}</Text>
                <div className={b('relations-groups')}>
                    {groups.dashboards.length === 0 &&
                    groups.charts.length === 0 &&
                    groups.datasets.length === 0 &&
                    groups.connections.length === 0 ? (
                        <div>{i18n('label_no-linked-objects')}</div>
                    ) : (
                        <React.Fragment>
                            {groups.dashboards.length > 0 ? (
                                <EntriesGroup
                                    key="dashboards"
                                    className={b('relations-group')}
                                    title={i18n('label_dashboards')}
                                    entries={groups.dashboards}
                                />
                            ) : null}
                            {groups.charts.length > 0 ? (
                                <EntriesGroup
                                    key="charts"
                                    className={b('relations-group')}
                                    title={i18n('label_charts')}
                                    entries={groups.charts}
                                />
                            ) : null}
                            {groups.datasets.length > 0 ? (
                                <EntriesGroup
                                    key="datasets"
                                    className={b('relations-group')}
                                    title={i18n('label_datasets')}
                                    entries={groups.datasets}
                                />
                            ) : null}
                            {groups.connections.length > 0 ? (
                                <EntriesGroup
                                    key="connections"
                                    className={b('relations-group')}
                                    title={i18n('label_connections')}
                                    entries={groups.connections}
                                />
                            ) : null}
                        </React.Fragment>
                    )}
                </div>
            </div>
        </div>
    );
};
