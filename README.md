# Checkout API

A comprehensive checkout API built with PostgreSQL, TypeScript, Node.js, and Swagger. This API manages products and payments with idempotency support, transaction handling, and robust concurrency management.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![Jest](https://img.shields.io/badge/Jest-323330?style=for-the-badge&logo=Jest&logoColor=white)](https://jestjs.io/)

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/aymangoloyal/checkout-api.git
cd checkout-api

# Install dependencies
npm install

# Set up database
npm run setup-db

# Start development server
npm run dev
```

**API Documentation**: http://localhost:3000/api-docs

## Features

- **Product Management**: CRUD operations for products with stock tracking
- **Payment Processing**: Complete payment lifecycle with status transitions
- **Idempotency**: Prevents duplicate payments using idempotency keys
- **Transaction Support**: Database transactions for data consistency
- **Status Validation**: Prevents invalid payment status transitions
- **Concurrency Handling**: Row-level locking prevents overselling and race conditions
- **Stock Management**: Automatic stock level tracking with atomic updates
- **Payment Cancellation**: Restore stock when payments are cancelled
- **Comprehensive API**: RESTful endpoints with full Swagger documentation
- **Error Handling**: Robust error handling and validation
- **TypeScript**: Full type safety throughout the application

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Language**: TypeScript
- **Documentation**: Swagger/OpenAPI 3.0
- **Validation**: Joi
- **Testing**: Jest

## API Endpoints

### Products
- `GET /api/v1/products` - Get all products
- `GET /api/v1/products/:id` - Get product by ID
- `POST /api/v1/products` - Create new product
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product

### Payments
- `GET /api/v1/payments` - Get all payments (with optional status filter)
- `GET /api/v1/payments/:id` - Get payment by ID
- `POST /api/v1/payments` - Create new payment (decreases stock)
- `PATCH /api/v1/payments/:id/status` - Update payment status
- `DELETE /api/v1/payments/:id/cancel` - Cancel payment (restores stock)
- `GET /api/v1/payments/total/completed` - Get total completed payments

## Payment Status Flow

1. **initialized** → **user_set**
2. **user_set** → **payment_processing**
3. **payment_processing** → **complete**

Invalid transitions are prevented by the API.

## Concurrency & Stock Management

### 🔒 **Row-Level Locking**
The API uses PostgreSQL's `SELECT ... FOR UPDATE` to prevent race conditions when multiple users attempt to purchase the same product simultaneously.

```sql
-- Lock product row to prevent concurrent access
SELECT id, name, price, stock_level FROM products WHERE id = $1 FOR UPDATE;

-- Atomically decrease stock level
UPDATE products SET stock_level = stock_level - 1, updated_at = CURRENT_TIMESTAMP 
WHERE id = $1 AND stock_level > 0 RETURNING *;
```

### 📦 **Stock Management Flow**

1. **Payment Creation**: Stock is decreased immediately when payment is initialized
2. **Concurrency Protection**: Row-level locking prevents overselling
3. **Payment Cancellation**: Stock is restored when payments are cancelled
4. **Atomic Operations**: All stock operations are wrapped in database transactions

### 🛡️ **Race Condition Prevention**

**Scenario**: Two users try to buy the last item of a product simultaneously

```
User A: Locks product → Checks stock (1) → Decreases stock → Creates payment ✅
User B: Waits for lock → Checks stock (0) → Payment fails with clear error ✅
```

**Result**: No overselling, accurate stock levels, clear error messages

### 🔄 **Payment Cancellation**

When a payment is cancelled (only `initialized` payments can be cancelled):
- Stock level is restored (+1)
- Payment record is deleted
- Transaction is rolled back atomically

### ⚡ **Performance Benefits**

- **Minimal Locking**: Only locks during critical operations
- **Efficient Queries**: Optimized database operations
- **High Concurrency**: Handles multiple simultaneous requests
- **Data Integrity**: Prevents overselling and data corruption

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd checkout-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your database credentials:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=checkout_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   PORT=3000
   NODE_ENV=development
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb checkout_db
   
   # Run schema
   psql -d checkout_db -f src/utils/schema.sql
   ```

5. **Build and run**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **API Base**: http://localhost:3000/api/v1

## Usage Examples

### Create a Product
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gaming Laptop",
    "description": "High-performance gaming laptop",
    "price": 1999.99,
    "stock_level": 25
  }'
