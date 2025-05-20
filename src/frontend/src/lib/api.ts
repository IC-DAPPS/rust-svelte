import { toastsStore } from "@dfinity/gix-components";
import { backendActor } from "./agent";
import type { Product, UserProfile, Order, OrderItemInput, OrderStatus, Subscription, CreateSubscriptionPayload, UpdateSubscriptionDetailsPayload } from "./types";

// Products
export async function getProducts(): Promise<Product[]> {
  try {
    const result = await backendActor.get_products();
    // Ensure we're handling the response correctly
    // Convert backend product format to frontend format
    return (result || []).map(item => {
      let imageName;
      if (item.name === "Matha") {
        imageName = 'buttermilk.jpg';
      } else {
        imageName = item.name.toLowerCase().replace(/\s+/g, '-') + '.jpg'; // Assuming .jpg for all images
      }
      return {
        id: Number(item.id),
        name: item.name,
        unit: item.unit,
        description: item.description,
        price: Number(item.price),
        imageUrl: `/images/products/${imageName}`
      };
    });
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

export async function updateProduct(product: Product): Promise<Product | null> {
  try {
    // This would be the payload for the backend. Ensure types match.
    const payload = {
      id: BigInt(product.id), // Assuming backend expects BigInt for ID
      name: product.name,
      unit: product.unit,
      description: product.description,
      price: product.price, // Assuming backend expects number for price
    };

    console.log("Calling backendActor.update_product_admin with payload:", payload);
    // const result = await backendActor.update_product_admin(payload);
    // Simulate backend call for now
    await new Promise(resolve => setTimeout(resolve, 500));
    const result = { Ok: product.id }; // Simulate a successful response with the product ID

    if ('Ok' in result) {
      // The backend might return the full updated product or just an ID/status.
      // Here, we assume it was successful and return the product data passed in,
      // as if the backend confirmed the update without returning the full object.
      // Or, if backend returns the full object: return convertBackendProduct(result.Ok);
      toastsStore.show({
        text: `Product "${product.name}" updated successfully. (Simulated)`, // Added (Simulated)
        level: "success",
      });
      return product; // Return the product passed in, as it reflects the new state.
    } else {
      // console.error("Failed to update product:", result.Err);
      // toastsStore.show({
      //   text: "Failed to update product: " + result.Err,
      //   level: "error",
      // });
      // Simulate an error for demonstration if needed, or handle actual result.Err
      console.error("Simulated error or unhandled response from update_product_admin");
      toastsStore.show({
        text: "Failed to update product. (Simulated Error)",
        level: "error",
      });
      return null;
    }
  } catch (error) {
    console.error("Error updating product:", error);
    toastsStore.show({
      text: "An error occurred while updating product.",
      level: "error",
    });
    return null;
  }
}

export async function getSubscriptionDetailsAdmin(subscriptionId: bigint): Promise<Subscription | null> {
  try {
    // In a real backend, this might call a specific admin-authorized method
    // For now, we can simulate or call a generic one if available that doesn't require user phone for admin context
    // const result = await backendActor.get_subscription_details_admin(subscriptionId);

    // SIMULATION: We'll try to find it from getAllSubscriptions for now, or simulate a direct fetch.
    // This is NOT how you'd do it in production with a proper backend method.
    console.log(`Simulating Admin fetch for subscription ID: ${subscriptionId}`);
    const allSubscriptions = await getAllSubscriptions(); // Inefficient, just for simulation
    const foundSubscription = allSubscriptions.find(sub => sub.id === Number(subscriptionId));

    if (foundSubscription) {
      toastsStore.show({
        text: `Admin: Subscription details for ${subscriptionId} fetched (Simulated).`,
        level: "info",
      });
      return foundSubscription; // Already in frontend format due to getAllSubscriptions
    } else {
      // Simulate a case where backend would return an error or empty for a specific admin fetch
      // const result = await backendActor.get_subscription_details_admin(subscriptionId); 
      // if ("Ok" in result && result.Ok) { return convertBackendSubscription(result.Ok); }
      // else if ("Err" in result) { console.error(result.Err); } 

      toastsStore.show({
        text: `Admin: Subscription ID ${subscriptionId} not found (Simulated).`,
        level: "warning",
      });
      return null;
    }
  } catch (error) {
    console.error(`Error fetching subscription details for admin (ID: ${subscriptionId}):`, error);
    toastsStore.show({
      text: "Failed to fetch subscription details for admin.",
      level: "error",
    });
    throw new Error("Failed to fetch subscription details for admin");
  }
}

export async function getOrderDetailsAdmin(orderId: bigint): Promise<Order | null> {
  try {
    console.log(`Simulating API call to getOrderDetailsAdmin for order ID: ${orderId}`);
    // const result = await backendActor.get_order_details_admin(orderId);
    // For simulation, let's try to find it from getAllOrders.
    // This is NOT efficient for production but serves as a placeholder.
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
    const allOrders = await getAllOrders(); // This itself might call backend
    const foundOrder = allOrders.find(o => o.id === Number(orderId));

    if (foundOrder) {
      toastsStore.show({
        text: `Admin: Order details for ${orderId} fetched (Simulated).`,
        level: "info",
      });
      return foundOrder; // Already in frontend format due to getAllOrders
    } else {
      // const errorMsg = 'Err' in result ? result.Err : "Order not found";
      // console.error(`getOrderDetailsAdmin: Order ${orderId} not found or error:`, errorMsg);
      // toastsStore.show({
      //   text: `Failed to get order details: ${errorMsg} (Simulated)`,
      //   level: "warning",
      // });
      console.warn(`Simulated: Order ${orderId} not found in getOrderDetailsAdmin.`);
      toastsStore.show({
        text: `Admin: Order ${orderId} not found (Simulated).`,
        level: "warning",
      });
      return null;
    }
  } catch (error) {
    console.error(`Error in getOrderDetailsAdmin for order ${orderId}:`, error);
    toastsStore.show({
      text: "An error occurred while fetching order details for admin.",
      level: "error",
    });
    // Depending on how you want to handle errors, you might throw or return null
    // throw new Error("Failed to fetch order details for admin"); 
    return null;
  }
}

export async function updateOrderStatusAdmin(orderId: bigint, newStatus: OrderStatus): Promise<boolean> {
  try {
    console.log(`Simulating API call to update order ${orderId} to status:`, newStatus);
    // const result = await backendActor.update_order_status_admin(orderId, newStatus);
    await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay
    // const success = 'Ok' in result; // Or however your backend indicates success
    const success = true; // Simulate success

    if (success) {
      toastsStore.show({
        text: `Order ${orderId} status updated successfully (Simulated).`,
        level: "success",
      });
      return true;
    } else {
      // const errorMsg = 'Err' in result ? result.Err : "Unknown error";
      // console.error(`Failed to update order status for ${orderId}:`, errorMsg);
      // toastsStore.show({
      //   text: `Failed to update order status: ${errorMsg} (Simulated)`,
      //   level: "error",
      // });
      console.error(`Simulated failure to update order status for ${orderId}.`);
      toastsStore.show({
        text: `Failed to update order status for ${orderId} (Simulated).`,
        level: "error",
      });
      return false;
    }
  } catch (error) {
    console.error(`Error in updateOrderStatusAdmin for order ${orderId}:`, error);
    toastsStore.show({
      text: "An error occurred while updating order status.",
      level: "error",
    });
    return false;
  }
}
