import { toastsStore } from "@dfinity/gix-components";
import { backendActor } from "./agent";
import type { Product, UserProfile, Order, OrderItemInput, OrderStatus } from "./types";

// Products
export async function getProducts(): Promise<Product[]> {
  try {
    const result = await backendActor.get_products();
    // Ensure we're handling the response correctly
    // Convert backend product format to frontend format
    return (result || []).map(item => ({
      id: Number(item.id),
      name: item.name,
      unit: item.unit,
      description: item.description,
      price: Number(item.price)
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
    toastsStore.show({
      text: "Failed to fetch products",
      level: "error",
    });
    throw new Error("Failed to fetch products");
  }
}

// User Profile
export async function getProfileByPhone(phoneNumber: string): Promise<UserProfile | null> {
  try {
    const result = await backendActor.get_profile_by_phone(phoneNumber);
    if (result && "Ok" in result) {
      return result.Ok;
    }
    return null;
  } catch (error) {
    toastsStore.show({
      text: "Failed to fetch user profile",
      level: "error",
    });
    throw new Error("Failed to fetch user profile");
  }
}

// Alias for getProfileByPhone to maintain consistency
export async function getProfile(phoneNumber: string): Promise<UserProfile | null> {
  return getProfileByPhone(phoneNumber);
}

export async function createProfile(profile: UserProfile): Promise<boolean> {
  try {
    const result = await backendActor.create_profile(profile);
    if ("Ok" in result) {
      toastsStore.show({
        text: "Profile created successfully",
        level: "success",
      });
      return true;
    } else {
      toastsStore.show({
        text: `Failed to create profile: ${result.Err}`,
        level: "error",
      });
      return false;
    }
  } catch (error) {
    toastsStore.show({
      text: "Failed to create profile",
      level: "error",
    });
    throw new Error("Failed to create profile");
  }
}

export async function updateProfile(profile: UserProfile): Promise<boolean> {
  try {
    const result = await backendActor.update_profile(profile);
    if ("Ok" in result) {
      toastsStore.show({
        text: "Profile updated successfully",
        level: "success",
      });
      return true;
    } else {
      toastsStore.show({
        text: "Failed to update profile",
        level: "error",
      });
      return false;
    }
  } catch (error) {
    toastsStore.show({
      text: "Failed to update profile",
      level: "error",
    });
    throw new Error("Failed to update profile");
  }
}

// Orders
export async function createOrder(phoneNumber: string, items: OrderItemInput[], deliveryAddress: string): Promise<bigint | null> {
  try {
    // Convert frontend OrderItemInput to backend format
    const backendItems = items.map(item => ({
      product_id: BigInt(item.product_id),
      quantity: item.quantity
    }));
    
    const result = await backendActor.create_order(phoneNumber, backendItems, deliveryAddress);
    if ("Ok" in result) {
      toastsStore.show({
        text: "Order created successfully",
        level: "success",
      });
      return result.Ok;
    } else {
      toastsStore.show({
        text: `Failed to create order: ${result.Err}`,
        level: "error",
      });
      return null;
    }
  } catch (error) {
    toastsStore.show({
      text: "Failed to create order",
      level: "error",
    });
    throw new Error("Failed to create order");
  }
}

export async function getMyOrders(phoneNumber: string): Promise<Order[]> {
  try {
    const result = await backendActor.get_my_orders(phoneNumber);
    if ("Ok" in result) {
      // Convert backend Order format to frontend format
      return result.Ok.map(order => ({
        id: Number(order.id),
        status: order.status,
        total_amount: Number(order.total_amount),
        last_updated: Number(order.last_updated),
        user_phone_number: order.user_phone_number,
        delivery_address: order.delivery_address,
        timestamp: Number(order.timestamp),
        items: order.items.map(item => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          price_per_unit_at_order: Number(item.price_per_unit_at_order)
        }))
      }));
    } else {
      toastsStore.show({
        text: `Failed to fetch orders: ${result.Err}`,
        level: "error",
      });
      return [];
    }
  } catch (error) {
    toastsStore.show({
      text: "Failed to fetch orders",
      level: "error",
    });
    throw new Error("Failed to fetch orders");
  }
}

export async function getOrderDetails(orderId: bigint, phoneNumber: string): Promise<Order | null> {
  try {
    const result = await backendActor.get_order_details(orderId, phoneNumber);
    if ("Ok" in result) {
      // Convert backend Order to frontend Order
      const order = result.Ok;
      return {
        id: Number(order.id),
        status: order.status,
        total_amount: Number(order.total_amount),
        last_updated: Number(order.last_updated),
        user_phone_number: order.user_phone_number,
        delivery_address: order.delivery_address,
        timestamp: Number(order.timestamp),
        items: order.items.map(item => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          price_per_unit_at_order: Number(item.price_per_unit_at_order)
        }))
      };
    } else {
      toastsStore.show({
        text: `Failed to fetch order details: ${result.Err}`,
        level: "error",
      });
      return null;
    }
  } catch (error) {
    toastsStore.show({
      text: "Failed to fetch order details",
      level: "error",
    });
    throw new Error("Failed to fetch order details");
  }
}
