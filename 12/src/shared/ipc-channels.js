"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = void 0;
exports.IPC_CHANNELS = {
    ACCOUNT: {
        LIST: 'account:list',
        ADD: 'account:add',
        UPDATE: 'account:update',
        DELETE: 'account:delete',
        TEST: 'account:test',
        AUTO_DISCOVER: 'account:auto-discover'
    },
    FOLDER: {
        LIST: 'folder:list',
        SYNC: 'folder:sync',
        CREATE: 'folder:create',
        DELETE: 'folder:delete',
        RENAME: 'folder:rename'
    },
    EMAIL: {
        LIST: 'email:list',
        GET: 'email:get',
        GET_BY_THREAD: 'email:get-by-thread',
        SEND: 'email:send',
        SAVE_DRAFT: 'email:save-draft',
        UPDATE_FLAGS: 'email:update-flags',
        MOVE: 'email:move',
        COPY: 'email:copy',
        DELETE: 'email:delete',
        SYNC: 'email:sync',
        GET_THREADS: 'email:get-threads'
    },
    ATTACHMENT: {
        DOWNLOAD: 'attachment:download',
        OPEN: 'attachment:open',
        SAVE_AS: 'attachment:save-as'
    },
    SEARCH: {
        QUERY: 'search:query'
    },
    LABEL: {
        LIST: 'label:list',
        CREATE: 'label:create',
        UPDATE: 'label:update',
        DELETE: 'label:delete',
        APPLY: 'label:apply',
        REMOVE: 'label:remove'
    },
    FILTER: {
        LIST: 'filter:list',
        CREATE: 'filter:create',
        UPDATE: 'filter:update',
        DELETE: 'filter:delete',
        RUN: 'filter:run',
        TEST: 'filter:test'
    },
    SIGNATURE: {
        LIST: 'signature:list',
        CREATE: 'signature:create',
        UPDATE: 'signature:update',
        DELETE: 'signature:delete'
    },
    TEMPLATE: {
        LIST: 'template:list',
        CREATE: 'template:create',
        UPDATE: 'template:update',
        DELETE: 'template:delete'
    },
    GPG: {
        LIST_KEYS: 'gpg:list-keys',
        IMPORT_KEY: 'gpg:import-key',
        EXPORT_KEY: 'gpg:export-key',
        DELETE_KEY: 'gpg:delete-key',
        ENCRYPT: 'gpg:encrypt',
        DECRYPT: 'gpg:decrypt',
        SIGN: 'gpg:sign',
        VERIFY: 'gpg:verify'
    },
    BACKUP: {
        GET_SETTINGS: 'backup:get-settings',
        UPDATE_SETTINGS: 'backup:update-settings',
        START: 'backup:start',
        RESTORE: 'backup:restore',
        LIST_BACKUPS: 'backup:list-backups'
    },
    PLUGIN: {
        LIST: 'plugin:list',
        ENABLE: 'plugin:enable',
        DISABLE: 'plugin:disable',
        INSTALL: 'plugin:install',
        UNINSTALL: 'plugin:uninstall',
        RELOAD: 'plugin:reload',
        CALL: 'plugin:call'
    },
    SETTINGS: {
        GET: 'settings:get',
        UPDATE: 'settings:update'
    },
    APP: {
        QUIT: 'app:quit',
        RELOAD: 'app:reload',
        GET_VERSION: 'app:get-version'
    },
    SYNC: {
        STATUS: 'sync:status',
        START: 'sync:start',
        STOP: 'sync:stop',
        PROGRESS: 'sync:progress'
    }
};
