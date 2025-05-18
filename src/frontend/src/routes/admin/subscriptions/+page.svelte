<script lang="ts">
  import { onMount } from "svelte";
  import { getAllSubscriptions, getProducts } from "$lib/api";
  import type { Subscription as SubscriptionType, Product } from "$lib/types";

  // Define types for our data
  interface DisplaySubscriptionItem {
    product_id: number;
    name: string;
    quantity: number;
    price?: number;
    unit?: string;
  }

  interface DisplaySubscription {
    id: number | bigint;
    user_phone_number: string;
    items: DisplaySubscriptionItem[];
    delivery_days: string[];
    delivery_time_slot: string;
    delivery_address: string;
    start_date: number;
    next_order_date?: number;
    created_at?: number;
    updated_at?: number;
    status: any;
  }

  let subscriptions: DisplaySubscription[] = [];
  let isLoading = true;
  let loadError = false;
  let productMap = new Map<
    number,
    { name: string; price: number; unit: string }
  >();

  // For filtering
  let filterStatus = "All";
  let searchQuery = "";

  onMount(async () => {
    await loadInitialData();
  });

  async function loadInitialData() {
    isLoading = true;
    loadError = false;
    try {
      // Fetch all products first to create a lookup map
      const productsFromApi = await getProducts();
      productMap = new Map(
        productsFromApi.map((p) => [
          p.id,
          { name: p.name, price: p.price, unit: p.unit },
        ])
      );
      await loadSubscriptions();
    } catch (error) {
      console.error(
        "Failed to load initial data for admin subscriptions:",
        error
      );
      loadError = true;
    } finally {
      isLoading = false;
    }
  }

  async function loadSubscriptions() {
    // isLoading is managed by loadInitialData
    try {
      const data = await getAllSubscriptions();

      subscriptions = data.map((sub) => {
        return {
          ...sub,
          items: sub.items.map((item) => {
            const productDetails = productMap.get(item.product_id);
            return {
              product_id: item.product_id,
              name: productDetails?.name || `Product #${item.product_id}`,
              quantity: item.quantity,
              price: productDetails?.price,
              unit: productDetails?.unit,
            };
          }),
        };
      });
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
      loadError = true;
    }
  }

  function formatDate(timestamp: number | undefined): string {
    if (!timestamp || timestamp === 0) return "N/A";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function handleStatusChange(
    subscriptionId: bigint | number,
    newStatus: string
  ): void {
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

  function handleSelectChange(
    event: Event,
    subscriptionId: bigint | number
  ): void {
    const target = event.target as HTMLSelectElement;
    if (target) {
      handleStatusChange(subscriptionId, target.value);
    }
  }

  // Helper to get status display name - converting from backed enum format
  function getStatusDisplayName(status: any): string {
    if (typeof status === "object") {
      // Handle Candid enum format like { Active: null }
      const key = Object.keys(status)[0];
      return key || "Unknown";
    }
    return status || "Unknown";
  }

  // Computed for filtered subscriptions
  $: filteredSubscriptions = subscriptions.filter((sub) => {
    const subStatus = getStatusDisplayName(sub.status);

    // Filter by status
    if (filterStatus !== "All" && subStatus !== filterStatus) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const userPhone = sub.user_phone_number || "";
      return (
        userPhone.toLowerCase().includes(query) ||
        sub.delivery_address.toLowerCase().includes(query) ||
        sub.items.some((item) =>
          (item.name || "").toLowerCase().includes(query)
        )
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
                ID: #{String(subscription.id)}
              </div>
              <div
                class="subscription-status status-{getStatusDisplayName(
                  subscription.status
                ).toLowerCase()}"
              >
                <select
                  value={getStatusDisplayName(subscription.status)}
                  on:change={(e) => handleSelectChange(e, subscription.id)}
                >
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div class="subscription-details">
              <p><strong>Customer:</strong> {subscription.user_phone_number}</p>
              <p>
                <strong>Start Date:</strong>
                {formatDate(subscription.start_date)}
              </p>
              <p>
                <strong>Next Order Date:</strong>
                {formatDate(subscription.next_order_date)}
              </p>
              <p>
                <strong>Delivery Days:</strong>
                {subscription.delivery_days.join(", ")}
              </p>
              <p>
                <strong>Time Slot:</strong>
                {subscription.delivery_time_slot}
              </p>
              <p><strong>Address:</strong> {subscription.delivery_address}</p>
              <div class="products-section">
                <strong>Products:</strong>
                {#if subscription.items.length > 0}
                  <ul>
                    {#each subscription.items as item (item.product_id)}
                      <li>{item.name} - {item.quantity} {item.unit || ""}</li>
                    {/each}
                  </ul>
                {:else}
                  <p>No items in this subscription.</p>
                {/if}
              </div>
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

  .subscription-details {
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

  .products-section {
    padding: 1rem;
    border-bottom: 1px solid #eee;
  }

  .products-list {
    list-style: none;
    padding: 0;
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
      justify-content: center;
      display: flex;
    }

    .subscriptions-container {
      grid-template-columns: 1fr;
    }

    .filters {
      flex-direction: column;
    }

    .status-filter {
      width: 100%;
      justify-content: space-between;
    }

    .admin-page {
      padding: 0.5rem;
    }

    .subscriptions-section {
      padding: 1rem;
    }
  }
</style>
