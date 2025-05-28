<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { getOrderDetails, createOrder, cancelMyOrder } from "$lib/api";
  import type { Order, OrderItemInput } from "$lib/types";
  import { toastsStore } from "@dfinity/gix-components";

  let order: Order | null = null;
  let loading = true;
  let error = false;
  let phoneNumber = "";
  let isLoggedIn = false;

  onMount(() => {
    // Auto-load phone number from localStorage
    const storedPhoneNumber = localStorage.getItem("userPhoneNumber");
    if (storedPhoneNumber) {
      phoneNumber = storedPhoneNumber;
      isLoggedIn = true;
      // Auto-load order details with stored phone number
      loadOrderDetails();
    }
  });

  // Handle login with phone number
  function handleLogin() {
    if (phoneNumber.trim().length > 0) {
      // Save phone for future use
      localStorage.setItem("userPhoneNumber", phoneNumber);
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

  async function repeatOrder() {
    if (!order) return;

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

        // Navigate to the orders page
        window.location.href = "/orders";
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

  async function handleCancelOrder() {
    if (!order || !order.id) {
      toastsStore.show({
        text: "Order details are not available to cancel.",
        level: "error",
      });
      return;
    }
    if (!phoneNumber) {
      toastsStore.show({
        text: "Phone number is not available. Please log in again.",
        level: "error",
      });
      return;
    }

    try {
      const updatedOrder = await cancelMyOrder(BigInt(order.id), phoneNumber);
      if (updatedOrder) {
        order = updatedOrder; // Update the local order state
        // The toast for success is shown by cancelMyOrder
      }
      // If updatedOrder is null, cancelMyOrder already showed an error toast
    } catch (err) {
      console.error("Error in handleCancelOrder (details page):", err);
      toastsStore.show({
        text: "An unexpected error occurred while trying to cancel the order.",
        level: "error",
      });
    }
  }
</script>

<svelte:head>
  <title
    >{order
      ? `Order #${order.id.toString()} - Kanhiya Dairy`
      : "Order Details - Kanhiya Dairy"}</title
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
            <h3>
              Order Tracking
              <button
                class="btn btn-sm btn-outline-secondary refresh-btn"
                on:click={loadOrderDetails}
                title="Refresh order status"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  class="bi bi-arrow-clockwise"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill-rule="evenodd"
                    d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"
                  />
                  <path
                    d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"
                  />
                </svg>
              </button>
            </h3>
            <div class="timeline">
              <div
                class="timeline-item {'Pending' in order.status
                  ? 'active'
                  : ''} {'Confirmed' in order.status ||
                'Processing' in order.status ||
                'OutForDelivery' in order.status ||
                'Delivered' in order.status
                  ? 'completed'
                  : ''}"
              >
                <div class="timeline-point"></div>
                <div class="timeline-content">
                  <h4>Pending</h4>
                  <p>
                    Your order has been placed and is awaiting confirmation.
                  </p>
                </div>
              </div>
              <div
                class="timeline-item {'Confirmed' in order.status
                  ? 'active'
                  : ''} {'Processing' in order.status ||
                'OutForDelivery' in order.status ||
                'Delivered' in order.status
                  ? 'completed'
                  : ''}"
              >
                <div class="timeline-point"></div>
                <div class="timeline-content">
                  <h4>Confirmed</h4>
                  <p>Your order has been confirmed by the dairy.</p>
                </div>
              </div>
              <div
                class="timeline-item {'Processing' in order.status
                  ? 'active'
                  : ''} {'OutForDelivery' in order.status ||
                'Delivered' in order.status
                  ? 'completed'
                  : ''}"
              >
                <div class="timeline-point"></div>
                <div class="timeline-content">
                  <h4>Processing</h4>
                  <p>Your items are being prepared.</p>
                </div>
              </div>
              <div
                class="timeline-item {'OutForDelivery' in order.status
                  ? 'active'
                  : ''} {'Delivered' in order.status ? 'completed' : ''}"
              >
                <div class="timeline-point"></div>
                <div class="timeline-content">
                  <h4>Out for Delivery</h4>
                  <p>Your order is on its way!</p>
                </div>
              </div>
              <div
                class="timeline-item {'Delivered' in order.status
                  ? 'active completed'
                  : ''}"
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
        <a href="/" class="btn btn-primary">Dobara Shopping Karein</a>
        {#if "Pending" in order.status}
          <button class="btn btn-secondary" on:click={handleCancelOrder}>
            Cancel Order
          </button>
        {/if}
        {#if "Delivered" in order.status}
          <button class="btn btn-primary" on:click={repeatOrder}
            >Repeat This Order</button
          >
        {/if}
      </div>
    </div>

    <div class="need-help">
      <h3>Need Help?</h3>
      <p>Call us at: <a href="tel:9399377528">9399377528</a></p>
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
    background-color: #f9f9f9;
    padding: 1.5rem;
    border-radius: 6px;
  }

  .order-items-section h3,
  .order-info-section h3,
  .contact-info h3,
  .delivery-info h3,
  .tracking-info h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #444;
    font-size: 1.2rem;
    border-bottom: 1px solid #eee;
    padding-bottom: 0.5rem;
  }

  .items-table {
    width: 100%;
    border-collapse: collapse;
  }

  .items-table th,
  .items-table td {
    text-align: left;
    padding: 0.75rem;
    border-bottom: 1px solid #eee;
  }

  .items-table th {
    background-color: #f0f0f0;
    font-weight: 600;
  }

  .items-table td:last-child,
  .items-table th:last-child {
    text-align: right;
  }

  .total-row td {
    font-weight: bold;
    font-size: 1.1rem;
    background-color: #f8f8f8;
  }

  .contact-info p,
  .delivery-info p {
    margin: 0.5rem 0;
    line-height: 1.6;
  }

  .tracking-info .refresh-btn {
    margin-left: 0.5rem;
    padding: 0.2rem 0.4rem;
    font-size: 0.8rem;
    vertical-align: middle;
  }

  .timeline {
    margin-top: 1rem;
    position: relative;
  }

  .timeline::before {
    content: "";
    position: absolute;
    left: 10px;
    top: 0;
    bottom: 0;
    width: 2px;
    background-color: #e0e0e0;
  }

  .timeline-item {
    display: flex;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    position: relative;
    padding-left: 30px;
  }

  .timeline-point {
    width: 12px;
    height: 12px;
    background-color: #ccc;
    border-radius: 50%;
    position: absolute;
    left: 4px;
    top: 5px;
    border: 2px solid white;
    z-index: 1;
  }

  .timeline-item.active .timeline-point {
    background-color: #5eaa6f;
  }
  .timeline-item.completed .timeline-point {
    background-color: #5eaa6f;
  }

  .timeline-content {
    background-color: #f9f9f9;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    flex: 1;
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
    margin-top: 2rem;
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    padding-top: 1.5rem;
    border-top: 1px solid #eee;
  }

  .need-help {
    margin-top: 3rem;
    text-align: center;
    padding: 1.5rem;
    background-color: #f0f8ff;
    border-radius: 6px;
  }

  .need-help h3 {
    margin: 0 0 0.5rem;
    color: #333;
  }

  .need-help p {
    margin: 0;
    color: #555;
  }

  .need-help a {
    color: #007bff;
    text-decoration: none;
  }

  .need-help a:hover {
    text-decoration: underline;
  }

  @media (max-width: 992px) {
    .order-sections {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .order-details-page {
      padding: 1rem 0.5rem;
    }
    .order-card {
      padding: 1.5rem;
    }
    .order-header {
      flex-direction: column;
      align-items: stretch;
    }
    .order-status {
      text-align: left;
      margin-top: 1rem;
    }
    .order-actions {
      flex-direction: column;
    }
    .order-actions .btn {
      width: 100%;
    }
  }
</style>
