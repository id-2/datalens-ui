export * from './connectors';
export * from './form';
export * from './mdb';
export * from './validation';

export const ConverterErrorCode = {
    FILE_LIMIT_EXCEEDED: 'ERR.FILE.FILE_LIMIT_EXCEEDED',
    INVALID_LINK: 'ERR.FILE.INVALID_LINK',
    NOT_FOUND: 'ERR.FILE.NOT_FOUND',
    NO_DATA: 'ERR.FILE.NO_DATA',
    PERMISSION_DENIED: 'ERR.FILE.PERMISSION_DENIED',
    TOO_MANY_COLUMNS: 'ERR.FILE.TOO_MANY_COLUMNS',
    UNSUPPORTED_DOCUMENT: 'ERR.FILE.UNSUPPORTED_DOCUMENT',
};
