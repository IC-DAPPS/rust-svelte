use ic_stable_structures::StableCell;
use std::cell::RefCell;

use super::memory::{Memory, MEMORY_MANAGER};

// Thread-local initialization flag
thread_local! {
    static INITIALIZED: RefCell<StableCell<bool, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(super::INITIALIZED_MEM_ID)),
            false
        ).expect("Failed to init StableCell for INITIALIZED flag")
    );
}

/// Checks if the store has been initialized (e.g., initial products added).
pub fn is_initialized() -> bool {
    INITIALIZED.with(|cell| *cell.borrow().get())
}

/// Marks the store as initialized.
pub fn mark_initialized() -> Result<(), String> {
    INITIALIZED.with(|cell| {
        cell.borrow_mut()
            .set(true)
            .map(|_| ()) // Discard the old value and return () on success
            .map_err(|e| format!("Failed to set initialized flag: {:?}", e))
    })
}
