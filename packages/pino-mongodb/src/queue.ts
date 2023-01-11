import { AnyError } from 'mongodb';

type ErrorCallback = (error?: AnyError) => void;

export interface Options<TItem> {
    callback: (messages: TItem[], bufferCallback?: ErrorCallback) => any | Promise<any>;
    cache?: TItem[];
    interval?: number;
    maxMessages?: number;
}


export const createMessageQueue = <TItem>({ callback, cache = [], interval = 1000, maxMessages = 10 }: Options<TItem>) => {
    const sendMessages = (bufferCallback?: ErrorCallback) => {
        const messages = cache.splice(0, maxMessages);
        if (messages.length === 0) return;
        return callback(messages, bufferCallback);
    };
    
    const push = (message: TItem, bufferCallback: ErrorCallback) => {
        cache.push(message);
        if (cache.length === maxMessages) {
            sendMessages(bufferCallback);
        } else {
            bufferCallback();
        }

    };

    const intervalID = setInterval(sendMessages, interval);

    const stop = () => clearInterval(intervalID);


    return {
        push,
        stop
    };
};