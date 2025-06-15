export class DomainError extends Error {
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = 'DomainError';
    }
}

export class NotFoundError extends DomainError {
    constructor(entity: string) {
        super(`${entity} not found`, 'NOT_FOUND');
    }
}