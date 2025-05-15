<script lang="ts">
  import { onMount } from "svelte";
  import { getAllCustomers } from "$lib/api";
  import type { UserProfile } from "$lib/types";

  // Define Customer interface extending UserProfile for admin display
  interface Customer extends UserProfile {
    email?: string; // Optional email field
    created_at?: number; // When the user was created
    orders_count?: number;
    subscriptions_count?: number;
  }

  let customers: Customer[] = [];
  let isLoading = true;
  let loadError = false;

  // For search/filter
  let searchQuery = "";

  onMount(async () => {
    await loadCustomers();
  });

  async function loadCustomers(): Promise<void> {
    isLoading = true;
    loadError = false;

    try {
      // Fetch customers from backend
      const userData = await getAllCustomers();

      // Transform to Customer interface with order and subscription counts
      // In a complete implementation, you'd fetch order and subscription counts from backend
      customers = userData.map((user) => ({
        ...user,
        email: `${user.phone_number}@example.com`, // Placeholder email
        created_at: Date.now() - Math.floor(Math.random() * 30) * 86400000, // Random date
        orders_count: 0, // Placeholder - would fetch real data in production
        subscriptions_count: 0, // Placeholder - would fetch real data in production
      }));

      isLoading = false;
    } catch (error) {
      console.error("Failed to load customers:", error);
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

  // Filter customers based on search
  $: filteredCustomers = customers.filter((customer) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      customer.phone_number.includes(query) ||
      customer.name.toLowerCase().includes(query) ||
      (customer.email && customer.email.toLowerCase().includes(query)) ||
      customer.address.toLowerCase().includes(query)
    );
  });
</script>

<svelte:head>
  <title>Customer Management - Admin</title>
</svelte:head>

<div class="admin-page">
  <div class="page-header">
    <h1>Customer Management</h1>
    <button class="refresh-btn" on:click={loadCustomers} disabled={isLoading}>
      🔄 Refresh
    </button>
  </div>

  <div class="customers-section">
    <div class="search-container">
      <input
        type="text"
        class="search-input"
        placeholder="Search by name, phone, email, or address..."
        bind:value={searchQuery}
      />
    </div>

    {#if isLoading}
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading customers...</p>
      </div>
    {:else if loadError}
      <div class="error-container">
        <p>Failed to load customers. Please try again.</p>
        <button class="retry-btn" on:click={loadCustomers}>Try Again</button>
      </div>
    {:else if customers.length === 0}
      <div class="empty-state">
        <p>No customers found.</p>
      </div>
    {:else if filteredCustomers.length === 0}
      <div class="empty-state">
        <p>No customers match your search.</p>
        <button class="reset-btn" on:click={() => (searchQuery = "")}
          >Clear Search</button
        >
      </div>
    {:else}
      <div class="customers-table-container">
        <table class="customers-table">
          <thead>
            <tr>
              <th>Phone Number</th>
              <th>Name</th>
              <th>Email</th>
              <th>Address</th>
              <th>Customer Since</th>
              <th>Orders</th>
              <th>Subscriptions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredCustomers as customer (customer.phone_number)}
              <tr>
                <td>{customer.phone_number}</td>
                <td>{customer.name}</td>
                <td>{customer.email || "N/A"}</td>
                <td class="address-cell">{customer.address}</td>
                <td
                  >{customer.created_at
                    ? formatDate(customer.created_at)
                    : "N/A"}</td
                >
                <td>{customer.orders_count ?? 0}</td>
                <td>{customer.subscriptions_count ?? 0}</td>
                <td class="actions-cell">
                  <button class="action-btn view-btn">View</button>
                  <button class="action-btn orders-btn">Orders</button>
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
  }

  .customers-section {
    background-color: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .search-container {
    margin-bottom: 1.5rem;
  }

  .search-input {
    width: 100%;
    padding: 0.7rem 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  .customers-table-container {
    overflow-x: auto;
    width: 100%;
  }

  .customers-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 800px;
  }

  .customers-table th,
  .customers-table td {
    padding: 0.8rem;
    text-align: left;
    border-bottom: 1px solid #eee;
  }

  .customers-table th {
    background-color: #f5f5f5;
    font-weight: 600;
    color: #555;
  }

  .address-cell {
    max-width: 250px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .actions-cell {
    white-space: nowrap;
  }

  .action-btn {
    padding: 0.4rem 0.8rem;
    margin-right: 0.4rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .view-btn {
    background-color: #4299e1;
    color: white;
  }

  .orders-btn {
    background-color: #5eaa6f;
    color: white;
  }

  .loading-container,
  .error-container,
  .empty-state {
    padding: 3rem 1rem;
    text-align: center;
    color: #666;
  }

  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border-left-color: #5eaa6f;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  .retry-btn,
  .reset-btn {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background-color: #5eaa6f;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
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
    }

    .admin-page {
      padding: 0.5rem;
    }

    .customers-section {
      padding: 1rem;
    }
  }
</style>
