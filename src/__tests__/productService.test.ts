import { productService } from '../services/productService';
import { db } from '../utils/database';

// Mock the database
jest.mock('../utils/database', () => ({
    db: {
        query: jest.fn()
    }
}));

describe('ProductService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllProducts', () => {
        it('should return all products', async () => {
            const mockProducts = [
                {
                    id: '1',
                    name: 'Test Product',
                    description: 'Test Description',
                    price: 99.99,
                    stock_level: 10,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ];

            (db.query as jest.Mock).mockResolvedValue({ rows: mockProducts });

            const result = await productService.getAllProducts();

            expect(result).toHaveLength(1);
            expect(result[0]?.name).toBe('Test Product');
            expect(db.query).toHaveBeenCalledWith(
                'SELECT * FROM products ORDER BY created_at DESC'
            );
        });
    });

    describe('getProductById', () => {
        it('should return product when found', async () => {
            const mockProduct = {
                id: '1',
                name: 'Test Product',
                description: 'Test Description',
                price: 99.99,
                stock_level: 10,
                created_at: new Date(),
                updated_at: new Date()
            };

            (db.query as jest.Mock).mockResolvedValue({ rows: [mockProduct] });

            const result = await productService.getProductById('1');

            expect(result).toBeDefined();
            expect(result?.name).toBe('Test Product');
        });

        it('should return null when product not found', async () => {
            (db.query as jest.Mock).mockResolvedValue({ rows: [] });

            const result = await productService.getProductById('1');

            expect(result).toBeNull();
        });
    });

    describe('createProduct', () => {
        it('should create a new product', async () => {
            const productData = {
                name: 'New Product',
                description: 'New Description',
                price: 149.99,
                stock_level: 5
            };

            const mockCreatedProduct = {
                id: '1',
                ...productData,
                created_at: new Date(),
                updated_at: new Date()
            };

            (db.query as jest.Mock).mockResolvedValue({ rows: [mockCreatedProduct] });

            const result = await productService.createProduct(productData);

            expect(result.name).toBe('New Product');
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO products'),
                [productData.name, productData.description, productData.price, productData.stock_level]
            );
        });
    });
});
