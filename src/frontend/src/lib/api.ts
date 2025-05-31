import { backendActorPromise } from "./agent";
import type { Product as FrontendProduct, UserProfile, Order as FrontendOrder, OrderItemInput, OrderStatus } from "./types";

// Simple custom toast function
function showToast({ text, level }: { text: string, level: string }) {
  // For now, just log to console. Replace with UI toast if needed.
  console[level === 'error' ? 'error' : 'log'](`[${level.toUpperCase()}] ${text}`);
}

// Products
export async function getProducts(): Promise<FrontendProduct[]> {
  try {
    const actor = await backendActorPromise;
    const result = await actor.get_products();
    // Ensure we're handling the response correctly
    // Convert backend product format to frontend format
    return (result || []).map((item: any) => {
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
    showToast({
      text: "Failed to fetch products",
      level: "error",
    });
    throw new Error("Failed to fetch products");
  }
}

// Admin API functions for products
export async function addProduct(product: Omit<FrontendProduct, 'id'>): Promise<FrontendProduct | null> {
  try {
    const actor = await backendActorPromise;
    const payload = {
      name: product.name,
      unit: product.unit,
      description: product.description,
      price: product.price
    };

    const result = await actor.add_product_admin(payload);

    if ('Ok' in result) {
      const productId = Number(result.Ok);
      return {
        id: productId,
        ...product
      };
    } else {
      showToast({
        text: "Failed to add product: " + result.Err,
        level: "error",
      });
      return null;
    }
  } catch (error) {
    showToast({
      text: "Failed to add product",
      level: "error",
    });
    return null;
  }
}

// Admin functions for customers
export async function getAllCustomers(): Promise<UserProfile[]> {
  try {
    const actor = await backendActorPromise;
    const result = await actor.get_all_customers();
    return result.map((customer: any) => ({
      name: customer.name,
      address: customer.address,
      phone_number: customer.phone_number,
      order_ids: Array.from(customer.order_ids).map((id: any) => Number(id))
    }));
  } catch (error) {
    showToast({
      text: "Saare customers fetch karne mein error aaya",
      level: "error",
    });
    return [];
  }
}

// Admin functions for orders
export async function getAllOrders(): Promise<FrontendOrder[]> {
  try {
    const actor = await backendActorPromise;
    const result = await actor.get_all_orders();

    if ("Ok" in result) {
      return result.Ok.map((order: any) => ({
        id: Number(order.id),
        status: order.status,
        total_amount: Number(order.total_amount),
        last_updated: Number(order.last_updated),
        user_phone_number: order.user_phone_number,
        customer_name: order.customer_name,
        delivery_address: order.delivery_address,
        timestamp: Number(order.timestamp),
        items: order.items.map((item: any) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          price_per_unit_at_order: Number(item.price_per_unit_at_order)
        }))
      }));
    } else {
      showToast({
        text: `Orders fetch karne mein fail: ${result.Err}`,
        level: "error",
      });
      return [];
    }
  } catch (error) {
    showToast({
      text: "Saare orders fetch karne mein fail",
      level: "error",
    });
    throw new Error("Saare orders fetch karne mein fail");
  }
}

