<script lang="ts">
  import { onMount } from "svelte";

  // Define types for our data
  interface SubscriptionItem {
    product_id: number;
    name: string;
    quantity: number;
    price: number;
    unit: string;
  }

  interface Subscription {
    id: bigint;
    user_phone: string;
    items: SubscriptionItem[];
    delivery_days: string[];
    delivery_time_slot: string;
    delivery_address: string;
    start_date: number;
    status: string;
  }

  // Mock subscription data for demo
  const mockSubscriptions: Subscription[] = [
    {
      id: BigInt(1),
      user_phone: "7389345065",
      items: [
        { product_id: 1, name: "Milk", quantity: 1, price: 70, unit: "litre" },
      ],
      delivery_days: ["Monday", "Wednesday", "Friday"],
      delivery_time_slot: "Morning (6 AM - 9 AM)",
      delivery_address: "123 Main Street, City",
      start_date: Date.now(),
      status: "Active",
    },
    {
      id: BigInt(2),
      user_phone: "9876543210",
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
      delivery_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      delivery_time_slot: "Evening (5 PM - 7 PM)",
      delivery_address: "456 Park Avenue, City",
      start_date: Date.now() - 86400000 * 10, // 10 days ago
      status: "Active",
    },
    {
      id: BigInt(3),
      user_phone: "8765432109",
      items: [
        {
          product_id: 4,
          name: "Khatti Dahi",
          quantity: 0.5,
          price: 50,
          unit: "kg",
        },
        { product_id: 5, name: "Matha", quantity: 1, price: 20, unit: "litre" },
      ],
      delivery_days: ["Saturday", "Sunday"],
      delivery_time_slot: "Morning (6 AM - 9 AM)",
      delivery_address: "789 Garden Road, City",
      start_date: Date.now() - 86400000 * 5, // 5 days ago
      status: "Paused",
    },
  ];

  let subscriptions: Subscription[] = [];
  let isLoading = true;
  let loadError = false;

  // For filtering
  let filterStatus = "All";
  let searchQuery = "";

  onMount(async () => {
    await loadSubscriptions();
  });

  async function loadSubscriptions() {
    isLoading = true;
    loadError = false;

    try {
      // In a real app, fetch subscriptions from backend
      // Example: subscriptions = await getSubscriptions();

      // For demo, use mock data
      setTimeout(() => {
        subscriptions = mockSubscriptions;
        isLoading = false;
      }, 800);
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
      loadError = true;
      isLoading = false;
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function handleStatusChange(subscriptionId: bigint, newStatus: string): void {
    // In a real app, call API to update subscription status
    console.log(
      `Updating subscription ${subscriptionId} to status: ${newStatus}`
    );

    // Update local state for demo
    subscriptions = subscriptions.map((sub) => {
      if (sub.id === subscriptionId) {
        return { ...sub, status: newStatus };
      }
      return sub;
    });
  }

  function handleSelectChange(event: Event, subscriptionId: bigint): void {
    const target = event.target as HTMLSelectElement;
    if (target) {
      handleStatusChange(subscriptionId, target.value);
    }
  }

  // Computed for filtered subscriptions
  $: filteredSubscriptions = subscriptions.filter((sub) => {
    // Filter by status
    if (filterStatus !== "All" && sub.status !== filterStatus) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        sub.user_phone.toLowerCase().includes(query) ||
        sub.delivery_address.toLowerCase().includes(query) ||
        sub.items.some((item) => item.name.toLowerCase().includes(query))
      );
    }

    return true;
  });
</script>

<svelte:head>
  <title>Subscription Management - Admin</title>
</svelte:head>

