import React from 'react';

import {FormRow} from '@gravity-ui/components';
import block from 'bem-cn-lite';
import {FieldWrapper} from 'components/FieldWrapper/FieldWrapper';
import {I18n} from 'i18n';
import {getSdk} from 'libs/schematic-sdk';
import {useDispatch, useSelector} from 'react-redux';
import {DATASET_FIELD_TYPES, DATASET_IGNORED_DATA_TYPES, Dataset, DatasetFieldType} from 'shared';
import {ENTRY_SCOPE} from 'units/dash/modules/constants';
import {
    SelectorElementType,
    SetSelectorDialogItemArgs,
    setLastUsedDatasetId,
    setSelectorDialogItem,
} from 'units/dash/store/actions/dashTyped';
import {selectSelectorDialog} from 'units/dash/store/selectors/dashTypedSelectors';

import DropdownNavigation from '../../../../../DropdownNavigation/DropdownNavigation';
import DatasetField from '../../../../Control/Switchers/DatasetField/DatasetField';
import {ELEMENT_TYPE} from '../../../../Control/constants';

import './DatasetSelector.scss';

const b = block('external-selector-wrapper');
const i18n = I18n.keyset('dash.control-dialog.edit');

function DatasetSelector() {
    const dispatch = useDispatch();
    const {datasetId, datasetFieldId, validation, isManualTitle, title, fieldType} =
        useSelector(selectSelectorDialog);

    const fetchDataset = React.useCallback((entryId: string) => {
        getSdk()
            .bi.getDatasetByVersion({
                datasetId: entryId,
                version: 'draft',
            })
            .then((dataset: Dataset) => {
                dispatch(
                    setSelectorDialogItem({
                        dataset,
                    }),
                );
            });
    }, []);

    React.useEffect(() => {
        if (datasetId) {
            fetchDataset(datasetId);
        }
    }, []);

    const handleDatasetChange = React.useCallback(
        (args: any) => {
            const entryId = args.entry.entryId as string;

            if (entryId !== datasetId) {
                dispatch(setLastUsedDatasetId(entryId));

                fetchDataset(entryId);

                dispatch(
                    setSelectorDialogItem({
                        datasetId: entryId,
                        datasetFieldId: undefined,
                        elementType: ELEMENT_TYPE.SELECT,
                        defaultValue: undefined,
                        useDefaultValue: false,
                    }),
                );
            }
        },
        [datasetId],
    );

    const handleDatasetFieldChange = React.useCallback(
        (data: {
            fieldId: string;
            fieldType: DATASET_FIELD_TYPES;
            fieldName: string;
            datasetFieldType: DatasetFieldType;
        }) => {
            let elementType: SelectorElementType = ELEMENT_TYPE.INPUT;

            if (datasetFieldId === data.fieldId && fieldType === data.fieldType) {
                return;
            }

            if (
                data.fieldType === DATASET_FIELD_TYPES.DATE ||
                data.fieldType === DATASET_FIELD_TYPES.DATETIME ||
                data.fieldType === DATASET_FIELD_TYPES.GENERICDATETIME
            ) {
                elementType = ELEMENT_TYPE.DATE;
            } else if (data.fieldType === DATASET_FIELD_TYPES.STRING) {
                elementType = ELEMENT_TYPE.SELECT;
            }

            if (data.datasetFieldType === DatasetFieldType.Measure) {
                elementType = ELEMENT_TYPE.INPUT;
            }

            const args: SetSelectorDialogItemArgs = {
                datasetFieldId: data.fieldId,
                elementType,
                fieldType: data.fieldType,
                datasetFieldType: data.datasetFieldType,
            };

            if (!isManualTitle || !title) {
                args.title = data.fieldName;
            }

            dispatch(setSelectorDialogItem(args));
        },
        [datasetFieldId, isManualTitle, title],
    );

    return (
        <React.Fragment>
            <FormRow label={i18n('field_dataset')}>
                <div className={b('droplist')}>
                    <DropdownNavigation
                        //@ts-ignore
                        size="m"
                        //@ts-ignore
                        entryId={datasetId}
                        //@ts-ignore
                        scope={ENTRY_SCOPE.DATASET}
                        //@ts-ignore
                        onClick={handleDatasetChange}
                    />
                </div>
            </FormRow>
            <FormRow label={i18n('field_field')}>
                <FieldWrapper error={validation.datasetFieldId}>
                    <DatasetField
                        ignoredFieldTypes={[]}
                        ignoredDataTypes={DATASET_IGNORED_DATA_TYPES}
                        datasetId={datasetId}
                        fieldId={datasetFieldId}
                        onChange={handleDatasetFieldChange}
                    />
                </FieldWrapper>
            </FormRow>
        </React.Fragment>
    );
}

export {DatasetSelector};
