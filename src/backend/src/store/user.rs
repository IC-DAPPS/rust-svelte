use candid::{Decode, Encode};
use ic_stable_structures::{storable::Bound, StableBTreeMap, Storable};
use std::{borrow::Cow, cell::RefCell};

use super::memory::{Memory, StorableString, MEMORY_MANAGER};
use crate::models::UserProfile;

// Implement Storable for UserProfile using Candid encoding
impl Storable for UserProfile {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).expect("Failed to encode UserProfile"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).expect("Failed to decode UserProfile")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: super::MAX_USER_PROFILE_SIZE,
        is_fixed_size: false,
    };
}

// Thread-local user profile storage
thread_local! {
    static USER_PROFILES: RefCell<StableBTreeMap<StorableString, UserProfile, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(super::USER_PROFILES_MEM_ID))
        )
    );
}

/// Retrieves the user profile for a given phone number.
pub fn get_user_profile(phone_number: &String) -> Option<UserProfile> {
    let key = StorableString(phone_number.clone());
    USER_PROFILES.with(|profiles| profiles.borrow().get(&key))
}

/// Inserts or updates a user profile. Uses the phone number within the profile as the key.
pub fn update_user_profile(profile: UserProfile) -> Option<UserProfile> {
    let key = StorableString(profile.phone_number.clone());
    USER_PROFILES.with(|profiles| profiles.borrow_mut().insert(key, profile))
}

/// Deletes a user profile by phone number. Returns the profile if it was deleted.
pub fn delete_user_profile(phone_number: &String) -> Option<UserProfile> {
    let key = StorableString(phone_number.clone());
    USER_PROFILES.with(|profiles| profiles.borrow_mut().remove(&key))
}

/// Retrieves all user profiles
pub fn get_all_user_profiles() -> Vec<UserProfile> {
    USER_PROFILES.with(|profiles| {
        let map = profiles.borrow();
        let mut result = Vec::new();

        for (_, profile) in map.iter() {
            result.push(profile);
        }

        result
    })
}
