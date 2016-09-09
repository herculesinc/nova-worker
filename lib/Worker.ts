// IMPORTS
// =================================================================================================
import * as events from 'events';
import * as toobusy from 'toobusy-js';
import * as nova from 'nova-base';
import { TaskHandler } from './TaskHandler';
import { QueueService } from './util';

// MODULE VARIABLES
// =================================================================================================
const ERROR_EVENT = 'error';
const LAG_EVENT = 'lag';

// INTERFACES
// =================================================================================================
export interface WorkerConfig {
    name            : string;
    queueService    : QueueService;
    database        : nova.Database;
    cache?          : nova.Cache;
    dispatcher?     : nova.Dispatcher;
    notifier?       : nova.Notifier;
    logger?         : nova.Logger;
    settings?       : any;
}

export interface TaskHandlerConfig<V,T> {
    defaults?       : any;
    adapter?        : nova.ActionAdapter<V>;
    action          : nova.Action<V,T>;
    dao?            : nova.DaoOptions;
}

// CLASS DEFINITION
// =================================================================================================
export class Worker extends events.EventEmitter {

    name        : string;
    client      : QueueService;
    logger      : nova.Logger;
    context     : nova.ExecutorContext;
    handlers    : Map<string, TaskHandler>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(options: WorkerConfig) {
        super();

        // make sure options are valid
        options = validateOptions(options);

        // initialize basic instance variables
        this.name = options.name;
        this.client = options.queueService;
        this.logger = options.logger;
        this.handlers = new Map();

        // initialize executor context
        this.context = {
            database        : options.database,
            cache           : options.cache,
            dispatcher      : options.dispatcher,
            notifier        : options.notifier,
            logger          : options.logger,
            settings        : options.settings
        };

        // set up lag handling
        toobusy.onLag((lag) => {
            this.emit(LAG_EVENT, lag);
        });
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    start(): void {
        for (let handler of this.handlers.values()) {
            handler.start();
        }

        this.logger && this.logger.log('worker started', { name: this.name });
    }

    stop(): Promise<any> {
        const promises = [];
        for (let handler of this.handlers.values()) {
            promises.push(handler.stop());
        }

        return Promise.all(promises).then(() => {
            this.logger && this.logger.log('worker stopped', { name: this.name });
        })
    }

    register<V,T>(queue: string, config: TaskHandlerConfig<V,T>) {

        const options: nova.ExecutionOptions = {
            daoOptions  : config.dao,
        };
        const executor = new nova.Executor(this.context, config.action, config.adapter, options);
        const handler = new TaskHandler(this.client, queue, undefined, executor);

        this.handlers.set(queue, handler);
    }
}

// HELPER FUNCTIONS
// =================================================================================================
function validateOptions(options: WorkerConfig): WorkerConfig {
    if (!options) throw new TypeError('Cannot create a worker: options are undefined');
    options = Object.assign({}, options);

    if (!options.name) throw new TypeError('Cannot create a worker: name is undefined');
    if (typeof options.name !== 'string' || options.name.trim().length === 0)
        throw new TypeError('Cannot create a worker: name must be a non-empty string');

    if (!options.queueService) throw new TypeError('Cannot create a worker: queue service is undefined');
    if (typeof options.queueService.sendMessage !== 'function')
        throw new TypeError('Cannot create a worker: queue service is invalid');
    if (typeof options.queueService.receiveMessage !== 'function')
        throw new TypeError('Cannot create a worker: queue service is invalid');
    if (typeof options.queueService.deleteMessage !== 'function')
        throw new TypeError('Cannot create a worker: queue service is invalid');

    return options;
}