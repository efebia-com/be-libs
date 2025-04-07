export class FastifyZodReplyError extends Error {
    statusCode: number;
    constructor(message?: string, statusCode?: number) {
        super(message);
        this.statusCode = statusCode ?? -1;
    }
}