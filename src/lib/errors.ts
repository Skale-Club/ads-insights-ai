export class ChatError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly retryable: boolean = false,
    ) {
        super(message);
        this.name = 'ChatError';
    }
}

export class NetworkError extends ChatError {
    constructor(message: string = 'Network error occurred') {
        super(message, 'NETWORK_ERROR', true);
    }
}

export class RateLimitError extends ChatError {
    constructor(
        message: string = 'Rate limit exceeded. Please wait before retrying.',
        public readonly retryAfter: number = 60
    ) {
        super(message, 'RATE_LIMIT', true);
        this.retryAfter = retryAfter;
    }
}

export class AuthenticationError extends ChatError {
    constructor(message: string = 'Authentication failed') {
        super(message, 'AUTH_ERROR', false);
    }
}

export class ValidationError extends ChatError {
    constructor(message: string) {
        super(message, 'VALIDATION_ERROR', false);
    }
}

export function isRetryableError(error: unknown): boolean {
    if (error instanceof ChatError) {
        return error.retryable;
    }
    return false;
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof ChatError) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unexpected error occurred';
}
