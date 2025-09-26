import { paymentService } from '../services/paymentService';
import { PaymentMethod, PaymentStatus } from '../types';
import { db } from '../utils/database';

// Mock the database
jest.mock('../utils/database', () => ({
    db: {
        query: jest.fn(),
        transaction: jest.fn()
    }
}));

describe('PaymentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createPayment', () => {
        it('should create a new payment with idempotency', async () => {
            const paymentData = {
                product_id: 'product-1',
                payment_method: PaymentMethod.CREDIT_CARD,
                user_id: 'user-1',
                idempotency_key: 'key-123'
            };

            const mockProduct = {
                id: 'product-1',
                price: 99.99,
                stock_level: 10
            };

            const mockPayment = {
                id: 'payment-1',
                amount: 99.99,
                status: PaymentStatus.INITIALIZED,
                ...paymentData,
                created_at: new Date(),
                updated_at: new Date()
            };

            (db.transaction as jest.Mock).mockImplementation(async (callback) => {
                const mockClient = {
                    query: jest.fn()
                };

                // Mock idempotency check - no existing payment
                mockClient.query.mockResolvedValueOnce({ rows: [] });

                // Mock product lookup with FOR UPDATE
                mockClient.query.mockResolvedValueOnce({ rows: [mockProduct] });

                // Mock stock update
                mockClient.query.mockResolvedValueOnce({ rows: [{ ...mockProduct, stock_level: mockProduct.stock_level - 1 }] });

                // Mock payment creation
                mockClient.query.mockResolvedValueOnce({ rows: [mockPayment] });

                return await callback(mockClient);
            });

            const result = await paymentService.createPayment(paymentData);

            expect(result.status).toBe(PaymentStatus.INITIALIZED);
            expect(result.amount).toBe(99.99);
        });

        it('should return existing payment if idempotency key exists', async () => {
            const paymentData = {
                product_id: 'product-1',
                payment_method: PaymentMethod.CREDIT_CARD,
                user_id: 'user-1',
                idempotency_key: 'key-123'
            };

            const existingPayment = {
                id: 'payment-1',
                amount: 99.99,
                status: PaymentStatus.INITIALIZED,
                ...paymentData,
                created_at: new Date(),
                updated_at: new Date()
            };

            (db.transaction as jest.Mock).mockImplementation(async (callback) => {
                const mockClient = {
                    query: jest.fn()
                };

                // Mock idempotency check - existing payment found
                mockClient.query.mockResolvedValueOnce({ rows: [existingPayment] });

                return await callback(mockClient);
            });

            const result = await paymentService.createPayment(paymentData);

            expect(result.id).toBe('payment-1');
            expect(result.status).toBe(PaymentStatus.INITIALIZED);
        });
    });

    describe('updatePaymentStatus', () => {
        it('should update payment status with valid transition', async () => {
            const currentPayment = {
                id: 'payment-1',
                status: PaymentStatus.INITIALIZED
            };

            const updatedPayment = {
                ...currentPayment,
                status: PaymentStatus.USER_SET
            };

            (db.transaction as jest.Mock).mockImplementation(async (callback) => {
                const mockClient = {
                    query: jest.fn()
                };

                // Mock get current payment
                mockClient.query.mockResolvedValueOnce({ rows: [currentPayment] });

                // Mock update payment
                mockClient.query.mockResolvedValueOnce({ rows: [updatedPayment] });

                return await callback(mockClient);
            });

            const result = await paymentService.updatePaymentStatus('payment-1', {
                status: PaymentStatus.USER_SET
            });

            expect(result.status).toBe(PaymentStatus.USER_SET);
        });
    });

    describe('getTotalCompletedPayments', () => {
        it('should return total amount of completed payments', async () => {
            (db.query as jest.Mock).mockResolvedValue({
                rows: [{ total: '1500.00' }]
            });

            const result = await paymentService.getTotalCompletedPayments();

            expect(result).toBe(1500.00);
            expect(db.query).toHaveBeenCalledWith(
                'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = $1',
                [PaymentStatus.COMPLETE]
            );
        });
    });
});
