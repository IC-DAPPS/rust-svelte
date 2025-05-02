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
export interface Product {
  'id' : bigint,
  'name' : string,
  'unit' : string,
  'description' : string,
  'price' : number,
}
export type Result = { 'Ok' : bigint } |
  { 'Err' : string };
export type Result_1 = { 'Ok' : null } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : UserProfile } |
  { 'Err' : string };
export type Result_3 = { 'Ok' : UserProfile } |
  { 'Err' : GetUserDataError };
export type Result_4 = { 'Ok' : string } |
  { 'Err' : string };
export type Result_5 = { 'Ok' : null } |
  { 'Err' : GetUserDataError };
export interface UserProfile {
  'name' : string,
  'address' : string,
  'phone_number' : string,
}
export interface _SERVICE {
  'add_product_admin' : ActorMethod<[AddProductPayload], Result>,
  'create_profile' : ActorMethod<[UserProfile], Result_1>,
  'delete_profile_admin' : ActorMethod<[string], Result_2>,
  'get_products' : ActorMethod<[], Array<Product>>,
  'get_profile_by_phone' : ActorMethod<[string], Result_3>,
  'initialize_products' : ActorMethod<[], Result_4>,
  'is_dev_check' : ActorMethod<[], boolean>,
  'update_profile' : ActorMethod<[UserProfile], Result_5>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
