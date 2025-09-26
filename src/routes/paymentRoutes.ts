import { Request, Response, Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { validateCreatePayment, validatePaymentStatusFilter, validateUpdatePaymentStatus, validateUUID } from '../middleware/validation';
import { paymentService } from '../services/paymentService';
import { ApiResponse } from '../types';

const router = Router();

/**
 * @swagger
 * /api/v1/payments:
 *   get:
 *     summary: Get all payments with optional status filter
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [initialized, user_set, payment_processing, complete]
 *         description: Filter payments by status
 *     responses:
 *       200:
 *         description: List of payments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PaymentWithProduct'
 */
router.get('/', validatePaymentStatusFilter, asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as any;

    const payments = await paymentService.getAllPayments(status);

    const response: ApiResponse<typeof payments> = {
        success: true,
        data: payments
    };

    res.json(response);
}));

/**
 * @swagger
 * /api/v1/payments/{id}:
 *   get:
 *     summary: Get payment by ID
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Payment details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PaymentWithProduct'
 *       404:
 *         description: Payment not found
 */
router.get('/:id', validateUUID('id'), asyncHandler(async (req: Request, res: Response) => {
    const payment = await paymentService.getPaymentById(req.params.id!);

    if (!payment) {
        return res.status(404).json({
            success: false,
            error: 'Payment not found'
        });
    }

    const response: ApiResponse<typeof payment> = {
        success: true,
        data: payment
    };

    return res.json(response);
}));

/**
 * @swagger
 * /api/v1/payments:
 *   post:
 *     summary: Create a new payment
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentRequest'
 *     responses:
 *       201:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Validation error or business logic error
 */
router.post('/', validateCreatePayment, asyncHandler(async (req: Request, res: Response) => {
    const payment = await paymentService.createPayment(req.body);

    const response: ApiResponse<typeof payment> = {
        success: true,
        data: payment,
        message: 'Payment created successfully'
    };

    res.status(201).json(response);
}));

/**
 * @swagger
 * /api/v1/payments/{id}/status:
 *   patch:
 *     summary: Update payment status
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePaymentStatusRequest'
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Payment not found
 */
router.patch('/:id/status', validateUUID('id'), validateUpdatePaymentStatus, asyncHandler(async (req: Request, res: Response) => {
    const payment = await paymentService.updatePaymentStatus(req.params.id!, req.body);

    const response: ApiResponse<typeof payment> = {
        success: true,
        data: payment,
        message: 'Payment status updated successfully'
    };

    return res.json(response);
}));

/**
 * @swagger
 * /api/v1/payments/total/completed:
 *   get:
 *     summary: Get total amount of all completed payments
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Total amount of completed payments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       format: decimal
 */
router.get('/total/completed', asyncHandler(async (req: Request, res: Response) => {
    const total = await paymentService.getTotalCompletedPayments();

    const response: ApiResponse<{ total: number }> = {
        success: true,
        data: { total }
    };

    res.json(response);
}));

/**
 * @swagger
 * /api/v1/payments/{id}/cancel:
 *   delete:
 *     summary: Cancel a payment and restore stock
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Payment cancelled successfully and stock restored
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *                 message:
 *                   type: string
 *       400:
 *         description: Payment cannot be cancelled
 *       404:
 *         description: Payment not found
 */
router.delete('/:id/cancel', validateUUID('id'), asyncHandler(async (req: Request, res: Response) => {
    const payment = await paymentService.cancelPayment(req.params.id!);

    const response: ApiResponse<typeof payment> = {
        success: true,
        data: payment,
        message: 'Payment cancelled successfully and stock restored'
    };

    res.json(response);
}));

export default router;
