export default function(data: any) {
    let log: any;

    try {
        log = typeof data === 'string' ? JSON.parse(data) : data;

        if (log.time) {
            log.time = new Date(log.time);
        }
    } catch (e) {
        log = {
            msg: data
        };
    }

    return log;
}