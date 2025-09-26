import { CreateProductRequest, Product } from '../types';
import { db } from '../utils/database';

export class ProductService {
    /**
     * Get all products
     */
    async getAllProducts(): Promise<Product[]> {
        const result = await db.query(
            'SELECT * FROM products ORDER BY created_at DESC'
        );

        return result.rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            price: parseFloat(row.price),
            stock_level: row.stock_level,
            created_at: row.created_at,
            updated_at: row.updated_at
        }));
    }

    /**
     * Get product by ID
     */
    async getProductById(productId: string): Promise<Product | null> {
        const result = await db.query(
            'SELECT * FROM products WHERE id = $1',
            [productId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            price: parseFloat(row.price),
            stock_level: row.stock_level,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }

    /**
     * Create a new product
     */
    async createProduct(productData: CreateProductRequest): Promise<Product> {
        const result = await db.query(
            `INSERT INTO products (name, description, price, stock_level)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [productData.name, productData.description, productData.price, productData.stock_level]
        );

        const row = result.rows[0];
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            price: parseFloat(row.price),
            stock_level: row.stock_level,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }

    /**
     * Update product
     */
    async updateProduct(productId: string, productData: Partial<CreateProductRequest>): Promise<Product> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 0;

        if (productData.name !== undefined) {
            fields.push(`name = $${++paramCount}`);
            values.push(productData.name);
        }

        if (productData.description !== undefined) {
            fields.push(`description = $${++paramCount}`);
            values.push(productData.description);
        }

        if (productData.price !== undefined) {
            fields.push(`price = $${++paramCount}`);
            values.push(productData.price);
        }

        if (productData.stock_level !== undefined) {
            fields.push(`stock_level = $${++paramCount}`);
            values.push(productData.stock_level);
        }

        if (fields.length === 0) {
            throw new Error('No valid fields provided for update. Please provide at least one of: name, description, price, or stock_level.');
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(productId);

        const result = await db.query(
            `UPDATE products SET ${fields.join(', ')} WHERE id = $${++paramCount} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            throw new Error(`Product with ID '${productId}' not found. Please verify the product ID and try again.`);
        }

        const row = result.rows[0];
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            price: parseFloat(row.price),
            stock_level: row.stock_level,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }

    /**
     * Delete product
     */
    async deleteProduct(productId: string): Promise<boolean> {
        const result = await db.query(
            'DELETE FROM products WHERE id = $1',
            [productId]
        );

        return result.rowCount > 0;
    }

    /**
     * Update stock level
     */
    async updateStock(productId: string, newStockLevel: number): Promise<Product> {
        if (newStockLevel < 0) {
            throw new Error(`Invalid stock level: ${newStockLevel}. Stock level must be a non-negative number (0 or greater).`);
        }

        const result = await db.query(
            'UPDATE products SET stock_level = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [newStockLevel, productId]
        );

        if (result.rows.length === 0) {
            throw new Error(`Product with ID '${productId}' not found. Please verify the product ID and try again.`);
        }

        const row = result.rows[0];
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            price: parseFloat(row.price),
            stock_level: row.stock_level,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }
}

export const productService = new ProductService();
