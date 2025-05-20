<script lang="ts">
  import { onMount } from "svelte";
  import { getAllSubscriptions, getProducts } from "$lib/api";
  import type { Subscription as SubscriptionType, Product } from "$lib/types";
  import { goto } from "$app/navigation";

  // Define types for our data
  interface DisplaySubscriptionItem {
    product_id: number;
    name: string;
    quantity: number;
    price?: number;
    unit?: string;
    // deliveryDays?: string[]; // Uncomment if you add per-product days in backend
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
  let updatingStatus: { [key: string]: boolean } = {}; // To track loading state for each subscription status update
  let updateError: { [key: string]: string | null } = {}; // To track error messages for each status update

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

  function formatDate(timestamp: number | bigint | undefined): string {
    if (timestamp === undefined || timestamp === null) return "N/A";

    // Convert BigInt to Number for division and Date constructor
    const numericTimestamp = Number(timestamp);
    if (numericTimestamp === 0) return "N/A";

    // Assume timestamp is in nanoseconds if it's a very large number, convert to milliseconds
    // Or if it's already small enough, assume it's in seconds or milliseconds (though backend consistently uses ns)
    // A more robust check might be needed if timestamp units vary wildly.
    const timestampInMilliseconds =
      numericTimestamp > 1_000_000_000_000
        ? numericTimestamp / 1_000_000
        : numericTimestamp * 1000; // If it was seconds, convert to ms. If ms, this is too much.
    // Backend provides nanoseconds, so primary path is /1_000_000

    // Correcting the assumption: backend gives nanoseconds.
    // const timestampInMilliseconds = numericTimestamp / 1_000_000;

    const date = new Date(numericTimestamp / 1_000_000); // Assuming nanoseconds from backend.
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  async function handleStatusChange(
    subscriptionId: bigint | number,
    newStatus: string
  ): Promise<void> {
    const subIdStr = String(subscriptionId);
    updatingStatus = { ...updatingStatus, [subIdStr]: true };
    updateError = { ...updateError, [subIdStr]: null };

    try {
      // In a real app, call API to update subscription status
      // This is a placeholder for the actual API call
      // await updateSubscriptionStatusAdmin(subscriptionId, newStatus);
      console.log(
        `Simulating API call: Updating subscription ${subscriptionId} to status: ${newStatus}`
      );
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // If API call is successful, then update local state
      subscriptions = subscriptions.map((sub) => {
        if (String(sub.id) === subIdStr) {
          // The backend might return the updated subscription or just a success status.
          // For now, we update the status locally. If the backend returns an enum
          // like { Active: null }, we need to transform newStatus to that format.
          // For simplicity, assuming newStatus is already in the correct format or a simple string.
          let backendStatusFormat: any;
          if (newStatus === "Active") backendStatusFormat = { Active: null };
          else if (newStatus === "Paused")
            backendStatusFormat = { Paused: null };
          else if (newStatus === "Cancelled")
            backendStatusFormat = { Cancelled: null };
          else backendStatusFormat = newStatus; // Fallback, though should match known statuses

          return { ...sub, status: backendStatusFormat };
        }
        return sub;
      });
      console.log("Local state updated after simulated API call.");
    } catch (err) {
      console.error(
        `Failed to update status for subscription ${subscriptionId}:`,
        err
      );
      updateError = {
        ...updateError,
        [subIdStr]: "Failed to update status. Please try again.",
      };
    } finally {
      updatingStatus = { ...updatingStatus, [subIdStr]: false };
    }
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

  function getStatusColor(status: any): string {
    const key = getStatusDisplayName(status).toLowerCase();
    if (key === "active") return "#e8f5e9";
    if (key === "paused") return "#fff8e1";
    if (key === "cancelled") return "#ffebee";
    return "#f5f5f5";
  }

  function getStatusTextColor(status: any): string {
    const key = getStatusDisplayName(status).toLowerCase();
    if (key === "active") return "#388e3c";
    if (key === "paused") return "#fbc02d";
    if (key === "cancelled") return "#d32f2f";
    return "#333";
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
          <div
            class="subscription-card"
            style="background: {getStatusColor(subscription.status)};"
          >
            <div class="subscription-header">
              <div class="subscription-id">
                <span style="font-size:1.1em;">ID: {subscription.id}</span>
              </div>
              <div
                class="subscription-status"
                style="color: {getStatusTextColor(
                  subscription.status
                )}; font-weight:bold;"
              >
                <select
                  value={getStatusDisplayName(subscription.status)}
                  on:change={(e) => handleSelectChange(e, subscription.id)}
                  disabled={updatingStatus[String(subscription.id)]}
                >
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                {#if updatingStatus[String(subscription.id)]}
                  <span class="status-updating-spinner">Updating...</span>
                {/if}
                {#if updateError[String(subscription.id)]}
                  <span class="status-update-error"
                    >{updateError[String(subscription.id)]}</span
                  >
                {/if}
              </div>
            </div>

            <div class="subscription-details">
              <p>
                <span class="icon">📞</span> <strong>Customer:</strong>
                <a href={`tel:${subscription.user_phone_number}`}
                  >{subscription.user_phone_number}</a
                >
              </p>
              <p>
                <span class="icon">📅</span> <strong>Start Date:</strong>
                {formatDate(subscription.start_date)}
              </p>
              <p>
                <span class="icon">⏭️</span> <strong>Next Order Date:</strong>
                {formatDate(subscription.next_order_date)}
              </p>
              <p>
                <span class="icon">🗓️</span> <strong>Delivery Days:</strong>
                {subscription.delivery_days.join(", ")}
              </p>
              <p>
                <span class="icon">⏰</span> <strong>Time Slot:</strong>
                {subscription.delivery_time_slot}
              </p>
              <p>
                <span class="icon">📍</span> <strong>Address:</strong>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(subscription.delivery_address)}`}
                  target="_blank">{subscription.delivery_address}</a
                >
              </p>
              <p>
                <span class="icon">🆔</span> <strong>Created:</strong>
                {formatDate(subscription.created_at)} |
                <strong>Updated:</strong>
                {formatDate(subscription.updated_at)}
              </p>
              <div class="products-section">
                <strong>Products:</strong>
                {#if subscription.items.length > 0}
                  <ul>
                    {#each subscription.items as item (item.product_id)}
                      <li>
                        <span class="icon">🥛</span>
                        {item.name} - {item.quantity}
                        {item.unit || ""}
                        <!-- If you add per-product days in backend, show here: (Days: {item.deliveryDays?.join(', ')}) -->
                      </li>
                    {/each}
                  </ul>
                {:else}
                  <p>No items in this subscription.</p>
                {/if}
              </div>
            </div>
            <div class="subscription-actions">
              <button
                class="action-btn view-details-btn"
                on:click={() => goto(`/admin/subscriptions/${subscription.id}`)}
              >
                View Details
              </button>
              <!-- Placeholder for future Manage Orders button -->
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
    margin-bottom: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
    border: 1px solid #e0e0e0;
    overflow: hidden;
  }

  .subscription-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f5f5f5;
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

  .status-updating-spinner,
  .status-update-error {
    font-size: 0.8rem;
    margin-left: 0.5rem;
  }
  .status-update-error {
    color: red;
  }

  .subscription-details {
    padding: 1rem;
    font-size: 1.05em;
  }

  .subscription-details .icon {
    margin-right: 0.3em;
  }

  .subscription-actions {
    padding: 0.5rem 1rem 1rem 1rem;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: flex-end;
  }

  .action-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: #f0f0f0;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }
  .action-btn:hover {
    background-color: #e0e0e0;
  }
  .view-details-btn {
    background-color: #e3f2fd; /* Light blue */
    border-color: #bbdefb;
    color: #0d47a1;
  }
  .view-details-btn:hover {
    background-color: #bbdefb;
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
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: #f8f8f8;
    border-radius: 6px;
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
