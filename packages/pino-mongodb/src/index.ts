import { MongoClient, type MongoClientOptions } from 'mongodb';
import build from 'pino-abstract-transport';
import { Writable } from 'stream';
import log from './log.js';
import { createMessageQueue, type Options as QueueOptions } from './queue.js';

export type Options = {
    uri?: string;
    database?: string;
    collection?: string;
    unified?: boolean;
    clientOptions?: MongoClientOptions;
} & ({ queueOptions?: Omit<QueueOptions<unknown>, 'callback'>; } | { immediate: true})

export const defaultOption: Options = {
    uri: 'mongodb://localhost:27017/logs',
    collection: 'logs',
    unified: false,
    queueOptions: {
        cache: [],
        interval: 1000,
        maxMessages: 10
    }
};

const bulkTransport = async (opts: Options) => {

    const {
        uri,
        database: databaseName,
        collection: collectionName,
        clientOptions,
        queueOptions,
    } = { ...defaultOption, ...opts };

    const isImmediate = 'immediate' in opts && opts.immediate;

    if (!uri) throw new Error(`@efebia/pino-mongodb: URI_NOT_SPECIFIED`);
    if (!collectionName) throw new Error(`@efebia/pino-mongodb: COLLECTION_NAME_NOT_SPECIFIED`);


    const client = new MongoClient(uri, clientOptions);
    await client.connect();

    const db = client.db(databaseName);
    const collection = db.collection(collectionName);

    if (isImmediate) {
        return build(async (source) => {
            for await (let obj of source) {
                await collection.insertOne(log(obj), { forceServerObjectId: true }).catch((e) => {
                    if (e instanceof Error) {
                        console.error(e);
                    }
                })
            }
        }, {
            async close (_err) {
                await client.close();
            }
        });
    }

    const messageQueue = createMessageQueue({
        callback: (messages, errorCallback) => collection.bulkWrite(messages.map(e => ({
            insertOne: {
                document: log(e)
            }
        })), { forceServerObjectId: true }).catch((e) => {
            if (e instanceof Error) {
                errorCallback?.(e);
            }
        }),
        ...queueOptions
    });

    const stream = new Writable({
        objectMode: true,
        autoDestroy: true,
        write(chunk, encoding, callback) {
            messageQueue.push(chunk, callback);
        },
        destroy(err, cb) {
            client.close((closeErr) => {
                cb(err || closeErr || null);
            });
        }
    });


    return build((source) => {
        source.pipe(stream);
    }, {
        close (err, cb) {
            stream.end();
            stream.once('close', cb.bind(null, err));
        }
    });
};

export default bulkTransport;