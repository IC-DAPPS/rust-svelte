#![allow(dead_code)]
#![warn(unused_variables)]

mod errors;
mod guard;
// mod handlers; // Assuming handlers might be removed or refactored
mod models;
mod store; // Now this refers to the store/ directory with mod.rs

use crate::{guard::*, models::*, store::*}; // Now importing from the refactored store
use candid::{CandidType, Deserialize, Principal}; // Added Deserialize
use errors::{GetUserDataError, OrderError}; // Assuming OrderError will be added
use ic_cdk::{api::time, query, update}; // Removed caller import
use std::collections::HashMap; // Needed for price lookup maybe

// === Product Endpoints ===

#[query]
fn get_products() -> Vec<Product> {
    store::get_all_products()
}

// Example product input for the add_product function
#[derive(candid::CandidType, serde::Deserialize)]
struct AddProductPayload {
    name: String,
    description: String,
    price: f64,
    unit: String,
}

// Only dev principal (specified in guard.rs) can add products
#[update(guard = "is_dev")]
fn add_product_admin(payload: AddProductPayload) -> Result<u64, String> {
    // The store::add_product function expects the ID to be set correctly.
    // Since we use the StableVec index as ID, we can temporarily set it to 0 or fetch the next ID.
    // Let's rely on the store function to return the correct ID (index).
    // Note: We're creating the product here. The ID field in the Product struct itself isn't
    // strictly necessary for adding to StableVec if we always use the index, but it's good practice
    // to potentially store it for consistency, especially if we retrieve it later.
    // The store::add_product currently calculates the ID based on vector length *before* push.

    let product_to_add = Product {
        id: 0, // This ID will be effectively ignored by store::add_product which uses the index
        name: payload.name,
        description: payload.description,
        price: payload.price,
        unit: payload.unit,
    };

    // We might want to update the product ID *after* adding it, based on the result,
    // but StableVec doesn't easily allow modifying elements in place without reading and writing back.
    // For now, we rely on the index being the ID.
    store::add_product(product_to_add)
}

// === User Profile Endpoints ===

#[query]
fn get_profile_by_phone(phone_number: String) -> Result<UserProfile, GetUserDataError> {
    match store::get_user_profile(&phone_number) {
        Some(profile) => Ok(profile),
        // Use DidntFindUserData when profile for the phone number is not found
        None => Err(GetUserDataError::DidntFindUserData),
    }
}

#[update]
fn update_profile(profile: UserProfile) -> Result<(), GetUserDataError> {
    // Basic validation: Ensure phone number is not empty
    if profile.phone_number.trim().is_empty() {
        // Consider adding a specific error variant for invalid input
        return Err(GetUserDataError::DidntFindUserData); // Reusing for now
    }
    // update_user_profile now returns Option<UserProfile> (the old profile, if any)
    // We can ignore the return value if we just want to confirm the update happened.
    store::update_user_profile(profile);
    Ok(())
}

// Optional: Add a dedicated create profile function
#[update]
fn create_profile(profile: UserProfile) -> Result<(), String> {
    if profile.phone_number.trim().is_empty()
        || profile.name.trim().is_empty()
        || profile.address.trim().is_empty()
    {
        return Err("Phone number, name, and address cannot be empty.".to_string());
    }
    // Check if profile already exists
    if store::get_user_profile(&profile.phone_number).is_some() {
        Err(format!(
            "Profile with phone number {} already exists.",
            profile.phone_number
        ))
    } else {
        // store::update_user_profile will insert if it doesn't exist
        store::update_user_profile(profile.clone()); // Use clone if profile is used later
        Ok(())
    }
}

// Optional: Add delete profile endpoint
#[update(guard = "is_dev")] // Example: Make deletion admin-only
fn delete_profile_admin(phone_number: String) -> Result<UserProfile, String> {
    if phone_number.trim().is_empty() {
        return Err("Phone number cannot be empty.".to_string());
    }
    match store::delete_user_profile(&phone_number) {
        Some(deleted_profile) => Ok(deleted_profile),
        None => Err(format!(
            "Profile with phone number {} not found.",
            phone_number
        )),
    }
}

// === Order Endpoints ===

// Input structure for creating an order item from frontend
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct OrderItemInput {
    pub product_id: u64,
    pub quantity: f64,
}

