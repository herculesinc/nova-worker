// IMPORTS
// ================================================================================================
import { Dispatcher, QueueMessage, QueueMessageOptions } from 'nova-base';

// MESSAGES
// =================================================================================================
export const queueMessages: QueueMessage[] = [
    { id: '1', queue: 'testQueue', payload: { id: '1', author: 'user1 '}, received: 0, sentOn: Date.now(), expires: Date.now() + 10000 },
    undefined,
    { id: '2', queue: 'testQueue', payload: { id: '2', author: 'user1 '}, received: 0, sentOn: Date.now(), expires: Date.now() + 10000 },
    { id: '3', queue: 'testQueue', payload: { id: '3', author: 'user1 '}, received: 0, sentOn: Date.now(), expires: Date.now() + 10000 },
    { id: '4', queue: 'testQueue', payload: { id: '4', author: 'user1 '}, received: 0, sentOn: Date.now(), expires: Date.now() + 10000 },
    undefined,
    undefined,
    undefined,
    undefined,
    { id: '5', queue: 'testQueue', payload: { id: '5', author: 'user1 '}, received: 0, sentOn: Date.now(), expires: Date.now() + 10000 },
    { id: '6', queue: 'testQueue', payload: { id: '6', author: 'user1 '}, received: 0, sentOn: Date.now(), expires: Date.now() + 10000 },
    undefined,
    undefined,
    { id: '7', queue: 'testQueue', payload: { id: '7', author: 'user1 '}, received: 0, sentOn: Date.now(), expires: Date.now() + 10000 },
    { id: '8', queue: 'testQueue', payload: { id: '8', author: 'user1 '}, received: 0, sentOn: Date.now(), expires: Date.now() + 10000 }
];

// QUEUE SERVICE CLASS
// =================================================================================================
export class MockDispatcher {

    messages: QueueMessage[];

    constructor(messages = queueMessages) {
        this.messages = messages.slice();
    }

    sendMessage(queue: string, payload: any, options?: QueueMessageOptions, callback?: (error: Error) => void) {
        this.messages.push({
            id      : String(Date.now()),
            queue   : queue,
            payload : payload,
            received: 0,
            expires : Date.now() + 100000,
            sentOn  : Date.now()
        });
        // console.log(`Sending message to '${queue}' queue`);
    }

    receiveMessage(queue: string, callback: (error: Error, message: QueueMessage) => void) {
        let msg = this.messages[0];
        if (msg) msg.received += 1;
        callback(undefined, msg);
    }

    deleteMessage(message: QueueMessage, callback: (error?: Error) => void) {
        // console.log(`Deleting a message from '${message.queue}' queue`);
        this.messages.shift();
        callback();
    }
}