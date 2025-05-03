import { writable, derived } from 'svelte/store';
import type { Product } from '$lib/types';

export interface CartItem {
    product: Product;
    quantity: number;
}

function createCartStore() {
    const { subscribe, set, update } = writable<CartItem[]>([]);

    // Try to load cart from localStorage on initialization
    if (typeof window !== 'undefined') {
        const savedCart = localStorage.getItem('dairyCart');
        if (savedCart) {
            try {
                set(JSON.parse(savedCart));
            } catch (e) {
                console.error('Failed to parse saved cart', e);
            }
        }
    }

    // Helper to save to localStorage
    function saveToLocalStorage(items: CartItem[]) {
        if (typeof window !== 'undefined') {
            localStorage.setItem('dairyCart', JSON.stringify(items));
        }
    }

    return {
        subscribe,

        // Add an item to cart
        addItem: (product: Product, quantity: number) => {
            update(items => {
                // Check if product already in cart
                const existingItemIndex = items.findIndex(item => item.product.id === product.id);

                let updatedItems;
                if (existingItemIndex >= 0) {
                    // Update quantity of existing item
                    updatedItems = [...items];
                    updatedItems[existingItemIndex].quantity += quantity;
                } else {
                    // Add new item
                    updatedItems = [...items, { product, quantity }];
                }

                saveToLocalStorage(updatedItems);
                return updatedItems;
            });
        },

        // Update quantity of an item
        updateQuantity: (productId: number, quantity: number) => {
            update(items => {
                const updatedItems = items.map(item =>
                    item.product.id === productId
                        ? { ...item, quantity }
                        : item
                );
                saveToLocalStorage(updatedItems);
                return updatedItems;
            });
        },

        // Remove an item from cart
        removeItem: (productId: number) => {
            update(items => {
                const updatedItems = items.filter(item => item.product.id !== productId);
                saveToLocalStorage(updatedItems);
                return updatedItems;
            });
        },

        // Clear the entire cart
        clearCart: () => {
            set([]);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('dairyCart');
            }
        }
    };
}

// Create and export the cart store
export const cartStore = createCartStore();

// Derived stores for cart calculations
export const cartItemCount = derived(
    cartStore,
    $cart => $cart.reduce((total, item) => total + item.quantity, 0)
);

export const cartTotal = derived(
    cartStore,
    $cart => $cart.reduce(
        (total, item) => total + (item.product.price * item.quantity),
        0
    )
); 