#[update]
fn create_order(
    phone_number: String,
    items_input: Vec<OrderItemInput>,
    delivery_address: String, // Use specific address for the order
) -> Result<u64, OrderError> {
    // 1. Validate inputs
    if phone_number.trim().is_empty()
        || items_input.is_empty()
        || delivery_address.trim().is_empty()
    {
        return Err(OrderError::InvalidInput(
            "Phone number, items, and delivery address cannot be empty".to_string(),
        ));
    }

    // 2. Check if user profile exists
    if store::get_user_profile(&phone_number).is_none() {
        return Err(OrderError::UserProfileNotFound);
    }

    // 3. Fetch current prices and validate products
    let mut order_items: Vec<OrderItem> = Vec::new();
    let mut total_amount: f64 = 0.0;

    for item_input in items_input {
        if item_input.quantity <= 0.0 {
            return Err(OrderError::InvalidInput(format!(
                "Invalid quantity {} for product ID {}",
                item_input.quantity, item_input.product_id
            )));
        }
        match store::get_product_by_id(item_input.product_id) {
            Some(product) => {
                let item_total = product.price * item_input.quantity;
                order_items.push(OrderItem {
                    product_id: item_input.product_id,
                    quantity: item_input.quantity,
                    price_per_unit_at_order: product.price, // Store current price
                });
                total_amount += item_total;
            }
            None => {
                return Err(OrderError::InvalidProductInOrder(item_input.product_id));
            }
        }
    }

    // 4. Generate Order ID
    let order_id = store::get_next_order_id();
    let timestamp = time(); // Get current IC time

    // 5. Create Order struct
    let order = Order {
        id: order_id,
        user_phone_number: phone_number,
        items: order_items,
        total_amount,
        status: OrderStatus::Pending, // Initial status
        timestamp,
        delivery_address,
        last_updated: timestamp, // Initially same as creation time
    };

    // 6. Save order
    match store::add_order(order) {
        Ok(_) => Ok(order_id),
        Err(e) => Err(OrderError::StorageError(format!(
            "Failed to save order: {}",
            e
        ))),
    }
}

#[query]    
fn get_my_orders(phone_number: String) -> Result<Vec<Order>, OrderError> {
    if phone_number.trim().is_empty() {
        return Err(OrderError::InvalidInput(
            "Phone number cannot be empty".to_string(),
        ));
    }
    // Optional: Check if user profile exists, though just returning empty vec is also fine
    // if store::get_user_profile(&phone_number).is_none() {
    //     return Err(OrderError::UserProfileNotFound);
    // }
    Ok(store::get_orders_by_phone(&phone_number))
}

#[query]
fn get_order_details(order_id: u64, requestor_phone_number: String) -> Result<Order, OrderError> {
    match store::get_order(order_id) {
        Some(order) => {
            // Security check: Only allow the user who placed the order to view it
            // TODO: Add admin override check using is_dev() guard if needed
            if order.user_phone_number == requestor_phone_number {
                Ok(order)
            } else {
                Err(OrderError::AccessDenied)
            }
        }
        None => Err(OrderError::OrderNotFound),
    }
}

#[update(guard = "is_dev")]
fn update_order_status_admin(
    order_id: u64,
    status: OrderStatus, // Directly take the new status enum
) -> Result<Order, OrderError> {
    let timestamp = time();
    // TODO: Add logic to prevent invalid status transitions if needed (e.g., cannot go from Delivered back to Pending)
    match store::update_order_status(order_id, status, timestamp) {
        Ok(updated_order) => Ok(updated_order),
        Err(e) => {
            // Check if the error indicates the order wasn't found
            if e.contains("not found") {
                // Simple check, might need refinement
                Err(OrderError::OrderNotFound)
            } else {
                Err(OrderError::StorageError(e))
            }
        }
    }
}

// === Initialization (Example: Add initial products only once) ===
// We need a way to track if initialization happened. A StableCell is good for this.

#[update(guard = "is_dev")]
fn initialize_products() -> Result<String, String> {
    // Use the function from the store module
    if store::is_initialized() {
        return Err("Already initialized".to_string());
    }

    let initial_products = vec![
        Product {
            id: 0,
            name: "Milk".to_string(),
            description: "Fresh Cow Milk".to_string(),
            price: 70.0,
            unit: "litre".to_string(),
        },
        Product {
            id: 1,
            name: "Paneer".to_string(),
            description: "Fresh Homemade Paneer".to_string(),
            price: 300.0,
            unit: "kg".to_string(),
        },
        Product {
            id: 2,
            name: "Methi Dahi".to_string(),
            description: "Curd with Fenugreek".to_string(),
            price: 100.0,
            unit: "kg".to_string(),
        },
        Product {
            id: 3,
            name: "Khatti Dahi".to_string(),
            description: "Sour Curd".to_string(),
            price: 50.0,
            unit: "kg".to_string(),
        },
        Product {
            id: 4,
            name: "Matha".to_string(),
            description: "Buttermilk".to_string(),
            price: 20.0,
            unit: "litre".to_string(),
        },
        Product {
            id: 5,
            name: "Ghee".to_string(),
            description: "Pure Desi Ghee".to_string(),
            price: 600.0,
            unit: "litre".to_string(),
        },
        Product {
            id: 6,
            name: "Cream".to_string(),
            description: "Fresh Milk Cream".to_string(),
            price: 300.0,
            unit: "kg".to_string(),
        },
    ];

    let mut count = 0;
    for (index, product) in initial_products.into_iter().enumerate() {
        // Ensure the product ID matches the index for consistency, though store::add relies on index
        let product_with_correct_id = Product {
            id: index as u64,
            ..product
        };
        match store::add_product(product_with_correct_id) {
            Ok(_) => count += 1,
            Err(e) => return Err(format!("Failed to add product {}: {}", index, e)),
        }
    }

    // Mark as initialized using the store function
    store::mark_initialized()?;

    Ok(format!("Initialized {} products.", count))
}

// Guard function (ensure guard.rs has is_dev)
#[ic_cdk::query]
fn is_dev_check() -> bool {
    is_dev().is_ok()
}
#[test]
fn generate_candid() {
    candid::export_service!();

    std::fs::write("../distributed/backend/backend.did", __export_service())
        .expect("Failed to write backend.did");
}
