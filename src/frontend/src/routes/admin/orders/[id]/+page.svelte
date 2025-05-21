<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { getOrderDetailsAdmin, getProducts } from "$lib/api"; // We'll create getOrderDetailsAdmin
  import type { Order as OrderType, Product } from "$lib/types";

  let order: OrderType | null = null;
  let productMap = new Map<number, Product>();
  let isLoading = true;
  let loadError: string | null = null;

  function formatDate(timestamp: number | bigint | undefined): string {
    if (timestamp === undefined || timestamp === null) return "N/A";
    const numericTimestamp = Number(timestamp);
    if (numericTimestamp === 0) return "N/A";
    const date = new Date(numericTimestamp / 1_000_000); // Assuming nanoseconds from backend
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusDisplayName(status: any): string {
    if (typeof status === "object" && status !== null) {
      const key = Object.keys(status)[0];
      return key ? key.replace(/([A-Z])/g, " $1").trim() : "Unknown"; // Format for display
    }
    return String(status || "Unknown");
  }

  function getStatusColor(status: any): string {
    const statusString = getStatusDisplayName(status).toLowerCase();
    if (statusString.includes("delivered"))
      return "var(--color-success, #28a745)";
    if (statusString.includes("pending") || statusString.includes("processing"))
      return "var(--color-warning, #ffc107)";
    if (statusString.includes("cancelled") || statusString.includes("failed"))
      return "var(--color-danger, #dc3545)";
    if (
      statusString.includes("shipped") ||
      statusString.includes("out for delivery")
    )
      return "var(--color-info, #17a2b8)";
    return "var(--color-text-secondary, #6c757d)"; // Default color
  }

  onMount(async () => {
    isLoading = true;
    loadError = null;
    const orderIdParam = $page.params.id;

    if (!orderIdParam) {
      loadError = "Order ID not found in URL.";
      isLoading = false;
      return;
    }

    try {
      const orderId = BigInt(orderIdParam);

      // Fetch products for item details
      const productsFromApi = await getProducts();
      productMap = new Map(productsFromApi.map((p) => [p.id, p]));

      const result = await getOrderDetailsAdmin(orderId);
      if (result) {
        order = result;
      } else {
        loadError = `Order with ID ${orderIdParam} not found.`;
      }
    } catch (error) {
      console.error(
        `Error fetching order details for ID ${orderIdParam}:`,
        error
      );
      loadError = "Failed to load order details. Please try again.";
    } finally {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Order No: {$page.params.id} - Admin</title>
</svelte:head>

<div class="admin-page order-details-page">
  {#if isLoading}
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading order details...</p>
    </div>
  {:else if loadError}
    <div class="error-container">
      <p>{loadError}</p>
      <a href="/admin/orders" class="back-link">Back to Orders List</a>
    </div>
  {:else if order}
    <div class="page-header">
      <h1>
        Order <span class="order-id-label">No:</span>
        <span class="order-id-highlight">{String(order.id)}</span>
      </h1>
      <a href="/admin/orders" class="back-link button-link" style="background-color: var(--color-success, #28a745); color: black;">Back to List</a>
    </div>

    <div class="details-card">
      <div class="details-grid">
        <div class="detail-section">
          <h2>Order Information</h2>
          <p><strong>Order ID:</strong> {String(order.id)}</p>
          <p>
            <strong>Status:</strong>
            <span
              style="color: {getStatusColor(order.status)}; font-weight: bold;"
              >{getStatusDisplayName(order.status)}</span
            >
          </p>
          <p><strong>Order Date:</strong> {formatDate(order.timestamp)}</p>
          <p><strong>Last Updated:</strong> {formatDate(order.last_updated)}</p>
          <p><strong>Total Amount:</strong> ₹{order.total_amount.toFixed(2)}</p>
        </div>

        <div class="detail-section">
          <h2>Customer & Delivery</h2>
          <p>
            <strong>Customer Phone:</strong>
            <a href={`tel:${order.user_phone_number}`}
              >{order.user_phone_number}</a
            >
          </p>
          <p><strong>Delivery Address:</strong> {order.delivery_address}</p>
        </div>
      </div>

      <div class="detail-section items-section">
        <h2>Items in Order</h2>
        {#if order.items && order.items.length > 0}
          <table class="items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price at Order</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {#each order.items as item (item.product_id)}
                {@const productDetail = productMap.get(item.product_id)}
                <tr>
                  <td
                    >{productDetail
                      ? productDetail.name
                      : `Product ID: ${item.product_id}`}</td
                  >
                  <td>{item.quantity} {productDetail?.unit || ""}</td>
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
        {:else}
          <p>No items in this order.</p>
        {/if}
      </div>
    </div>
  {:else}
    <div class="empty-state">
      <p>Order data is not available.</p>
      <a href="/admin/orders" class="back-link">Back to Orders List</a>
    </div>
  {/if}
</div>

<style>
  .admin-page {
    max-width: 900px;
    margin: 0 auto;
    padding: 1rem;
  }
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  .page-header h1 {
    font-size: 1.8rem;
    color: #333;
    display: flex; /* For aligning label and ID */
    align-items: baseline; /* Align text nicely */
  }
  .order-id-label {
    font-size: 1.5rem; /* Slightly smaller than ID */
    color: #555; /* Darker gray for the label */
    margin-right: 0.3rem;
    font-weight: normal; /* Label doesn't need to be bold */
  }
  .order-id-highlight {
    color: #5eaa6f; /* Kaniya Dairy green */
    font-weight: bold;
  }
  .back-link {
    color: #5eaa6f;
    text-decoration: none;
  }
  .back-link:hover {
    text-decoration: underline;
  }
  .button-link {
    padding: 0.6rem 1rem;
    background-color: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-weight: 500;
  }
  .button-link:hover {
    background-color: #e0e0e0;
    text-decoration: none;
  }

  .details-card {
    background-color: #fff;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
  }
  .detail-section {
    margin-bottom: 1rem; /* Reduced margin for sections in grid */
  }
  .detail-section h2 {
    font-size: 1.3rem;
    color: #444;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #eee;
  }
  .detail-section p {
    margin-bottom: 0.6rem;
    line-height: 1.6;
  }
  .items-section h2 {
    margin-top: 1.5rem;
  }
  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
  }
  .items-table th,
  .items-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #eee;
  }
  .items-table th {
    background-color: #f9f9f9;
    font-weight: 600; /* Make headers bolder */
  }

  .loading-container,
  .error-container,
  .empty-state {
    text-align: center;
    padding: 3rem;
  }
  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 4px solid #5eaa6f;
    width: 36px;
    height: 36px;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .items-table-admin img {
    max-width: 60px;
    border: 1px solid #eee;
  }
  .items-table-admin td,
  .items-table-admin th {
    vertical-align: middle;
  }
</style>
