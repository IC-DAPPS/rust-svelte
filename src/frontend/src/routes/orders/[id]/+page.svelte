<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import {
    getOrderDetails,
    createOrder,
    cancelMyOrder,
    getProducts,
  } from "$lib/api";
  import type { Order, OrderItemInput, Product } from "$lib/types";

  let order: Order | null = null;
  let allProducts: Product[] = [];
  let loading = true;
  let error = false;
  let phoneNumber = "";
  let isLoggedIn = false;

  onMount(async () => {
    const storedPhoneNumber = localStorage.getItem("userPhoneNumber");
    if (storedPhoneNumber) {
      phoneNumber = storedPhoneNumber;
      isLoggedIn = true;
      await loadInitialData();
    }
  });

  async function loadInitialData() {
    loading = true;
    error = false;
    try {
      const orderId = BigInt($page.params.id);
      const [orderDetails, productsData] = await Promise.all([
        getOrderDetails(orderId, phoneNumber),
        getProducts(),
      ]);

      order = orderDetails;
      allProducts = productsData;

      if (!order) {
        error = true;
      }
      loading = false;
    } catch (err) {
      console.error("Failed to load initial data:", err);
      error = true;
      loading = false;
    }
  }

  function handleLogin() {
    if (phoneNumber.trim().length > 0) {
      localStorage.setItem("userPhoneNumber", phoneNumber);
      isLoggedIn = true;
      loadInitialData();
    }
  }

  async function loadOrderDetailsOnly() {
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

  function getProductNameById(productId: number): string {
    const product = allProducts.find((p) => p.id === productId);
    return product ? product.name : "Unknown Product";
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

  async function repeatOrder() {
    if (!order) return;

    try {
      const orderItems: OrderItemInput[] = order.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      }));

      const newOrderId = await createOrder(
        phoneNumber,
        orderItems,
        order.delivery_address
      );

      if (newOrderId) {
        console.log("Order repeated successfully!");

        window.location.href = "/orders";
      } else {
        console.log("Failed to repeat order");
      }
    } catch (error) {
      console.error("Error repeating order:", error);
      console.log("Failed to repeat order");
    }
  }

  async function handleCancelOrder() {
    if (!order || !order.id) {
      console.log("Order details are not available to cancel.");
      return;
    }
    if (!phoneNumber) {
      console.log("Phone number is not available. Please log in again.");
      return;
    }

    try {
      const updatedOrder = await cancelMyOrder(BigInt(order.id), phoneNumber);
      if (updatedOrder) {
        order = updatedOrder;
      }
    } catch (err) {
      console.error("Error in handleCancelOrder (details page):", err);
      console.log(
        "An unexpected error occurred while trying to cancel the order."
      );
    }
  }
</script>

<svelte:head>
  <title
    >{order
      ? `Order #${order.id.toString()} - Kanhaiya Dairy`
      : "Order Details - Kanhaiya Dairy"}</title
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
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Price (₹)</th>
                <th>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {#each order.items as item}
                <tr>
                  <td>{getProductNameById(item.product_id)}</td>
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

          <div class="payment-info-section">
            <h3>Payment Information</h3>
            <p><strong>Payment Method:</strong> Cash on Delivery</p>
            {#if "Delivered" in order.status}
              <p>
                <strong>Status:</strong>
                <span class="status-text status-paid"
                  >Paid (assumed for COD)</span
                >
              </p>
            {:else if "Cancelled" in order.status}
              <p>
                <strong>Status:</strong>
                <span class="status-text status-cancelled"
                  >Not Applicable (Order Cancelled)</span
                >
              </p>
            {:else}
              <p>
                <strong>Status:</strong>
                <span class="status-text status-pending"
                  >To be paid upon delivery</span
                >
              </p>
            {/if}
          </div>

          <div class="tracking-info">
            <h3>
              Order Tracking
              <button
                class="btn btn-sm btn-outline-secondary refresh-btn"
                on:click={loadOrderDetailsOnly}
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
  .payment-info-section h3,
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
    background-color: #e6f2ff;
    font-weight: 600;
    color: #333;
  }

  .items-table tbody tr:nth-child(even) {
    background-color: #f8f9fa;
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
  .delivery-info p,
  .payment-info-section p {
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
    top: 5px;
    bottom: 5px;
    width: 2px;
    background-color: #e0e0e0;
    z-index: 0;
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
      padding: 1rem;
    }
    .order-header {
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }
    .order-info h2 {
      font-size: 1.5rem;
    }
    .order-total {
      font-size: 1.3rem;
      margin-top: 0.5rem;
    }
    .order-status {
      text-align: left;
      margin-top: 1rem;
    }
    .order-sections {
      gap: 1rem;
    }
    .order-items-section,
    .order-info-section {
      padding: 1rem;
    }

    .items-table {
      display: block;
      overflow-x: auto;
    }
    .items-table th,
    .items-table td {
      padding: 0.5rem 0.75rem;
      white-space: nowrap;
    }

    .order-actions {
      flex-direction: column;
    }
    .order-actions .btn {
      width: 100%;
      margin-bottom: 0.5rem;
    }
    .order-actions .btn:last-child {
      margin-bottom: 0;
    }
  }

  /* Styling for Payment Information Section */
  .payment-info-section {
    background-color: #fdfaf0; /* Light creamy background */
    border: 1px solid #f0e6c6; /* Soft border */
    border-radius: 6px; /* Consistent with other sections */
    padding: 1.25rem; /* A bit more padding */
  }

  .payment-info-section h3 {
    color: #795548; /* Brownish color for heading */
    margin-bottom: 1rem; /* Space below heading */
  }

  .payment-info-section p {
    margin: 0.75rem 0; /* More vertical space between lines */
    font-size: 0.95rem; /* Slightly larger font */
  }

  .payment-info-section p strong {
    color: #5d4037; /* Darker brown for labels */
    margin-right: 0.5rem;
  }

  /* Specific styling for payment status text */
  .payment-info-section p .status-text {
    font-weight: 500;
  }

  .payment-info-section p .status-pending {
    color: #ffa000; /* Amber/Orange for pending payment */
  }

  .payment-info-section p .status-paid {
    color: #388e3c; /* Green for paid */
  }

  .payment-info-section p .status-cancelled {
    color: #757575; /* Grey for not applicable/cancelled */
  }
</style>
