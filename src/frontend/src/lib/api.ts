import { toastsStore } from "@dfinity/gix-components";
import { backendActor } from "./agent";
import type { Product, UserProfile, Order, OrderItemInput, OrderStatus } from "./types";

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
    const result = await backendActor.get_all_customers();
    return result.map(customer => ({
      name: customer.name,
      address: customer.address,
      phone_number: customer.phone_number,
      order_ids: Array.from(customer.order_ids).map(id => Number(id))
    }));
  } catch (error) {
    console.error("Error fetching customers:", error);
    toastsStore.show({
      text: "Saare customers fetch karne mein error aaya",
      level: "error",
    });
    return [];
  }
}

// Admin functions for orders
export async function getAllOrders(): Promise<Order[]> {
  try {
    const result = await backendActor.get_all_orders();

    if ("Ok" in result) {
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

// User Profile
export async function getProfileByPhone(phoneNumber: string): Promise<UserProfile | null> {
  try {
    const result = await backendActor.get_profile_by_phone(phoneNumber);
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
    const profileToSend = {
      name: profile.name,
      address: profile.address,
      phone_number: profile.phone_number,
      order_ids: profile.order_ids.map(id => BigInt(id))
    };

    console.log("Creating profile with data:", JSON.stringify(profileToSend));
    console.log("order_ids type:", Array.isArray(profileToSend.order_ids) ? "Array" : typeof profileToSend.order_ids);
    console.log("order_ids value:", profileToSend.order_ids);

    const result = await backendActor.create_profile(profileToSend);
    console.log("Backend create_profile result:", result);

    if ("Ok" in result) {
      toastsStore.show({
        text: "Profile created successfully",
        level: "success",
      });
      return true;
    } else {
      console.error("Backend returned error:", result.Err);
      toastsStore.show({
        text: `Failed to create profile: ${result.Err}`,
        level: "error",
      });
      return false;
    }
  } catch (error) {
    console.error("Exception in createProfile:", error);
    toastsStore.show({
      text: "Failed to create profile",
      level: "error",
    });
    return false;
  }
}

export async function updateProfile(profile: UserProfile): Promise<boolean> {
  try {
    const profileToSend = {
      name: profile.name,
      address: profile.address,
      phone_number: profile.phone_number,
      order_ids: profile.order_ids.map(id => BigInt(id))
    };

    const result = await backendActor.update_profile(profileToSend);
    if ("Ok" in result) {
      toastsStore.show({
        text: "Profile updated successfully",
        level: "success",
      });
      return true;
    } else {
      toastsStore.show({
        text: `Failed to update profile: ${result.Err}`,
        level: "error",
      });
      return false;
    }
  } catch (error) {
    toastsStore.show({
      text: "Failed to update profile",
      level: "error",
    });
    return false;
  }
}

// Orders
export async function createOrder(phoneNumber: string, items: OrderItemInput[], deliveryAddress: string): Promise<bigint | null> {
  try {
    const itemsToSend = items.map(item => ({
      ...item,
      product_id: BigInt(item.product_id)
    }));

    const result = await backendActor.create_order(phoneNumber, itemsToSend, deliveryAddress);
    if ("Ok" in result) {
      toastsStore.show({
        text: "Order created successfully!",
        level: "success",
      });

      // Indicate a successful order creation for use by the Orders page
      localStorage.setItem("newOrderCreated", "true");
      localStorage.setItem("lastOrderId", result.Ok.toString());

      return result.Ok;
    } else {
      console.error("Failed to create order:", result.Err);
      toastsStore.show({
        text: `Failed to create order: ${JSON.stringify(result.Err)}`,
        level: "error",
      });
      return null;
    }
  } catch (error) {
    console.error("Error creating order:", error);
    toastsStore.show({
      text: "Failed to create order",
      level: "error",
    });
    return null;
  }
}

export async function getMyOrders(phoneNumber: string): Promise<Order[]> {
  try {
    const result = await backendActor.get_my_orders(phoneNumber);
    if ("Ok" in result) {
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
      console.error("Failed to fetch orders:", result.Err);
      toastsStore.show({
        text: `Failed to fetch orders: ${JSON.stringify(result.Err)}`,
        level: "error",
      });
      return [];
    }
  } catch (error) {
    console.error("Error fetching orders:", error);
    toastsStore.show({
      text: "Failed to fetch orders",
      level: "error",
    });
    return [];
  }
}

export async function getOrderDetails(orderId: bigint, phoneNumber: string): Promise<Order | null> {
  try {
    const result = await backendActor.get_order_details(orderId, phoneNumber);
    if ("Ok" in result) {
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
      console.error("Failed to fetch order details:", result.Err);
      toastsStore.show({
        text: `Failed to fetch order details: ${JSON.stringify(result.Err)}`,
        level: "error",
      });
      return null;
    }
  } catch (error) {
    console.error("Error fetching order details:", error);
    toastsStore.show({
      text: "Failed to fetch order details",
      level: "error",
    });
    return null;
  }
}

export async function updateProduct(product: Product): Promise<Product | null> {
  try {
    const payload = {
      name: product.name,
      unit: product.unit,
      description: product.description,
      price: product.price
    };

    const result = await backendActor.update_product_admin(BigInt(product.id), payload);

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
      console.error("Failed to update product:", result.Err);
      toastsStore.show({
        text: "Failed to update product: " + result.Err,
        level: "error",
      });
      return null;
    }
  } catch (error) {
    console.error("Error updating product:", error);
    toastsStore.show({
      text: "Failed to update product",
      level: "error",
    });
    return null;
  }
}

export async function getOrderDetailsAdmin(orderId: bigint): Promise<Order | null> {
  try {
    const result = await backendActor.get_order_details_admin(orderId);
    if ("Ok" in result) {
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
      console.error("Failed to fetch order details:", result.Err);
      toastsStore.show({
        text: `Failed to fetch order details: ${JSON.stringify(result.Err)}`,
        level: "error",
      });
      return null;
    }
  } catch (error) {
    console.error("Error fetching order details:", error);
    toastsStore.show({
      text: "Failed to fetch order details",
      level: "error",
    });
    return null;
  }
}

export async function updateOrderStatusAdmin(orderId: bigint, newStatus: OrderStatus): Promise<boolean> {
  try {
    const result = await backendActor.update_order_status_admin(orderId, newStatus);
    if ("Ok" in result) {
      toastsStore.show({
        text: "Order status updated successfully",
        level: "success",
      });
      return true;
    } else {
      console.error("Failed to update order status:", result.Err);
      toastsStore.show({
        text: `Failed to update order status: ${JSON.stringify(result.Err)}`,
        level: "error",
      });
      return false;
    }
  } catch (error) {
    console.error("Error updating order status:", error);
    toastsStore.show({
      text: "Failed to update order status",
      level: "error",
    });
    return false;
  }
}
