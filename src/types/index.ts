export enum PaymentStatus {
    INITIALIZED = 'initialized',
    USER_SET = 'user_set',
    PAYMENT_PROCESSING = 'payment_processing',
    COMPLETE = 'complete'
}

export enum PaymentMethod {
    CREDIT_CARD = 'credit_card',
    DEBIT_CARD = 'debit_card',
    PAYPAL = 'paypal',
    BANK_TRANSFER = 'bank_transfer'
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    stock_level: number;
    created_at: Date;
    updated_at: Date;
}

export interface Payment {
    id: string;
    amount: number;
    status: PaymentStatus;
    product_id: string;
    payment_method: PaymentMethod;
    user_id: string;
    idempotency_key: string;
    created_at: Date;
    updated_at: Date;
}

export interface CreateProductRequest {
    name: string;
    description: string;
    price: number;
    stock_level: number;
}

export interface CreatePaymentRequest {
    product_id: string;
    payment_method: PaymentMethod;
    user_id: string;
    idempotency_key: string;
}

export interface UpdatePaymentStatusRequest {
    status: PaymentStatus;
}

export interface PaymentWithProduct extends Payment {
    product: Product;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface PaymentFilters {
    status?: PaymentStatus;
    user_id?: string;
    product_id?: string;
}