// User Profile
export async function getProfileByPhone(phoneNumber: string): Promise<UserProfile | null> {
  try {
    const actor = await backendActorPromise;
    const result = await actor.get_profile_by_phone(phoneNumber);
    if (result && "Ok" in result) {
      const profile = result.Ok;
      return {
        name: profile.name,
        address: profile.address,
        phone_number: profile.phone_number,
        order_ids: Array.from(profile.order_ids).map(id => Number(id))
      };
    }
    return null;
  } catch (error) {
    showToast({
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
    const actor = await backendActorPromise;
    const profileToSend = {
      name: profile.name,
      address: profile.address,
      phone_number: profile.phone_number,
      order_ids: profile.order_ids.map(id => BigInt(id))
    };

    console.log("Creating profile with data:", JSON.stringify(profileToSend));
    console.log("order_ids type:", Array.isArray(profileToSend.order_ids) ? "Array" : typeof profileToSend.order_ids);
    console.log("order_ids value:", profileToSend.order_ids);

    const result = await actor.create_profile(profileToSend);
    console.log("Backend create_profile result:", result);

    if ("Ok" in result) {
      showToast({
        text: "Profile created successfully",
        level: "success",
      });
      return true;
    } else {
      console.error("Backend returned error:", result.Err);
      showToast({
        text: `Failed to create profile: ${result.Err}`,
        level: "error",
      });
      return false;
    }
  } catch (error) {
    console.error("Exception in createProfile:", error);
    showToast({
      text: "Failed to create profile",
      level: "error",
    });
    return false;
  }
}

export async function updateProfile(profile: UserProfile): Promise<boolean> {
  try {
    const actor = await backendActorPromise;
    const profileToSend = {
      name: profile.name,
      address: profile.address,
      phone_number: profile.phone_number,
      order_ids: profile.order_ids.map(id => BigInt(id))
    };

    const result = await actor.update_profile(profileToSend);
    if ("Ok" in result) {
      showToast({
        text: "Profile updated successfully",
        level: "success",
      });
      return true;
    } else {
      showToast({
        text: `Failed to update profile: ${result.Err}`,
        level: "error",
      });
      return false;
    }
  } catch (error) {
    showToast({
      text: "Failed to update profile",
      level: "error",
    });
    return false;
  }
}

// Orders
export async function createOrder(phoneNumber: string, items: OrderItemInput[], deliveryAddress: string): Promise<bigint | null> {
  try {
    const actor = await backendActorPromise;
    const itemsToSend = items.map(item => ({
      ...item,
      product_id: BigInt(item.product_id)
    }));

    const result = await actor.create_order(phoneNumber, itemsToSend, deliveryAddress);
    if ("Ok" in result) {
      showToast({
        text: "Order created successfully!",
        level: "success",
      });

      // Indicate a successful order creation for use by the Orders page
      localStorage.setItem("newOrderCreated", "true");
      localStorage.setItem("lastOrderId", result.Ok.toString());

      return result.Ok;
    } else {
      showToast({
        text: `Failed to create order: ${JSON.stringify(result.Err)}`,
        level: "error",
      });
      return null;
    }
  } catch (error) {
    showToast({
      text: "Failed to create order",
      level: "error",
    });
    return null;
  }
}

export async function getMyOrders(phoneNumber: string): Promise<FrontendOrder[]> {
  try {
    const actor = await backendActorPromise;
    const result = await actor.get_my_orders(phoneNumber);
    if ("Ok" in result) {
      return result.Ok.map((order: any) => ({
        id: Number(order.id),
        status: order.status,
        total_amount: Number(order.total_amount),
        last_updated: Number(order.last_updated),
        user_phone_number: order.user_phone_number,
        delivery_address: order.delivery_address,
        timestamp: Number(order.timestamp),
        items: order.items.map((item: any) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          price_per_unit_at_order: Number(item.price_per_unit_at_order)
        }))
      }));
    } else {
      showToast({
        text: `Failed to fetch orders: ${JSON.stringify(result.Err)}`,
        level: "error",
      });
      return [];
    }
  } catch (error) {
    showToast({
      text: "Failed to fetch orders",
      level: "error",
    });
    return [];
  }
}

export async function getOrderDetails(orderId: bigint, phoneNumber: string): Promise<FrontendOrder | null> {
  try {
    const actor = await backendActorPromise;
    const result = await actor.get_order_details(orderId, phoneNumber);
    if ("Ok" in result) {
      const order: any = result.Ok;
      return {
        id: Number(order.id),
        status: order.status,
        total_amount: Number(order.total_amount),
        last_updated: Number(order.last_updated),
        user_phone_number: order.user_phone_number,
        delivery_address: order.delivery_address,
        timestamp: Number(order.timestamp),
        items: order.items.map((item: any) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          price_per_unit_at_order: Number(item.price_per_unit_at_order)
        }))
      };
    } else {
      showToast({
        text: `Failed to fetch order details: ${JSON.stringify(result.Err)}`,
        level: "error",
      });
      return null;
    }
  } catch (error) {
    showToast({
      text: "Failed to fetch order details",
      level: "error",
    });
    return null;
  }
}

