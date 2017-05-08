"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// =================================================================================================
const events = require("events");
const toobusy = require("toobusy-js");
const nova = require("nova-base");
const TaskHandler_1 = require("./TaskHandler");
const index_1 = require("./../index");
// MODULE VARIABLES
// =================================================================================================
const ERROR_EVENT = 'error';
const LAG_EVENT = 'lag';
// CLASS DEFINITION
// =================================================================================================
class Worker extends events.EventEmitter {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(options) {
        super();
        // make sure options are valid
        options = validateOptions(options);
        // initialize basic instance variables
        this.name = options.name;
        this.dispatcher = options.dispatcher;
        this.logger = options.logger;
        this.handlers = new Map();
        this.poisonQueue = options.poisonQueue;
        // initialize executor context
        this.context = {
            database: options.database,
            cache: options.cache,
            dispatcher: options.dispatcher,
            notifier: options.notifier,
            logger: options.logger,
            settings: options.settings
        };
        // set up lag handling
        toobusy.onLag((lag) => {
            this.emit(LAG_EVENT, lag);
        });
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    start() {
        for (let handler of this.handlers.values()) {
            handler.start();
        }
        this.logger && this.logger.log('worker started', { name: this.name });
    }
    stop() {
        const promises = [];
        for (let handler of this.handlers.values()) {
            promises.push(handler.stop());
        }
        return Promise.all(promises).then(() => {
            this.logger && this.logger.log('worker stopped', { name: this.name });
        });
    }
    register(queue, config) {
        // validate inputs
        if (!queue)
            throw new TypeError('Cannot register queue handler: queue is undefined');
        if (typeof queue !== 'string')
            throw new TypeError('Cannot register queue handler: queue must be a string');
        if (!config)
            throw new TypeError('Cannot register queue handler: handler configuration is undefined');
        if (this.handlers.has(queue))
            new TypeError(`Cannot register queue handler: a handler has already been registered for '${queue}' queue`);
        // build an executor
        const options = {
            daoOptions: config.dao,
            defaultInputs: config.defaults
        };
        const executor = new nova.Executor(this.context, config.action, config.adapter, options);
        // build and register the handler
        const handler = new TaskHandler_1.TaskHandler({
            dispatcher: this.dispatcher,
            queue: queue,
            poisonQueue: this.poisonQueue,
            retrieval: Object.assign({}, index_1.defaults.RETRIEVAL, config.retrieval),
            executor: executor,
            logger: this.logger,
            onerror: (error) => { this.emit(ERROR_EVENT, error); }
        });
        this.handlers.set(queue, handler);
    }
}
exports.Worker = Worker;
// HELPER FUNCTIONS
// =================================================================================================
function validateOptions(options) {
    if (!options)
        throw new TypeError('Cannot create a worker: options are undefined');
    options = Object.assign({}, options);
    if (!options.name)
        throw new TypeError('Cannot create a worker: name is undefined');
    if (typeof options.name !== 'string' || options.name.trim().length === 0)
        throw new TypeError('Cannot create a worker: name must be a non-empty string');
    if (!options.dispatcher)
        throw new TypeError('Cannot create a worker: dispatcher is undefined');
    return options;
}
//# sourceMappingURL=Worker.js.map