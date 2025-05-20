<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { getSubscriptionDetailsAdmin } from "$lib/api"; // We'll create this API function next
  import type { Subscription as SubscriptionType, Product } from "$lib/types"; // Assuming Product might be needed for item details

  let subscription: SubscriptionType | null = null;
  let isLoading = true;
  let loadError: string | null = null;
  // productMap can be used if you decide to fetch product names for items
  // let productMap = new Map<number, { name: string; price: number; unit: string }>();

  // Helper to format dates, similar to the one in the main subscriptions page
  function formatDate(timestamp: number | bigint | undefined): string {
    if (timestamp === undefined || timestamp === null) return "N/A";
    const numericTimestamp = Number(timestamp);
    if (numericTimestamp === 0) return "N/A";
    // Assuming timestamp is already in milliseconds for SubscriptionType from convertBackendSubscription
    // or needs conversion if raw from a new backend source
    const date = new Date(numericTimestamp); // If it's from our convertBackendSubscription, it's already ms.
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Helper to get status display name - converting from backed enum format
  function getStatusDisplayName(status: any): string {
    if (typeof status === "object" && status !== null) {
      const key = Object.keys(status)[0];
      return key || "Unknown";
    }
    return String(status || "Unknown"); // Ensure it's a string
  }

  onMount(async () => {
    isLoading = true;
    loadError = null;
    const subscriptionIdParam = $page.params.id;

    if (!subscriptionIdParam) {
      loadError = "Subscription ID not found in URL.";
      isLoading = false;
      return;
    }

    try {
      const subscriptionId = BigInt(subscriptionIdParam);
      const result = await getSubscriptionDetailsAdmin(subscriptionId);
      if (result) {
        subscription = result;
      } else {
        loadError = `Subscription with ID ${subscriptionIdParam} not found.`;
      }
    } catch (error) {
      console.error(
        `Error fetching subscription details for ID ${subscriptionIdParam}:`,
        error
      );
      loadError = "Failed to load subscription details. Please try again.";
    } finally {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Subscription Details (ID: {$page.params.id}) - Admin</title>
</svelte:head>

<div class="admin-page subscription-details-page">
  {#if isLoading}
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading subscription details...</p>
    </div>
  {:else if loadError}
    <div class="error-container">
      <p>{loadError}</p>
      <a href="/admin/subscriptions" class="back-link"
        >Back to Subscriptions List</a
      >
    </div>
  {:else if subscription}
    <div class="page-header">
      <h1>Subscription Details (ID: {String(subscription.id)})</h1>
      <a href="/admin/subscriptions" class="back-link button-link"
        >Back to List</a
      >
    </div>

    <div class="details-card">
      <div class="detail-section">
        <h2>Customer & Delivery</h2>
        <p>
          <strong>Customer Phone:</strong>
          <a href={`tel:${subscription.user_phone_number}`}
            >{subscription.user_phone_number}</a
          >
        </p>
        <p>
          <strong>Delivery Address:</strong>
          {subscription.delivery_address}
        </p>
        <p>
          <strong>Delivery Days:</strong>
          {subscription.delivery_days.join(", ")}
        </p>
        <p>
          <strong>Delivery Time Slot:</strong>
          {subscription.delivery_time_slot}
        </p>
      </div>

      <div class="detail-section">
        <h2>Subscription Timing & Status</h2>
        <p>
          <strong>Status:</strong>
          {getStatusDisplayName(subscription.status)}
        </p>
        <p>
          <strong>Start Date:</strong>
          {formatDate(subscription.start_date)}
        </p>
        <p>
          <strong>Next Order Date:</strong>
          {formatDate(subscription.next_order_date)}
        </p>
        <p>
          <strong>Created At:</strong>
          {formatDate(subscription.created_at)}
        </p>
        <p>
          <strong>Last Updated At:</strong>
          {formatDate(subscription.updated_at)}
        </p>
      </div>

      <div class="detail-section">
        <h2>Items in Subscription</h2>
        {#if subscription.items && subscription.items.length > 0}
          <ul class="items-list">
            {#each subscription.items as item (item.product_id)}
              <li>
                Product ID: {item.product_id} - Quantity: {item.quantity}
              </li>
            {/each}
          </ul>
        {:else}
          <p>No items in this subscription.</p>
        {/if}
      </div>
    </div>
  {:else}
    <div class="empty-state">
      <p>Subscription data is not available.</p>
      <a href="/admin/subscriptions" class="back-link"
        >Back to Subscriptions List</a
      >
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
  .detail-section {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #eee;
  }
  .detail-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
  .detail-section h2 {
    font-size: 1.3rem;
    color: #444;
    margin-bottom: 1rem;
  }
  .detail-section p {
    margin-bottom: 0.5rem;
    line-height: 1.6;
  }
  .items-list {
    list-style: disc;
    padding-left: 20px;
  }
  .items-list li {
    margin-bottom: 0.3rem;
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
</style>
