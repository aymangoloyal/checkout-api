import {
    CreatePaymentRequest,
    Payment,
    PaymentStatus,
    PaymentWithProduct,
    UpdatePaymentStatusRequest
} from '../types';
import { db } from '../utils/database';

export class PaymentService {
    private static readonly VALID_STATUS_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
        [PaymentStatus.INITIALIZED]: [PaymentStatus.USER_SET],
        [PaymentStatus.USER_SET]: [PaymentStatus.PAYMENT_PROCESSING],
        [PaymentStatus.PAYMENT_PROCESSING]: [PaymentStatus.COMPLETE],
        [PaymentStatus.COMPLETE]: [] // No transitions from complete
    };

    /**
     * Create a new payment with idempotency support
     */
    async createPayment(paymentData: CreatePaymentRequest): Promise<Payment> {
        return await db.transaction(async (client) => {
            // Check if payment with same idempotency key already exists
            const existingPayment = await client.query(
                'SELECT * FROM payments WHERE idempotency_key = $1',
                [paymentData.idempotency_key]
            );

            if (existingPayment.rows.length > 0) {
                return existingPayment.rows[0] as Payment;
            }

            // Get product details with row lock to prevent race conditions
            const productResult = await client.query(
                'SELECT id, name, price, stock_level FROM products WHERE id = $1 FOR UPDATE',
                [paymentData.product_id]
            );

            if (productResult.rows.length === 0) {
                throw new Error(`Product with ID '${paymentData.product_id}' not found. Please verify the product ID and try again.`);
            }

            const product = productResult.rows[0];

            // Check stock availability
            if (product.stock_level <= 0) {
                throw new Error(`Product '${product.name || paymentData.product_id}' is currently out of stock (available: ${product.stock_level}). Please try again later or choose a different product.`);
            }

            // Decrease stock level and create payment atomically
            const updateStockResult = await client.query(
                'UPDATE products SET stock_level = stock_level - 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND stock_level > 0 RETURNING *',
                [paymentData.product_id]
            );

            if (updateStockResult.rows.length === 0) {
                throw new Error(`Product '${product.name || paymentData.product_id}' is no longer available. Stock may have been depleted by another transaction. Please try again.`);
            }

            // Create payment
            const result = await client.query(
                `INSERT INTO payments (amount, status, product_id, payment_method, user_id, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
                [
                    product.price,
                    PaymentStatus.INITIALIZED,
                    paymentData.product_id,
                    paymentData.payment_method,
                    paymentData.user_id,
                    paymentData.idempotency_key
                ]
            );

            return result.rows[0] as Payment;
        });
    }

    /**
     * Update payment status with validation
     */
    async updatePaymentStatus(paymentId: string, statusData: UpdatePaymentStatusRequest): Promise<Payment> {
        return await db.transaction(async (client) => {
            // Get current payment
            const currentPayment = await client.query(
                'SELECT * FROM payments WHERE id = $1',
                [paymentId]
            );

            if (currentPayment.rows.length === 0) {
                throw new Error(`Payment with ID '${paymentId}' not found. Please verify the payment ID and try again.`);
            }

            const currentStatus = currentPayment.rows[0].status as PaymentStatus;
            const newStatus = statusData.status;

            // Validate status transition
            if (!this.isValidStatusTransition(currentStatus, newStatus)) {
                const validTransitions = PaymentService.VALID_STATUS_TRANSITIONS[currentStatus];
                throw new Error(`Invalid payment status transition from '${currentStatus}' to '${newStatus}'. Valid transitions from '${currentStatus}' are: ${validTransitions.join(', ')}. Please follow the correct payment flow.`);
            }

            // Update payment status
            const result = await client.query(
                'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
                [newStatus, paymentId]
            );

            return result.rows[0] as Payment;
        });
    }

    /**
     * Get all payments with optional status filter
     */
    async getAllPayments(status?: PaymentStatus): Promise<PaymentWithProduct[]> {
        let query = `
            SELECT p.*, pr.name, pr.description, pr.price as product_price, pr.stock_level
            FROM payments p
            JOIN products pr ON p.product_id = pr.id
        `;

        const params: any[] = [];

        if (status) {
            query += ' WHERE p.status = $1';
            params.push(status);
        }

        query += ' ORDER BY p.created_at DESC';

        const result = await db.query(query, params);

        return result.rows.map((row: any) => ({
            id: row.id,
            amount: row.amount,
            status: row.status,
            product_id: row.product_id,
            payment_method: row.payment_method,
            user_id: row.user_id,
            idempotency_key: row.idempotency_key,
            created_at: row.created_at,
            updated_at: row.updated_at,
            product: {
                id: row.product_id,
                name: row.name,
                description: row.description,
                price: row.product_price,
                stock_level: row.stock_level,
                created_at: row.created_at,
                updated_at: row.updated_at
            }
        }));
    }

    /**
     * Get payment by ID
     */
    async getPaymentById(paymentId: string): Promise<PaymentWithProduct | null> {
        const result = await db.query(
            `SELECT p.*, pr.name, pr.description, pr.price as product_price, pr.stock_level
       FROM payments p
       JOIN products pr ON p.product_id = pr.id
       WHERE p.id = $1`,
            [paymentId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            id: row.id,
            amount: row.amount,
            status: row.status,
            product_id: row.product_id,
            payment_method: row.payment_method,
            user_id: row.user_id,
            idempotency_key: row.idempotency_key,
            created_at: row.created_at,
            updated_at: row.updated_at,
            product: {
                id: row.product_id,
                name: row.name,
                description: row.description,
                price: row.product_price,
                stock_level: row.stock_level,
                created_at: row.created_at,
                updated_at: row.updated_at
            }
        };
    }

    /**
     * Get total amount of all completed payments
     */
    async getTotalCompletedPayments(): Promise<number> {
        const result = await db.query(
            'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = $1',
            [PaymentStatus.COMPLETE]
        );

        return parseFloat(result.rows[0].total);
    }

    /**
     * Cancel a payment and restore stock
     */
    async cancelPayment(paymentId: string): Promise<Payment> {
        return await db.transaction(async (client) => {
            // Get payment details
            const paymentResult = await client.query(
                'SELECT * FROM payments WHERE id = $1',
                [paymentId]
            );

            if (paymentResult.rows.length === 0) {
                throw new Error(`Payment with ID '${paymentId}' not found. Please verify the payment ID and try again.`);
            }

            const payment = paymentResult.rows[0];

            // Only allow cancellation of initialized payments
            if (payment.status !== PaymentStatus.INITIALIZED) {
                throw new Error(`Payment with ID '${paymentId}' cannot be cancelled. Only payments with status 'initialized' can be cancelled. Current status: '${payment.status}'.`);
            }

            // Restore stock level
            await client.query(
                'UPDATE products SET stock_level = stock_level + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                [payment.product_id]
            );

            // Delete the payment
            await client.query(
                'DELETE FROM payments WHERE id = $1',
                [paymentId]
            );

            return payment as Payment;
        });
    }

    /**
     * Validate status transition
     */
    private isValidStatusTransition(currentStatus: PaymentStatus, newStatus: PaymentStatus): boolean {
        const validTransitions = PaymentService.VALID_STATUS_TRANSITIONS[currentStatus];
        return validTransitions.includes(newStatus);
    }
}

export const paymentService = new PaymentService();
