use candid::{CandidType, Deserialize};
use serde::Serialize; // Added Serialize for potential future use, though not strictly needed for Candid only

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, Default)]
pub struct Product {
    pub id: u64, // This ID must match the index in the StableVec in store.rs
    pub name: String,
    pub description: String,
    pub price: f64,
    pub unit: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, Default)]
pub struct UserProfile {
    // Use Phone Number as the primary identifier, stored within the profile itself
    pub phone_number: String,
    // Making name and address mandatory for shipping/transaction context
    pub name: String,
    pub address: String,
    // Store order IDs for user's order history
    pub order_ids: Vec<u64>,
}

// --- Order Related Models ---

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct OrderItem {
    pub product_id: u64,
    pub quantity: f64, // Use f64 for quantity (e.g., 1.5 kg paneer, 0.5 litre milk)
    pub price_per_unit_at_order: f64, // Store the price at the time of order
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)] // Added PartialEq for status checks
pub enum OrderStatus {
    Pending,
    Confirmed,
    Processing, // e.g., Paneer being made
    OutForDelivery,
    Delivered,
    Cancelled,
}

// Default status for a new order
impl Default for OrderStatus {
    fn default() -> Self {
        OrderStatus::Pending
    }
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Order {
    pub id: u64,                   // Unique order ID
    pub user_phone_number: String, // Link to the user who placed the order
    pub items: Vec<OrderItem>,
    pub total_amount: f64, // Calculated total amount for the order
    pub status: OrderStatus,
    pub timestamp: u64, // Timestamp of when the order was created (nanoseconds since epoch)
    pub delivery_address: String, // Delivery address for this specific order
    pub last_updated: u64, // Optional: Timestamp of last status update
}
