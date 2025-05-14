export interface Product {
    id: number;
    name: string;
    unit: string;
    description: string;
    price: number;
}

export interface UserProfile {
    name: string;
    address: string;
    phone_number: string;
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
    delivery_address: string;
    timestamp: number;
    items: OrderItem[];
}

// Subscription Types
export interface SubscriptionItem {
    product_id: number;
    quantity: number;
}

export type SubscriptionStatus =
    | { Active: null }
    | { Paused: null }
    | { Cancelled: null };

export interface Subscription {
    id: number;
    user_phone_number: string;
    items: SubscriptionItem[];
    delivery_days: string[];
    delivery_time_slot: string;
    delivery_address: string;
    start_date: number;
    status: SubscriptionStatus;
    next_order_date: number;
    created_at: number;
    updated_at: number;
}

export interface CreateSubscriptionPayload {
    items: SubscriptionItem[];
    delivery_days: string[];
    delivery_time_slot: string;
    delivery_address: string;
    start_date: number;
}

export interface UpdateSubscriptionDetailsPayload {
    items?: SubscriptionItem[];
    delivery_days?: string[];
    delivery_time_slot?: string;
    delivery_address?: string;
} 