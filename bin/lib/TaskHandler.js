"use strict";
const nova = require("nova-base");
const toobusy = require("toobusy-js");
const util_1 = require("./util");
// MODULE VARIABLES
// =================================================================================================
const since = nova.util.since;
;
// CLASS DEFINITION
// =================================================================================================
class TaskHandler {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(options) {
        this.dispatcher = options.dispatcher;
        this.queue = options.queue;
        this.retrieval = options.retrieval;
        this.executor = options.executor;
        this.logger = options.logger;
        this.onerror = options.onerror;
        this.status = 1 /* stopped */;
        this.interval = this.retrieval.minInterval;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    start() {
        if (this.status === 3 /* running */) {
            throw new TypeError('Cannot start a task handler: task handler is already running');
        }
        if (this.status === 2 /* stopping */) {
            throw new TypeError('Cannot start a task handler: task handler hasn not stopped yet');
        }
        this.status = 3 /* running */;
        this.setNextCheck(true);
    }
    stop() {
        if (this.status === 1 /* stopped */) {
            throw new TypeError('Cannot start a task handler: task handler is not running');
        }
        if (this.status === 2 /* stopping */) {
            throw new TypeError('Cannot start a task handler: task handler hasn not stopped yet');
        }
        this.status = 2 /* stopping */;
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (this.status === 1 /* stopped */) {
                    resolve();
                }
                else {
                    setTimeout(() => {
                        if (this.status === 1 /* stopped */) {
                            resolve();
                        }
                        else {
                            reject(new util_1.WorkerError(`Failed to stop a handler for '${this.queue}' queue`));
                        }
                    }, this.retrieval.maxInterval);
                }
            }, this.retrieval.maxInterval);
        });
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    checkQueue() {
        const start = process.hrtime();
        this.dispatcher.receiveMessage(this.queue, (error, message) => {
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
        if (this.status !== 3 /* running */) {
            this.status = 1 /* stopped */;
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
    deleteMessage(message) {
        this.dispatcher.deleteMessage(message, (error) => {
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