```

### Create a Payment
```bash
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "product-uuid",
    "payment_method": "credit_card",
    "user_id": "user123",
    "idempotency_key": "payment-123-abc"
  }'
```

### Update Payment Status
```bash
curl -X PATCH http://localhost:3000/api/v1/payments/payment-uuid/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "user_set"
  }'
```

### Get Payments with Status Filter
```bash
# Get all payments
curl "http://localhost:3000/api/v1/payments"

# Get only initialized payments
curl "http://localhost:3000/api/v1/payments?status=initialized"

# Get only completed payments
curl "http://localhost:3000/api/v1/payments?status=complete"
```

### Cancel Payment
```bash
curl -X DELETE "http://localhost:3000/api/v1/payments/payment-uuid/cancel"
```

## Database Schema

### Products Table
- `id` (UUID, Primary Key)
- `name` (VARCHAR)
- `description` (TEXT)
- `price` (DECIMAL)
- `stock_level` (INTEGER)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Payments Table
- `id` (UUID, Primary Key)
- `amount` (DECIMAL)
- `status` (ENUM: initialized, user_set, payment_processing, complete)
- `product_id` (UUID, Foreign Key)
- `payment_method` (ENUM: credit_card, debit_card, paypal, bank_transfer)
- `user_id` (VARCHAR)
- `idempotency_key` (VARCHAR, Unique)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Key Features Explained

### Idempotency
The API uses idempotency keys to prevent duplicate payments. If a payment with the same idempotency key already exists, the existing payment is returned instead of creating a new one.

### Transaction Support
All payment operations are wrapped in database transactions to ensure data consistency. If any part of the operation fails, all changes are rolled back.

### Status Transitions
Payment status can only transition in the defined order:
- initialized → user_set
- user_set → payment_processing  
- payment_processing → complete

Invalid transitions are rejected with appropriate error messages.

### Concurrency Handling
The API prevents race conditions and overselling through:
- **Row-level locking** with `SELECT ... FOR UPDATE`
- **Atomic stock updates** with `WHERE stock_level > 0`
- **Transaction isolation** for data consistency
- **Clear error messages** when stock is depleted

### Stock Management
- **Automatic tracking**: Stock decreases when payment is created
- **Concurrency safe**: Prevents overselling with database locks
- **Restoration**: Stock is restored when payments are cancelled
- **Real-time accuracy**: Stock levels are always current

### Error Handling
Comprehensive error handling with:
- Input validation using Joi
- Database constraint validation
- Business logic validation
- Concurrency error detection
- Proper HTTP status codes
- Detailed error messages

## Error Scenarios

### Stock Depletion Error
```json
{
  "success": false,
  "error": "Product 'Gaming Laptop' is no longer available. Stock may have been depleted by another transaction. Please try again."
}
```

### Invalid Status Transition
```json
{
  "success": false,
  "error": "Invalid payment status transition from 'initialized' to 'complete'. Valid transitions from 'initialized' are: user_set. Please follow the correct payment flow."
}
```

### Payment Cancellation Error
```json
{
  "success": false,
  "error": "Payment with ID 'payment-123' cannot be cancelled. Only payments with status 'initialized' can be cancelled. Current status: 'user_set'."
}
```

## 🚀 Future Enhancements

### 👥 **User Management & Authentication**
- **User Registration & Login**: JWT-based authentication system
- **User Roles**: Admin, customer, and merchant roles with role-based access control
- **User Profiles**: Personal information, order history, and preferences

### 🔐 **Security Enhancements**
- **Rate Limiting**: Prevent API abuse and DDoS attacks
- **Input Sanitization**: Enhanced XSS and injection protection
- **CORS Configuration**: Proper cross-origin resource sharing
- **API Keys**: Secure API access management
- **Audit Logging**: Track all user actions and system events

### 🐳 **Deployment & DevOps**
- **Docker Compose**: Multi-container setup with PostgreSQL
- **CI/CD Pipeline**: Automated testing and deployment
- **Environment Management**: Development, staging, and production configs

### 🔧 **Technical Improvements**
- **Caching Layer**: Redis for improved performance
- **API Versioning**: Backward compatibility management
- **Monitoring**: Health checks and performance metrics
- **Logging**: Structured logging (Winston)


MIT License

## 👨‍💻 Author

**Ayman Abbas**
- GitHub: [@aymangoloyal](https://github.com/aymangoloyal)
- LinkedIn: [Ayman Abbas](https://linkedin.com/in/ayman-abbas92)