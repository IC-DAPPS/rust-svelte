<script lang="ts">
  import { onMount } from "svelte";
  import { getMyOrders, createOrder, cancelMyOrder } from "$lib/api";
  import type { Order, OrderItemInput } from "$lib/types";
  import { goto } from "$app/navigation";
  import { toastsStore } from "@dfinity/gix-components";
  import { cartStore } from "$lib/stores/cart";

  let orders: Order[] = [];
  let loading = true;
  let error = false;
  let phoneNumber = "";
  let isLoggedIn = false;
  let attemptCount = 0; // Track load attempts

  onMount(() => {
    // Check if user is already logged in via localStorage
    const storedPhoneNumber = localStorage.getItem("userPhoneNumber");
    if (storedPhoneNumber) {
      phoneNumber = storedPhoneNumber;
      isLoggedIn = true;
      loadOrders();

      // Check if we just came from order creation
      const newOrderCreated = localStorage.getItem("newOrderCreated");
      if (newOrderCreated === "true") {
        // Clear the flag
        localStorage.removeItem("newOrderCreated");

        // Check if we need to redirect to the order details
        const lastOrderId = localStorage.getItem("lastOrderId");
        if (lastOrderId) {
          localStorage.removeItem("lastOrderId");
          // We could redirect to the order details, but we're already loading orders
          // So we'll just focus on showing all orders
        }
      }
    }
  });

  // Temporary function until we have a proper user management system
  function handleLogin() {
    if (phoneNumber.trim().length > 0) {
      // Save phone number to localStorage for persistence
      localStorage.setItem("userPhoneNumber", phoneNumber);
      isLoggedIn = true;
      attemptCount = 0; // Reset attempt count on new login
      loadOrders();
    }
  }

  async function loadOrders() {
    loading = true;
    error = false;
    attemptCount++;

    try {
      orders = await getMyOrders(phoneNumber);

      // If we don't get any orders on the first attempt, try one more time
      if (orders.length === 0 && attemptCount === 1) {
        // Small delay before retrying
        setTimeout(() => {
          loadOrders();
        }, 500);
        return;
      }

      loading = false;
    } catch (err) {
      console.error("Failed to load orders:", err);
      error = true;
      loading = false;
    }
  }

  // Force refresh orders when this variable changes
  $: {
    if (isLoggedIn) {
      // Adding this reactive statement ensures orders refresh properly
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(Number(timestamp) / 1000000).toLocaleString();
  }

  function getStatusColor(status: any): string {
    if ("Pending" in status) return "#f0ad4e";
    if ("Processing" in status) return "#5bc0de";
    if ("Confirmed" in status) return "#0275d8";
    if ("OutForDelivery" in status) return "#5EAA6F";
    if ("Delivered" in status) return "#5cb85c";
    if ("Cancelled" in status) return "#d9534f";
    return "#6c757d";
  }

  function getStatusText(status: any): string {
    if ("Pending" in status) return "Pending";
    if ("Processing" in status) return "Processing";
    if ("Confirmed" in status) return "Confirmed";
    if ("OutForDelivery" in status) return "Out For Delivery";
    if ("Delivered" in status) return "Delivered";
    if ("Cancelled" in status) return "Cancelled";
    return "Unknown";
  }

  async function repeatOrder(order: Order) {
    try {
      // Create order items input from the previous order
      const orderItems: OrderItemInput[] = order.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      }));

      // Create new order with same items and delivery address
      const newOrderId = await createOrder(
        phoneNumber,
        orderItems,
        order.delivery_address
      );

      if (newOrderId) {
        toastsStore.show({
          text: "Order repeated successfully!",
          level: "success",
        });

        // Reload orders to show the new order
        loadOrders();
      } else {
        toastsStore.show({
          text: "Failed to repeat order",
          level: "error",
        });
      }
    } catch (error) {
      console.error("Error repeating order:", error);
      toastsStore.show({
        text: "Failed to repeat order",
        level: "error",
      });
    }
  }

  async function handleCancelOrder(orderId: bigint) {
    if (!phoneNumber) {
      toastsStore.show({
        text: "Phone number is not available. Please log in again.",
        level: "error",
      });
      return;
    }
    try {
      const updatedOrder = await cancelMyOrder(orderId, phoneNumber);
      if (updatedOrder) {
        // Optionally, update the specific order in the list or reload all orders
        // For simplicity, reloading all orders:
        loadOrders();
      }
      // If updatedOrder is null, the cancelMyOrder function already showed a toast
    } catch (err) {
      // This catch is mostly for unexpected errors in the component itself,
      // as cancelMyOrder handles its own errors including API errors.
      console.error("Error in handleCancelOrder:", err);
      toastsStore.show({
        text: "An unexpected error occurred while trying to cancel the order.",
        level: "error",
      });
    }
  }
</script>

