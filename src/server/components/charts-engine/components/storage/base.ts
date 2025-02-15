import {Request} from '@gravity-ui/expresskit';
import {AppConfig, AppContext} from '@gravity-ui/nodekit';

import {TelemetryCallbacks} from '../../types';

import {ResolvedConfig} from './types';
import {EmbeddingInfo, USProvider} from './united-storage/provider';

const DEFAULT_PRELOAD_FETCHING_INTERVAL = 120e3;

type Config = AppConfig & {preloadList?: string[]};

export type ResolveConfigProps = {
    id?: string;
    embedToken?: string;
    key: string;
    headers: Request['headers'];
    unreleased?: boolean;
    noCache?: boolean;
    requestId?: string;
};

export type BaseStorageInitParams = {
    initialPreloadFetchingInterval?: number;
    initialOauthToken: string;
    config: {usEndpoint: string; requestIdHeaderName: string};
    telemetryCallbacks: {
        onConfigFetched?: TelemetryCallbacks['onConfigFetched'];
        onConfigFetchingFailed?: TelemetryCallbacks['onConfigFetchingFailed'];
    };
    flags: {alwaysUnreleased?: boolean};
};

export class BaseStorage {
    provider: typeof USProvider;
    requestIdHeaderName = '';
    preloadFetchingInterval?: number;
    oauthToken?: string;
    cachedConfigs: Record<string, ResolvedConfig> = {};
    flags: {alwaysUnreleased?: boolean | undefined} = {};
    telemetryCallbacks: {
        onConfigFetched?: TelemetryCallbacks['onConfigFetched'];
        onConfigFetchingFailed?: TelemetryCallbacks['onConfigFetchingFailed'];
    } = {};

    constructor(provider: typeof USProvider) {
        this.provider = provider;
    }

    init({
        initialPreloadFetchingInterval = DEFAULT_PRELOAD_FETCHING_INTERVAL,
        initialOauthToken,
        config,
        telemetryCallbacks,
        flags,
    }: BaseStorageInitParams) {
        this.preloadFetchingInterval = initialPreloadFetchingInterval;
        this.oauthToken = initialOauthToken;
        this.cachedConfigs = {};
        this.requestIdHeaderName = config.requestIdHeaderName;

        this.flags = flags;
        this.telemetryCallbacks = telemetryCallbacks;

        this.initProvider(config);
    }

    async refreshPreloaded(
        ctx: AppContext & {config: Config},
        callback: (configs: Record<string, ResolvedConfig>) => void,
    ) {
        ctx.log('STORAGE_REFRESHING_PRELOADED');
        const preloadList = ctx.config.preloadList || [];

        for (const key of preloadList) {
            await this.resolveConfig(ctx, {
                key,
                headers: {
                    authorization: `OAuth ${this.oauthToken}`,
                },
                noCache: true,
            })
                .then((config) => {
                    this.cachedConfigs[key] = config as unknown as ResolvedConfig;
                })
                .catch((error) => {
                    ctx.logError('Error preloading config', error, {
                        key,
                    });
                });
        }

        setTimeout(() => this.refreshPreloaded(ctx, callback), this.preloadFetchingInterval);
        callback(this.cachedConfigs);
    }

    initPreloading(ctx: AppContext, callback: (configs: Record<string, ResolvedConfig>) => void) {
        this.refreshPreloaded(ctx, callback).catch((error) => {
            ctx.logError('Error preloading configs', error);
        });
    }

    fetchConfig(
        ctx: AppContext,
        params: {
            id?: string;
            embedToken?: string;
            embedId?: string;
            key?: string;
            headers: Request['headers'];
            unreleased: boolean;
            requestId?: string;
        },
    ): Promise<ResolvedConfig | EmbeddingInfo> {
        const {headers, unreleased, requestId} = params;
        if (requestId) {
            headers[this.requestIdHeaderName] = requestId;
        }

        const usRetrieveArgs = {
            headers,
            unreleased: this.flags.alwaysUnreleased ? true : unreleased,
            includePermissionsInfo: true,
        };

        const onConfigFetched = this.telemetryCallbacks.onConfigFetched || (() => {});
        const onConfigFetchingFailed = this.telemetryCallbacks.onConfigFetchingFailed || (() => {});

        const startTime = new Date().getTime();

        let retrieve: Promise<ResolvedConfig | EmbeddingInfo>;
        let id: string;

        if (params.id) {
            retrieve = this.provider.retrieveById(ctx, {id: params.id, ...usRetrieveArgs});
            id = params.id;
        } else if (params.embedToken) {
            retrieve = this.provider.retrieveByToken(ctx, {
                token: params.embedToken,
                ...usRetrieveArgs,
            });
            id = params.embedId || 'wrongToken';
        } else if (params.key) {
            retrieve = this.provider.retrieveByKey(ctx, {key: params.key, ...usRetrieveArgs});
            id = params.key;
        } else {
            throw new Error('Wrong fetch config params');
        }

        return retrieve
            .then((result) => {
                onConfigFetched({
                    id,
                    requestId,
                    statusCode: 200,
                    latency: new Date().getTime() - startTime,
                });
                return result;
            })
            .catch((error) => {
                onConfigFetchingFailed(error, {
                    id,
                    requestId,
                    statusCode: error.status || error.statusCode,
                    latency: new Date().getTime() - startTime,
                });
                throw error;
            });
    }

    setPreloaded(preloaded: Record<string, ResolvedConfig>) {
        this.cachedConfigs = preloaded;
    }

    resolveConfig(ctx: AppContext, props: ResolveConfigProps) {
        const {
            id,
            key,
            embedToken,
            headers,
            unreleased = false,
            noCache = false,
            requestId,
        } = props;
        if (!noCache && !unreleased && this.cachedConfigs[key]) {
            ctx.log('STORAGE_CONF_PRELOAD_HIT', {key});
            return Promise.resolve(this.cachedConfigs[key]);
        }

        return this.fetchConfig(ctx, {
            id,
            key,
            embedToken,
            headers,
            unreleased,
            requestId,
        });
    }

    private initProvider(config: BaseStorageInitParams['config']) {
        this.provider.init({
            endpoint: config.usEndpoint,
            requestIdHeaderName: this.requestIdHeaderName,
        });
    }
}
