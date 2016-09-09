// IMPORTS
// =================================================================================================
import { isError } from 'util';
import * as nova from 'nova-base';
import * as toobusy from 'toobusy-js';
import { QueueService, QueueMessage, WorkerError, TaskRetrievalOptions } from './util';

// MODULE VARIABLES
// =================================================================================================
const since = nova.util.since;

// INTERFACES
// =================================================================================================
export interface HandlerOptions {
    client          : QueueService;
    queue           : string;
    retrieval       : TaskRetrievalOptions;
    executor        : nova.Executor<any,any>;
    logger          : nova.Logger;
    onerror         : (error: Error) => void;
}

// CLASS DEFINITION
// =================================================================================================
export class TaskHandler {

    client          : QueueService;
    queue           : string;
    retrieval       : TaskRetrievalOptions;

    executor        : nova.Executor<any,any>;
    logger?         : nova.Logger;
    onerror         : (error: Error) => void;

    isRunning       : boolean;
    checkInterval   : number;
    checkScheduled  : boolean;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(options: HandlerOptions) {

        this.client = options.client;
        this.queue = options.queue;
        this.retrieval = options.retrieval;

        this.executor = options.executor;
        this.logger = options.logger;
        this.onerror = options.onerror;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    start() {
        this.isRunning = true;
        this.setNextCheck(true);
    }

    stop(): Promise<void> {
        this.isRunning = false;
        return Promise.resolve();
    }

    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    private checkQueue() {
        const start = process.hrtime();

        this.client.receiveMessage(this.queue, (error, message) => {

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

            // if the message has been retrieved too many times, just delete it
            if (message.received > this.retrieval.maxRetries) {
                this.logger && this.logger.debug(`Deleting a task from '${this.queue}' queue after ${message.received - 1} unsuccessful attempts`);
                return this.deleteMessage(message);
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

        if (immediate && !toobusy()) {
            setImmediate(() => {
                this.checkQueue();
            });

            this.checkInterval = this.retrieval.minInterval;
        }
        else {
            if (this.checkScheduled) return;
            this.checkScheduled = true;
            setTimeout(() => {	
                this.checkScheduled = false;
                this.checkQueue(); 
            }, this.checkInterval);

            this.checkInterval = this.checkInterval + this.checkInterval;
            if (this.checkInterval > this.retrieval.maxInterval) {
                this.checkInterval = this.retrieval.maxInterval;
            }    
        }
	}

    private deleteMessage(message: QueueMessage) {
        this.client.deleteMessage(message, (error) => {
            if (error) {
                this.onerror(new WorkerError(`Failed to delete a task from '${this.queue}' queue`, error));
            }
            else {
                this.logger && this.logger.debug(`Deleted a task from '${this.queue}' queue`);
            }
        });
    }
}