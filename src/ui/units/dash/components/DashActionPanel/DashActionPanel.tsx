import React from 'react';

import {ChevronsExpandUpRight, ListUl} from '@gravity-ui/icons';
import {Icon} from '@gravity-ui/uikit';
import block from 'bem-cn-lite';
import {History, Location} from 'history';
import {I18n} from 'i18n';
import {ResolveThunks, connect} from 'react-redux';
import {EntryUpdateMode, Feature} from 'shared';
import {ActionPanelEntryContextMenuQa} from 'shared/constants/qa/action-panel';
import {
    ActionPanel,
    DL,
    DatalensGlobalState,
    EntryDialogName,
    EntryDialogResolveStatus,
    EntryDialogues,
} from 'ui';
import {registry} from 'ui/registry';
import Utils from 'utils';

import {GetEntryResponse} from '../../../../../shared/schema';
import {getIsAsideHeaderEnabled} from '../../../../components/AsideHeaderAdapter';
import {
    EntryContextMenuItem,
    EntryContextMenuItems,
} from '../../../../components/EntryContextMenu/helpers';
import {isDraftVersion} from '../../../../components/Revisions/helpers';
import {RevisionEntry} from '../../../../components/Revisions/types';
import {ICONS_MENU_DEFAULT_SIZE} from '../../../../libs/DatalensChartkit/menu/MenuItems';
import navigateHelper from '../../../../libs/navigateHelper';
import {isEmbeddedMode} from '../../../../utils/embedded';
import {DIALOG_TYPE} from '../../containers/Dialogs/constants';
import {dispatchResize} from '../../modules/helpers';
import {purgeData} from '../../store/actions/dash';
import {
    saveDashAsDraft,
    saveDashAsNewDash,
    setActualDash,
    setDashViewMode,
    setPageDefaultTabItems,
    setPublishDraft,
} from '../../store/actions/dashTyped';
import {
    selectLoadingEditMode,
    selectRenameWithoutReload,
    selectStateMode,
} from '../../store/selectors/dashTypedSelectors';
import {DashEntry} from '../../typings/entry';

import {AddWidgetProps} from './AddWidget/AddWidget';
import {EditControls} from './EditControls/EditControls';
import {ViewControls} from './ViewControls/ViewControls';

import './DashActionPanel.scss';

const b = block('dash-action-panel');
const i18n = I18n.keyset('dash.action-panel.view');

type DispatchProps = ResolveThunks<typeof mapDispatchToProps>;

type StateProps = ReturnType<typeof mapStateToProps>;

type OwnProps = {
    entry: DashEntry;
    canEdit: boolean;
    isEditMode: boolean;
    isDraft: boolean;
    hasTableOfContent: boolean;
    history: History;
    location: Location;
    progress: boolean;
    handlerEditClick: () => void;
    openDialog: (dialogType: string) => void;
    toggleTableOfContent: () => void;
    toggleFullscreenMode: (args: {history: History; location: Location}) => void;
    onPasteWidget: AddWidgetProps['onPasteWidget'];
    entryDialoguesRef: React.RefObject<EntryDialogues>;
};

export type ActionPanelProps = OwnProps & StateProps & DispatchProps;

type ActionPanelState = {};

class DashActionPanel extends React.PureComponent<ActionPanelProps, ActionPanelState> {
    render() {
        const {entry, isEditMode} = this.props;
        const showHeader = !isEmbeddedMode();

        const DashSelectState = registry.dash.components.get('DashSelectState');

        return (
            <div className={b({editing: isEditMode})}>
                {showHeader && (
                    <React.Fragment>
                        <ActionPanel
                            entry={entry as GetEntryResponse}
                            additionalEntryItems={this.getAdditionalEntryItems()}
                            rightItems={[
                                <div className={b('controls')} key="controls">
                                    {this.renderControls()}
                                </div>,
                            ]}
                            enablePublish={Utils.isEnabledFeature(Feature.EnablePublishEntry)}
                            setActualVersion={this.handlerSetActualVersion}
                            isEditing={isEditMode}
                        />
                        {Boolean(DashSelectState) && <DashSelectState />}
                    </React.Fragment>
                )}
            </div>
        );
    }

    renderControls() {
        const {entry} = this.props;

        if (this.props.isSelectStateMode) {
            return null;
        }

        return this.props.isEditMode ? (
            <EditControls
                revId={this.props.dashEntry.entry?.revId}
                publishedId={this.props.dashEntry.entry?.publishedId}
                onSaveAndPublishDashClick={this.handlerSaveAndPublishDashClick}
                onSaveAsDraftDashClick={this.handlerSaveAsDraftDashClick}
                onSaveAsNewClick={this.handlerSaveAsNewClick}
                onCancelClick={this.handlerCancelEditClick}
                onOpenDialogSettingsClick={this.openDialogSettings}
                onOpenDialogConnectionsClick={this.openDialogConnections}
                onOpenDialogTabsClick={this.openDialogTabs}
                openDialog={this.props.openDialog}
                onPasteWidget={this.props.onPasteWidget}
                entryDialoguesRef={this.props.entryDialoguesRef}
                isDraft={this.props.isDraft}
                isRenameWithoutReload={this.props.isRenameWithoutReload}
                loading={this.props.progress || this.props.isLoadingEditMode}
            />
        ) : (
            <ViewControls
                canEdit={this.props.canEdit}
                progress={this.props.progress}
                isLoadingEditMode={this.props.isLoadingEditMode}
                onEditClick={this.props.handlerEditClick}
                onAccessClick={this.openDialogAccess}
                entryDialoguesRef={this.props.entryDialoguesRef}
                isWorkbook={Boolean(entry && entry.workbookId)}
            />
        );
    }

