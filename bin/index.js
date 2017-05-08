"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const toobusy = require("toobusy-js");
const Worker_1 = require("./lib/Worker");
// MODULE VARIABLES
// =================================================================================================
exports.defaults = {
    RETRIEVAL: {
        minInterval: 100,
        maxInterval: 3000,
        maxRetries: 3
    }
};
// PUBLIC FUNCTIONS
// ================================================================================================
function createWorker(options) {
    const worker = new Worker_1.Worker(options);
    return worker;
}
exports.createWorker = createWorker;
function configure(setting, config) {
    if (!config)
        throw new TypeError('Config object must be provided');
    if (setting === 'load controller') {
        if (config.maxLag <= 0)
            throw new TypeError('Max lag must be > 0');
        if (config.interval <= 0)
            throw new TypeError('Interval must be > 0');
        toobusy.maxLag(config.maxLag);
        toobusy.interval(config.interval);
    }
}
exports.configure = configure;
// RE-EXPORTS
// =================================================================================================
var nova_base_1 = require("nova-base");
exports.validate = nova_base_1.validate;
exports.Exception = nova_base_1.Exception;
exports.util = nova_base_1.util;
//# sourceMappingURL=index.js.map