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

#[derive(candid::CandidType, Clone, Serialize, Deserialize, Debug)]
pub enum SubscriptionError {
    InvalidInput(String),
    UserProfileNotFound,
    ProductNotFound(u64),
    SubscriptionNotFound,
    AccessDenied,
    StorageError(String),
    AlreadyExists,
    UpdateFailed(String),
}
