// IMPORTS
// =================================================================================================
import { createWorker } from './../index';
import { MockDatabase } from './mocks/Database';
import { MockQueueService } from './mocks/QueueService';
import { MockNotifier } from './mocks/Notifier';
import { MockLogger } from './mocks/Logger';
import { helloWorldAction } from './actions';

// WORKER
// =================================================================================================
const worker = createWorker({
    name            : 'Test Worker',
    queueService    : new MockQueueService(),
    database        : new MockDatabase(),
    notifier        : new MockNotifier(),
    logger          : new MockLogger()
});

worker.register('testQueue', {
    action          : helloWorldAction
});

worker.on('lag', () => {
    console.log('Worker lag event fired');
});

worker.on('error', (error) => {
    console.log('Worker error event fired: ' + error.message);
});

worker.start();
setTimeout(function() {
    worker.stop();
}, 30 * 1000);