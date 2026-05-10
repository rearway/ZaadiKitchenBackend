export class BaseError extends Error {
    constructor(
        public readonly errorCode: string,
        public readonly statusCode: number,
        message: string,
        public readonly details?: any
    ) {
        super(message)
        this.name = this.constructor.name
    }
}
