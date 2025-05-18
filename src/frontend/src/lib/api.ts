import { toastsStore } from "@dfinity/gix-components";
import { backendActor } from "./agent";
import type { Product, UserProfile, Order, OrderItemInput, OrderStatus, Subscription, CreateSubscriptionPayload, UpdateSubscriptionDetailsPayload } from "./types";

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

// Admin API functions for products
export async function addProduct(product: Omit<Product, 'id'>): Promise<Product | null> {
  try {
    const payload = {
      name: product.name,
      unit: product.unit,
      description: product.description,
      price: product.price
    };

    const result = await backendActor.add_product_admin(payload);

    if ('Ok' in result) {
      const productId = Number(result.Ok);
      return {
        id: productId,
        ...product
      };
    } else {
      console.error("Failed to add product:", result.Err);
      toastsStore.show({
        text: "Failed to add product: " + result.Err,
        level: "error",
      });
      return null;
    }
  } catch (error) {
    console.error("Error adding product:", error);
    toastsStore.show({
      text: "Failed to add product",
      level: "error",
    });
    return null;
  }
}

// Admin functions for customers
export async function getAllCustomers(): Promise<UserProfile[]> {
  try {
    // Ab direct admin function ko call karenge
    const result = await backendActor.get_all_customers();

    // Agar result mila toh use return kar denge
    return result || [];

  } catch (error) {
    console.error("Error fetching customers:", error);
    toastsStore.show({
      text: "Saare customers fetch karne mein error aaya",
      level: "error",
    });

    // Error ke case mein empty array return karenge
    return [];
  }
}

// Admin functions for orders
export async function getAllOrders(): Promise<Order[]> {
  try {
    // Direct admin function ko call karenge
    const result = await backendActor.get_all_orders();

    if ("Ok" in result) {
      // Backend Order format ko frontend format mein convert karenge
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
      console.log("Orders fetch karne mein error:", result.Err);
      toastsStore.show({
        text: `Orders fetch karne mein fail: ${result.Err}`,
        level: "error",
      });
      return [];
    }
  } catch (error) {
    console.error("Orders fetch karne mein error:", error);
    toastsStore.show({
      text: "Saare orders fetch karne mein fail",
      level: "error",
    });
    throw new Error("Saare orders fetch karne mein fail");
  }
}

