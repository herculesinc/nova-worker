// INTERFACES
// ================================================================================================
export interface QueueMessage {
    id      : string;
    queue   : string;
    payload : any;
    received: number;
    sentOn  : number;
}

export interface MessageOptions {
    delay?  : number;
    ttl?    : number;
}

// MESSAGES
// =================================================================================================
const messages: QueueMessage[] = [
    { id: '1', queue: 'testQueue', payload: { author: 'user1 '}, received: 0, sentOn: Date.now() },
    undefined,
    { id: '2', queue: 'testQueue', payload: { author: 'user1 '}, received: 0, sentOn: Date.now() },
    { id: '3', queue: 'testQueue', payload: { author: 'user1 '}, received: 0, sentOn: Date.now() },
    { id: '4', queue: 'testQueue', payload: { author: 'user1 '}, received: 0, sentOn: Date.now() },
    undefined,
    undefined,
    undefined,
    undefined,
    { id: '5', queue: 'testQueue', payload: { author: 'user1 '}, received: 0, sentOn: Date.now() },
    { id: '6', queue: 'testQueue', payload: { author: 'user1 '}, received: 0, sentOn: Date.now() },
    undefined,
    undefined,
    { id: '7', queue: 'testQueue', payload: { author: 'user1 '}, received: 0, sentOn: Date.now() },
    { id: '8', queue: 'testQueue', payload: { author: 'user1 '}, received: 0, sentOn: Date.now() }
];

// QUEUE SERVICE CLASS
// =================================================================================================
export class MockQueueService {

    messages: QueueMessage[];

    constructor() {
        this.messages = messages.slice();
    }

    sendMessage(queue: string, payload: any, options?: MessageOptions, callback?: (error: Error) => void) {
        console.log(`Sending message to '${queue}' queue`);
    }

    receiveMessage(queue: string, callback: (error: Error, message: QueueMessage) => void) {
        callback(undefined, this.messages.shift());
    }

    deleteMessage(message: QueueMessage, callback: (error?: Error) => void) {
        console.log(`Deleting a message from '${message.queue}' queue`);
        callback();
    }
}