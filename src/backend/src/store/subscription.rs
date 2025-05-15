use crate::{
    models::{Subscription, SubscriptionStatus},
    store::{
        memory::MEMORY_MANAGER, MAX_SUBSCRIPTION_SIZE, NEXT_SUBSCRIPTION_ID_MEM_ID,
        SUBSCRIPTIONS_MEM_ID,
    },
};
use ic_stable_structures::{
    memory_manager::VirtualMemory, storable::Bound, DefaultMemoryImpl, StableCell, StableVec,
    Storable,
};
use std::{borrow::Cow, cell::RefCell};

// Define Storable trait for Subscription if not already implicitly handled by CandidType
// For complex types with StableVec, we need to implement Storable.
// Assuming Subscription derives CandidType and Deserialize, which are often sufficient for ic-stable-structures.
// If direct Storable implementation is needed, it would look like this:
// #[derive(CandidType, Deserialize, Clone, Debug)] // Ensure Subscription has these
// struct StorableSubscription(Subscription); // Wrapper or use directly
// impl Storable for Subscription { ... }
// However, with CandidType, often direct usage in StableVec is possible if it serializes to a bounded size.

// Implementation of Storable for Subscription
impl Storable for Subscription {
    fn to_bytes(&self) -> Cow<[u8]> {
        // Serialize using candid
        Cow::Owned(candid::encode_one(self).expect("Serialization failed for Subscription"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        // Deserialize using candid
        candid::decode_one(&bytes).expect("Deserialization failed for Subscription")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: MAX_SUBSCRIPTION_SIZE,
        is_fixed_size: false,
    };
}

type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    // Memory for storing subscriptions
    static SUBSCRIPTIONS: RefCell<StableVec<Subscription, Memory>> = RefCell::new(
        StableVec::init(MEMORY_MANAGER.with(|m| m.borrow().get(SUBSCRIPTIONS_MEM_ID)))
            .expect("Failed to init SUBSCRIPTIONS StableVec")
    );

    // Memory for storing the next available subscription ID
    static NEXT_SUBSCRIPTION_ID: RefCell<StableCell<u64, Memory>> = RefCell::new(
        StableCell::init(MEMORY_MANAGER.with(|m| m.borrow().get(NEXT_SUBSCRIPTION_ID_MEM_ID)), 0u64)
            .expect("Failed to init NEXT_SUBSCRIPTION_ID StableCell")
    );
}

pub fn get_subscription(id: u64) -> Option<Subscription> {
    SUBSCRIPTIONS.with(|vec| vec.borrow().get(id))
}

pub fn get_subscriptions_by_phone(phone_number: &str) -> Vec<Subscription> {
    SUBSCRIPTIONS.with(|vec| {
        vec.borrow()
            .iter()
            .filter(|s| s.user_phone_number == phone_number)
            .collect()
    })
}

pub fn get_all_subscriptions() -> Vec<Subscription> {
    SUBSCRIPTIONS.with(|vec| vec.borrow().iter().collect())
}

pub fn update_subscription(
    id: u64,
    mut updated_data: Subscription,
    current_time: u64,
) -> Result<Subscription, String> {
    SUBSCRIPTIONS.with(|vec| {
        let mut subscriptions_vec = vec.borrow_mut();
        if id >= subscriptions_vec.len() {
            return Err(format!("Subscription with id {} not found for update.", id));
        }
        updated_data.id = id; // Ensure the ID from path/parameter is used
        updated_data.updated_at = current_time; // Set updated_at timestamp

        subscriptions_vec.set(id, &updated_data);
        Ok(updated_data)
    })
}

pub fn update_subscription_status(
    id: u64,
    new_status: SubscriptionStatus,
    current_time: u64,
) -> Result<Subscription, String> {
    SUBSCRIPTIONS.with(|vec| {
        let subscriptions_vec = vec.borrow_mut();
        match subscriptions_vec.get(id) {
            Some(mut subscription) => {
                subscription.status = new_status;
                subscription.updated_at = current_time; // Set updated_at timestamp
                subscriptions_vec.set(id, &subscription);
                Ok(subscription)
            }
            None => Err(format!(
                "Subscription with id {} not found for status update.",
                id
            )),
        }
    })
}

pub fn update_subscription_next_order_date(
    id: u64,
    new_next_order_date: u64,
    current_time: u64,
) -> Result<Subscription, String> {
    SUBSCRIPTIONS.with(|vec| {
        let subscriptions_vec = vec.borrow_mut();
        match subscriptions_vec.get(id) {
            Some(mut subscription) => {
                subscription.next_order_date = new_next_order_date;
                subscription.updated_at = current_time; // Set updated_at timestamp
                subscriptions_vec.set(id, &subscription);
                Ok(subscription)
            }
            None => Err(format!(
                "Subscription with id {} not found for next_order_date update.",
                id
            )),
        }
    })
}

pub fn get_active_subscriptions_due_for_order(current_date_timestamp: u64) -> Vec<Subscription> {
    SUBSCRIPTIONS.with(|vec| {
        vec.borrow()
            .iter()
            .filter(|s| {
                s.status == SubscriptionStatus::Active
                    && s.next_order_date <= current_date_timestamp
            })
            .collect()
    })
}

// Helper to manage next ID
pub fn get_next_subscription_id_impl() -> u64 {
    NEXT_SUBSCRIPTION_ID.with(|cell| {
        let current_id = *cell.borrow().get();
        let next_id = current_id + 1;
        match cell.borrow_mut().set(next_id) {
            Ok(_) => current_id,
            Err(e) => panic!("Failed to update next subscription ID: {:?}", e),
        }
    })
}

pub fn add_subscription(mut subscription_data: Subscription) -> Result<Subscription, String> {
    let new_id = get_next_subscription_id_impl();
    subscription_data.id = new_id; // Assign the new ID
                                   // created_at and updated_at should be set by the caller (lib.rs handler) before calling this

    SUBSCRIPTIONS.with(|vec| {
        let mut subscriptions_vec = vec.borrow_mut();
        match subscriptions_vec.push(&subscription_data) {
            Ok(_) => Ok(subscription_data), // Return the full subscription object
            Err(e) => Err(format!("Failed to add subscription to StableVec: {:?}", e)),
        }
    })
}
