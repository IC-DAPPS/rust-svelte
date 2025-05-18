#![allow(dead_code)]
#![warn(unused_variables)]

mod errors;
mod guard;
// mod handlers; // Assuming handlers might be removed or refactored
mod models;
mod store; // Now this refers to the store/ directory with mod.rs
#[cfg(test)]
mod tests;

use crate::{guard::*, models::*}; // Now importing from the refactored store
use candid::{CandidType, Deserialize};
use errors::{GetUserDataError, OrderError, SubscriptionError}; // Added SubscriptionError
use ic_cdk::{api::time, query, update}; // Removed caller import

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

// Get all users for admin
#[query]
fn get_all_customers() -> Vec<UserProfile> {
    store::get_all_user_profiles()
}

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
#[update]
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
fn get_all_orders() -> Result<Vec<Order>, OrderError> {
    // Return all orders for admin panel
    Ok(store::get_all_orders())
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

#[update]
fn update_order_status_admin(order_id: u64, new_status: OrderStatus) -> Result<Order, OrderError> {
    let timestamp = time();
    // TODO: Add logic to prevent invalid status transitions if needed (e.g., cannot go from Delivered back to Pending)
    match store::update_order_status(order_id, new_status, timestamp) {
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

// === Subscription Endpoints ===

// Payload for creating a new subscription
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CreateSubscriptionPayload {
    pub items: Vec<SubscriptionItemInput>,
    pub delivery_days: Vec<String>,
    pub delivery_time_slot: String,
    pub delivery_address: String,
    pub start_date: u64,
}

// Input for individual items in a subscription payload
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SubscriptionItemInput {
    pub product_id: u64,
    pub quantity: f64,
}

// Payload for updating subscription details (specific fields)
// For simplicity, we can reuse CreateSubscriptionPayload if all fields are updatable
// Or define a new one like UpdateSubscriptionPayload if only some are.
// Let's assume for now we might want to update items, delivery_days, time_slot, address.
// Start_date is usually not updated post-creation, but next_order_date is.
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct UpdateSubscriptionDetailsPayload {
    pub items: Option<Vec<SubscriptionItemInput>>,
    pub delivery_days: Option<Vec<String>>,
    pub delivery_time_slot: Option<String>,
    pub delivery_address: Option<String>,
    // next_order_date can be updated via a separate mechanism or admin action primarily
}

// Helper function (conceptual) - to be properly implemented
// This is a simplified placeholder. Real implementation needs careful date math.
fn calculate_initial_next_order_date(start_date_ts: u64, delivery_days: &[String]) -> u64 {
    // If empty delivery days, return start_date as fallback
    if delivery_days.is_empty() {
        return start_date_ts;
    }

    // Simple implementation - use start_date_ts if it's in the future
    let current_time = time();
    if start_date_ts > current_time {
        return start_date_ts;
    }

    // If start_date is in the past, add one day to current time as a simple approach
    // In a real implementation, we'd determine the day of week and find the next valid delivery day
    // This would require proper date/time calculations
    current_time + 86_400_000_000_000 // Add one day (86400000000000 ns = 1 day)
}

#[update]
async fn create_subscription(
    phone_number: String,
    payload: CreateSubscriptionPayload,
) -> Result<Subscription, SubscriptionError> {
    // 1. Validate inputs (basic checks)
    if phone_number.trim().is_empty() {
        return Err(SubscriptionError::InvalidInput(
            "Phone number cannot be empty".to_string(),
        ));
    }
    if payload.items.is_empty()
        || payload.delivery_days.is_empty()
        || payload.delivery_time_slot.trim().is_empty()
        || payload.delivery_address.trim().is_empty()
        || payload.start_date == 0
    {
        return Err(SubscriptionError::InvalidInput(
            "Missing required subscription details".to_string(),
        ));
    }

    // 2. Check if user profile exists
    if store::get_user_profile(&phone_number).is_none() {
        return Err(SubscriptionError::UserProfileNotFound);
    }

    // 3. Check if user already has an active subscription
    let existing_subscriptions = store::get_subscriptions_by_phone(&phone_number);
    if existing_subscriptions
        .iter()
        .any(|sub| sub.status == SubscriptionStatus::Active)
    {
        return Err(SubscriptionError::AlreadyExists);
    }

    // 4. Validate subscription items and product existence
    let mut subscription_items: Vec<models::SubscriptionItem> = Vec::new();
    for item_input in payload.items {
        if item_input.quantity <= 0.0 {
            return Err(SubscriptionError::InvalidInput(format!(
                "Invalid quantity {} for product ID {}",
                item_input.quantity, item_input.product_id
            )));
        }
        if store::get_product_by_id(item_input.product_id).is_none() {
            return Err(SubscriptionError::ProductNotFound(item_input.product_id));
        }
        subscription_items.push(models::SubscriptionItem {
            product_id: item_input.product_id,
            quantity: item_input.quantity,
        });
    }

    // 5. Prepare subscription data
    let current_time = time();
    let calculated_next_order_date =
        calculate_initial_next_order_date(payload.start_date, &payload.delivery_days);

    let subscription_to_create = Subscription {
        id: 0,                           // Placeholder, will be set by store
        user_phone_number: phone_number, // Already cloned if needed by this point
        items: subscription_items,
        delivery_days: payload.delivery_days,
        delivery_time_slot: payload.delivery_time_slot,
        delivery_address: payload.delivery_address,
        start_date: payload.start_date,
        status: SubscriptionStatus::Active,
        next_order_date: calculated_next_order_date, // Use calculated date
        created_at: current_time,
        updated_at: current_time,
    };

    // 6. Add subscription to store
    store::add_subscription(subscription_to_create).map_err(|e| SubscriptionError::StorageError(e))
}

#[query]
fn get_my_subscriptions(phone_number: String) -> Result<Vec<Subscription>, SubscriptionError> {
    if phone_number.trim().is_empty() {
        return Err(SubscriptionError::InvalidInput(
            "Phone number cannot be empty".to_string(),
        ));
    }
    Ok(store::get_subscriptions_by_phone(&phone_number))
}

#[query]
fn get_all_subscriptions() -> Result<Vec<Subscription>, SubscriptionError> {
    // Return all subscriptions for admin panel
    Ok(store::get_all_subscriptions())
}

#[query]
fn get_subscription_details(
    subscription_id: u64,
    requestor_phone_number: String,
) -> Result<Subscription, SubscriptionError> {
    match store::get_subscription(subscription_id) {
        Some(subscription) => {
            if subscription.user_phone_number == requestor_phone_number || is_dev().is_ok() {
                Ok(subscription)
            } else {
                Err(SubscriptionError::AccessDenied)
            }
        }
        None => Err(SubscriptionError::SubscriptionNotFound),
    }
}

async fn manage_subscription_status(
    subscription_id: u64,
    requestor_phone_number: String,
    new_status: SubscriptionStatus,
) -> Result<Subscription, SubscriptionError> {
    let current_time = time();
    match store::get_subscription(subscription_id) {
        Some(subscription) => {
            if subscription.user_phone_number != requestor_phone_number && is_dev().is_err() {
                return Err(SubscriptionError::AccessDenied);
            }
            // Prevent changing status if already cancelled, unless it's an admin trying to reactivate (future scope)
            if subscription.status == SubscriptionStatus::Cancelled
                && new_status != SubscriptionStatus::Cancelled
                && is_dev().is_err()
            {
                return Err(SubscriptionError::InvalidInput(
                    "Cannot change status of a cancelled subscription.".to_string(),
                ));
            }

            store::update_subscription_status(subscription_id, new_status, current_time)
                .map_err(|e| SubscriptionError::UpdateFailed(e))
        }
        None => Err(SubscriptionError::SubscriptionNotFound),
    }
}

#[update]
async fn cancel_subscription(
    subscription_id: u64,
    requestor_phone_number: String,
) -> Result<Subscription, SubscriptionError> {
    manage_subscription_status(
        subscription_id,
        requestor_phone_number,
        SubscriptionStatus::Cancelled,
    )
    .await
}

#[update]
async fn pause_subscription(
    subscription_id: u64,
    requestor_phone_number: String,
) -> Result<Subscription, SubscriptionError> {
    manage_subscription_status(
        subscription_id,
        requestor_phone_number,
        SubscriptionStatus::Paused,
    )
    .await
}

#[update]
async fn resume_subscription(
    subscription_id: u64,
    requestor_phone_number: String,
) -> Result<Subscription, SubscriptionError> {
    // Add check: only resume if Paused or maybe Active (idempotent)
    match store::get_subscription(subscription_id) {
        Some(sub) => {
            if sub.status != SubscriptionStatus::Paused && sub.status != SubscriptionStatus::Active
            {
                // Allow resuming active to be idempotent
                return Err(SubscriptionError::InvalidInput(
                    "Subscription must be paused to be resumed.".to_string(),
                ));
            }
            // Check ownership before calling manage_subscription_status or include in manage_subscription_status
            if sub.user_phone_number != requestor_phone_number && is_dev().is_err() {
                return Err(SubscriptionError::AccessDenied);
            }
        }
        None => return Err(SubscriptionError::SubscriptionNotFound),
    }
    manage_subscription_status(
        subscription_id,
        requestor_phone_number,
        SubscriptionStatus::Active,
    )
    .await
}

#[update]
async fn update_subscription_details(
    subscription_id: u64,
    requestor_phone_number: String,
    payload: UpdateSubscriptionDetailsPayload,
) -> Result<Subscription, SubscriptionError> {
    let current_time = time();
    match store::get_subscription(subscription_id) {
        Some(mut subscription) => {
            if subscription.user_phone_number != requestor_phone_number && is_dev().is_err() {
                return Err(SubscriptionError::AccessDenied);
            }
            if subscription.status == SubscriptionStatus::Cancelled && is_dev().is_err() {
                return Err(SubscriptionError::InvalidInput(
                    "Cannot update a cancelled subscription.".to_string(),
                ));
            }

            let mut changed = false;
            if let Some(items_payload) = payload.items {
                if items_payload.is_empty() {
                    return Err(SubscriptionError::InvalidInput(
                        "Subscription items cannot be empty".to_string(),
                    ));
                }
                let mut new_subscription_items: Vec<models::SubscriptionItem> = Vec::new();
                for item_input in items_payload {
                    if item_input.quantity <= 0.0 {
                        return Err(SubscriptionError::InvalidInput(format!(
                            "Invalid quantity {} for product ID {}",
                            item_input.quantity, item_input.product_id
                        )));
                    }
                    if store::get_product_by_id(item_input.product_id).is_none() {
                        return Err(SubscriptionError::ProductNotFound(item_input.product_id));
                    }
                    new_subscription_items.push(models::SubscriptionItem {
                        product_id: item_input.product_id,
                        quantity: item_input.quantity,
                    });
                }
                subscription.items = new_subscription_items;
                changed = true;
            }

            if let Some(days) = payload.delivery_days {
                if days.is_empty() {
                    return Err(SubscriptionError::InvalidInput(
                        "Delivery days cannot be empty".to_string(),
                    ));
                }
                subscription.delivery_days = days;
                changed = true;
            }
            if let Some(time_slot) = payload.delivery_time_slot {
                if time_slot.trim().is_empty() {
                    return Err(SubscriptionError::InvalidInput(
                        "Delivery time slot cannot be empty".to_string(),
                    ));
                }
                subscription.delivery_time_slot = time_slot;
                changed = true;
            }
            if let Some(address) = payload.delivery_address {
                if address.trim().is_empty() {
                    return Err(SubscriptionError::InvalidInput(
                        "Delivery address cannot be empty".to_string(),
                    ));
                }
                subscription.delivery_address = address;
                changed = true;
            }

            if changed {
                subscription.updated_at = current_time;
                // Here we use store::update_subscription, which also takes current_time and sets updated_at.
                // The store function needs to be adjusted to not *require* current_time if lib.rs sets it, or lib.rs doesn't set it.
                // For now, let's assume lib.rs sets it, and store::update_subscription uses the passed subscription.updated_at.
                // The store function's signature is `update_subscription(id: u64, mut updated_data: Subscription, current_time: u64)`
                // This means the store will overwrite updated_at with its current_time param.
                // So, lib.rs should NOT set updated_at if the store function is going to do it.
                // Let's modify the call to store::update_subscription to pass the current_time for the store to set it.
                // The `subscription` object here in lib.rs has its updated_at set. So, let's ensure the store's `update_subscription` uses the `updated_at` from the passed object if it makes sense, or standardize.
                // Given current store/subscription.rs, store::update_subscription will use the `current_time` param it receives.
                // So, `subscription.updated_at = current_time;` above is for the object *before* it goes to the store function.
                // The store function will also set it. This is fine, just a bit redundant. Let's simplify.
                // We'll rely on the store function to set `updated_at`.
                store::update_subscription(subscription_id, subscription, current_time) // Pass current_time for store to use
                    .map_err(|e| SubscriptionError::UpdateFailed(e))
            } else {
                Ok(subscription) // No changes made
            }
        }
        None => Err(SubscriptionError::SubscriptionNotFound),
    }
}

// === Initialization (Example: Add initial products only once) ===
// We need a way to track if initialization happened. A StableCell is good for this.

#[update]
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

// === Recurring Order Generation ===

// Helper function: Calculates the next date for a given subscription after generating an order
fn calculate_next_recurring_date(current_date: u64) -> u64 {
    // In a production system, we would:
    // 1. Convert timestamp to calendar date
    // 2. Extract current day of week
    // 3. Check subscription.delivery_days to find next delivery day
    // 4. Calculate exact timestamp for that day

    // For now, we'll use a simple approach - next day delivery
    // 86_400_000_000_000 nanoseconds = 1 day
    current_date + 86_400_000_000_000
}

/// Generates orders for all active subscriptions that are due for delivery.
/// This function should be called by an admin periodically (e.g., daily) to process
/// subscriptions and create orders automatically.
///
/// The function:
/// 1. Fetches all active subscriptions with next_order_date <= current time
/// 2. For each subscription, creates a new pending order with the subscription items
/// 3. Updates the subscription's next_order_date to the next delivery date
/// 4. Returns a summary of successful and failed order generations
///
/// Admin-only function, protected by the is_dev guard.
#[update]
async fn generate_recurring_orders() -> Result<String, String> {
    let current_time = time();
    let due_subscriptions = store::get_active_subscriptions_due_for_order(current_time);

    if due_subscriptions.is_empty() {
        return Ok("No subscriptions due for order generation".to_string());
    }

    let mut success_count = 0;
    let mut error_count = 0;

    for subscription in &due_subscriptions {
        // 1. Create order items from subscription items
        let mut order_items = Vec::new();
        let mut total_amount = 0.0;

        let mut valid_products = true;
        for item in &subscription.items {
            match store::get_product_by_id(item.product_id) {
                Some(product) => {
                    let item_total = product.price * item.quantity;
                    order_items.push(OrderItem {
                        product_id: item.product_id,
                        quantity: item.quantity,
                        price_per_unit_at_order: product.price,
                    });
                    total_amount += item_total;
                }
                None => {
                    ic_cdk::println!(
                        "Product ID {} not found for subscription {}",
                        item.product_id,
                        subscription.id
                    );
                    valid_products = false;
                    break;
                }
            }
        }

        if !valid_products {
            error_count += 1;
            continue;
        }

        // 2. Create order
        let order_id = store::get_next_order_id();
        let order = Order {
            id: order_id,
            user_phone_number: subscription.user_phone_number.clone(),
            items: order_items,
            total_amount,
            status: OrderStatus::Pending,
            timestamp: current_time,
            delivery_address: subscription.delivery_address.clone(),
            last_updated: current_time,
        };

        match store::add_order(order) {
            Ok(_) => {
                // 3. Update subscription's next_order_date
                let next_date = calculate_next_recurring_date(current_time);
                match store::update_subscription_next_order_date(
                    subscription.id,
                    next_date,
                    current_time,
                ) {
                    Ok(_) => success_count += 1,
                    Err(e) => {
                        ic_cdk::println!(
                            "Failed to update next_order_date for subscription {}: {}",
                            subscription.id,
                            e
                        );
                        error_count += 1;
                    }
                }
            }
            Err(e) => {
                ic_cdk::println!(
                    "Failed to create order for subscription {}: {}",
                    subscription.id,
                    e
                );
                error_count += 1;
            }
        }
    }

    Ok(format!(
        "Processed {} subscriptions: {} successful, {} failed",
        due_subscriptions.len(),
        success_count,
        error_count
    ))
}
