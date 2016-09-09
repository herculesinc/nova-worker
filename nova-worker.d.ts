declare module "nova-worker" {

    // IMPORTS AND RE-EXPORTS
    // --------------------------------------------------------------------------------------------    
    import * as events from 'events';
    import * as nova from 'nova-base';

    export * from 'nova-base';

    // WORKER
    // --------------------------------------------------------------------------------------------
    export interface WorkerConfig {
        name            : string;
        queueService    : QueueService;        
        database        : nova.Database;
        cache?          : nova.Cache;
        dispatcher?     : nova.Dispatcher;
        notifier?       : nova.Notifier;
        logger?         : nova.Logger;
        settings?       : any;
    }

    export interface Worker extends events.EventEmitter {
        name        : string;

        register<V,T>(queue: string, config: TaskHandlerConfig<V,T>);

        start() : void;
        stop()  : Promise<any>;

        on(event: 'error', callback: (error: Error) => void);
        on(event: 'lag', callback: (lag: number) => void);
    }

    // TASK HANDLER
    // --------------------------------------------------------------------------------------------
    export interface TaskHandlerConfig<V,T> {
        defaults?   : any;
        adapter?    : nova.ActionAdapter<V>;
        action      : nova.Action<V,T>;
        dao?        : nova.DaoOptions;
        retrieval?  : TaskRetrievalOptions;
    }

    export interface TaskRetrievalOptions {
        minInterval?: number;
        maxInterval?: number;
        maxRetries?	: number;
    }

    // QUEUE SERVICE
    // --------------------------------------------------------------------------------------------
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
        deleteMessage(message: QueueMessage, callback: (error?: Error) => void);
    }

    // LOAD CONTROLLER
    // --------------------------------------------------------------------------------------------
    export interface LoadControllerConfig {
        interval    : number;
        maxLag      : number;
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    export function createWorker(config: WorkerConfig): Worker;

    export function configure(setting: 'load controller', config: LoadControllerConfig);
}