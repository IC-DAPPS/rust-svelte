// Declare submodules
pub mod init;
pub mod memory;
pub mod order;
pub mod product;
pub mod subscription;
pub mod user;

// Re-export only needed functions for backward compatibility
// Removed unused re-exports: `MEMORY_MANAGER`, `Memory`, `StorablePrincipal`, and `StorableString`

pub use init::{is_initialized, mark_initialized};
pub use order::{
    add_order, get_all_orders, get_next_order_id, get_order, get_orders_by_phone,
    update_order_status,
};
pub use product::{add_product, get_all_products, get_product_by_id};
pub use subscription::{
    add_subscription, get_active_subscriptions_due_for_order, get_all_subscriptions,
    get_subscription, get_subscriptions_by_phone, update_subscription,
    update_subscription_next_order_date, update_subscription_status,
};
pub use user::{delete_user_profile, get_all_user_profiles, get_user_profile, update_user_profile};

// Common memory ID constants for all store modules
use ic_stable_structures::memory_manager::MemoryId;

pub(crate) const USER_PROFILES_MEM_ID: MemoryId = MemoryId::new(0);
pub(crate) const PRODUCTS_MEM_ID: MemoryId = MemoryId::new(1);
pub(crate) const INITIALIZED_MEM_ID: MemoryId = MemoryId::new(2);
pub(crate) const ORDERS_MEM_ID: MemoryId = MemoryId::new(3);
pub(crate) const NEXT_ORDER_ID_MEM_ID: MemoryId = MemoryId::new(4);
pub(crate) const SUBSCRIPTIONS_MEM_ID: MemoryId = MemoryId::new(5);
pub(crate) const NEXT_SUBSCRIPTION_ID_MEM_ID: MemoryId = MemoryId::new(6);

// Add more memory IDs as needed

// Size constants
pub(crate) const MAX_PRODUCT_SIZE: u32 = 512;
pub(crate) const MAX_USER_PROFILE_SIZE: u32 = 1024;
pub(crate) const MAX_PHONE_NUMBER_SIZE: u32 = 30;
pub(crate) const MAX_PRINCIPAL_SIZE: u32 = 38;
pub(crate) const MAX_ORDER_SIZE: u32 = 4096;
pub(crate) const MAX_SUBSCRIPTION_SIZE: u32 = 2048;
