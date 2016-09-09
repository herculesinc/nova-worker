"use strict";
// IMPORTS
// =================================================================================================
const util_1 = require('util');
const toobusy = require('toobusy-js');
const index_1 = require('./../index');
// CLASS DEFINITION
// =================================================================================================
class TaskHandler {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(client, queue, options, executor) {
        this.client = client;
        this.queue = queue;
        this.options = index_1.defaults.RETRIEVAL;
        this.executor = executor;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    start() {
        this.isRunning = true;
        this.checkQueue();
    }
    stop() {
        this.isRunning = false;
        return Promise.resolve();
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    checkQueue() {
        // get message from queue
        this.client.receiveMessage(this.queue, (error, message) => {
            if (error) {
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
                    if (util_1.isError(inputs)) {
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
    setNextCheck(immediate = false) {
        if (immediate && !toobusy()) {
            setImmediate(() => {
                this.checkQueue();
            });
            this.checkInterval = this.options.minInterval;
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
            if (this.checkInterval > this.options.maxInterval) {
                this.checkInterval = this.options.maxInterval;
            }
        }
    }
}
exports.TaskHandler = TaskHandler;
// HELPER FUNCTIONS
// =================================================================================================
function parseMessagePayload(message) {
    try {
        return JSON.parse(message.payload);
    }
    catch (error) {
        return error;
    }
}
//# sourceMappingURL=TaskHandler.js.map