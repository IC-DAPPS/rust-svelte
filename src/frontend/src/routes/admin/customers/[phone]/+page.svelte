<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { getMyOrders, getProducts, getProfileByPhone } from "$lib/api"; // Added getProducts
  import type { Order, UserProfile, Product } from "$lib/types"; // Added Product

  let customerPhoneNumber: string | null = null;
  let customerProfile: UserProfile | null = null;
  let orders: Order[] = [];
  let productMap: Map<number, Product> = new Map(); // To store product details
  let isLoading = true;
  let error: string | null = null;

  onMount(async () => {
    const phoneFromRoute = $page.params.phone;
    if (phoneFromRoute) {
      customerPhoneNumber = phoneFromRoute;
      await loadCustomerDetailsAndOrders();
    } else {
      error = "Customer phone number not found in URL.";
      isLoading = false;
    }
  });

  async function loadCustomerDetailsAndOrders() {
    if (!customerPhoneNumber) return;
    isLoading = true;
    error = null;
    try {
      // Fetch customer profile to display name
      const profilePromise = getProfileByPhone(customerPhoneNumber);
      // Fetch all products to map product_id to product_name
      const productsPromise = getProducts();

      const [profile, products] = await Promise.all([
        profilePromise,
        productsPromise,
      ]);

      if (profile) {
        customerProfile = profile;
      } else {
        error = `Profile not found for ${customerPhoneNumber}`;
      }

      if (products) {
        productMap = new Map(products.map((p) => [p.id, p]));
      }

      // Fetch orders for the customer
      // TODO: Ensure getMyOrders can be used by an admin for any user,
      // or create a new admin-specific API endpoint like getCustomerOrders(phoneNumber)
      const fetchedOrders = await getMyOrders(customerPhoneNumber);
      orders = fetchedOrders.sort((a, b) => Number(b.id) - Number(a.id)); // Sort by most recent
    } catch (e) {
      console.error("Error loading customer orders:", e);
      error = "Failed to load orders for this customer.";
      if (e instanceof Error) {
        error += ` ${e.message}`;
      }
    } finally {
      isLoading = false;
    }
  }

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp / 1_000_000).toLocaleString(); // Convert nanoseconds to milliseconds
  }
</script>

<svelte:head>
  <title
    >Orders by {customerProfile?.name || customerPhoneNumber || "Customer"} - Admin</title
  >
