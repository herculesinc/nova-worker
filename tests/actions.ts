// IMPORTS
// =================================================================================================
import { ActionContext } from 'nova-base';
import { HelloWorldNotice } from './notices';

// HELLO WORLD
// =================================================================================================
interface HelloWorldInputs {
    id      : string;
    author  : string;
}

export function helloWorldAction(this: ActionContext, inputs: HelloWorldInputs): Promise<string> {
    this.register(new HelloWorldNotice(inputs.id, inputs.author));
    return new Promise(function (resolve, reject) {
        setTimeout(function() {
            resolve();
        }, 50);
    })
}