import { Request, Response, Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { validateCreateProduct, validateUUID } from '../middleware/validation';
import { productService } from '../services/productService';
import { ApiResponse } from '../types';

const router = Router();

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of all products
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
 *                     $ref: '#/components/schemas/Product'
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const products = await productService.getAllProducts();

    const response: ApiResponse<typeof products> = {
        success: true,
        data: products
    };

    res.json(response);
}));

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
router.get('/:id', validateUUID('id'), asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.getProductById(req.params.id!);

    if (!product) {
        return res.status(404).json({
            success: false,
            error: 'Product not found'
        });
    }

    const response: ApiResponse<typeof product> = {
        success: true,
        data: product
    };

    return res.json(response);
}));

/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductRequest'
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 */
router.post('/', validateCreateProduct, asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.createProduct(req.body);

    const response: ApiResponse<typeof product> = {
        success: true,
        data: product,
        message: 'Product created successfully'
    };

    res.status(201).json(response);
}));

/**
 * @swagger
 * /api/v1/products/{id}:
 *   put:
 *     summary: Update product
 *     tags: [Products]
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
 *             $ref: '#/components/schemas/CreateProductRequest'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
router.put('/:id', validateUUID('id'), validateCreateProduct, asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.updateProduct(req.params.id!, req.body);

    const response: ApiResponse<typeof product> = {
        success: true,
        data: product,
        message: 'Product updated successfully'
    };

    return res.json(response);
}));

/**
 * @swagger
 * /api/v1/products/{id}:
 *   delete:
 *     summary: Delete product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Product not found
 */
router.delete('/:id', validateUUID('id'), asyncHandler(async (req: Request, res: Response) => {
    const deleted = await productService.deleteProduct(req.params.id!);

    if (!deleted) {
        return res.status(404).json({
            success: false,
            error: 'Product not found'
        });
    }

    const response: ApiResponse<null> = {
        success: true,
        message: 'Product deleted successfully'
    };

    return res.json(response);
}));

export default router;
