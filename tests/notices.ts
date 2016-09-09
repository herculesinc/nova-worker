// IMPORTS
// =================================================================================================
import { Notice } from 'nova-base';

// HELLO WORLD
// =================================================================================================
export class HelloWorldNotice implements Notice {

    event = 'helloWorld'; 
    target  : string;
    payload : any;

    constructor(userId: string, author: string) {
        this.target = userId;
        this.payload = {
            author  : author
        };
    }

    merge(): HelloWorldNotice {
        return undefined;
    }
}