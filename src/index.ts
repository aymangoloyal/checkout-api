import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import paymentRoutes from './routes/paymentRoutes';
import productRoutes from './routes/productRoutes';
import { db } from './utils/database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Checkout API',
            version: '1.0.0',
            description: 'A simple checkout API with PostgreSQL, TypeScript, and Swagger'
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Development server'
            }
        ],
        components: {
            schemas: {
                Product: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Product unique identifier'
                        },
                        name: {
                            type: 'string',
                            description: 'Product name',
                            example: 'Laptop Pro'
                        },
                        description: {
                            type: 'string',
                            description: 'Product description',
                            example: 'High-performance laptop for professionals'
                        },
                        price: {
                            type: 'number',
                            format: 'decimal',
                            description: 'Product price',
                            example: 1299.99
                        },
                        stock_level: {
                            type: 'integer',
                            description: 'Available stock level',
                            example: 50
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Creation timestamp'
                        },
                        updated_at: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Last update timestamp'
                        }
                    }
                },
                Payment: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Payment unique identifier'
                        },
                        amount: {
                            type: 'number',
                            format: 'decimal',
                            description: 'Payment amount',
                            example: 1299.99
                        },
                        status: {
                            type: 'string',
                            enum: ['initialized', 'user_set', 'payment_processing', 'complete'],
                            description: 'Payment status'
                        },
                        product_id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Associated product ID'
                        },
                        payment_method: {
                            type: 'string',
                            enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer'],
                            description: 'Payment method'
                        },
                        user_id: {
                            type: 'string',
                            description: 'User identifier',
                            example: 'user123'
                        },
                        idempotency_key: {
                            type: 'string',
                            description: 'Idempotency key for duplicate prevention',
                            example: 'payment-123-abc'
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Creation timestamp'
                        },
                        updated_at: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Last update timestamp'
                        }
                    }
                },
                PaymentWithProduct: {
                    allOf: [
                        { $ref: '#/components/schemas/Payment' },
                        {
                            type: 'object',
                            properties: {
                                product: {
                                    $ref: '#/components/schemas/Product'
                                }
                            }
                        }
                    ]
                },
                CreateProductRequest: {
                    type: 'object',
                    required: ['name', 'price', 'stock_level'],
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Product name',
                            example: 'Laptop Pro'
                        },
                        description: {
                            type: 'string',
                            description: 'Product description',
                            example: 'High-performance laptop for professionals'
                        },
                        price: {
                            type: 'number',
                            format: 'decimal',
                            description: 'Product price',
                            example: 1299.99
                        },
                        stock_level: {
                            type: 'integer',
                            description: 'Available stock level',
                            example: 50
                        }
                    }
                },
                CreatePaymentRequest: {
                    type: 'object',
                    required: ['product_id', 'payment_method', 'user_id', 'idempotency_key'],
                    properties: {
                        product_id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Product ID to purchase',
                            example: '123e4567-e89b-12d3-a456-426614174000'
                        },
                        payment_method: {
                            type: 'string',
                            enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer'],
                            description: 'Payment method',
                            example: 'credit_card'
                        },
                        user_id: {
                            type: 'string',
                            description: 'User identifier',
                            example: 'user123'
                        },
                        idempotency_key: {
                            type: 'string',
                            description: 'Unique key to prevent duplicate payments',
                            example: 'payment-123-abc'
                        }
                    }
                },
                UpdatePaymentStatusRequest: {
                    type: 'object',
                    required: ['status'],
                    properties: {
                        status: {
                            type: 'string',
                            enum: ['initialized', 'user_set', 'payment_processing', 'complete'],
                            description: 'New payment status'
                        }
                    }
                },
                ApiResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            description: 'Indicates if the request was successful'
                        },
                        data: {
                            description: 'Response data'
                        },
                        error: {
                            type: 'string',
                            description: 'Error message if any'
                        },
                        message: {
                            type: 'string',
                            description: 'Success message'
                        }
                    }
                }
            }
        },
        tags: [
            {
                name: 'Products',
                description: 'Product management endpoints'
            },
            {
                name: 'Payments',
                description: 'Payment processing endpoints'
            }
        ]
    },
    apis: ['./src/routes/*.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Checkout API Documentation'
}));

// Health check endpoint
app.get('/health', (req: any, res: any) => {
    res.json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API routes
app.use(`/api/${API_VERSION}/products`, productRoutes);
app.use(`/api/${API_VERSION}/payments`, paymentRoutes);

// Root endpoint
app.get('/', (req: any, res: any) => {
    res.json({
        success: true,
        message: 'Checkout API',
        version: '1.0.0',
        documentation: '/api-docs',
        health: '/health'
    });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Graceful shutdown...');
    await db.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM. Graceful shutdown...');
    await db.close();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api/${API_VERSION}`);
});

export default app;
