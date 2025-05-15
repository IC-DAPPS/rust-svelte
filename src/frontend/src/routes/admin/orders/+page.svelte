<script lang="ts">
  import { onMount } from "svelte";
  import type { Order, OrderStatus } from "$lib/types";

  let orders: Order[] = [];
  let isLoading = true;
  let loadError = false;

  // Mock orders for demo purpose
  // In a real app, you would fetch these from backend
  const mockOrders = [
    {
      id: BigInt(1),
      user_phone: "7389345065",
      items: [
        { product_id: 1, name: "Milk", quantity: 2, price: 70, unit: "litre" },
        {
          product_id: 2,
          name: "Paneer",
          quantity: 0.5,
          price: 300,
          unit: "kg",
        },
      ],
      status: "Delivered",
      total_amount: 290,
      created_at: Date.now() - 86400000 * 2, // 2 days ago
      delivery_address: "123 Main Street, City",
    },
    {
      id: BigInt(2),
      user_phone: "9876543210",
      items: [
        {
          product_id: 3,
          name: "Methi Dahi",
          quantity: 1,
          price: 100,
          unit: "kg",
        },
        {
          product_id: 4,
          name: "Khatti Dahi",
          quantity: 1,
          price: 50,
          unit: "kg",
        },
        { product_id: 5, name: "Matha", quantity: 2, price: 20, unit: "litre" },
      ],
      status: "Processing",
      total_amount: 190,
      created_at: Date.now() - 3600000 * 5, // 5 hours ago
      delivery_address: "456 Park Avenue, City",
    },
    {
      id: BigInt(3),
      user_phone: "8765432109",
      items: [
        { product_id: 1, name: "Milk", quantity: 5, price: 70, unit: "litre" },
      ],
      status: "Placed",
      total_amount: 350,
      created_at: Date.now() - 1800000, // 30 minutes ago
      delivery_address: "789 Garden Road, City",
    },
  ];

  // Status options for dropdown
  const statusOptions: OrderStatus[] = [
    "Placed",
    "Processing",
    "Out for Delivery",
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
      // In a real app, fetch orders from backend
      // Example: orders = await getOrders();

      // For demo, use mock orders
      setTimeout(() => {
        orders = mockOrders;
        isLoading = false;
      }, 800);
    } catch (error) {
      console.error("Failed to load orders:", error);
      loadError = true;
      isLoading = false;
    }
  }

  function formatDate(timestamp: number) {
    const date = new Date(timestamp);
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleStatusChange(orderId: bigint, newStatus: string) {
    // In a real app, call API to update order status
    console.log(`Updating order ${orderId} to status: ${newStatus}`);

    // Update local state for demo
    orders = orders.map((order) => {
      if (order.id === orderId) {
        return { ...order, status: newStatus };
      }
      return order;
    });
  }

  function handleSelectChange(event: Event, orderId: bigint) {
    const target = event.target as HTMLSelectElement;
    if (target) {
      handleStatusChange(orderId, target.value);
    }
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
                <td>#{order.id.toString()}</td>
                <td>{order.user_phone}</td>
                <td>
                  <div class="order-items">
                    {#each order.items as item, i}
                      <div class="order-item">
                        {item.name} ({item.quantity}
                        {item.unit})
                        {#if i < order.items.length - 1},
                        {/if}
                      </div>
                    {/each}
                  </div>
                </td>
                <td>₹{order.total_amount}</td>
                <td>{formatDate(order.created_at)}</td>
                <td>
                  <select
                    class="status-select status-{order.status
                      .toLowerCase()
                      .replace(/ /g, '-')}"
                    value={order.status}
                    on:change={(e) => handleSelectChange(e, order.id)}
                  >
                    {#each statusOptions as status}
                      <option value={status}>{status}</option>
                    {/each}
                  </select>
                </td>
                <td class="address-cell">{order.delivery_address}</td>
                <td class="actions-cell">
                  <button class="action-btn view-btn">View</button>
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
    width: 250px;
  }

  .orders-table-container {
    overflow-x: auto;
  }

  .orders-table {
    width: 100%;
    border-collapse: collapse;
  }

  .orders-table th,
  .orders-table td {
    padding: 0.8rem;
    text-align: left;
    border-bottom: 1px solid #eee;
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
  }

  .status-placed {
    background-color: #e3f2fd;
    border-color: #bbdefb;
  }

  .status-processing {
    background-color: #fff8e1;
    border-color: #ffecb3;
  }

  .status-out-for-delivery {
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

    .search-filter input {
      width: 100%;
    }
  }
</style>
