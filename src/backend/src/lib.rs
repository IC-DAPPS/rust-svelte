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
use errors::{GetUserDataError, OrderError};
use ic_cdk::{api::time, query, update};

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

    let user_profile = match store::get_user_profile(&phone_number) {
        Some(profile) => profile,
        None => return Err(OrderError::UserProfileNotFound),
    };

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
        user_phone_number: phone_number.clone(),
        customer_name: user_profile.name.clone(),
        items: order_items,
        total_amount,
        status: OrderStatus::Pending,
        timestamp,
        delivery_address,
        last_updated: timestamp,
    };

    match store::add_order(order) {
        Ok(_) => {
            let mut updated_profile = user_profile;
            updated_profile.order_ids.push(order_id);
            store::update_user_profile(updated_profile);
            Ok(order_id)
        }
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

#[update]
fn cancel_my_order(order_id: u64, requestor_phone_number: String) -> Result<Order, OrderError> {
    if requestor_phone_number.trim().is_empty() {
        return Err(OrderError::InvalidInput(
            "Requestor phone number cannot be empty".to_string(),
        ));
    }

    match store::get_order(order_id) {
        Some(mut order) => {
            if order.user_phone_number != requestor_phone_number {
                return Err(OrderError::AccessDenied);
            }

            // Check if the order is in a cancellable state (e.g., Pending)
            if order.status != OrderStatus::Pending {
                return Err(OrderError::CannotCancelOrder(
                    "Order can only be cancelled if it is in Pending status.".to_string(),
                ));
            }

            let timestamp = time();
            match store::update_order_status(order_id, OrderStatus::Cancelled, timestamp) {
                Ok(updated_order) => Ok(updated_order),
                Err(e) => {
                    // Check if the error message indicates the order was not found
                    // This could happen in a race condition if the order was deleted
                    // or cancelled by another process between the get_order and update_order_status calls.
                    if e.contains("not found") {
                        Err(OrderError::OrderNotFound)
                    } else {
                        Err(OrderError::StorageError(e))
                    }
                }
            }
        }
        None => Err(OrderError::OrderNotFound),
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

#[update]
fn update_product_admin(id: u64, payload: AddProductPayload) -> Result<Product, String> {
    let product_update = Product {
        id, // Keep the original ID
        name: payload.name,
        description: payload.description,
        price: payload.price,
        unit: payload.unit,
    };
    store::update_product(id, product_update)
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

#[query]
fn get_order_details_admin(order_id: u64) -> Result<Order, OrderError> {
    match store::get_order(order_id) {
        Some(order) => Ok(order),
        None => Err(OrderError::OrderNotFound),
    }
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

// Admin System Functions

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

// Added pre_upgrade and post_upgrade hooks for stable storage
#[ic_cdk::pre_upgrade]
fn pre_upgrade() {
    // Optionally, you can serialize and save data here if it's not already in stable structures.
    // For ic-stable-structures, if all data is in StableBTreeMap, StableVec, etc.,
    // this function can often be left empty. The structures themselves live in stable memory.
    // However, some developers choose to explicitly take()/replace() the RefCell contents
    // of their state here and store them with ic_cdk::storage::stable_save, then restore
    // in post_upgrade. This is a more robust pattern if you have complex state management.
    // For this example, we'll assume direct use of stable structures which persist
    // across upgrades without explicit saving/loading here, as long as MEMORY_MANAGER is re-init.
}

#[ic_cdk::post_upgrade]
fn post_upgrade() {
    // Re-initialize the MEMORY_MANAGER after an upgrade.
    // This is crucial for ic-stable-structures to correctly re-map the stable memory.
    store::memory::MEMORY_MANAGER.with(|mm| {
        *mm.borrow_mut() = ic_stable_structures::memory_manager::MemoryManager::init(
            ic_stable_structures::DefaultMemoryImpl::default(),
        );
    });
    // After the memory manager is re-initialized, your StableBTreeMaps, StableVecs, etc.,
    // in the store modules will be able to reload their data from stable memory after an upgrade
    // when they are accessed (typically via `STATE.with(|s| s.borrow().get(...)`).
    // If you have an explicit initialization function for your state that needs to be called
    // after an upgrade (e.g., to repopulate runtime caches from stable storage), call it here.
    // For example, if you had a function like store::reinit_state_after_upgrade():
    // store::reinit_state_after_upgrade();
}

#[test]
fn generate_candid() {
    candid::export_service!();
    std::fs::write("../distributed/backend/backend.did", __export_service())
        .expect("Failed to write backend.did");
}
