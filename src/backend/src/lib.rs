#![allow(dead_code)]
#![warn(unused_variables)]

mod errors;
mod guard;
mod models;
mod store;
#[cfg(test)]
mod tests;

use crate::{guard::*, models::*};
use candid::{CandidType, Deserialize};
use errors::{GetUserDataError, OrderError, SubscriptionError};
use ic_cdk::{api::time, query, update};

// Helper functions for date calculations
fn calculate_initial_next_order_date(start_date_ts: u64, delivery_days: &[String]) -> u64 {
    if delivery_days.is_empty() {
        return start_date_ts;
    }
    let current_time = time();
    if start_date_ts > current_time {
        return start_date_ts;
    }
    current_time + 86_400_000_000_000
}

fn calculate_next_recurring_date(current_date: u64) -> u64 {
    current_date + 86_400_000_000_000
}

// Helper function for subscription status management
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

            if subscription.status == SubscriptionStatus::Cancelled
                && new_status != SubscriptionStatus::Cancelled
                && is_dev().is_err()
            {
                return Err(SubscriptionError::InvalidInput(
                    "Cannot change status of a cancelled subscription.".to_string(),
                ));
            }

            let updated_subscription = match store::update_subscription_status(
                subscription_id,
                new_status.clone(),
                current_time,
            ) {
                Ok(sub) => sub,
                Err(e) => return Err(SubscriptionError::UpdateFailed(e)),
            };

            if let Some(user_profile) = store::get_user_profile(&subscription.user_phone_number) {
                let mut updated_profile = user_profile;

                if new_status == SubscriptionStatus::Active {
                    updated_profile.has_active_subscription = true;
                    updated_profile.active_subscription_id = Some(subscription_id);
                } else {
                    updated_profile.has_active_subscription = false;
                    if new_status == SubscriptionStatus::Cancelled {
                        updated_profile.active_subscription_id = None;
                    }
                }

                store::update_user_profile(updated_profile);
            }

            Ok(updated_subscription)
        }
        None => Err(SubscriptionError::SubscriptionNotFound),
    }
}

///////////////////////////////////////////////////////////
// USER FUNCTIONS
///////////////////////////////////////////////////////////

// User Profile Management

#[query]
fn get_profile_by_phone(phone_number: String) -> Result<UserProfile, GetUserDataError> {
    match store::get_user_profile(&phone_number) {
        Some(profile) => Ok(profile),
        None => Err(GetUserDataError::DidntFindUserData),
    }
}

#[update]
fn update_profile(profile: UserProfile) -> Result<(), GetUserDataError> {
    if profile.phone_number.trim().is_empty() {
        return Err(GetUserDataError::DidntFindUserData);
    }
    store::update_user_profile(profile);
    Ok(())
}

#[update]
fn create_profile(profile: UserProfile) -> Result<(), String> {
    if profile.phone_number.trim().is_empty()
        || profile.name.trim().is_empty()
        || profile.address.trim().is_empty()
    {
        return Err("Phone number, name, and address cannot be empty.".to_string());
    }
    if store::get_user_profile(&profile.phone_number).is_some() {
        Err(format!(
            "Profile with phone number {} already exists.",
            profile.phone_number
        ))
    } else {
        let complete_profile = UserProfile {
            phone_number: profile.phone_number,
            name: profile.name,
            address: profile.address,
            order_ids: Vec::new(),
            has_active_subscription: false,
            active_subscription_id: None,
        };
        store::update_user_profile(complete_profile);
        Ok(())
    }
}

// User Order Management

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct OrderItemInput {
    pub product_id: u64,
    pub quantity: f64,
}

