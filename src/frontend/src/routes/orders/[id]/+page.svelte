<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { getOrderDetails } from "$lib/api";
  import type { Order } from "$lib/types";

  let order: Order | null = null;
  let loading = true;
  let error = false;
  let phoneNumber = "";
  let isLoggedIn = false;

  // Handle login with phone number
  function handleLogin() {
    if (phoneNumber.trim().length > 0) {
      isLoggedIn = true;
      loadOrderDetails();
    }
  }

  // Load order details
  async function loadOrderDetails() {
    loading = true;
    error = false;

    try {
      const orderId = BigInt($page.params.id);
      order = await getOrderDetails(orderId, phoneNumber);

      if (!order) {
        error = true;
      }

      loading = false;
    } catch (err) {
      console.error("Failed to load order details:", err);
      error = true;
      loading = false;
    }
  }

  // Format timestamp to readable date
  function formatDate(timestamp: number): string {
    return new Date(Number(timestamp) / 1000000).toLocaleString();
  }

  // Get status color based on order status
  function getStatusColor(status: any): string {
    if ("Pending" in status) return "#f0ad4e";
    if ("Processing" in status) return "#5bc0de";
    if ("Confirmed" in status) return "#0275d8";
    if ("OutForDelivery" in status) return "#5EAA6F";
    if ("Delivered" in status) return "#5cb85c";
    if ("Cancelled" in status) return "#d9534f";
    return "#6c757d";
  }

  // Get status text based on order status
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
  <title
    >{order
      ? `Order #${order.id.toString()} - Kaniya Dairy`
      : "Order Details - Kaniya Dairy"}</title
  >
</svelte:head>

