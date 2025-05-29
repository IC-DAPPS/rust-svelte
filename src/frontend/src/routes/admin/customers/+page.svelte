<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { getAllCustomers } from "$lib/api";
  import type { UserProfile } from "$lib/types";

  // Define Customer interface extending UserProfile for admin display
  interface Customer extends UserProfile {
    created_at?: number; // When the user was created
    // orders_count?: number; // Removed
    // has_active_subscription?: boolean; // Removed
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

      customers = userData.map((user) => ({
        ...user,
        created_at: Date.now() - Math.floor(Math.random() * 30) * 86400000, // Random date
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
      customer.address.toLowerCase().includes(query)
    );
  });

  function viewCustomerOrders(customerPhoneNumber: string) {
    goto(`/admin/customers/${customerPhoneNumber}`);
  }

  // Removed viewCustomerSubscription and viewCustomerOrders functions
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
        placeholder="Search by name, phone, or address..."
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
              <th>Address</th>
              <th>Customer Since</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredCustomers as customer (customer.phone_number)}
              <tr>
                <td>{customer.phone_number}</td>
                <td>{customer.name}</td>
                <td class="address-cell">{customer.address}</td>
                <td
                  >{customer.created_at
                    ? formatDate(customer.created_at)
                    : "N/A"}</td
                >
                <td class="profile-action-cell">
                  <button
                    class="action-btn view-orders-btn"
                    style="background-color: #0d6efd; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;"
                    on:click={() => viewCustomerOrders(customer.phone_number)}
                    title="View customer's orders">View Orders</button
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
    vertical-align: middle;
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

  .profile-action-cell {
    white-space: nowrap;
    text-align: center; /* Center the button in its cell */
  }

  .view-orders-btn {
    background-color: #17a2b8; /* Info blue */
    color: white;
  }

  .profile-btn {
    background-color: #007bff; /* Bootstrap primary color */
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    cursor: pointer;
  }
  .profile-btn:hover {
    background-color: #0056b3;
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