#[update]
fn create_order(
    phone_number: String,
    items_input: Vec<OrderItemInput>,
    delivery_address: String,
) -> Result<u64, OrderError> {
    if phone_number.trim().is_empty()
        || items_input.is_empty()
        || delivery_address.trim().is_empty()
    {
        return Err(OrderError::InvalidInput(
            "Phone number, items, and delivery address cannot be empty".to_string(),
        ));
    }

    if store::get_user_profile(&phone_number).is_none() {
        return Err(OrderError::UserProfileNotFound);
    }

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
                    price_per_unit_at_order: product.price,
                });
                total_amount += item_total;
            }
            None => {
                return Err(OrderError::InvalidProductInOrder(item_input.product_id));
            }
        }
    }

    let order_id = store::get_next_order_id();
    let timestamp = time();

    let order = Order {
        id: order_id,
        user_phone_number: phone_number,
        items: order_items,
        total_amount,
        status: OrderStatus::Pending,
        timestamp,
        delivery_address,
        last_updated: timestamp,
    };

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
    Ok(store::get_orders_by_phone(&phone_number))
}

#[query]
fn get_order_details(order_id: u64, requestor_phone_number: String) -> Result<Order, OrderError> {
    match store::get_order(order_id) {
        Some(order) => {
            if order.user_phone_number == requestor_phone_number {
                Ok(order)
            } else {
                Err(OrderError::AccessDenied)
            }
        }
        None => Err(OrderError::OrderNotFound),
    }
}

