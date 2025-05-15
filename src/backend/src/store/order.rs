use candid::{Decode, Encode};
use ic_stable_structures::{storable::Bound, StableBTreeMap, StableCell, Storable};
use std::{borrow::Cow, cell::RefCell};

use super::memory::{Memory, MEMORY_MANAGER};
use crate::models::{Order, OrderStatus};

// Implement Storable for Order using Candid encoding
impl Storable for Order {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).expect("Failed to encode Order"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).expect("Failed to decode Order")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: super::MAX_ORDER_SIZE,
        is_fixed_size: false,
    };
}

// Thread-local order storage
thread_local! {
    // Order ID Counter
    static NEXT_ORDER_ID: RefCell<StableCell<u64, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(super::NEXT_ORDER_ID_MEM_ID)),
            0
        ).expect("Failed to init StableCell for NEXT_ORDER_ID")
    );

    // Orders: Map Order ID (u64) -> Order
    static ORDERS: RefCell<StableBTreeMap<u64, Order, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(super::ORDERS_MEM_ID))
        )
    );
}

/// Gets the next available order ID and increments the counter.
pub fn get_next_order_id() -> u64 {
    NEXT_ORDER_ID.with(|cell| {
        let current_id = *cell.borrow().get();
        cell.borrow_mut()
            .set(current_id + 1)
            .expect("Failed to increment order ID counter");
        current_id
    })
}

/// Adds a new order to the store. Assumes order.id is already set correctly.
pub fn add_order(order: Order) -> Result<(), String> {
    ORDERS.with(|orders| -> Result<(), String> {
        let key = order.id;
        // Insert the order and ignore previous value if it existed
        orders.borrow_mut().insert(key, order);
        Ok(())
    })
}

/// Retrieves an order by its ID.
pub fn get_order(order_id: u64) -> Option<Order> {
    ORDERS.with(|orders| orders.borrow().get(&order_id))
}

/// Retrieves all orders for a specific user (phone number).
pub fn get_orders_by_phone(phone_number: &String) -> Vec<Order> {
    ORDERS.with(|orders_map| {
        orders_map
            .borrow()
            .iter()
            .filter(|(_, order)| order.user_phone_number == *phone_number)
            .map(|(_, order)| order.clone())
            .collect()
    })
}

/// Updates the status of an existing order.
pub fn update_order_status(
    order_id: u64,
    status: OrderStatus,
    timestamp: u64,
) -> Result<Order, String> {
    ORDERS.with(|orders| -> Result<Order, String> {
        let mut order_map = orders.borrow_mut();
        match order_map.remove(&order_id) {
            Some(mut order) => {
                order.status = status;
                order.last_updated = timestamp;
                let updated_order = order.clone();

                // Insert the updated order back
                order_map.insert(order_id, order);
                Ok(updated_order)
            }
            None => Err(format!(
                "Order with ID {} not found for status update.",
                order_id
            )),
        }
    })
}

/// Retrieves all orders for admin panel.
pub fn get_all_orders() -> Vec<Order> {
    ORDERS.with(|orders_map| {
        orders_map
            .borrow()
            .iter()
            .map(|(_, order)| order.clone())
            .collect()
    })
}
