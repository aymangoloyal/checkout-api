import { paymentService } from '../services/paymentService';
import { PaymentMethod } from '../types';
import { db } from '../utils/database';

// Mock the database
jest.mock('../utils/database', () => ({
    db: {
        query: jest.fn(),
        transaction: jest.fn()
    }
}));

describe('Concurrency Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Stock Level Concurrency', () => {
        it('should handle concurrent payment creation and prevent overselling', async () => {
            const productId = 'product-1';
            const mockProduct = {
                id: productId,
                name: 'Test Product',
                price: 99.99,
                stock_level: 1 // Only 1 item in stock
            };

            const mockPayment = {
                id: 'payment-1',
                amount: 99.99,
                status: 'initialized',
                product_id: productId,
                payment_method: PaymentMethod.CREDIT_CARD,
                user_id: 'user-1',
                idempotency_key: 'key-1',
                created_at: new Date(),
                updated_at: new Date()
            };

            // Mock the transaction to simulate concurrent access
            (db.transaction as jest.Mock).mockImplementation(async (callback) => {
                const mockClient = {
                    query: jest.fn()
                };

                // Mock idempotency check - no existing payment
                mockClient.query.mockResolvedValueOnce({ rows: [] });

                // Mock product selection with FOR UPDATE
                mockClient.query.mockResolvedValueOnce({ rows: [mockProduct] });

                // Mock stock update - succeeds
                mockClient.query.mockResolvedValueOnce({ rows: [{ ...mockProduct, stock_level: 0 }] });

                // Mock payment creation
                mockClient.query.mockResolvedValueOnce({ rows: [mockPayment] });

                return await callback(mockClient);
            });

            // First payment should succeed
            const payment1 = await paymentService.createPayment({
                product_id: productId,
                payment_method: PaymentMethod.CREDIT_CARD,
                user_id: 'user-1',
                idempotency_key: 'key-1'
            });

            expect(payment1.status).toBe('initialized');
            expect(payment1.id).toBe('payment-1');
        });

        it('should restore stock when payment is cancelled', async () => {
            const paymentId = 'payment-1';
            const productId = 'product-1';
            const mockPayment = {
                id: paymentId,
                amount: 99.99,
                status: 'initialized',
                product_id: productId,
                payment_method: PaymentMethod.CREDIT_CARD,
                user_id: 'user-1',
                idempotency_key: 'key-1',
                created_at: new Date(),
                updated_at: new Date()
            };

            (db.transaction as jest.Mock).mockImplementation(async (callback) => {
                const mockClient = {
                    query: jest.fn()
                };

                // Mock get payment
                mockClient.query.mockResolvedValueOnce({ rows: [mockPayment] });

                // Mock stock restoration
                mockClient.query.mockResolvedValueOnce({ rows: [] });

                // Mock payment deletion
                mockClient.query.mockResolvedValueOnce({ rows: [] });

                return await callback(mockClient);
            });

            const cancelledPayment = await paymentService.cancelPayment(paymentId);

            expect(cancelledPayment.id).toBe(paymentId);
            expect(cancelledPayment.status).toBe('initialized');
        });

        it('should not allow cancellation of non-initialized payments', async () => {
            const paymentId = 'payment-1';
            const mockPayment = {
                id: paymentId,
                status: 'user_set', // Not initialized
                product_id: 'product-1'
            };

            (db.transaction as jest.Mock).mockImplementation(async (callback) => {
                const mockClient = {
                    query: jest.fn()
                };

                // Mock get payment
                mockClient.query.mockResolvedValueOnce({ rows: [mockPayment] });

                return await callback(mockClient);
            });

            await expect(
                paymentService.cancelPayment(paymentId)
            ).rejects.toThrow('Payment with ID \'payment-1\' cannot be cancelled. Only payments with status \'initialized\' can be cancelled. Current status: \'user_set\'.');
        });
    });
});
