<script lang="ts">
  import { onMount } from "svelte";
  import { getMyOrders } from "$lib/api";
  import type { Order } from "$lib/types";

  let orders: Order[] = [];
  let loading = true;
  let error = false;
  let phoneNumber = "";
  let isLoggedIn = false;

  onMount(() => {
    // Check if user is already logged in via localStorage
    const storedPhoneNumber = localStorage.getItem("userPhoneNumber");
    if (storedPhoneNumber) {
      phoneNumber = storedPhoneNumber;
      isLoggedIn = true;
      loadOrders();
    }
  });

  // Temporary function until we have a proper user management system
  function handleLogin() {
    if (phoneNumber.trim().length > 0) {
      // Save phone number to localStorage for persistence
      localStorage.setItem("userPhoneNumber", phoneNumber);
      isLoggedIn = true;
      loadOrders();
    }
  }

  async function loadOrders() {
    loading = true;
    error = false;

    try {
      orders = await getMyOrders(phoneNumber);
      loading = false;
    } catch (err) {
      console.error("Failed to load orders:", err);
      error = true;
      loading = false;
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
</script>

<svelte:head>
  <title>My Orders - Kaniya Dairy</title>
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
              <button class="btn btn-secondary">Cancel Order</button>
            {/if}
            {#if "Delivered" in order.status}
              <button class="btn btn-primary">Reorder</button>
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
