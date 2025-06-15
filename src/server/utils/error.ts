export class DomainError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly status: number,
      public readonly details?: object | string,
    ) {
      super(message);
      this.name = 'DomainError';
    }
  }
  
  export class NotFoundError extends DomainError {
    constructor(entity: string) {
      super(`${entity} not found`, 'NOT_FOUND', 404);
    }
  }
  
  export class ValidationError extends DomainError {
    constructor(details: object | string) {
      super('Invalid input', 'VALIDATION_ERROR', 400, details);
    }
  }
  
  export class AuthenticationError extends DomainError {
    constructor(message: string = 'Unauthorized') {
      super(message, 'AUTHENTICATION_ERROR', 401);
    }
  }
  
  export class DatabaseError extends DomainError {
    constructor(message: string = 'Database operation failed') {
      super(message, 'DATABASE_ERROR', 500);
    }
  }