<div class="admin-page">
  <div class="page-header">
    <h1>Subscription Management</h1>
    <button
      class="refresh-btn"
      on:click={loadSubscriptions}
      disabled={isLoading}
    >
      🔄 Refresh Subscriptions
    </button>
  </div>

  <div class="subscriptions-section">
    <div class="filters">
      <div class="search-filter">
        <input
          type="text"
          placeholder="Search by phone, address or product..."
          bind:value={searchQuery}
        />
      </div>

      <div class="status-filter">
        <label>Filter by status:</label>
        <select bind:value={filterStatus}>
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Paused">Paused</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>
    </div>

    {#if isLoading}
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading subscriptions...</p>
      </div>
    {:else if loadError}
      <div class="error-container">
        <p>Failed to load subscriptions. Please try again.</p>
        <button class="retry-btn" on:click={loadSubscriptions}>Try Again</button
        >
      </div>
    {:else if subscriptions.length === 0}
      <div class="empty-state">
        <p>No subscriptions found.</p>
      </div>
    {:else if filteredSubscriptions.length === 0}
      <div class="empty-state">
        <p>No subscriptions match your filters.</p>
        <button
          class="reset-btn"
          on:click={() => {
            filterStatus = "All";
            searchQuery = "";
          }}>Reset Filters</button
        >
      </div>
    {:else}
      <div class="subscriptions-container">
        {#each filteredSubscriptions as subscription (subscription.id)}
          <div class="subscription-card">
            <div class="subscription-header">
              <div class="subscription-id">
                ID: #{subscription.id.toString()}
              </div>
              <div
                class="subscription-status status-{subscription.status.toLowerCase()}"
              >
                <select
                  value={subscription.status}
                  on:change={(e) => handleSelectChange(e, subscription.id)}
                >
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div class="subscription-info">
              <div class="info-group">
                <div class="info-label">Customer:</div>
                <div class="info-value">{subscription.user_phone}</div>
              </div>

              <div class="info-group">
                <div class="info-label">Start Date:</div>
                <div class="info-value">
                  {formatDate(subscription.start_date)}
                </div>
              </div>

              <div class="info-group">
                <div class="info-label">Delivery Days:</div>
                <div class="info-value">
                  {subscription.delivery_days.join(", ")}
                </div>
              </div>

              <div class="info-group">
                <div class="info-label">Time Slot:</div>
                <div class="info-value">{subscription.delivery_time_slot}</div>
              </div>

              <div class="info-group full-width">
                <div class="info-label">Address:</div>
                <div class="info-value">{subscription.delivery_address}</div>
              </div>
            </div>

            <div class="subscription-items">
              <div class="items-header">Products:</div>
              <div class="items-list">
                {#each subscription.items as item}
                  <div class="item">
                    <span class="item-name">{item.name}</span>
                    <span class="item-qty">{item.quantity} {item.unit}</span>
                    <span class="item-price">₹{item.price * item.quantity}</span
                    >
                  </div>
                {/each}
              </div>
            </div>

            <div class="subscription-actions">
              <button class="action-btn view-btn">View Details</button>
              <button class="action-btn edit-btn">Edit</button>
            </div>
          </div>
        {/each}
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
  }

  .subscriptions-section {
    padding: 1.5rem;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .filters {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .search-filter {
    flex: 1;
    min-width: 250px;
  }

  .search-filter input {
    width: 100%;
    padding: 0.6rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.95rem;
  }

  .status-filter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-filter select {
    padding: 0.6rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.95rem;
  }

  .subscriptions-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .subscription-card {
    border: 1px solid #eee;
    border-radius: 8px;
    overflow: hidden;
    background-color: #fafafa;
  }

  .subscription-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background-color: #f5f5f5;
    border-bottom: 1px solid #eee;
  }

  .subscription-id {
    font-weight: 600;
    font-size: 1rem;
  }

  .subscription-status {
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .status-active select {
    background-color: #e8f5e9;
    border: 1px solid #c8e6c9;
    border-radius: 4px;
    padding: 0.3rem;
    font-size: 0.9rem;
  }

  .status-paused select {
    background-color: #fff8e1;
    border: 1px solid #ffecb3;
    border-radius: 4px;
    padding: 0.3rem;
    font-size: 0.9rem;
  }

  .status-cancelled select {
    background-color: #ffebee;
    border: 1px solid #ffcdd2;
    border-radius: 4px;
    padding: 0.3rem;
    font-size: 0.9rem;
  }

  .subscription-info {
    padding: 1rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    border-bottom: 1px solid #eee;
  }

  .info-group {
    flex: 1 0 calc(50% - 0.8rem);
    min-width: 120px;
  }

  .info-group.full-width {
    flex-basis: 100%;
  }

  .info-label {
    color: #666;
    font-size: 0.85rem;
    margin-bottom: 0.2rem;
  }

  .info-value {
    color: #333;
    font-size: 0.95rem;
  }

  .subscription-items {
    padding: 1rem;
    border-bottom: 1px solid #eee;
  }

  .items-header {
    font-weight: 600;
    margin-bottom: 0.8rem;
    font-size: 0.95rem;
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem;
    background-color: #f9f9f9;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .item-name {
    flex: 2;
    font-weight: 500;
  }

  .item-qty {
    flex: 1;
    text-align: center;
  }

  .item-price {
    flex: 1;
    text-align: right;
    color: #5eaa6f;
  }

  .subscription-actions {
    display: flex;
    padding: 1rem;
    gap: 0.8rem;
    justify-content: flex-end;
  }

  .action-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .view-btn {
    background-color: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
  }

  .edit-btn {
    background-color: #2196f3;
    color: white;
  }

  .loading-container,
  .empty-state,
  .error-container {
    padding: 3rem;
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

  .reset-btn,
  .retry-btn {
    padding: 0.6rem 1.2rem;
    background-color: #5eaa6f;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 1rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
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
    }

    .subscriptions-container {
      grid-template-columns: 1fr;
    }
  }
</style>
