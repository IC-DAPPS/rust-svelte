export const idlFactory = ({ IDL }) => {
  const AddProductPayload = IDL.Record({
    'name' : IDL.Text,
    'unit' : IDL.Text,
    'description' : IDL.Text,
    'price' : IDL.Float64,
  });
  const Result = IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text });
  const OrderStatus = IDL.Variant({
    'Delivered' : IDL.Null,
    'Confirmed' : IDL.Null,
    'Cancelled' : IDL.Null,
    'Processing' : IDL.Null,
    'OutForDelivery' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const OrderItem = IDL.Record({
    'product_id' : IDL.Nat64,
    'quantity' : IDL.Float64,
    'price_per_unit_at_order' : IDL.Float64,
  });
  const Order = IDL.Record({
    'id' : IDL.Nat64,
    'status' : OrderStatus,
    'total_amount' : IDL.Float64,
    'last_updated' : IDL.Nat64,
    'user_phone_number' : IDL.Text,
    'delivery_address' : IDL.Text,
    'timestamp' : IDL.Nat64,
    'items' : IDL.Vec(OrderItem),
    'customer_name' : IDL.Text,
  });
  const OrderError = IDL.Variant({
    'AccessDenied' : IDL.Null,
    'CannotCancelOrder' : IDL.Text,
    'InvalidInput' : IDL.Text,
    'InvalidProductInOrder' : IDL.Nat64,
    'OrderNotFound' : IDL.Null,
    'UserProfileNotFound' : IDL.Null,
    'StorageError' : IDL.Text,
  });
  const Result_1 = IDL.Variant({ 'Ok' : Order, 'Err' : OrderError });
  const OrderItemInput = IDL.Record({
    'product_id' : IDL.Nat64,
    'quantity' : IDL.Float64,
  });
  const Result_2 = IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : OrderError });
  const UserProfile = IDL.Record({
    'name' : IDL.Text,
    'order_ids' : IDL.Vec(IDL.Nat64),
    'address' : IDL.Text,
    'phone_number' : IDL.Text,
  });
  const Result_3 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  const Result_4 = IDL.Variant({ 'Ok' : UserProfile, 'Err' : IDL.Text });
  const Result_5 = IDL.Variant({ 'Ok' : IDL.Vec(Order), 'Err' : OrderError });
  const Product = IDL.Record({
    'id' : IDL.Nat64,
    'name' : IDL.Text,
    'unit' : IDL.Text,
    'description' : IDL.Text,
    'price' : IDL.Float64,
  });
  const GetUserDataError = IDL.Variant({
    'FailedToAddToList' : IDL.Null,
    'DidntFindUserData' : IDL.Null,
    'AnonymousCaller' : IDL.Null,
  });
  const Result_6 = IDL.Variant({
    'Ok' : UserProfile,
    'Err' : GetUserDataError,
  });
  const Result_7 = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
  const Result_8 = IDL.Variant({ 'Ok' : Product, 'Err' : IDL.Text });
  const Result_9 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : GetUserDataError });
  return IDL.Service({
    'add_product_admin' : IDL.Func([AddProductPayload], [Result], []),
    'cancel_my_order' : IDL.Func([IDL.Nat64, IDL.Text], [Result_1], []),
    'create_order' : IDL.Func(
        [IDL.Text, IDL.Vec(OrderItemInput), IDL.Text],
        [Result_2],
        [],
      ),
    'create_profile' : IDL.Func([UserProfile], [Result_3], []),
    'delete_profile_admin' : IDL.Func([IDL.Text], [Result_4], []),
    'get_all_customers' : IDL.Func([], [IDL.Vec(UserProfile)], ['query']),
    'get_all_orders' : IDL.Func([], [Result_5], ['query']),
    'get_my_orders' : IDL.Func([IDL.Text], [Result_5], ['query']),
    'get_order_details' : IDL.Func(
        [IDL.Nat64, IDL.Text],
        [Result_1],
        ['query'],
      ),
    'get_order_details_admin' : IDL.Func([IDL.Nat64], [Result_1], ['query']),
    'get_products' : IDL.Func([], [IDL.Vec(Product)], ['query']),
    'get_profile_by_phone' : IDL.Func([IDL.Text], [Result_6], ['query']),
    'initialize_products' : IDL.Func([], [Result_7], []),
    'is_dev_check' : IDL.Func([], [IDL.Bool], ['query']),
    'update_order_status_admin' : IDL.Func(
        [IDL.Nat64, OrderStatus],
        [Result_1],
        [],
      ),
    'update_product_admin' : IDL.Func(
        [IDL.Nat64, AddProductPayload],
        [Result_8],
        [],
      ),
    'update_profile' : IDL.Func([UserProfile], [Result_9], []),
  });
};
export const init = ({ IDL }) => { return []; };
