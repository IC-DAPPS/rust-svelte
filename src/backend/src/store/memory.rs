use candid::{CandidType, Deserialize, Principal};
use ic_stable_structures::memory_manager::{MemoryManager, VirtualMemory};
use ic_stable_structures::{storable::Bound, DefaultMemoryImpl, Storable};
use serde::Serialize;
use std::{borrow::Cow, cell::RefCell};

// Re-exports for use by other modules

// Memory type used across the entire storage system
pub type Memory = VirtualMemory<DefaultMemoryImpl>;

// Thread-local memory manager (shared across all storage modules)
thread_local! {
    pub static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
}

// --- Newtype wrappers ---

// Wrapper for Principal to satisfy the orphan rule
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct StorablePrincipal(pub Principal);

// Implement Storable for StorablePrincipal
impl Storable for StorablePrincipal {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Borrowed(self.0.as_slice())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        StorablePrincipal(Principal::from_slice(bytes.as_ref()))
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: super::MAX_PRINCIPAL_SIZE,
        is_fixed_size: false,
    };
}

// Wrapper for String to satisfy the orphan rule
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct StorableString(pub String);

// Implement Storable for StorableString
impl Storable for StorableString {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Borrowed(self.0.as_bytes())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        StorableString(
            String::from_utf8(bytes.into_owned()).expect("Failed to decode String from UTF-8"),
        )
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: super::MAX_PHONE_NUMBER_SIZE,
        is_fixed_size: false,
    };
}
