export default function(data: any) {
    let log: any;

    try {
        log = typeof data === 'string' ? JSON.parse(data) : data;

        if (log.time) {
            log.time = new Date(log.time);
        }
        if (log._id) {
            log.__id = log._id;
            delete log._id;
        }
    } catch (e) {
        log = {
            msg: data
        };
    }

    return log;
}