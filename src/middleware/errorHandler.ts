import { NextFunction, Request, Response } from 'express';

export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
    code?: string;
}

export class CustomError extends Error implements AppError {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        if ((Error as any).captureStackTrace) {
            (Error as any).captureStackTrace(this, this.constructor);
        }
    }
}

export const errorHandler = (
    error: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let { statusCode = 500, message } = error;

    // Handle specific error types
    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation error';
    } else if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
    } else if (error.code === '23505') { // PostgreSQL unique constraint violation
        statusCode = 409;
        message = 'Duplicate entry';
    } else if (error.code === '23503') { // PostgreSQL foreign key constraint violation
        statusCode = 400;
        message = 'Referenced record not found';
    } else if (error.code === '23502') { // PostgreSQL not null constraint violation
        statusCode = 400;
        message = 'Required field missing';
    }

    // Log error for debugging (always log stack trace to console, never send to client)
    console.error(`Error ${statusCode}: ${message}`, {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query
    });

    // Never include stack trace in HTTP response for security
    res.status(statusCode).json({
        success: false,
        error: message
    });
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    const error = new CustomError(`Route ${req.originalUrl} not found`, 404);
    next(error);
};

export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
