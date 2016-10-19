///<reference path="../typings/tsd.d.ts"/>
import { expect } from 'chai';
import * as sinon from 'sinon';

import { Worker, WorkerConfig } from '../lib/Worker'
import { Database, Dao, ActionContext, Dispatcher, QueueMessage } from 'nova-base';
import { MockDao } from './mocks/Database';
import { MockDispatcher } from './mocks/Dispatcher';
import { WorkerError } from '../lib/util';
import { createWorker } from './../index';

let dao: Dao;
let database: Database;
let options: WorkerConfig;
let worker: Worker;
let dispatcher: Dispatcher;
let action: any;
let minInterval: number;
let queueLength: number;
let queue: QueueMessage;
let queue1: QueueMessage;
let error: Error;
let errorHandler: any;
let queueMessages: QueueMessage[];

const queueName: string = 'testQueue';

describe('NOVA-WORKER -> Worker;', () => {

    before(() => {
        queueMessages = Array.apply(null, { length: 10 }).map((v, i) => {
            return {
                id      : String(i + 1),
                queue   : queueName,
                payload : {
                    id    : String(i + 1),
                    author: `user${i + 1}`
                },
                received: 0,
                sentOn  : Date.now()
            };
        });
    });

    describe('worker should check queue after start;', () => {
        before(done => {
            createAndStartWorker([], 200, done);

            worker.stop().then(done);
        });

        it('dispatcher.sendMessage should not be called', () => {
            expect((dispatcher.sendMessage as any).notCalled).to.be.true;
        });

        it('dispatcher.receiveMessage should be called once', () => {
            expect((dispatcher.receiveMessage as any).calledOnce).to.be.true;
        });

        it('dispatcher.deleteMessage should not be called', () => {
            expect((dispatcher.deleteMessage as any).notCalled).to.be.true;
        });

        it('action should not be called', () => {
            expect((action as any).notCalled).to.be.true;
        });
    });

    describe('worker should check queue each 200 ms 5 times;', () => {
        before(done => {
            createAndStartWorker([], 200, done);

            setTimeout(() => {
                worker.stop().then(done);
            }, minInterval * 4);
        });

        it('dispatcher.sendMessage should not be called', () => {
            expect((dispatcher.sendMessage as any).notCalled).to.be.true;
        });

        it('dispatcher.receiveMessage should be called 5 times', () => {
            expect((dispatcher.receiveMessage as any).callCount).to.equal(5);
        });

        it('dispatcher.deleteMessage should not be called', () => {
            expect((dispatcher.deleteMessage as any).notCalled).to.be.true;
        });

        it('action should not be called', () => {
            expect((action as any).notCalled).to.be.true;
        });
    });

    describe('worker should process initial queue one time;', () => {
        before(done => {
            queue = queueMessages[0];

            createAndStartWorker([queue], 100, done);

            setTimeout(() => {
                worker.stop().then(done);
            }, minInterval);
        });

        it('dispatcher.sendMessage should not be called', () => {
            expect((dispatcher.sendMessage as any).notCalled).to.be.true;
        });

        it('dispatcher.receiveMessage should be called', () => {
            expect((dispatcher.receiveMessage as any).called).to.be.true;
        });

        it('dispatcher.deleteMessage should be called once', () => {
            expect((dispatcher.deleteMessage as any).calledOnce).to.be.true;
        });

        it('action should be called once', () => {
            expect((action as any).calledOnce).to.be.true;
        });

        it('action should be called with expected inputs', () => {
            expect((action as any).calledWithExactly(queue.payload)).to.be.true;
        });
    });

    describe('worker should process an added queue one time;', () => {
        before(done => {
            queue = queueMessages.find(q => q && q.id === '2');

            createAndStartWorker([], 100, done);

            addQueue(minInterval, queue.payload);

            setTimeout(() => {
                worker.stop().then(done);
            }, minInterval * 4);
        });

        it('dispatcher.sendMessage should be called once', () => {
            expect((dispatcher.sendMessage as any).calledOnce).to.be.true;
        });

        it('dispatcher.receiveMessage should be called', () => {
            expect((dispatcher.receiveMessage as any).called).to.be.true;
        });

        it('dispatcher.deleteMessage should be called once', () => {
            expect((dispatcher.deleteMessage as any).calledOnce).to.be.true;
        });

        it('action should be called once', () => {
            expect((action as any).calledOnce).to.be.true;
        });

        it('action should be called with expected inputs', () => {
            expect((action as any).calledWithExactly(queue.payload)).to.be.true;
        });
    });

    describe('worker should process initial and added queue one time;', () => {
        before(done => {
            queue = queueMessages.find(q => q && q.id === '2');
            queue1 = queueMessages.find(q => q && q.id === '3');

            createAndStartWorker([queue], 100, done);

            addQueue(minInterval, queue1.payload);

            setTimeout(() => {
                worker.stop().then(done);
            }, minInterval * 4);
        });

        it('dispatcher.sendMessage should be called once', () => {
            expect((dispatcher.sendMessage as any).calledOnce).to.be.true;
        });

        it('dispatcher.receiveMessage should be called', () => {
            expect((dispatcher.receiveMessage as any).called).to.be.true;
        });

        it('dispatcher.deleteMessage should be called twice', () => {
            expect((dispatcher.deleteMessage as any).calledTwice).to.be.true;
        });

        it('action should be called twice', () => {
            expect((action as any).calledTwice).to.be.true;
        });

        it('action should be called first time with expected inputs', () => {
            expect((action as any).firstCall.calledWithExactly(queue.payload)).to.be.true;
        });

        it('action should be called second time with expected inputs', () => {
            expect((action as any).secondCall.calledWithExactly(queue1.payload)).to.be.true;
        });
    });

    describe('worker should process all initial queues without waiting;', () => {
        before(done => {
            let queues: QueueMessage[];

            queue = queueMessages.find(q => q && q.id === '1');
            queues = Array.apply(null, { length: 5 }).map(() => Object.assign({}, queue));

            createAndStartWorker(queues, 250, done);

            setTimeout(() => {
                worker.stop().then(done);
            }, minInterval);
        });

        it('dispatcher.sendMessage should not be called', () => {
            expect((dispatcher.sendMessage as any).notCalled).to.be.true;
        });

        it('dispatcher.receiveMessage should be called 5 times', () => {
            expect((dispatcher.receiveMessage as any).callCount).to.be.at.least(queueLength);
        });

        it('dispatcher.deleteMessage should be called more than 5 times', () => {
            expect((dispatcher.deleteMessage as any).callCount).to.equal(queueLength);
        });

        it('action should be called 5 times', () => {
            expect((action as any).callCount).to.equal(queueLength);
        });

        it('action should be called time with expected inputs', () => {
            expect((action as any).alwaysCalledWithExactly(queue.payload)).to.be.true;
        });
    });

    describe('worker should not process queue when it is stopped;', () => {
        before(done => {
            queue = queueMessages.find(q => q && q.id === '1');
            queue1 = queueMessages.find(q => q && q.id === '2');

            createAndStartWorker([queue, undefined, undefined, queue1], 200, done);

            setTimeout(() => {
                worker.stop().then(done);
            }, minInterval);
        });

        it('dispatcher.sendMessage should not be called', () => {
            expect((dispatcher.sendMessage as any).notCalled).to.be.true;
        });

        it('dispatcher.receiveMessage should be called', () => {
            expect((dispatcher.receiveMessage as any).called).to.be.true;
        });

        it('dispatcher.deleteMessage should be called once', () => {
            expect((dispatcher.deleteMessage as any).calledOnce).to.be.true;
        });

        it('action should be called once', () => {
            expect((action as any).calledOnce).to.be.true;
        });

        it('action should be called with expected inputs', () => {
            expect((action as any).calledWithExactly(queue.payload)).to.be.true;
        });

        it('action should not be called with unexpected inputs', () => {
            expect((action as any).neverCalledWith(queue1.payload)).to.be.true;
        });
    });

    describe('worker should emmit an error when action return an error;', () => {
        before(done => {
            minInterval = 500;
            queue = queueMessages.find(q => q && q.id === '1');
            queue1 = queueMessages.find(q => q && q.id === '2');

            dao = new MockDao({ startTransaction: true });
            database = { connect: sinon.stub().returns(Promise.resolve(dao)) };
            dispatcher = new MockDispatcher([queue, queue1]);
            queueLength = (dispatcher as any).messages.length;

            options = {
                name        : 'testQueuedispatcher',
                dispatcher  : dispatcher,
                database    : database
            };

            sinon.spy(dispatcher, 'sendMessage');
            sinon.spy(dispatcher, 'receiveMessage');
            sinon.spy(dispatcher, 'deleteMessage');

            worker = createWorker(options);

            action = function (this: ActionContext, inputs: any): Promise<any> {
                return inputs.id === '1' ? Promise.reject(inputs) : Promise.resolve(inputs);
            };

            errorHandler = function (err: Error): void {
                error = err;
            };

            action = sinon.spy(action);
            errorHandler = sinon.spy(errorHandler);

            worker.register(queueName, {
                action   : action,
                retrieval: {
                    minInterval: minInterval,
                    maxInterval: minInterval
                }
            });

            worker.on('lag', errorHandler);
            worker.on('error', errorHandler);

            worker.start();

            setTimeout(() => {
                worker.stop().then(done);
            }, minInterval);
        });

        it('dispatcher.sendMessage should not be called', () => {
            expect((dispatcher.sendMessage as any).notCalled).to.be.true;
        });

        it('dispatcher.receiveMessage should be called at least 2 times', () => {
            expect((dispatcher.receiveMessage as any).callCount).to.be.at.least(queueLength);
        });

        it('dispatcher.deleteMessage should be called twice', () => {
            expect((dispatcher.deleteMessage as any).calledTwice).to.be.true;
        });

        it('action should be called twice', () => {
            expect((action as any).calledTwice).to.be.true;
        });

        it('action should be called first time with expected inputs', () => {
            expect((action as any).firstCall.calledWithExactly(queue.payload)).to.be.true;
        });

        it('action should be called second time with expected inputs', () => {
            expect((action as any).secondCall.calledWithExactly(queue1.payload)).to.be.true;
        });

        it('errorHandler should be called once', () => {
            expect((errorHandler as any).calledOnce).to.be.true;
        });

        it('errorHandler should return WorkerError', () => {
            expect(error).to.be.instanceof(WorkerError);
        });

        it('errorHandler should return expected message', () => {
            expect(error.message).to.match(/^Failed to process a task from/);
        });
    });

    describe('worker should emmit an error when dispatcher.receiveMessage return an error;', () => {
        before(done => {
            minInterval = 200;
            queue = queueMessages.find(q => q && q.id === '1');
            queue1 = queueMessages.find(q => q && q.id === '2');

            dao = new MockDao({ startTransaction: true });
            database = { connect: sinon.stub().returns(Promise.resolve(dao)) };
            dispatcher = new MockDispatcher([queue1, queue]);
            queueLength = (dispatcher as any).messages.length;

            dispatcher.receiveMessage = function (queue: string, callback: (error: Error, message: QueueMessage) => void) {
                let msg = this.messages[0];
                if (msg) msg.received += 1;
                callback(msg.id === '2' ? new Error(): undefined, msg);
            };

            options = {
                name        : 'testQueuedispatcher',
                dispatcher  : dispatcher,
                database    : database
            };

            sinon.spy(dispatcher, 'sendMessage');
            sinon.spy(dispatcher, 'receiveMessage');
            sinon.spy(dispatcher, 'deleteMessage');

            worker = createWorker(options);

            action = function (this: ActionContext, inputs: any): Promise<any> {
                return Promise.resolve(inputs);
            };

            errorHandler = function (err: Error): void {
                error = err;
            };

            action = sinon.spy(action);
            errorHandler = sinon.spy(errorHandler);

            worker.register(queueName, {
                action   : action,
                retrieval: {
                    minInterval: minInterval,
                    maxInterval: minInterval
                }
            });

            worker.on('lag', errorHandler);
            worker.on('error', errorHandler);

            worker.start();

            setTimeout(() => {
                worker.stop().then(done);
            }, minInterval * 3);
        });

        it('dispatcher.sendMessage should not be called', () => {
            expect((dispatcher.sendMessage as any).notCalled).to.be.true;
        });

        it('dispatcher.receiveMessage should be called at least 2 times', () => {
            expect((dispatcher.receiveMessage as any).callCount).to.be.at.least(queueLength);
        });

        it('dispatcher.deleteMessage should not be called', () => {
            expect((dispatcher.deleteMessage as any).notCalled).to.be.true;
        });

        it('action should not be called', () => {
            expect((action as any).notCalled).to.be.true;
        });

        it('errorHandler should be called', () => {
            expect((errorHandler as any).called).to.be.true;
        });

        it('errorHandler should return WorkerError', () => {
            expect(error).to.be.instanceof(WorkerError);
        });

        it('errorHandler should return expected message', () => {
            expect(error.message).to.match(/^Failed to retrieve a task from/);
        });
    });
});

// helpers

function createAndStartWorker(messages: QueueMessage[], minInt: number, callback: (error: Error) => void) {
    minInterval = minInt;

    dao = new MockDao({ startTransaction: true });
    database = { connect: sinon.stub().returns(Promise.resolve(dao)) };
    dispatcher = new MockDispatcher(messages);
    queueLength = (dispatcher as any).messages.length;

    options = {
        name        : 'testQueuedispatcher',
        dispatcher  : dispatcher,
        database    : database
    };

    sinon.spy(dispatcher, 'sendMessage');
    sinon.spy(dispatcher, 'receiveMessage');
    sinon.spy(dispatcher, 'deleteMessage');

    worker = createWorker(options);

    action = function (this: ActionContext, inputs: string): Promise<any> {
        return Promise.resolve(inputs);
    };

    action = sinon.spy(action);

    worker.register(queueName, {
        action   : action,
        retrieval: {
            minInterval: minInt,
            maxInterval: minInt
        }
    });

    worker.on('lag', callback);

    worker.on('error', callback);

    worker.start();
}

function addQueue(timeout: number, data: any) {
    setTimeout(() => {
        dispatcher.sendMessage(queueName, data);
    }, timeout);
}