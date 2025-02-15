import {OutgoingHttpHeaders} from 'http';

import {AppMiddleware, AppRouteDescription, Request} from '@gravity-ui/expresskit';
import {HttpMethod} from '@gravity-ui/expresskit/dist/types';

import {MiddlewareSourceAdapterArgs, MiddlewareUrl} from '../../modes/charts/plugins/types';

import {Runner} from './runners';

export type TelemetryCallbacks = {
    onConfigFetched?: ({
        id,
        statusCode,
        requestId,
        latency,
    }: {
        id: string;
        statusCode: number;
        requestId?: string;
        latency?: number;
    }) => void;
    onConfigFetchingFailed?: (
        error: Error,
        {
            id,
            statusCode,
            requestId,
            latency,
        }: {id: string; statusCode: number; requestId?: string; latency?: number},
    ) => void;
    onDataFetched?: ({
        sourceName,
        url,
        requestId,
        statusCode,
        latency,
    }: {
        sourceName: string;
        url: string;
        requestId: string;
        statusCode: number;
        latency: number;
    }) => void;
    onDataFetchingFailed?: (
        error: Error,
        {
            sourceName,
            url,
            requestId,
            statusCode,
            latency,
        }: {
            sourceName: string;
            url: string;
            requestId: string;
            statusCode: number;
            latency: number;
        },
    ) => void;
    onCodeExecuted?: ({
        id,
        requestId,
        latency,
    }: {
        id: string;
        requestId: string;
        latency: number;
    }) => void;
};

export type Source = {
    url: string;
    method?: string;
    headers?: OutgoingHttpHeaders;
    cache?: string;
    statFormat?: string;
    format?: 'json' | 'form' | 'text' | string;
    middlewareUrl?: MiddlewareUrl;
    data?: string | Record<string, string>;
    hideInInspector?: boolean;
    ui: boolean;
};

export type SourceConfig = {
    description?: {
        title: {
            ru: string;
            en: string;
        };
    };
    tvmServiceName?: string;
    postprocess?: (data: unknown, requestOptions: unknown) => unknown;
    aliases?: Set<string>;
    useCaching?: boolean;
    uiEndpointFormatter?: (url: string, sourceData?: Source['data']) => string | null;
    uiEndpoint?: string;
    passedCredentials?: Record<string, boolean>;
    extraHeaders?: Record<string, string> | ((req: Request) => Record<string, string>);
    sourceType?: string;
    dataEndpoint?: string;
    preprocess?: (url: string) => string;
    allowedMethods?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

    adapter?: ({
        targetUri,
        sourceName,
        req,
    }: {
        targetUri: string;
        sourceName: string;
        source: Source;
        req: Request;
        fetchingStartTime: number;
    }) => Promise<unknown>;

    middlewareAdapter?: (args: MiddlewareSourceAdapterArgs) => Promise<any>;
    check?: (
        req: Request,
        targetUri: string,
        params: Request['body']['params'],
    ) => Promise<boolean>;

    args?: Record<string, string | number | (string | number)[]>;
    maxRedirects?: number;
};

export enum MiddlewareStage {
    BeforeAuth = 'beforeAuth',
    AfterAuth = 'afterAuth',
}

export type Middleware = {stage: MiddlewareStage; fn: AppMiddleware};
export interface PluginRoute {
    method: Uppercase<HttpMethod>;
    path: string;
    handler: AppRouteDescription['handler'];
    authPolicy?: AppRouteDescription['authPolicy'];
    validationConfig?: {
        [key: string]: any;
        query?: Object;
        params?: Object;
        body?: Object;
    };
}
export interface Plugin {
    middlewares?: Middleware[];
    sources?: Record<string, SourceConfig>;
    runners?: Runner[];
    processorHooks?: Record<string, any>[];
    routes?: PluginRoute[];
}
