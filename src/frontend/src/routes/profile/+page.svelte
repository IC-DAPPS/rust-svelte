<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores"; // Import page store
  import { goto } from "$app/navigation"; // Import goto for navigation
  import {
    getProfileByPhone,
    createProfile,
    updateProfile,
    getMyOrders,
    getProducts,
  } from "$lib/api";
  import type { UserProfile, Order, Product } from "$lib/types";
  import { toastsStore } from "@dfinity/gix-components";

  let phoneNumber = "";
  let profile: UserProfile | null = null;
  let name = "";
  let address = "";
  let loading = false;
  let submitting = false;
  let message = "";
  let isLoggedIn = false;
  let isEditMode = false;

  let orders: Order[] = [];
  let currentOrder: Order | null = null;
  let ordersLoading = false;
  let productMap: Map<number, string> = new Map();

  let isAdminViewing = false; // To track if admin is viewing

  onMount(() => {
    const params = $page.url.searchParams;
    const phoneFromQuery = params.get("phone");
    const adminViewFromQuery = params.get("adminView");

    isAdminViewing = adminViewFromQuery === "true";

    if (phoneFromQuery) {
      phoneNumber = phoneFromQuery;
      isLoggedIn = true;
      loadProfile();
      loadProductsAndOrders();
    } else if (!isAdminViewing) {
      // Only fallback to localStorage if not admin viewing (admin always needs phone in URL)
      const storedPhoneNumber = localStorage.getItem("userPhoneNumber");
      if (storedPhoneNumber) {
        phoneNumber = storedPhoneNumber;
        isLoggedIn = true;
        loadProfile();
        loadProductsAndOrders();
      }
    }

    // If admin is viewing but no phone number, they can't see anything
    if (isAdminViewing && !phoneFromQuery) {
      isLoggedIn = false; // Ensure nothing loads if admin view is true but no phone
      loading = false;
      ordersLoading = false;
      message = "Cannot display profile: Phone number missing for admin view.";
      toastsStore.show({
        text: message,
        level: "error",
      });
    }
  });

  function handleLogin() {
    if (phoneNumber.trim().length > 0) {
      // Save phone number to localStorage for persistence
      localStorage.setItem("userPhoneNumber", phoneNumber);
      isLoggedIn = true;
      loadProfile();
      loadProductsAndOrders();
    }
  }

  async function loadProfile() {
    if (!phoneNumber) {
      loading = false;
      return;
    }
    loading = true;
    message = "";
    try {
      profile = await getProfileByPhone(phoneNumber);
      if (profile) {
        name = profile.name;
        address = profile.address;
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      message = "Failed to load profile";
    } finally {
      loading = false;
    }
  }

  async function loadProductsAndOrders() {
    if (!phoneNumber) {
      // Don't load if no phone number (e.g. admin view without phone)
      ordersLoading = false;
      return;
    }
    ordersLoading = true;
    try {
      // Fetch products and create a map for product_id -> name
      const products = await getProducts();
      productMap = new Map(products.map((p) => [p.id, p.name]));
      await loadOrders();
    } catch (error) {
      console.error(
        "Failed to load products or orders for profile page:",
        error
      );
      currentOrder = null;
    } finally {
      ordersLoading = false;
    }
  }

  async function loadOrders() {
    if (!phoneNumber) {
      currentOrder = null;
      orders = [];
      return;
    }
    try {
      const allOrders = await getMyOrders(phoneNumber);
      orders = allOrders;
      // Filter for active orders (Pending, Processing, OutForDelivery)
      currentOrder =
        orders.find(
          (order) =>
            order.status &&
            ("Pending" in order.status ||
              "Processing" in order.status ||
              "OutForDelivery" in order.status)
        ) || null;
    } catch (error) {
      console.error("Failed to load orders for profile page:", error);
      currentOrder = null;
    }
  }

  async function handleSubmit() {
    if (isAdminViewing) return; // Prevent submission for admin

    if (!phoneNumber.trim()) {
      message = "Phone number is required";
      return;
    }

    submitting = true;
    message = "";

    try {
      const updatedProfile: UserProfile = {
        name,
        address,
        phone_number: phoneNumber,
      };

      let success;

      if (profile) {
        // Update existing profile
        success = await updateProfile(updatedProfile);
      } else {
        // Create new profile
        success = await createProfile(updatedProfile);
      }

      if (success) {
        // Update localStorage with the possibly new phone number
        localStorage.setItem("userPhoneNumber", phoneNumber);

        message = profile
          ? "Profile updated successfully!"
          : "Profile created successfully!";

        // If we created a new profile, load it
        if (!profile) {
          profile = await getProfileByPhone(phoneNumber);
        } else {
          profile = updatedProfile;
        }

        isEditMode = false;
      } else {
        message = "Failed to save profile. Please try again.";
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      message = "An error occurred. Please try again.";
    } finally {
      submitting = false;
    }
  }

  function toggleEditMode() {
    if (isAdminViewing) return; // Prevent entering edit mode for admin
    isEditMode = !isEditMode;

    if (profile) {
      // Reset form data to current profile data
      name = profile.name;
      address = profile.address;
    }
  }

  function handleLogout() {
    if (isAdminViewing) {
      // If admin is viewing, "logout" means going back or closing tab.
      goto("/admin/customers"); // Or some other appropriate admin page
      return;
    }
    localStorage.removeItem("userPhoneNumber");
    isLoggedIn = false;
    phoneNumber = "";
    profile = null;
    message = "";
    loadProfile();
    loadProductsAndOrders();
  }

  // Specific navigation functions for admin/user
  function handleViewOrdersClick() {
    if (isAdminViewing) {
      goto(`/admin/orders?userId=${phoneNumber}`);
    } else {
      goto("/orders"); // Customer's own orders page (assuming this route exists)
    }
  }
</script>

<svelte:head>
  <title
    >{isAdminViewing
      ? `Admin View: ${name || phoneNumber}`
      : name
        ? `${name}'s Profile`
        : "User Profile"}</title
  >
</svelte:head>

<div class="profile-container">
  {#if isLoggedIn}
    <div class="profile-header">
      <h2>
        {isAdminViewing
          ? `Viewing Profile: ${name || phoneNumber}`
          : "My Profile"}
      </h2>
    </div>

    {#if loading}
      <p>Loading profile...</p>
    {:else if profile}
      {#if !isAdminViewing}
        <div class="profile-actions" style="margin-bottom: 1rem;">
          <button class="logout-btn" on:click={handleLogout}>Logout</button>
        </div>
      {/if}

      {#if isAdminViewing}
        <div class="admin-notice">
          <p>
            ℹ️ You are viewing this profile as an Administrator. Editing is
            disabled.
          </p>
        </div>
      {/if}
      <div class="profile-details">
        <p><strong>Name:</strong> {profile.name}</p>
        <p><strong>Phone:</strong> {profile.phone_number}</p>
        <p><strong>Address:</strong> {profile.address}</p>
      </div>

      {#if !isAdminViewing}
        <div class="profile-actions">
          <button class="edit-btn" on:click={toggleEditMode}>
            {isEditMode ? "Cancel" : "Edit Profile"}
          </button>
        </div>
      {/if}

      {#if isEditMode && !isAdminViewing}
        <form on:submit|preventDefault={handleSubmit} class="profile-form">
          <div class="form-group">
            <label for="phone">Phone Number:</label>
            <input type="tel" id="phone" bind:value={phoneNumber} required />
            <small class="form-hint"
              >This is the phone number you logged in with. You can change it if
              needed.</small
            >
          </div>
          <div class="form-group">
            <label for="name">Name:</label>
            <input type="text" id="name" bind:value={name} required />
          </div>
          <div class="form-group">
            <label for="address">Address:</label>
            <textarea id="address" bind:value={address} required></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="save-btn" disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" class="cancel-btn" on:click={toggleEditMode}
              >Cancel</button
            >
          </div>
        </form>
      {/if}

      {#if message}<p class="message">{message}</p>{/if}

      <!-- Current Order Section (Remains largely the same, but consider if admin needs different actions) -->
      <div class="current-order-section card">
        <h3>Current Order</h3>
        {#if ordersLoading}
          <p>Loading current order...</p>
        {:else if currentOrder}
          <div class="order-details">
            <p><strong>Order ID:</strong> #{currentOrder.id}</p>
            <p>
              <strong>Status:</strong>
              <span
                class="status-badge {Object.keys(
                  currentOrder.status
                )[0].toLowerCase()}">{Object.keys(currentOrder.status)[0]}</span
              >
            </p>
            <p>
              <strong>Placed On:</strong>
              {new Date(
                Number(currentOrder.timestamp) / 1_000_000
              ).toLocaleString()}
            </p>
            <p>
              <strong>Delivery Address:</strong>
              {currentOrder.delivery_address}
            </p>
            <p><strong>Order Items:</strong></p>
            <ul>
              {#each currentOrder.items as item}
                <li>
                  {productMap.get(item.product_id) ||
                    `Product ID ${item.product_id}`}
                  - Quantity: {item.quantity}, Price: ₹{item.price_per_unit_at_order?.toFixed(
                    2
                  )}
                </li>
              {/each}
            </ul>
            <p>
              <strong>Total:</strong> ₹{currentOrder.total_amount.toFixed(2)}
            </p>
          </div>
        {:else}
          <p>No active orders found.</p>
        {/if}
      </div>

      <!-- Buttons at the bottom -->
      <div class="profile-page-actions">
        {#if !isAdminViewing}
          <!-- Edit profile button is already above near profile details -->
        {/if}
        <button class="view-orders-btn" on:click={handleViewOrdersClick}>
          {isAdminViewing ? "View All Orders (Admin)" : "View My Orders"}
        </button>
      </div>
    {:else if !loading}
      <!-- if not loading and no profile -->
      <p>
        {#if isAdminViewing}
          Could not load profile for {phoneNumber}. Ensure the phone number is
          correct.
        {:else}
          No profile found for this phone number. Please create a new profile.
        {/if}
      </p>
      {#if !isAdminViewing}
        <form on:submit|preventDefault={handleSubmit} class="profile-form">
          <div class="form-group">
            <label for="phone">Phone Number:</label>
            <input type="tel" id="phone" bind:value={phoneNumber} required />
            <small class="form-hint"
              >This is the phone number you logged in with. You can change it if
              needed.</small
            >
          </div>
          <div class="form-group">
            <label for="name">Name:</label>
            <input type="text" id="name" bind:value={name} required />
          </div>
          <div class="form-group">
            <label for="address">Address:</label>
            <textarea id="address" bind:value={address} required></textarea>
          </div>
          <div class="form-actions">
            <button
              type="submit"
              class="save-btn"
              disabled={submitting || !name || !address}
            >
              {submitting ? "Creating..." : "Create Profile"}
            </button>
            <button type="button" class="cancel-btn" on:click={handleLogout}
              >Cancel</button
            >
          </div>
        </form>
        {#if message}<p class="message">{message}</p>{/if}
      {/if}
    {/if}
  {:else}
    <p>
      {#if isAdminViewing}
        Could not load profile for {phoneNumber}. Ensure the phone number is
        correct.
      {:else}
        Please enter your phone number to login or view your profile.
      {/if}
    </p>
    {#if !isAdminViewing}
      <div class="login-form">
        <input
          type="tel"
          bind:value={phoneNumber}
          placeholder="Enter phone number"
        />
        <button on:click={handleLogin} disabled={!phoneNumber.trim()}
          >Login / View Profile</button
        >
      </div>
    {/if}
  {/if}
</div>

<style>
  /* ... existing styles ... */
  /* styles for status badges */
  .status-badge {
    padding: 0.2em 0.6em;
    border-radius: 0.25rem;
    font-weight: bold;
    font-size: 0.85em;
    color: white;
    display: inline-block;
    margin-bottom: 0.5rem; /* Added margin for spacing below badge */
  }
  .status-badge.active,
  .status-badge.confirmed,
  .status-badge.pending,
  .status-badge.processing,
  .status-badge.outfordelivery {
    background-color: #28a745; /* Green for active/positive statuses */
  }
  .status-badge.pending {
    background-color: #ffc107;
    color: #333;
  } /* Yellow for pending */
  .status-badge.paused {
    background-color: #fd7e14; /* Orange for paused */
  }
  .status-badge.cancelled,
  .status-badge.error {
    background-color: #dc3545; /* Red for cancelled/error */
  }
  .status-badge.delivered {
    background-color: #17a2b8; /* Info blue for delivered */
  }

  .profile-container {
    max-width: 800px;
    margin: 2rem auto;
    padding: 1rem;
  }
  .profile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  .profile-header h2 {
    margin: 0;
    font-size: 1.8rem;
    color: #333;
  }
  .logout-btn {
    background-color: #dc3545;
    color: white;
  }
  .admin-notice {
    background-color: #e9f5ff;
    border-left: 4px solid #007bff;
    padding: 1rem;
    margin-bottom: 1rem;
    color: #004085;
  }
  .profile-details {
    background-color: #f9f9f9;
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
  }
  .profile-details p {
    margin: 0.5rem 0;
  }
  .profile-actions {
    margin-bottom: 1.5rem;
  }
  .edit-btn,
  .save-btn,
  .cancel-btn,
  .view-orders-btn,
  .action-btn {
    padding: 0.6rem 1.2rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    margin-right: 0.5rem;
  }
  .edit-btn {
    background-color: #ffc107;
    color: #212529;
  } /* Yellow */
  .save-btn {
    background-color: #28a745;
    color: white;
  } /* Green */
  .cancel-btn {
    background-color: #6c757d;
    color: white;
  } /* Grey */
  .view-orders-btn {
    background-color: #545b62;
    color: white;
  } /* Dark Grey */

  .profile-form .form-group {
    margin-bottom: 1rem;
  }
  .profile-form label {
    display: block;
    margin-bottom: 0.3rem;
    font-weight: 500;
  }
  .profile-form input[type="text"],
  .profile-form input[type="tel"],
  .profile-form textarea {
    width: 100%;
    padding: 0.6rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
  }
  .profile-form .form-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .message {
    padding: 0.8rem;
    margin: 1rem 0;
    border-radius: 4px;
    background-color: #e2f0e8;
    color: #28a745;
    border: 1px solid #d0e9dd;
  }
  .message.error {
    background-color: #f8d7da;
    color: #721c24;
    border-color: #f5c6cb;
  }

  .card {
    background-color: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  .card h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.4rem;
    color: #333;
    border-bottom: 1px solid #eee;
    padding-bottom: 0.5rem;
  }
  .order-details p {
    margin: 0.4rem 0;
    line-height: 1.6;
  }
  .order-details strong {
    color: #555;
  }
  .order-details ul {
    list-style: disc;
    margin-left: 1.5rem;
    padding-left: 0.5rem;
  }
  .order-details li {
    margin-bottom: 0.3rem;
  }

  .login-form {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-top: 1rem;
  }
  .login-form input {
    padding: 0.6rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    flex-grow: 1;
  }
  .login-form button {
    background-color: #007bff;
    color: white;
  }

  .profile-page-actions {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #eee;
    display: flex;
    gap: 0.5rem;
  }

  .profile-form input[disabled] {
    background-color: #f5f5f5;
    color: #666;
  }

  .form-hint {
    display: block;
    font-size: 0.8rem;
    color: #666;
    margin-top: 0.2rem;
  }
</style>
