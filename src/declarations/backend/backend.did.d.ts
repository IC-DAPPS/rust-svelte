import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AddProductPayload {
  'name' : string,
  'unit' : string,
  'description' : string,
  'price' : number,
}
export type GetUserDataError = { 'FailedToAddToList' : null } |
  { 'DidntFindUserData' : null } |
  { 'AnonymousCaller' : null };
export interface Order {
  'id' : bigint,
  'status' : OrderStatus,
  'total_amount' : number,
  'last_updated' : bigint,
  'user_phone_number' : string,
  'delivery_address' : string,
  'timestamp' : bigint,
  'items' : Array<OrderItem>,
  'customer_name' : string,
}
export type OrderError = { 'AccessDenied' : null } |
  { 'CannotCancelOrder' : string } |
  { 'InvalidInput' : string } |
  { 'InvalidProductInOrder' : bigint } |
  { 'OrderNotFound' : null } |
  { 'UserProfileNotFound' : null } |
  { 'StorageError' : string };
export interface OrderItem {
  'product_id' : bigint,
  'quantity' : number,
  'price_per_unit_at_order' : number,
}
export interface OrderItemInput { 'product_id' : bigint, 'quantity' : number }
export type OrderStatus = { 'Delivered' : null } |
  { 'Confirmed' : null } |
  { 'Cancelled' : null } |
  { 'Processing' : null } |
  { 'OutForDelivery' : null } |
  { 'Pending' : null };
export interface Product {
  'id' : bigint,
  'name' : string,
  'unit' : string,
  'description' : string,
  'price' : number,
}
export type Result = { 'Ok' : bigint } |
  { 'Err' : string };
export type Result_1 = { 'Ok' : Order } |
  { 'Err' : OrderError };
export type Result_2 = { 'Ok' : bigint } |
  { 'Err' : OrderError };
export type Result_3 = { 'Ok' : null } |
  { 'Err' : string };
export type Result_4 = { 'Ok' : UserProfile } |
  { 'Err' : string };
export type Result_5 = { 'Ok' : Array<Order> } |
  { 'Err' : OrderError };
export type Result_6 = { 'Ok' : UserProfile } |
  { 'Err' : GetUserDataError };
export type Result_7 = { 'Ok' : string } |
  { 'Err' : string };
export type Result_8 = { 'Ok' : Product } |
  { 'Err' : string };
export type Result_9 = { 'Ok' : null } |
  { 'Err' : GetUserDataError };
export interface UserProfile {
  'name' : string,
  'order_ids' : BigUint64Array | bigint[],
  'address' : string,
  'phone_number' : string,
}
export interface _SERVICE {
  'add_product_admin' : ActorMethod<[AddProductPayload], Result>,
  'cancel_my_order' : ActorMethod<[bigint, string], Result_1>,
  'create_order' : ActorMethod<
    [string, Array<OrderItemInput>, string],
    Result_2
  >,
  'create_profile' : ActorMethod<[UserProfile], Result_3>,
  'delete_profile_admin' : ActorMethod<[string], Result_4>,
  'get_all_customers' : ActorMethod<[], Array<UserProfile>>,
  'get_all_orders' : ActorMethod<[], Result_5>,
  'get_my_orders' : ActorMethod<[string], Result_5>,
  'get_order_details' : ActorMethod<[bigint, string], Result_1>,
  'get_order_details_admin' : ActorMethod<[bigint], Result_1>,
  'get_products' : ActorMethod<[], Array<Product>>,
  'get_profile_by_phone' : ActorMethod<[string], Result_6>,
  'initialize_products' : ActorMethod<[], Result_7>,
  'is_dev_check' : ActorMethod<[], boolean>,
  'update_order_status_admin' : ActorMethod<[bigint, OrderStatus], Result_1>,
  'update_product_admin' : ActorMethod<[bigint, AddProductPayload], Result_8>,
  'update_profile' : ActorMethod<[UserProfile], Result_9>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
