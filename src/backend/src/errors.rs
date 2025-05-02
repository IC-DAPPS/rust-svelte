use serde::{Deserialize, Serialize};

#[derive(candid::CandidType, Clone, Serialize, Deserialize, Debug)]
pub enum GetUserDataError {
    AnonymousCaller,
    DidntFindUserData,
    FailedToAddToList,
}

#[derive(candid::CandidType, Clone, Serialize, Deserialize, Debug)]
pub enum OrderError {
    InvalidInput(String),
    UserProfileNotFound,
    InvalidProductInOrder(u64),
    OrderNotFound,
    AccessDenied,
    StorageError(String),
}