<div class="order-details-page container">
  <h1>Order Details</h1>

  {#if !isLoggedIn}
    <div class="login-prompt">
      <p>Please enter your phone number to view your order details</p>
      <div class="login-form">
        <input
          type="tel"
          bind:value={phoneNumber}
          placeholder="Phone number"
          maxlength="10"
        />
        <button class="btn btn-primary" on:click={handleLogin}
          >View Order</button
        >
      </div>
    </div>
  {:else if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading order details...</p>
    </div>
  {:else if error || !order}
    <div class="error">
      <p>
        Sorry, we couldn't find this order or you don't have permission to view
        it.
      </p>
      <div class="error-actions">
        <a href="/orders" class="btn btn-outline">Go to My Orders</a>
        <a href="/" class="btn btn-primary">Shop Now</a>
      </div>
    </div>
  {:else}
    <div class="order-card">
      <div class="order-header">
        <div class="order-info">
          <h2>Order #{order.id.toString()}</h2>
          <p class="order-date">Placed on: {formatDate(order.timestamp)}</p>
          <p class="order-date">
            Last updated: {formatDate(order.last_updated)}
          </p>
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

      <div class="order-sections">
        <div class="order-items-section">
          <h3>Order Items</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Quantity</th>
                <th>Price (₹)</th>
                <th>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {#each order.items as item}
                <tr>
                  <td>{item.product_id.toString()}</td>
                  <td>{item.quantity}</td>
                  <td>{item.price_per_unit_at_order.toFixed(2)}</td>
                  <td
                    >{(item.quantity * item.price_per_unit_at_order).toFixed(
                      2
                    )}</td
                  >
                </tr>
              {/each}
              <tr class="total-row">
                <td colspan="3">Total</td>
                <td>₹{order.total_amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="order-info-section">
          <div class="contact-info">
            <h3>Contact Information</h3>
            <p><strong>Phone:</strong> {order.user_phone_number}</p>
          </div>

          <div class="delivery-info">
            <h3>Delivery Address</h3>
            <p>{order.delivery_address}</p>
          </div>

          <div class="tracking-info">
            <h3>Order Tracking</h3>
            <div class="tracking-timeline">
              <div
                class="timeline-item"
                class:active={"Pending" in order.status ||
                  "Processing" in order.status ||
                  "Confirmed" in order.status ||
                  "OutForDelivery" in order.status ||
                  "Delivered" in order.status}
              >
                <div class="timeline-point"></div>
                <div class="timeline-content">
                  <h4>Order Placed</h4>
                  <p>{formatDate(order.timestamp)}</p>
                </div>
              </div>

              <div
                class="timeline-item"
                class:active={"Processing" in order.status ||
                  "Confirmed" in order.status ||
                  "OutForDelivery" in order.status ||
                  "Delivered" in order.status}
              >
                <div class="timeline-point"></div>
                <div class="timeline-content">
                  <h4>Processing</h4>
                </div>
              </div>

              <div
                class="timeline-item"
                class:active={"Confirmed" in order.status ||
                  "OutForDelivery" in order.status ||
                  "Delivered" in order.status}
              >
                <div class="timeline-point"></div>
                <div class="timeline-content">
                  <h4>Confirmed</h4>
                </div>
              </div>

              <div
                class="timeline-item"
                class:active={"OutForDelivery" in order.status ||
                  "Delivered" in order.status}
              >
                <div class="timeline-point"></div>
                <div class="timeline-content">
                  <h4>Out for Delivery</h4>
                </div>
              </div>

              <div
                class="timeline-item"
                class:active={"Delivered" in order.status}
              >
                <div class="timeline-point"></div>
                <div class="timeline-content">
                  <h4>Delivered</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="order-actions">
        <a href="/orders" class="btn btn-outline">Back to Orders</a>
        {#if "Pending" in order.status}
          <button class="btn btn-secondary">Cancel Order</button>
        {/if}
        {#if "Delivered" in order.status}
          <button class="btn btn-primary">Reorder</button>
        {/if}
      </div>
    </div>

    <div class="need-help">
      <h3>Need Help?</h3>
      <p>Call us at: <a href="tel:07089345065">07089345065</a></p>
    </div>
  {/if}
</div>

<style>
  .order-details-page {
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
  .error {
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

  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1.5rem;
  }

  .order-card {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #eee;
  }

  .order-info h2 {
    margin: 0 0 0.5rem;
    font-size: 1.8rem;
    color: #333;
  }

  .order-date {
    color: #666;
    margin: 0.25rem 0;
  }

  .order-status {
    text-align: right;
  }

  .status-badge {
    display: inline-block;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    color: white;
    font-size: 1rem;
    font-weight: 500;
  }

  .order-total {
    font-size: 1.5rem;
    font-weight: bold;
    margin: 0.75rem 0 0;
    color: #5eaa6f;
  }

  .order-sections {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .order-items-section,
  .order-info-section {
    min-width: 0;
  }

  h3 {
    margin: 0 0 1.5rem;
    font-size: 1.4rem;
    color: #333;
  }

  .items-table {
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

  .total-row {
    font-weight: bold;
  }

  .total-row td {
    border-top: 2px solid #ddd;
    padding-top: 1rem;
  }

  .contact-info,
  .delivery-info,
  .tracking-info {
    margin-bottom: 2rem;
  }

  .tracking-timeline {
    position: relative;
  }

  .tracking-timeline:before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 11px;
    width: 2px;
    background-color: #ddd;
  }

  .timeline-item {
    position: relative;
    padding-left: 40px;
    margin-bottom: 1.5rem;
  }

  .timeline-point {
    position: absolute;
    left: 0;
    top: 5px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: #eee;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
  }

  .timeline-item.active .timeline-point {
    background-color: #5eaa6f;
  }

  .timeline-content h4 {
    margin: 0 0 0.25rem;
    font-size: 1rem;
    color: #333;
  }

  .timeline-content p {
    margin: 0;
    font-size: 0.9rem;
    color: #666;
  }

  .order-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .need-help {
    text-align: center;
    margin-top: 2rem;
    padding: 1rem;
    background-color: #f8f8f8;
    border-radius: 8px;
  }

  .need-help h3 {
    margin-bottom: 0.5rem;
  }

  .need-help p {
    margin: 0;
  }

  @media (max-width: 768px) {
    .order-header,
    .order-sections {
      display: block;
    }

    .order-status {
      text-align: left;
      margin-top: 1.5rem;
    }

    .order-items-section {
      margin-bottom: 2rem;
    }

    .login-form {
      flex-direction: column;
    }

    .order-actions {
      flex-direction: column;
    }

    .order-actions a,
    .order-actions button {
      width: 100%;
      margin-bottom: 0.5rem;
    }

    .items-table {
      font-size: 0.9rem;
    }

    th,
    td {
      padding: 0.5rem;
    }
  }
</style>
