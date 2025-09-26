import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { PaymentMethod, PaymentStatus } from '../types';

export const validateCreateProduct = (req: Request, res: Response, next: NextFunction) => {
    const schema = Joi.object({
        name: Joi.string().min(1).max(255).required(),
        description: Joi.string().max(1000).optional(),
        price: Joi.number().positive().precision(2).required(),
        stock_level: Joi.number().integer().min(0).required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: 'Product validation failed',
            message: `Invalid product data: ${error.details[0]?.message}. Please check the required fields and their formats.`
        });
    }
    return next();
};

export const validateCreatePayment = (req: Request, res: Response, next: NextFunction) => {
    const schema = Joi.object({
        product_id: Joi.string().uuid().required(),
        payment_method: Joi.string().valid(...Object.values(PaymentMethod)).required(),
        user_id: Joi.string().min(1).max(255).required(),
        idempotency_key: Joi.string().min(1).max(255).required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: 'Payment validation failed',
            message: `Invalid payment data: ${error.details[0]?.message}. Please check the required fields and their formats.`
        });
    }
    return next();
};

export const validateUpdatePaymentStatus = (req: Request, res: Response, next: NextFunction) => {
    const schema = Joi.object({
        status: Joi.string().valid(...Object.values(PaymentStatus)).required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: 'Payment status validation failed',
            message: `Invalid payment status: ${error.details[0]?.message}. Valid statuses are: ${Object.values(PaymentStatus).join(', ')}.`
        });
    }
    return next();
};

export const validatePaymentStatusFilter = (req: Request, res: Response, next: NextFunction) => {
    const schema = Joi.object({
        status: Joi.string().valid(...Object.values(PaymentStatus)).optional()
    });

    const { error } = schema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            error: 'Status filter validation failed',
            message: `Invalid status filter: ${error.details[0]?.message}. Valid statuses are: ${Object.values(PaymentStatus).join(', ')}.`
        });
    }
    return next();
};

export const validateUUID = (paramName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const schema = Joi.string().uuid().required();
        const { error } = schema.validate(req.params[paramName]);

        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid ID format',
                message: `The ${paramName} '${req.params[paramName]}' is not a valid UUID format. Please provide a valid UUID.`
            });
        }
        return next();
    };
};
