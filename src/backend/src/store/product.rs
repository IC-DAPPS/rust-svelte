use candid::{Decode, Encode};
use ic_stable_structures::{storable::Bound, StableVec, Storable};
use std::{borrow::Cow, cell::RefCell};

use super::memory::{Memory, MEMORY_MANAGER};
use crate::models::Product;

// Implement Storable for Product using Candid encoding
impl Storable for Product {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).expect("Failed to encode Product"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).expect("Failed to decode Product")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: super::MAX_PRODUCT_SIZE,
        is_fixed_size: false,
    };
}

// Thread-local product storage
thread_local! {
    static PRODUCTS: RefCell<StableVec<Product, Memory>> = RefCell::new(
        StableVec::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(super::PRODUCTS_MEM_ID))
        ).expect("Failed to init StableVec for Products")
    );
}

/// Adds a new product to the store. Returns the new product's ID (index).
pub fn add_product(product: Product) -> Result<u64, String> {
    PRODUCTS.with(|p| {
        let products = p.borrow_mut();
        // The ID will be the index where it's inserted
        let len_before_push = products.len();
        match products.push(&product) {
            Ok(_) => Ok(len_before_push),
            Err(e) => Err(format!("Failed to add product: {:?}", e)),
        }
    })
}

/// Retrieves all products from the store.
pub fn get_all_products() -> Vec<Product> {
    PRODUCTS.with(|p| p.borrow().iter().collect())
}

/// Retrieves a product by its ID (index).
pub fn get_product_by_id(id: u64) -> Option<Product> {
    PRODUCTS.with(|p| p.borrow().get(id))
}

/// Updates an existing product. Returns the updated product or an error if not found.
pub fn update_product(id: u64, updated_product: Product) -> Result<Product, String> {
    PRODUCTS.with(|p| {
        let products = p.borrow_mut();
        if id >= products.len() {
            return Err(format!("Product with ID {} not found", id));
        }

        // Create a new product with the same ID but updated fields
        let product_to_update = Product {
            id, // Keep the original ID
            name: updated_product.name,
            description: updated_product.description,
            price: updated_product.price,
            unit: updated_product.unit,
        };

        // set method returns () on success, not a Result
        products.set(id, &product_to_update);
        Ok(product_to_update)
    })
}

// Add additional product functions as needed
