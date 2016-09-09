// IMPORTS
// =================================================================================================
import { ActionContext } from 'nova-base';
import { HelloWorldNotice } from './notices';

// HELLO WORLD
// =================================================================================================
interface HelloWorldInputs {
    author: string;
}

export function helloWorldAction(this: ActionContext, inputs: HelloWorldInputs): Promise<string> {
    this.register(new HelloWorldNotice("1", inputs.author));
    return Promise.resolve(inputs.author + ': Hello World!');
}