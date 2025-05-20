<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { getAllOrders, getProducts, updateOrderStatusAdmin } from "$lib/api";
  import type { Order, OrderStatus, Product } from "$lib/types";

  let orders: Order[] = [];
  let products: Product[] = [];
  let productMap = new Map<number, Product>();
  let isLoading = true;
  let loadError = false;

  // For status updates
  let updatingStatus: { [key: number]: boolean } = {};
  let statusUpdateError: { [key: number]: string | null } = {};

  // Status options for dropdown
  const statusOptions = [
    "Pending",
    "Confirmed",
    "Processing",
    "OutForDelivery",
    "Delivered",
    "Cancelled",
  ];

  onMount(async () => {
    await loadOrders();
  });

  async function loadOrders() {
    isLoading = true;
    loadError = false;

    try {
      // Fetch products first to create a lookup map
      const productsFromApi = await getProducts();
      productMap = new Map(productsFromApi.map((p) => [p.id, p]));
      products = productsFromApi; // Store for other uses if needed

      // Fetch orders from backend API
      orders = await getAllOrders();
      isLoading = false;
    } catch (error) {
      console.error("Failed to load orders:", error);
      loadError = true;
      isLoading = false;
    }
  }

  function formatDate(timestamp: number | bigint | undefined): string {
    if (timestamp === undefined || timestamp === null) return "N/A";
    const numericTimestamp = Number(timestamp);
    if (numericTimestamp === 0) return "N/A";

    // Assuming timestamp from backend (order.timestamp) is in nanoseconds
    const date = new Date(numericTimestamp / 1_000_000);

    if (isNaN(date.getTime())) return "Invalid Date";

    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleStatusChange(orderId: number, newStatusKey: string) {
    updatingStatus = { ...updatingStatus, [orderId]: true };
    statusUpdateError = { ...statusUpdateError, [orderId]: null };

    // Format status to OrderStatus type (e.g., { Pending: null })
    const statusObject: OrderStatus = { [newStatusKey]: null } as OrderStatus;

    try {
      const success = await updateOrderStatusAdmin(
        BigInt(orderId),
        statusObject
      );

      if (success) {
        // Update local state for demo only if API call was successful
        orders = orders.map((order) => {
          if (order.id === orderId) {
            return { ...order, status: statusObject };
          }
          return order;
        });
        // Optionally show a success toast if not already handled by the API function
      } else {
        statusUpdateError = {
          ...statusUpdateError,
          [orderId]: "Failed to update status from API.",
        };
        // Revert optimistic update if any, or reload orders to get consistent state
        // For now, we just show an error. The local data will be out of sync until next full load.
      }
    } catch (error) {
      console.error(
        `Error calling updateOrderStatusAdmin for order ${orderId}:`,
        error
      );
      statusUpdateError = {
        ...statusUpdateError,
        [orderId]: "An unexpected error occurred.",
      };
    } finally {
      updatingStatus = { ...updatingStatus, [orderId]: false };
    }
  }

  function handleSelectChange(event: Event, orderId: number) {
    const target = event.target as HTMLSelectElement;
    if (target) {
      handleStatusChange(orderId, target.value);
    }
  }

  // Helper to get status display name - converting from backed enum format
  function getStatusDisplayName(status: any): string {
    if (typeof status === "object") {
      // Handle Candid enum format like { Pending: null }
      const key = Object.keys(status)[0];
      return key || "Unknown";
    }
    return status || "Unknown";
  }

  // Helper to check if a status matches the current order status
  function isCurrentStatus(orderStatus: any, statusOption: string): boolean {
    const current = getStatusDisplayName(orderStatus);
    return current === statusOption;
  }
</script>

<svelte:head>
  <title>Order Management - Admin</title>
</svelte:head>

<div class="admin-page">
  <div class="page-header">
    <h1>Order Management</h1>
    <button class="refresh-btn" on:click={loadOrders} disabled={isLoading}>
      🔄 Refresh Orders
    </button>
  </div>

  <div class="orders-section">
    <div class="section-header">
      <h2>All Orders</h2>
      <div class="search-filter">
        <input type="text" placeholder="Search orders..." />
      </div>
    </div>

    {#if isLoading}
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading orders...</p>
      </div>
    {:else if loadError}
      <div class="error-container">
        <p>Failed to load orders. Please try again.</p>
        <button class="retry-btn" on:click={loadOrders}>Try Again</button>
      </div>
    {:else if orders.length === 0}
      <div class="empty-state">
        <p>No orders found.</p>
      </div>
    {:else}
      <div class="orders-table-container">
        <table class="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th>Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each orders as order (order.id)}
              <tr>
                <td>#{order.id}</td>
                <td>{order.user_phone_number}</td>
                <td>
                  <div class="order-items">
                    {#if order.items && order.items.length > 0}
                      {#each order.items as item, i}
                        {@const productDetail = productMap.get(item.product_id)}
                        <div class="order-item">
                          {#if productDetail}
                            {productDetail.name} ({item.quantity}
                            {productDetail.unit || ""})
                          {:else}
                            Product #{item.product_id} ({item.quantity})
                          {/if}
                          {#if i < order.items.length - 1},
                          {/if}
                        </div>
                      {/each}
                    {:else}
                      <span>No items</span>
                    {/if}
                  </div>
                </td>
                <td>₹{order.total_amount}</td>
                <td>{formatDate(order.timestamp)}</td>
                <td>
                  <select
                    class="status-select status-{getStatusDisplayName(
                      order.status
                    )
                      .toLowerCase()
                      .replace(/ /g, '-')}"
                    value={getStatusDisplayName(order.status)}
                    on:change={(e) => handleSelectChange(e, order.id)}
                    disabled={updatingStatus[order.id]}
                  >
                    {#each statusOptions as statusKey}
                      <option
                        value={statusKey}
                        selected={isCurrentStatus(order.status, statusKey)}
                      >
                        {statusKey.replace(/([A-Z])/g, " $1").trim()}
                      </option>
                    {/each}
                  </select>
                  {#if updatingStatus[order.id]}
                    <span class="status-indicator loading-indicator"
                      >Updating...</span
                    >
                  {/if}
                  {#if statusUpdateError[order.id]}
                    <span class="status-indicator error-indicator"
                      >{statusUpdateError[order.id]}</span
                    >
                  {/if}
                </td>
                <td class="address-cell">{order.delivery_address}</td>
                <td class="actions-cell">
                  <button
                    class="action-btn view-btn"
                    on:click={() => goto(`/admin/orders/${order.id}`)}
                    >View</button
                  >
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<style>
  .admin-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 1.8rem;
    color: #333;
    margin: 0;
  }

  .refresh-btn {
    padding: 0.6rem 1.2rem;
    background-color: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .orders-section {
    background-color: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .section-header h2 {
    font-size: 1.4rem;
    color: #333;
    margin: 0;
  }

  .search-filter input {
    padding: 0.6rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    width: 100%;
    min-width: 250px;
  }

  .orders-table-container {
    overflow-x: auto;
    width: 100%;
  }

  .orders-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 800px;
  }

  .orders-table th,
  .orders-table td {
    padding: 0.8rem;
    text-align: left;
    border-bottom: 1px solid #eee;
    vertical-align: middle;
  }

  .orders-table th {
    background-color: #f5f5f5;
    font-weight: 600;
  }

  .order-items {
    font-size: 0.9rem;
    max-width: 200px;
  }

  .status-select {
    padding: 0.4rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .status-placed,
  .status-pending {
    background-color: #e3f2fd;
    border-color: #bbdefb;
  }

  .status-processing {
    background-color: #fff8e1;
    border-color: #ffecb3;
  }

  .status-outfordelivery {
    background-color: #e8f5e9;
    border-color: #c8e6c9;
  }

  .status-delivered {
    background-color: #e8f5e9;
    border-color: #c8e6c9;
  }

  .status-cancelled {
    background-color: #ffebee;
    border-color: #ffcdd2;
  }

  .status-indicator {
    display: block;
    font-size: 0.75rem;
    margin-top: 4px;
  }
  .loading-indicator {
    color: #757575;
  }
  .error-indicator {
    color: #d32f2f;
  }

  .address-cell {
    max-width: 200px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .actions-cell {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    padding: 0.4rem 0.8rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .view-btn {
    background-color: #2196f3;
    color: white;
  }

  .loading-container,
  .empty-state,
  .error-container {
    padding: 2rem;
    text-align: center;
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

  .error-container p {
    color: #e53935;
    margin-bottom: 1rem;
  }

  .retry-btn {
    padding: 0.6rem 1.2rem;
    background-color: #5eaa6f;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 992px) {
    .orders-table {
      font-size: 0.9rem;
    }
  }

  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .refresh-btn {
      width: 100%;
      justify-content: center;
    }

    .section-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .search-filter {
      width: 100%;
    }

    .admin-page {
      padding: 0.5rem;
    }

    .orders-section {
      padding: 1rem;
    }
  }
</style>
