// QUEUE INTERFACES
// =================================================================================================
export interface QueueMessage {
    id          : string;
    payload     : any;
    received    : number;
    sentOn      : number;
}

export interface MessageOptions {
    delay?      : number;
    ttl?        : number;
}

export interface QueueService {
    sendMessage(queue: string, payload: any, options?: MessageOptions, callback?: (error: Error) => void);
    receiveMessage(queue: string, callback: (error: Error, message: QueueMessage) => void);
    deleteMessage(message: QueueMessage, callback: (error: Error) => void);
}