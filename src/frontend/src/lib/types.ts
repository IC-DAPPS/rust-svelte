export interface Product {
    id: number;
    name: string;
    unit: string;
    description: string;
    price: number;
    imageUrl?: string;
}

export interface UserProfile {
    name: string;
    address: string;
    phone_number: string;
    order_ids: number[];
}

export interface OrderItem {
    product_id: number;
    quantity: number;
    price_per_unit_at_order: number;
}

export interface OrderItemInput {
    product_id: number;
    quantity: number;
}

export type OrderStatus =
    | { Pending: null }
    | { Processing: null }
    | { Confirmed: null }
    | { OutForDelivery: null }
    | { Delivered: null }
    | { Cancelled: null };

export interface Order {
    id: number;
    status: OrderStatus;
    total_amount: number;
    last_updated: number;
    user_phone_number: string;
    customer_name?: string;
    delivery_address: string;
    timestamp: number;
    items: OrderItem[];
} 