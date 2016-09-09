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
export const queueMessages: QueueMessage[] = [
    { id: '1', queue: 'testQueue', payload: { id: '1', author: 'user1 '}, received: 0, sentOn: Date.now() },
    undefined,
    { id: '2', queue: 'testQueue', payload: { id: '2', author: 'user1 '}, received: 0, sentOn: Date.now() },
    { id: '3', queue: 'testQueue', payload: { id: '3', author: 'user1 '}, received: 0, sentOn: Date.now() },
    { id: '4', queue: 'testQueue', payload: { id: '4', author: 'user1 '}, received: 0, sentOn: Date.now() },
    undefined,
    undefined,
    undefined,
    undefined,
    { id: '5', queue: 'testQueue', payload: { id: '5', author: 'user1 '}, received: 0, sentOn: Date.now() },
    { id: '6', queue: 'testQueue', payload: { id: '6', author: 'user1 '}, received: 0, sentOn: Date.now() },
    undefined,
    undefined,
    { id: '7', queue: 'testQueue', payload: { id: '7', author: 'user1 '}, received: 0, sentOn: Date.now() },
    { id: '8', queue: 'testQueue', payload: { id: '8', author: 'user1 '}, received: 0, sentOn: Date.now() }
];

// QUEUE SERVICE CLASS
// =================================================================================================
export class MockQueueService {

    messages: QueueMessage[];

    constructor(messages = queueMessages) {
        this.messages = messages.slice();
    }

    sendMessage(queue: string, payload: any, options?: MessageOptions, callback?: (error: Error) => void) {
        this.messages.push({
            id: String(Date.now()),
            queue,
            payload,
            received: 0,
            sentOn: Date.now()
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