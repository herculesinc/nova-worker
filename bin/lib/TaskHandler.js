"use strict";
const nova = require('nova-base');
const toobusy = require('toobusy-js');
const util_1 = require('./util');
// MODULE VARIABLES
// =================================================================================================
const since = nova.util.since;
// CLASS DEFINITION
// =================================================================================================
class TaskHandler {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(options) {
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
    stop() {
        this.isRunning = false;
        return Promise.resolve();
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    checkQueue() {
        const start = process.hrtime();
        this.client.receiveMessage(this.queue, (error, message) => {
            if (error) {
                this.onerror(new util_1.WorkerError(`Failed to retrieve a task from '${this.queue}' queue`, error));
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
                this.onerror(new util_1.WorkerError(`Failed to process a task from '${this.queue}' queue`, error));
            });
        });
    }
    setNextCheck(immediate = false) {
        if (immediate && !toobusy()) {
            setImmediate(() => {
                this.checkQueue();
            });
            this.checkInterval = this.retrieval.minInterval;
        }
        else {
            if (this.checkScheduled)
                return;
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
    deleteMessage(message) {
        this.client.deleteMessage(message, (error) => {
            if (error) {
                this.onerror(new util_1.WorkerError(`Failed to delete a task from '${this.queue}' queue`, error));
            }
            else {
                this.logger && this.logger.debug(`Deleted a task from '${this.queue}' queue`);
            }
        });
    }
}
exports.TaskHandler = TaskHandler;
//# sourceMappingURL=TaskHandler.js.map