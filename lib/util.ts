// IMPORTS
// =================================================================================================
import { Exception } from 'nova-base';

// COMMON INTERFACES
// =================================================================================================
export interface TaskRetrievalOptions {
	minInterval?    : number;
	maxInterval?	: number;
	maxRetries?		: number;
}

// ERRORS
// =================================================================================================
export class WorkerError extends Exception {
    constructor(message: string, cause?: Error) {
        super({ message: message, cause: cause });
        this.name = "Worker Error";
    }
}