// User Subscription Management

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CreateSubscriptionPayload {
    pub items: Vec<SubscriptionItemInput>,
    pub delivery_days: Vec<String>,
    pub delivery_time_slot: String,
    pub delivery_address: String,
    pub start_date: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SubscriptionItemInput {
    pub product_id: u64,
    pub quantity: f64,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct UpdateSubscriptionDetailsPayload {
    pub items: Option<Vec<SubscriptionItemInput>>,
    pub delivery_days: Option<Vec<String>>,
    pub delivery_time_slot: Option<String>,
    pub delivery_address: Option<String>,
}

#[update]
async fn create_subscription(
    phone_number: String,
    payload: CreateSubscriptionPayload,
) -> Result<Subscription, SubscriptionError> {
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

    if store::get_user_profile(&phone_number).is_none() {
        return Err(SubscriptionError::UserProfileNotFound);
    }

    let existing_subscriptions = store::get_subscriptions_by_phone(&phone_number);
    if existing_subscriptions
        .iter()
        .any(|sub| sub.status == SubscriptionStatus::Active)
    {
        return Err(SubscriptionError::AlreadyExists);
    }

    let mut subscription_items: Vec<models::SubscriptionItem> = Vec::new();
    for item_input in payload.items {
        if item_input.quantity <= 0.0 {
            return Err(SubscriptionError::InvalidInput(format!(
                "Invalid quantity {} for product ID {}",
                item_input.quantity, item_input.product_id
            )));
        }
        let product = match store::get_product_by_id(item_input.product_id) {
            Some(p) => p,
            None => return Err(SubscriptionError::ProductNotFound(item_input.product_id)),
        };

        subscription_items.push(models::SubscriptionItem {
            product_id: item_input.product_id,
            quantity: item_input.quantity,
            price_per_unit_at_subscription: product.price,
        });
    }

    let current_time = time();
    let calculated_next_order_date =
        calculate_initial_next_order_date(payload.start_date, &payload.delivery_days);

    let subscription_to_create = Subscription {
        id: 0,
        user_phone_number: phone_number,
        items: subscription_items,
        delivery_days: payload.delivery_days,
        delivery_time_slot: payload.delivery_time_slot,
        delivery_address: payload.delivery_address,
        start_date: payload.start_date,
        status: SubscriptionStatus::Active,
        next_order_date: calculated_next_order_date,
        created_at: current_time,
        updated_at: current_time,
    };

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
    match store::get_subscription(subscription_id) {
        Some(sub) => {
            if sub.status != SubscriptionStatus::Paused && sub.status != SubscriptionStatus::Active
            {
                return Err(SubscriptionError::InvalidInput(
                    "Subscription must be paused to be resumed.".to_string(),
                ));
            }
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
                    let product = match store::get_product_by_id(item_input.product_id) {
                        Some(p) => p,
                        None => {
                            return Err(SubscriptionError::ProductNotFound(item_input.product_id))
                        }
                    };
                    new_subscription_items.push(models::SubscriptionItem {
                        product_id: item_input.product_id,
                        quantity: item_input.quantity,
                        price_per_unit_at_subscription: product.price,
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
                store::update_subscription(subscription_id, subscription, current_time)
                    .map_err(|e| SubscriptionError::UpdateFailed(e))
            } else {
                Ok(subscription)
            }
        }
        None => Err(SubscriptionError::SubscriptionNotFound),
    }
}

///////////////////////////////////////////////////////////
// ADMIN FUNCTIONS
///////////////////////////////////////////////////////////

// Admin Product Management

#[query]
fn get_products() -> Vec<Product> {
    store::get_all_products()
}

#[derive(candid::CandidType, serde::Deserialize)]
struct AddProductPayload {
    name: String,
    description: String,
    price: f64,
    unit: String,
}

#[update(guard = "is_dev")]
fn add_product_admin(payload: AddProductPayload) -> Result<u64, String> {
    let product_to_add = Product {
        id: 0,
        name: payload.name,
        description: payload.description,
        price: payload.price,
        unit: payload.unit,
    };
    store::add_product(product_to_add)
}

// Admin User Management

#[query]
fn get_all_customers() -> Vec<UserProfile> {
    store::get_all_user_profiles()
}

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

// Admin Order Management

#[query]
fn get_all_orders() -> Result<Vec<Order>, OrderError> {
    Ok(store::get_all_orders())
}

#[update]
fn update_order_status_admin(order_id: u64, new_status: OrderStatus) -> Result<Order, OrderError> {
    let timestamp = time();
    match store::update_order_status(order_id, new_status, timestamp) {
        Ok(updated_order) => Ok(updated_order),
        Err(e) => {
            if e.contains("not found") {
                Err(OrderError::OrderNotFound)
            } else {
                Err(OrderError::StorageError(e))
            }
        }
    }
}

// Admin Subscription Management

#[query]
fn get_all_subscriptions() -> Result<Vec<Subscription>, SubscriptionError> {
    Ok(store::get_all_subscriptions())
}

#[update]
fn update_subscription_status_admin(
    subscription_id: u64,
    new_status: SubscriptionStatus,
) -> Result<Subscription, SubscriptionError> {
    let current_time = time();
    match store::get_subscription(subscription_id) {
        Some(subscription) => {
            let updated_subscription = match store::update_subscription_status(
                subscription_id,
                new_status.clone(),
                current_time,
            ) {
                Ok(sub) => sub,
                Err(e) => return Err(SubscriptionError::UpdateFailed(e)),
            };

            if let Some(user_profile) = store::get_user_profile(&subscription.user_phone_number) {
                let mut updated_profile = user_profile;

                if new_status == SubscriptionStatus::Active {
                    updated_profile.has_active_subscription = true;
                    updated_profile.active_subscription_id = Some(subscription_id);
                } else {
                    updated_profile.has_active_subscription = false;
                    if new_status == SubscriptionStatus::Cancelled {
                        updated_profile.active_subscription_id = None;
                    }
                }

                store::update_user_profile(updated_profile);
            }

            Ok(updated_subscription)
        }
        None => Err(SubscriptionError::SubscriptionNotFound),
    }
}

// Admin System Functions

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

#[update]
fn initialize_products() -> Result<String, String> {
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
        let product_with_correct_id = Product {
            id: index as u64,
            ..product
        };
        match store::add_product(product_with_correct_id) {
            Ok(_) => count += 1,
            Err(e) => return Err(format!("Failed to add product {}: {}", index, e)),
        }
    }

    store::mark_initialized()?;

    Ok(format!("Initialized {} products.", count))
}

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
