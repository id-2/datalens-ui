import {CommonSharedExtraSettings, ShapesConfig, Shared} from '../wizard/';
import {Field} from '../wizard/field';

export interface QLResultEntryMetadataDataGroup {
    group: boolean;
    undragable: boolean;
    name: string;
    capacity?: number;
    size: number;
    id?: string;
    allowedTypes?: string[];
    pseudo?: boolean;
}

export interface QLResultEntryMetadataDataColumn {
    // typeName -- legacy type that is incompatible with Field
    // How to turn on wizard ql common visualization -- you can delete
    typeName: string;

    // biType -- a new type compatible with Field and general visualization section
    biType?: string;

    name: string;
    id?: string;
    undragable?: boolean;
    pseudo?: boolean;
}

export interface QLParamInterval {
    from: string | undefined;
    to: string | undefined;
}

export interface QLParam {
    name: string;
    type: string;
    defaultValue: string | string[] | QLParamInterval | undefined;
    overridenValue?: string | string[] | QLParamInterval;
}

// Description of the request parameters.
export interface QLRequestParam {
    type_name: string;
    value: string | string[];
}

export interface QLResultEntryMetadataData {
    columns: QLResultEntryMetadataDataColumn[];
}

export type QLResultEntryMetadataDataColumnOrGroup =
    | QLResultEntryMetadataDataGroup
    | QLResultEntryMetadataDataColumn;

export interface QLEntryDataSharedConnection {
    entryId: string;
    type: string;
}

export enum QLChartType {
    Sql = 'sql',
    Promql = 'promql',
    Monitoringql = 'monitoringql',
}

export interface QLQuery {
    value: string;
    hidden?: boolean;
    params: QLParam[];
}

export interface QLEntryDataShared {
    // The type of template used to generate a chart at the ChartsEngine level, a low-level thing
    type: string;

    // Chart type should be selected in UI
    chartType: QLChartType;
    queryValue: string;
    queries: QLQuery[];
    extraSettings: CommonSharedExtraSettings;
    visualization: Shared['visualization'] & {highchartsId?: string};
    params: QLParam[];
    connection: QLEntryDataSharedConnection;
    order?: QLResultEntryMetadataDataColumnOrGroup[];
    preview?: boolean;

    colors?: Field[];
    colorsConfig?: any;
    labels?: Field[];
    tooltips?: Field[];
    shapes?: Field[];
    shapesConfig?: ShapesConfig;

    available?: Field[];
}

export interface QLPreviewTableDataColumn {
    name: string;
}

export interface QLPreviewTableDataRow {
    [key: string]: number | string | null;
}

export interface QLPreviewTableData {
    columns?: QLPreviewTableDataColumn[];
    data?: QLPreviewTableDataRow[];
}

export enum QLParamType {
    String = 'string',
    Number = 'number',
    Boolean = 'boolean',
    Date = 'date',
    Datetime = 'datetime',
    DateInterval = 'date-interval',
    DatetimeInterval = 'datetime-interval',
}