<svelte:head>
  <title>My Orders - Kanhiya Dairy</title>
</svelte:head>

<div class="orders-page container">
  <h1>My Orders</h1>

  {#if !isLoggedIn}
    <div class="login-prompt">
      <p>Please enter your phone number to view your orders</p>
      <div class="login-form">
        <input
          type="tel"
          bind:value={phoneNumber}
          placeholder="Phone number"
          maxlength="10"
        />
        <button class="btn btn-primary" on:click={handleLogin}
          >View Orders</button
        >
      </div>
    </div>
  {:else if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading your orders...</p>
    </div>
  {:else if error}
    <div class="error">
      <p>Failed to load orders. Please try again later.</p>
      <button class="btn btn-primary" on:click={loadOrders}>Retry</button>
    </div>
  {:else if orders.length === 0}
    <div class="no-orders">
      <p>You don't have any orders yet.</p>
      <a href="/" class="btn btn-primary">Shop Now</a>
    </div>
  {:else}
    <div class="orders-list">
      <div class="orders-header">
        <h2>Your Order History</h2>
        <div class="orders-actions">
          <button class="btn btn-secondary" on:click={loadOrders}>
            <span class="refresh-icon">🔄</span> Refresh
          </button>
          <a href="/" class="btn btn-primary">Dobara Shopping Karein</a>
        </div>
      </div>
      {#each orders as order (order.id)}
        <div class="order-card">
          <div class="order-header">
            <div class="order-info">
              <h3>Order #{order.id.toString()}</h3>
              <p class="order-date">Placed on: {formatDate(order.timestamp)}</p>
            </div>
            <div class="order-status">
              <span
                class="status-badge"
                style="background-color: {getStatusColor(order.status)}"
              >
                {getStatusText(order.status)}
              </span>
              <p class="order-total">₹{order.total_amount.toFixed(2)}</p>
            </div>
          </div>

          <div class="order-items">
            <h4>Order Items</h4>
            <table>
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {#each order.items as item}
                  <tr>
                    <td>{item.product_id.toString()}</td>
                    <td>{item.quantity}</td>
                    <td>₹{item.price_per_unit_at_order.toFixed(2)}</td>
                    <td
                      >₹{(item.quantity * item.price_per_unit_at_order).toFixed(
                        2
                      )}</td
                    >
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <div class="order-delivery">
            <h4>Delivery Address</h4>
            <p>{order.delivery_address}</p>
          </div>

          <div class="order-actions">
            <a href={`/orders/${order.id}`} class="btn btn-outline"
              >View Details</a
            >
            {#if "Pending" in order.status}
              <button
                class="btn btn-secondary"
                on:click={() => handleCancelOrder(BigInt(order.id))}
              >
                Cancel Order
              </button>
            {/if}
            {#if "Delivered" in order.status}
              <button
                class="btn btn-primary"
                on:click={() => repeatOrder(order)}>Reorder</button
              >
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .orders-page {
    padding: 2rem 1rem;
  }

  h1 {
    margin-bottom: 2rem;
    color: #333;
    text-align: center;
  }

  .login-prompt {
    max-width: 500px;
    margin: 0 auto;
    padding: 2rem;
    background-color: #f8f8f8;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    text-align: center;
  }

  .login-form {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  .login-form input {
    flex: 1;
  }

  .loading,
  .error,
  .no-orders {
    text-align: center;
    padding: 3rem;
    color: #666;
  }

  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 4px solid #5eaa6f;
    width: 40px;
    height: 40px;
    margin: 0 auto 1rem;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .orders-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .orders-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .orders-header h2 {
    margin: 0;
    color: #333;
  }

  .orders-actions {
    display: flex;
    gap: 0.5rem;
  }

  .refresh-icon {
    display: inline-block;
  }

  .order-card {
    background-color: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #eee;
  }

  .order-info h3 {
    margin: 0;
    color: #333;
  }

  .order-date {
    font-size: 0.9rem;
    color: #666;
    margin: 0.5rem 0 0;
  }

  .order-status {
    text-align: right;
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .order-total {
    font-size: 1.25rem;
    font-weight: bold;
    margin: 0.5rem 0 0;
    color: #5eaa6f;
  }

  .order-items {
    margin-bottom: 1.5rem;
  }

  .order-items h4,
  .order-delivery h4 {
    margin: 0 0 1rem;
    font-size: 1.1rem;
    color: #333;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #eee;
  }

  th {
    font-weight: 500;
    color: #666;
  }

  .order-delivery {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #eee;
  }

  .order-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  @media (max-width: 768px) {
    .order-header {
      flex-direction: column;
    }

    .order-status {
      text-align: left;
      margin-top: 1rem;
    }

    .login-form {
      flex-direction: column;
    }

    table {
      font-size: 0.875rem;
    }

    th,
    td {
      padding: 0.5rem;
    }
  }
</style>