</svelte:head>
<div class="admin-page customer-orders-page">
  <div class="page-header">
    {#if customerPhoneNumber}
      <h2>Orders by: {customerProfile?.name || customerPhoneNumber}</h2>
    {:else}
      <h2>Customer Orders</h2>
    {/if}
    <a
      href="/admin/customers"
      class="button-link back-to-list-button"
      style="background-color: var(--color-success, #28a745);"
      >Back to Customer List</a
    >
  </div>

  {#if isLoading}
    <p>Loading orders...</p>
  {:else if error}
    <div class="error-message">{error}</div>
  {:else if orders.length === 0}
    <p>No orders found for this customer.</p>
  {:else}
    <div class="orders-table-container">
      <table class="orders-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Date</th>
            <th>Status</th>
            <th>Total Amount</th>
            <th>Items</th>
            <th>Delivery Address</th>
          </tr>
        </thead>
        <tbody>
          {#each orders as order (order.id)}
            <tr>
              <td data-label="Order ID">{order.id}</td>
              <td data-label="Date">{formatTimestamp(order.timestamp)}</td>
              <td data-label="Status">
                <span
                  class="status-badge {Object.keys(
                    order.status
                  )[0].toLowerCase()}"
                >
                  {#if Object.keys(order.status)[0] === "Pending"}
                    ⏳ Pending
                  {:else if Object.keys(order.status)[0] === "Confirmed"}
                    ✅ Confirmed
                  {:else if Object.keys(order.status)[0] === "Processing"}
                    ⚙️ Processing
                  {:else if Object.keys(order.status)[0] === "OutForDelivery"}
                    🚚 Out for Delivery
                  {:else if Object.keys(order.status)[0] === "Delivered"}
                    📦 Delivered
                  {:else if Object.keys(order.status)[0] === "Cancelled"}
                    ❌ Cancelled
                  {:else}
                    {Object.keys(order.status)[0]}
                  {/if}
                </span>
              </td>
              <td data-label="Total Amount">₹{order.total_amount.toFixed(2)}</td
              >
              <td data-label="Items">
                <ul>
                  {#each order.items as item}
                    <li>
                      {productMap.get(item.product_id)?.name ||
                        `Product ID ${item.product_id}`}
                      (Qty: {item.quantity}, Price: ₹{item.price_per_unit_at_order.toFixed(
                        2
                      )})
                    </li>
                  {/each}
                </ul>
              </td>
              <td data-label="Delivery Address">{order.delivery_address}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .admin-page {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 1rem;
  }
  h2 {
    margin-bottom: 1.5rem;
    color: #333;
  }
  .error-message {
    color: red;
    padding: 1rem;
    background-color: #ffebeb;
    border: 1px solid red;
    border-radius: 4px;
    margin-bottom: 1rem;
  }
  .orders-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
  }
  .orders-table th,
  .orders-table td {
    border: 1px solid #ddd;
    padding: 0.75rem;
    text-align: left;
    vertical-align: top;
  }
  .orders-table th {
    background-color: #f0f0f0;
  }
  .orders-table ul {
    padding-left: 1.2rem;
    margin: 0;
  }
  .status-badge {
    padding: 0.25em 0.6em;
    border-radius: 0.25rem;
    font-weight: bold;
    color: white;
  }
  .status-badge.pending {
    background-color: #f0ad4e; /* Orange */
  }
  .status-badge.confirmed {
    background-color: #0275d8; /* Blue */
  }
  .status-badge.processing {
    background-color: #5bc0de; /* Light Blue */
  }
  .status-badge.outfordelivery {
    background-color: #5eaa6f; /* Greenish */
  }
  .status-badge.delivered {
    background-color: #5cb85c; /* Green */
  }
  .status-badge.cancelled {
    background-color: #d9534f; /* Red */
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem; /* Matches h2 margin-bottom */
  }

  .back-to-list-button {
    /* Re-using some styles from order details page if applicable, or define new */
    padding: 0.6rem 1rem;
    background-color: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    color: #333; /* Standard text color for button */
    text-decoration: none;
    font-weight: 500;
    transition: background-color 0.2s;
  }
  .back-to-list-button:hover {
    background-color: #e0e0e0;
    text-decoration: none;
  }

  @media (max-width: 768px) {
    .admin-page {
      padding: 0.5rem;
    }
    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem; /* Add some gap */
    }
    .page-header h2 {
      margin-bottom: 0; /* Adjust margin */
    }
    .back-to-list-button {
      padding: 0.5rem 0.8rem;
      font-size: 0.85rem;
      width: 100%; /* Make button full width */
      text-align: center;
    }
    .orders-table-container {
      overflow-x: initial; /* Remove horizontal scroll from container */
      /* width: 100%; */ /* Should be already set or inherit */
    }
    .orders-table {
      width: 100%;
      min-width: 0; /* Override for stacked view */
      border: none; /* Optional: remove table border for card look */
    }
    .orders-table thead {
      display: none; /* Hide table headers */
    }
    .orders-table tr {
      display: block;
      margin-bottom: 1rem; /* Space between cards */
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 1rem;
      background-color: #f9f9f9; /* Light background for each card */
    }
    .orders-table td {
      display: block; /* Stack cells vertically */
      text-align: left; /* NEW: Align content to the left */
      font-size: 0.9rem; /* Adjust font size as needed */
      padding: 0.6rem 0.2rem; /* Vertical padding, some horizontal for alignment */
      border-bottom: 1px dotted #eee; /* Separator for stacked items */
      white-space: normal; /* Allow content to wrap */
    }
    .orders-table td:last-child {
      border-bottom: none; /* No border for the last cell in a card */
    }
    .orders-table td::before {
      content: attr(data-label); /* Get label from data-label attribute */
      display: block; /* NEW: Make label a block element */
      font-weight: bold;
      margin-bottom: 0.25rem; /* NEW: Space below label */
      color: #333;
      white-space: nowrap; /* Keep label on one line */
      overflow: hidden; /* Added to help with float containment */
    }
    .orders-table td[data-label="Items"] ul {
      padding-left: 1.2rem; /* Keep padding for bullet points */
      margin-top: 0.25rem;
      text-align: left; /* Align list items to left */
      display: flow-root; /* This was already present */
      overflow: hidden; /* Added to help with float containment */
    }
    .orders-table td[data-label="Items"] li {
      font-size: 0.85rem;
      margin-bottom: 0.25rem;
    }
    .status-badge {
      /* Adjust badge size/padding if needed for stacked view */
      padding: 0.2em 0.5em;
      font-size: 0.8rem;
    }
  }
</style>