export async function updateProduct(product: FrontendProduct): Promise<FrontendProduct | null> {
  try {
    const actor = await backendActorPromise;
    const payload = {
      name: product.name,
      unit: product.unit,
      description: product.description,
      price: product.price
    };

    const result = await actor.update_product_admin(BigInt(product.id), payload);

    if ('Ok' in result) {
      const updatedProduct = result.Ok;
      return {
        id: Number(updatedProduct.id),
        name: updatedProduct.name,
        unit: updatedProduct.unit,
        description: updatedProduct.description,
        price: Number(updatedProduct.price),
        imageUrl: product.imageUrl // Keep the existing image URL
      };
    } else {
      showToast({
        text: "Failed to update product: " + result.Err,
        level: "error",
      });
      return null;
    }
  } catch (error) {
    showToast({
      text: "Failed to update product",
      level: "error",
    });
    return null;
  }
}

export async function getOrderDetailsAdmin(orderId: bigint): Promise<FrontendOrder | null> {
  try {
    const actor = await backendActorPromise;
    const result = await actor.get_order_details_admin(orderId);
    if ("Ok" in result) {
      const order: any = result.Ok;
      return {
        id: Number(order.id),
        status: order.status,
        total_amount: Number(order.total_amount),
        last_updated: Number(order.last_updated),
        user_phone_number: order.user_phone_number,
        customer_name: order.customer_name,
        delivery_address: order.delivery_address,
        timestamp: Number(order.timestamp),
        items: order.items.map((item: any) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          price_per_unit_at_order: Number(item.price_per_unit_at_order)
        }))
      };
    } else {
      showToast({
        text: `Failed to fetch order details: ${JSON.stringify(result.Err)}`,
        level: "error",
      });
      return null;
    }
  } catch (error) {
    showToast({
      text: "Failed to fetch order details",
      level: "error",
    });
    return null;
  }
}

export async function updateOrderStatusAdmin(orderId: bigint, newStatus: OrderStatus): Promise<boolean> {
  try {
    const actor = await backendActorPromise;
    const result = await actor.update_order_status_admin(orderId, newStatus);
    if ("Ok" in result) {
      showToast({
        text: "Order status updated successfully",
        level: "success",
      });
      return true;
    } else {
      showToast({
        text: `Failed to update order status: ${JSON.stringify(result.Err)}`,
        level: "error",
      });
      return false;
    }
  } catch (error) {
    showToast({
      text: "Failed to update order status",
      level: "error",
    });
    return false;
  }
}

export async function cancelMyOrder(orderId: bigint, phoneNumber: string): Promise<FrontendOrder | null> {
  try {
    const actor = await backendActorPromise;
    const result = await actor.cancel_my_order(orderId, phoneNumber);
    if ("Ok" in result) {
      showToast({
        text: "Order cancelled successfully!",
        level: "success",
      });
      // Convert backend order to frontend order
      const backendOrder: any = result.Ok;
      return {
        id: Number(backendOrder.id),
        status: backendOrder.status, // Assuming OrderStatus is compatible
        total_amount: Number(backendOrder.total_amount),
        last_updated: Number(backendOrder.last_updated),
        user_phone_number: backendOrder.user_phone_number,
        delivery_address: backendOrder.delivery_address,
        timestamp: Number(backendOrder.timestamp),
        items: backendOrder.items.map((item: any) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          price_per_unit_at_order: Number(item.price_per_unit_at_order)
        }))
      };
    } else {
      let errorMessage = "Failed to cancel order.";
      if (result.Err && 'CannotCancelOrder' in result.Err) {
        errorMessage = result.Err.CannotCancelOrder;
      } else if (result.Err && 'OrderNotFound' in result.Err) {
        errorMessage = "Order not found.";
      } else if (result.Err && 'AccessDenied' in result.Err) {
        errorMessage = "You do not have permission to cancel this order.";
      } else if (result.Err && 'InvalidInput' in result.Err) {
        errorMessage = `Invalid input: ${result.Err.InvalidInput}`;
      } else if (result.Err && 'UserProfileNotFound' in result.Err) {
        errorMessage = "User profile not found.";
      } else if (result.Err && 'StorageError' in result.Err) {
        errorMessage = `Storage error: ${result.Err.StorageError}`;
      }
      showToast({
        text: errorMessage,
        level: "error",
      });
      return null;
    }
  } catch (error) {
    showToast({
      text: "An unexpected error occurred while cancelling the order.",
      level: "error",
    });
    return null;
  }
}
