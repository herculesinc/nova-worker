// IMPORTS
// ================================================================================================
import * as toobusy from 'toobusy-js';
import { Worker, WorkerConfig } from './lib/Worker'

// INTERFACES
// ================================================================================================
export interface LoadControllerConfig {
    interval: number;
    maxLag  : number;
}

// MODULE VARIABLES
// =================================================================================================
export const defaults = {
    RETRIEVAL: {
        minInterval     : 100,
        maxInterval		: 3000,
        maxRetries		: 3
    }
};

// PUBLIC FUNCTIONS
// ================================================================================================
export function createWorker(options: WorkerConfig): Worker {
    const worker = new Worker(options);
    return worker;
}

export function configure(setting: 'load controller', config: LoadControllerConfig);
export function configure(setting: string, config: any) {
    if (!config) throw new TypeError('Config object must be provided');

    if (setting === 'load controller') {
        if (config.maxLag <= 0) throw new TypeError('Max lag must be > 0');
        if (config.interval <= 0) throw new TypeError('Interval must be > 0');

        toobusy.maxLag(config.maxLag);
        toobusy.interval(config.interval);
    }
}

// RE-EXPORTS
// =================================================================================================
export { validate, Exception, util } from 'nova-base';