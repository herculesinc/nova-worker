// IMPORTS
// =================================================================================================
import { isError } from 'util';
import * as nova from 'nova-base';
import * as toobusy from 'toobusy-js';
import { QueueService, QueueMessage } from './util';
import { defaults } from './../index';

// INTERFACES
// =================================================================================================
interface RetrievalOptions {
	minInterval?    : number;
	maxInterval?	: number;
	maxRetries?		: number;
}

// CLASS DEFINITION
// =================================================================================================
export class TaskHandler {

    client          : QueueService;
    queue           : string;

    options         : RetrievalOptions;
    executor        : nova.Executor<any,any>;

    isRunning       : boolean;
    checkInterval   : number;
    checkScheduled  : boolean;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(client: QueueService, queue: string, options: RetrievalOptions, executor: nova.Executor<any,any>) {

        this.client = client;
        this.queue = queue;

        this.options = defaults.RETRIEVAL;
        this.executor = executor;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    start() {
        this.isRunning = true;
        this.checkQueue();
    }

    stop(): Promise<void> {
        this.isRunning = false;
        return Promise.resolve();
    }

    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    private checkQueue() {
        
        // get message from queue
        this.client.receiveMessage(this.queue, (error, message) => {

            if (error) {
                // report error
            }

            if (!message) {
                this.setNextCheck();
            }
            else {
                this.setNextCheck(true);
                if (message.received > this.options.maxRetries) {
                    this.client.deleteMessage(message, (error) => {
                        // report an error
                    });
                }
                else {
                    const inputs = parseMessagePayload(message);
                    if (isError(inputs)) {
                        // delete message from queue
                        // report the error
                    }

                    this.executor.execute(inputs).then(() => {
                        // remove the message from the queue
                        this.client.deleteMessage(message, (error) => {
                            // report an error
                        });
                    })
                    .catch((error) => {
                        // report the error
                    });
                }
            }
        });
    }

	private setNextCheck(immediate = false) {

        if (immediate && !toobusy()) {
            setImmediate(() => {
                this.checkQueue();
            });

            this.checkInterval = this.options.minInterval;
        }
        else {
            if (this.checkScheduled) return;
            this.checkScheduled = true;
            setTimeout(() => {	
                this.checkScheduled = false;
                this.checkQueue(); 
            }, this.checkInterval);

            this.checkInterval = this.checkInterval + this.checkInterval;
            if (this.checkInterval > this.options.maxInterval) {
                this.checkInterval = this.options.maxInterval;
            }    
        }
	}
}

// HELPER FUNCTIONS
// =================================================================================================
function parseMessagePayload(message: QueueMessage): any {
    try {
        return JSON.parse(message.payload);
    }
    catch (error) {
        return error;
    }
}