// Admin functions for subscriptions
export async function getAllSubscriptions(): Promise<Subscription[]> {
  try {
    // Direct admin function ko call karenge
    const result = await backendActor.get_all_subscriptions();

    if ("Ok" in result) {
      return result.Ok.map(subscription => convertBackendSubscription(subscription));
    } else {
      console.log("Subscriptions fetch karne mein error:", result.Err);
      toastsStore.show({
        text: `Subscriptions fetch karne mein fail: ${result.Err}`,
        level: "error",
      });
      return [];
    }
  } catch (error) {
    console.error("Subscriptions fetch karne mein error:", error);
    toastsStore.show({
      text: "Saare subscriptions fetch karne mein fail",
      level: "error",
    });
    throw new Error("Saare subscriptions fetch karne mein fail");
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

// Subscriptions

// Create a new subscription
export async function createSubscription(phoneNumber: string, payload: CreateSubscriptionPayload): Promise<Subscription | null> {
  try {
    // Convert frontend format to backend format
    const backendPayload = {
      items: payload.items.map(item => ({
        product_id: BigInt(item.product_id),
        quantity: item.quantity
      })),
      delivery_days: payload.delivery_days,
      delivery_time_slot: payload.delivery_time_slot,
      delivery_address: payload.delivery_address,
      start_date: BigInt(payload.start_date)
    };

    const result = await backendActor.create_subscription(phoneNumber, backendPayload);

    if ("Ok" in result) {
      // Convert backend subscription to frontend format
      const subscription = result.Ok;
      toastsStore.show({
        text: "Subscription created successfully",
        level: "success",
      });
      return convertBackendSubscription(subscription);
    } else {
      toastsStore.show({
        text: `Failed to create subscription: ${result.Err}`,
        level: "error",
      });
      return null;
    }
  } catch (error) {
    console.error("Error creating subscription:", error);
    toastsStore.show({
      text: "Failed to create subscription",
      level: "error",
    });
    throw new Error("Failed to create subscription");
  }
}

// Get subscriptions for a user
export async function getMySubscriptions(phoneNumber: string): Promise<Subscription[]> {
  try {
    const result = await backendActor.get_my_subscriptions(phoneNumber);

    if ("Ok" in result) {
      return result.Ok.map(subscription => convertBackendSubscription(subscription));
    } else {
      toastsStore.show({
        text: `Failed to fetch subscriptions: ${result.Err}`,
        level: "error",
      });
      return [];
    }
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    toastsStore.show({
      text: "Failed to fetch subscriptions",
      level: "error",
    });
    throw new Error("Failed to fetch subscriptions");
  }
}

// Get details for a specific subscription
export async function getSubscriptionDetails(subscriptionId: bigint, phoneNumber: string): Promise<Subscription | null> {
  try {
    const result = await backendActor.get_subscription_details(subscriptionId, phoneNumber);

    if ("Ok" in result) {
      return convertBackendSubscription(result.Ok);
    } else {
      toastsStore.show({
        text: `Failed to fetch subscription details: ${result.Err}`,
        level: "error",
      });
      return null;
    }
  } catch (error) {
    console.error("Error fetching subscription details:", error);
    toastsStore.show({
      text: "Failed to fetch subscription details",
      level: "error",
    });
    throw new Error("Failed to fetch subscription details");
  }
}

// Cancel a subscription
export async function cancelSubscription(subscriptionId: bigint, phoneNumber: string): Promise<boolean> {
  try {
    const result = await backendActor.cancel_subscription(subscriptionId, phoneNumber);

    if ("Ok" in result) {
      toastsStore.show({
        text: "Subscription cancelled successfully",
        level: "success",
      });
      return true;
    } else {
      toastsStore.show({
        text: `Failed to cancel subscription: ${result.Err}`,
        level: "error",
      });
      return false;
    }
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    toastsStore.show({
      text: "Failed to cancel subscription",
      level: "error",
    });
    throw new Error("Failed to cancel subscription");
  }
}

// Pause a subscription
export async function pauseSubscription(subscriptionId: bigint, phoneNumber: string): Promise<boolean> {
  try {
    const result = await backendActor.pause_subscription(subscriptionId, phoneNumber);

    if ("Ok" in result) {
      toastsStore.show({
        text: "Subscription paused successfully",
        level: "success",
      });
      return true;
    } else {
      toastsStore.show({
        text: `Failed to pause subscription: ${result.Err}`,
        level: "error",
      });
      return false;
    }
  } catch (error) {
    console.error("Error pausing subscription:", error);
    toastsStore.show({
      text: "Failed to pause subscription",
      level: "error",
    });
    throw new Error("Failed to pause subscription");
  }
}

// Resume a subscription
export async function resumeSubscription(subscriptionId: bigint, phoneNumber: string): Promise<boolean> {
  try {
    const result = await backendActor.resume_subscription(subscriptionId, phoneNumber);

    if ("Ok" in result) {
      toastsStore.show({
        text: "Subscription resumed successfully",
        level: "success",
      });
      return true;
    } else {
      toastsStore.show({
        text: `Failed to resume subscription: ${result.Err}`,
        level: "error",
      });
      return false;
    }
  } catch (error) {
    console.error("Error resuming subscription:", error);
    toastsStore.show({
      text: "Failed to resume subscription",
      level: "error",
    });
    throw new Error("Failed to resume subscription");
  }
}

// Update subscription details
export async function updateSubscriptionDetails(
  subscriptionId: bigint,
  phoneNumber: string,
  updatePayload: UpdateSubscriptionDetailsPayload
): Promise<Subscription | null> {
  try {
    // Convert frontend format to backend format
    const backendPayload: any = {};

    if (updatePayload.items) {
      backendPayload.items = updatePayload.items.map(item => ({
        product_id: BigInt(item.product_id),
        quantity: item.quantity
      }));
    }

    if (updatePayload.delivery_days) {
      backendPayload.delivery_days = updatePayload.delivery_days;
    }

    if (updatePayload.delivery_time_slot) {
      backendPayload.delivery_time_slot = updatePayload.delivery_time_slot;
    }

    if (updatePayload.delivery_address) {
      backendPayload.delivery_address = updatePayload.delivery_address;
    }

    const result = await backendActor.update_subscription_details(
      subscriptionId,
      phoneNumber,
      backendPayload
    );

    if ("Ok" in result) {
      toastsStore.show({
        text: "Subscription updated successfully",
        level: "success",
      });
      return convertBackendSubscription(result.Ok);
    } else {
      toastsStore.show({
        text: `Failed to update subscription: ${result.Err}`,
        level: "error",
      });
      return null;
    }
  } catch (error) {
    console.error("Error updating subscription:", error);
    toastsStore.show({
      text: "Failed to update subscription",
      level: "error",
    });
    throw new Error("Failed to update subscription");
  }
}

// Helper function to convert backend subscription format to frontend format
function convertBackendSubscription(backendSubscription: any): Subscription {
  return {
    id: Number(backendSubscription.id),
    user_phone_number: backendSubscription.user_phone_number,
    items: backendSubscription.items.map((item: any) => ({
      product_id: Number(item.product_id),
      quantity: Number(item.quantity)
    })),
    delivery_days: backendSubscription.delivery_days,
    delivery_time_slot: backendSubscription.delivery_time_slot,
    delivery_address: backendSubscription.delivery_address,
    start_date: backendSubscription.start_date ? Number(backendSubscription.start_date) / 1000000 : 0,
    status: backendSubscription.status,
    next_order_date: backendSubscription.next_order_date ? Number(backendSubscription.next_order_date) / 1000000 : 0,
    created_at: backendSubscription.created_at ? Number(backendSubscription.created_at) / 1000000 : 0,
    updated_at: backendSubscription.updated_at ? Number(backendSubscription.updated_at) / 1000000 : 0,
  };
}
