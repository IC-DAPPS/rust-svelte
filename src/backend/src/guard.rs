use candid::Principal;
use std::{cell::RefCell, collections::BTreeSet};

const INITIAL_AUTHORIZED_PRINCIPALS: [&str; 2] = [
    "3x4lf-ejzal-hbmpw-3nbss-3eewi-bhvbf-wtvor-d5ogi-hop22-w7o5t-lqe",
    "upfji-4rkdd-uh3e4-uiavy-wkdcq-rcakh-creh5-crsgi-hq5az-7nfqd-wqe",
];

thread_local! {
    pub static GUARD: RefCell<BTreeSet<Principal>> = RefCell::new({
        let mut set = BTreeSet::new();
        for principal_str in INITIAL_AUTHORIZED_PRINCIPALS.iter() {
            match Principal::from_text(principal_str) {
                Ok(principal) => {
                    set.insert(principal);
                }
                Err(e) => {
                    eprintln!("Failed to parse principal string '{}': {}", principal_str, e);
                }
            }
        }
        set
    });
}

pub fn add_to_list(principal: Principal) -> () {
    GUARD.with(|guard| {
        let mut guard_ref = guard.borrow_mut();

        if guard_ref.contains(&principal) {
            return ();
        } else {
            guard_ref.insert(principal);
            return ();
        }
    })
}

pub fn delete_from_list(p: Principal) -> String {
    GUARD.with(|guard| {
        let mut guard_ref = guard.borrow_mut();

        if !guard_ref.contains(&p) {
            return "Principal {} is not in the guard list".to_string();
        } else {
            guard_ref.remove(&p);
            return "removed".to_string();
        }
    })
}

pub fn is_dev() -> Result<(), String> {
    let caller = ic_cdk::caller();
    let anonymous = Principal::anonymous();
    if caller == anonymous {
        return Err("AnonymousCaller".to_string());
    }

    GUARD.with(|guard| {
        let guard_ref = guard.borrow();
        if !guard_ref.contains(&caller) {
            return Err(format!("Caller {} is not authorized", caller));
        } else {
            return Ok(());
        }
    })
}
