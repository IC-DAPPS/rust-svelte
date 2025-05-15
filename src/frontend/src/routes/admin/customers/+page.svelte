<script lang="ts">
  import { onMount } from "svelte";

  // Define Customer interface
  interface Customer {
    phone_number: string;
    name: string;
    email: string;
    address: string;
    created_at: number;
    orders_count: number;
    subscriptions_count: number;
  }

  // Mock customer data for demo
  const mockCustomers: Customer[] = [
    {
      phone_number: "7389345065",
      name: "Rahul Sharma",
      email: "rahul@example.com",
      address: "123 Main Street, Mumbai, Maharashtra",
      created_at: Date.now() - 86400000 * 30, // 30 days ago
      orders_count: 15,
      subscriptions_count: 1,
    },
    {
      phone_number: "9876543210",
      name: "Priya Patel",
      email: "priya@example.com",
      address: "456 Park Avenue, Delhi, Delhi",
      created_at: Date.now() - 86400000 * 15, // 15 days ago
      orders_count: 8,
      subscriptions_count: 1,
    },
    {
      phone_number: "8765432109",
      name: "Amit Kumar",
      email: "amit@example.com",
      address: "789 Garden Road, Bangalore, Karnataka",
      created_at: Date.now() - 86400000 * 5, // 5 days ago
      orders_count: 2,
      subscriptions_count: 1,
    },
    {
      phone_number: "9988776655",
      name: "Sneha Gupta",
      email: "sneha@example.com",
      address: "234 Lake View, Chennai, Tamil Nadu",
      created_at: Date.now() - 86400000 * 2, // 2 days ago
      orders_count: 1,
      subscriptions_count: 0,
    },
  ];

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
      // In a real app, fetch customers from backend
      // Example: customers = await getCustomers();

      // For demo, use mock data
      setTimeout(() => {
        customers = mockCustomers;
        isLoading = false;
      }, 800);
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
      customer.email.toLowerCase().includes(query) ||
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
                <td>{customer.email}</td>
                <td class="address-cell">{customer.address}</td>
                <td>{formatDate(customer.created_at)}</td>
                <td>{customer.orders_count}</td>
                <td>{customer.subscriptions_count}</td>
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
  }

  .customers-table {
    width: 100%;
    border-collapse: collapse;
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

  .orders-btn {
    background-color: #5eaa6f;
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

  .retry-btn,
  .reset-btn {
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

  @media (max-width: 992px) {
    .customers-table {
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
    }
  }
</style>