    openDialogSettings = () => this.props.openDialog(DIALOG_TYPE.SETTINGS);
    openDialogConnections = () => this.props.openDialog(DIALOG_TYPE.CONNECTIONS);
    openDialogTabs = () => this.props.openDialog(DIALOG_TYPE.TABS);

    openDialogAccess = () => {
        this.props.entryDialoguesRef.current?.open?.({
            dialog: EntryDialogName.Access,
            dialogProps: {
                entry: this.props.entry as GetEntryResponse,
            },
        });
    };

    handlerCancelEditClick = () => {
        this.props.setDashViewMode();
        this.props.setPageDefaultTabItems();
    };

    handlerSaveAsNewClick = async () => {
        if (this.props.entryDialoguesRef.current) {
            const {entry, data, lockToken} = this.props.dashEntry;

            const response = await this.props.entryDialoguesRef.current.open({
                dialog: EntryDialogName.SaveAsNew,
                dialogProps: {
                    entryData: {
                        data: purgeData(data),
                        lockToken,
                        mode: EntryUpdateMode.Publish,
                        meta: {is_release: true},
                    },
                    initDestination: Utils.getPathBefore({path: entry.key}),
                    initName: Utils.getEntryNameFromKey(entry.key, true),
                    onSaveAsNewCallback: this.props.saveDashAsNewDash,
                    workbookId: entry.workbookId,
                },
            });

            if (response.status === EntryDialogResolveStatus.Success && response.data) {
                // browser blockes events which are not triggered by users (event.isTrusted)
                // https://www.w3.org/TR/DOM-Level-3-Events/#trusted-events
                navigateHelper.open(response.data);
            }
        }
    };

    handlerSetActualVersion = () => {
        const isDraftEntry = isDraftVersion(this.props.entry as RevisionEntry);
        if (isDraftEntry) {
            this.props.setPublishDraft();
        } else if (this.props.entryDialoguesRef.current) {
            this.props.entryDialoguesRef.current.open({
                dialog: EntryDialogName.SetActualConfirm,
                dialogProps: {
                    onConfirm: this.props.setActualDash,
                },
            });
        }
    };

    handlerSaveAsDraftDashClick = () => {
        this.props.saveDashAsDraft();
    };

    handlerSaveAndPublishDashClick = () => {
        this.props.setActualDash();
    };

    private getAdditionalEntryItems() {
        const {canEdit, hasTableOfContent, dashEntry} = this.props;
        const {revId, publishedId} = dashEntry.entry;
        const isCurrentRevisionActual = revId === publishedId;

        const getSelectStateMenuItemFn = registry.common.functions.get('getSelectStateMenuItem');

        const selectStateMenuItem = getSelectStateMenuItemFn({
            action: this.onSelectStateClick,
            hidden: !canEdit || !isCurrentRevisionActual || DL.IS_MOBILE,
        });

        const items: EntryContextMenuItem[] = [
            {
                action: this.onValueTableOfContentsClick,
                text: i18n('value_table-of-content'),
                icon: <Icon data={ListUl} size={ICONS_MENU_DEFAULT_SIZE} />,
                qa: ActionPanelEntryContextMenuQa.TableOfContent,
                id: 'tableOfContent',
                hidden: !hasTableOfContent,
            },
            {
                action: this.onFullScreenClick,
                icon: <Icon data={ChevronsExpandUpRight} size={ICONS_MENU_DEFAULT_SIZE} />,
                id: 'fullscreen',
                text: i18n('value_fullscreen'),
                hidden: getIsAsideHeaderEnabled(),
            },
        ];
        if (selectStateMenuItem) {
            items.push(selectStateMenuItem);
        }
        return items.filter((item) => !item.hidden) as EntryContextMenuItems | [];
    }

    private onSelectStateClick = () => {
        this.props.openDialog(DIALOG_TYPE.SELECT_STATE);
    };

    private onValueTableOfContentsClick = () => {
        this.props.toggleTableOfContent();
    };

    private onFullScreenClick = () => {
        const {history, location} = this.props;
        this.props.toggleFullscreenMode({history, location});
        // triggers ReactGridLayout recalculating
        dispatchResize();
    };
}

const mapStateToProps = (state: DatalensGlobalState) => {
    return {
        dashEntry: state.dash,
        isLoadingEditMode: selectLoadingEditMode(state),
        isRenameWithoutReload: selectRenameWithoutReload(state),
        isSelectStateMode: selectStateMode(state),
    };
};

const mapDispatchToProps = {
    setActualDash,
    setPublishDraft,
    saveDashAsDraft,
    saveDashAsNewDash,
    setDashViewMode,
    setPageDefaultTabItems,
};

export default connect(mapStateToProps, mapDispatchToProps)(DashActionPanel);
