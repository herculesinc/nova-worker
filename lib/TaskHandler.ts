// IMPORTS
// =================================================================================================
import { isError } from 'util';
import * as nova from 'nova-base';
import * as toobusy from 'toobusy-js';
import { WorkerError, TaskRetrievalOptions } from './util';

// MODULE VARIABLES
// =================================================================================================
const since = nova.util.since;

// ENUMS AND INTERFACES
// =================================================================================================
export interface HandlerOptions {
    dispatcher  : nova.Dispatcher;
    queue       : string;
    poisonQueue : string;
    retrieval   : TaskRetrievalOptions;
    executor    : nova.Executor<any,any>;
    logger      : nova.Logger;
    onerror     : (error: Error) => void;
}

const enum TaskHandlerStatus {
    stopped = 1, stopping, running
};

// CLASS DEFINITION
// =================================================================================================
export class TaskHandler {

    dispatcher  : nova.Dispatcher;
    queue       : string;
    retrieval   : TaskRetrievalOptions;
    poisonQueue : string;

    executor    : nova.Executor<any,any>;
    logger?     : nova.Logger;
    onerror     : (error: Error) => void;

    status      : TaskHandlerStatus;
    interval    : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(options: HandlerOptions) {

        this.dispatcher = options.dispatcher;
        this.queue = options.queue;
        this.poisonQueue = options.poisonQueue;
        this.retrieval = options.retrieval;

        this.executor = options.executor;
        this.logger = options.logger;
        this.onerror = options.onerror;

        this.status = TaskHandlerStatus.stopped;
        this.interval = this.retrieval.minInterval;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    start() {
        if (this.status === TaskHandlerStatus.running) {
            throw new TypeError('Cannot start a task handler: task handler is already running');
        }

        if (this.status === TaskHandlerStatus.stopping) {
            throw new TypeError('Cannot start a task handler: task handler hasn not stopped yet');
        }

        this.status = TaskHandlerStatus.running;
        this.setNextCheck(true);
    }

    stop(): Promise<void> {
        if (this.status === TaskHandlerStatus.stopped) {
            throw new TypeError('Cannot start a task handler: task handler is not running');
        }

        if (this.status === TaskHandlerStatus.stopping) {
            throw new TypeError('Cannot start a task handler: task handler hasn not stopped yet');
        }

        this.status = TaskHandlerStatus.stopping;
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (this.status === TaskHandlerStatus.stopped) {
                    resolve();
                }
                else {
                    setTimeout(() => {
                        if (this.status === TaskHandlerStatus.stopped) {
                            resolve();
                        }
                        else {
                            reject(new WorkerError(`Failed to stop a handler for '${this.queue}' queue`));
                        }
                    }, this.retrieval.maxInterval);
                }
            }, this.retrieval.maxInterval);
        }) as Promise<any>;
    }

    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    private checkQueue() {
        const start = process.hrtime();

        this.dispatcher.receiveMessage(this.queue, (error, message) => {

            if (error) {
                this.onerror(new WorkerError(`Failed to retrieve a task from '${this.queue}' queue`, error));
                return this.setNextCheck();
            }

            // if there are no messages in the queue, schedule the next check and return
            if (!message) {
                return this.setNextCheck();
            }

            this.logger && this.logger.debug(`Retrieved a task from '${this.queue}' queue`);

            // immediately check for the next message
            this.setNextCheck(true);

            // if the message has been retrieved too many times, deleted from the queue and add it to the poison queue
            if (message.received > this.retrieval.maxRetries) {
                this.logger && this.logger.debug(`Deleting a task from '${this.queue}' queue after ${message.received - 1} unsuccessful attempts`);
                return this.deleteMessage(message, true);
            }

            // execute the action, and remove the message from the queue if all went well
            this.executor.execute(message.payload).then(() => {
                this.deleteMessage(message);
                this.logger && this.logger.log('task completed', { queue: this.queue, time: since(start) });
            })
            .catch((error) => {
                this.onerror(new WorkerError(`Failed to process a task from '${this.queue}' queue`, error));
            });
        });
    }

	private setNextCheck(immediate = false) {

        if (this.status !== TaskHandlerStatus.running) {
            this.status = TaskHandlerStatus.stopped;
            return;
        }

        if (immediate && !toobusy()) {
            setImmediate(() => {
                this.checkQueue();
            });

            this.interval = this.retrieval.minInterval;
        }
        else {
            setTimeout(() => {	
                this.checkQueue(); 
            }, this.interval);

            this.interval = this.interval + this.interval;
            if (this.interval > this.retrieval.maxInterval) {
                this.interval = this.retrieval.maxInterval;
            }    
        }
	}

    private deleteMessage(message: nova.QueueMessage, moveToPoisonQueue = false) {
        this.dispatcher.deleteMessage(message, (error) => {
            if (error) {
                this.onerror(new WorkerError(`Failed to delete a task from '${this.queue}' queue`, error));
            }
            else {
                if (moveToPoisonQueue && this.poisonQueue) {
                    this.dispatcher.sendMessage(this.poisonQueue, { source: this.queue, payload: message.payload }, (error) => {
                        if (error) {
                            this.onerror(new WorkerError(`Failed to move a task from '${this.queue}' queue to poison queue`, error));
                        }
                    });
                }
                this.logger && this.logger.debug(`Deleted a task from '${this.queue}' queue`);
            }
        });
    }
}