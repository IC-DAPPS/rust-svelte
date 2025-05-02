export const idlFactory = ({ IDL }) => {
  const AddProductPayload = IDL.Record({
    'name' : IDL.Text,
    'unit' : IDL.Text,
    'description' : IDL.Text,
    'price' : IDL.Float64,
  });
  const Result = IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text });
  const UserProfile = IDL.Record({
    'name' : IDL.Text,
    'address' : IDL.Text,
    'phone_number' : IDL.Text,
  });
  const Result_1 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  const Result_2 = IDL.Variant({ 'Ok' : UserProfile, 'Err' : IDL.Text });
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
  const Result_3 = IDL.Variant({
    'Ok' : UserProfile,
    'Err' : GetUserDataError,
  });
  const Result_4 = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
  const Result_5 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : GetUserDataError });
  return IDL.Service({
    'add_product_admin' : IDL.Func([AddProductPayload], [Result], []),
    'create_profile' : IDL.Func([UserProfile], [Result_1], []),
    'delete_profile_admin' : IDL.Func([IDL.Text], [Result_2], []),
    'get_products' : IDL.Func([], [IDL.Vec(Product)], ['query']),
    'get_profile_by_phone' : IDL.Func([IDL.Text], [Result_3], ['query']),
    'initialize_products' : IDL.Func([], [Result_4], []),
    'is_dev_check' : IDL.Func([], [IDL.Bool], ['query']),
    'update_profile' : IDL.Func([UserProfile], [Result_5], []),
  });
};
export const init = ({ IDL }) => { return []; };
