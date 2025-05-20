<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores"; // Import page store
  import { goto } from "$app/navigation"; // Import goto for navigation
  import {
    getProfileByPhone,
    createProfile,
    updateProfile,
    getMySubscriptions,
    getMyOrders,
    getProducts,
  } from "$lib/api";
  import type { UserProfile, Order, Product, Subscription } from "$lib/types"; // Added Subscription type
  import { toastsStore } from "$lib/stores/toasts"; // For showing toast messages

  let phoneNumber = "";
  let profile: UserProfile | null = null;
  let name = "";
  let address = "";
  let loading = false;
  let submitting = false;
  let message = "";
  let isLoggedIn = false;
  let isEditMode = false;

  // For subscription tracking
  let hasActiveSubscription = false;
  let subscriptionData: Subscription | null = null; // Use Subscription type

  // Computed properties for display
  let formattedDeliveryDays = "";
  let formattedProductNames = "";
  let formattedSubscriptionDates = "";
  let formattedTotalCost = "";

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
      checkForSubscription();
      loadProductsAndOrders();
    } else if (!isAdminViewing) { // Only fallback to localStorage if not admin viewing (admin always needs phone in URL)
      const storedPhoneNumber = localStorage.getItem("userPhoneNumber");
      if (storedPhoneNumber) {
        phoneNumber = storedPhoneNumber;
        isLoggedIn = true;
        loadProfile();
        checkForSubscription();
        loadProductsAndOrders();
      }
    }

    // If admin is viewing but no phone number, they can't see anything
    if (isAdminViewing && !phoneFromQuery) {
        isLoggedIn = false; // Ensure nothing loads if admin view is true but no phone
        loading = false;
        ordersLoading = false;
        message = "Cannot display profile: Phone number missing for admin view.";
        toastsStore.show({ text: message, level: "error" });
    }
  });

  function checkForSubscription() {
    if (!phoneNumber && !isAdminViewing) return; // Don't check if not logged in (for non-admin)

    const savedSubscription = localStorage.getItem("userSubscription");
    if (savedSubscription && !isAdminViewing) { // Admin view should rely on fresh data, not localStorage for subscription display
      try {
        const parsedData = JSON.parse(savedSubscription);
        // Basic validation of parsed data
        if (parsedData && parsedData.id !== undefined) {
            subscriptionData = parsedData as Subscription;
            hasActiveSubscription = true;
            formatSubscriptionDataForDisplay();
        } else {
            throw new Error("Invalid subscription data structure");
        }
      } catch (e) {
        console.error("Failed to parse saved subscription", e);
        hasActiveSubscription = false;
        subscriptionData = null;
        localStorage.removeItem("userSubscription");
      }
    } else if (isAdminViewing || !savedSubscription) { // For admin or if no localStorage, try to fetch
        fetchUserSubscription();
    } else {
      hasActiveSubscription = false;
      subscriptionData = null;
    }
  }

  async function fetchUserSubscription() {
    if (!phoneNumber) return;
    try {
      const userSubscriptions = await getMySubscriptions(phoneNumber);
      if (userSubscriptions && userSubscriptions.length > 0) {
        // Assuming the first active subscription is the one to show
        // You might need more sophisticated logic if multiple active subs are possible (though we aimed for one)
        const activeSub = userSubscriptions.find(sub => sub.status === 'Active'); // Make sure status enum matches backend
        if (activeSub) {
            subscriptionData = activeSub;
            hasActiveSubscription = true;
            formatSubscriptionDataForDisplay();
            // For non-admin, also save to localStorage
            if (!isAdminViewing) {
                localStorage.setItem("userSubscription", JSON.stringify(activeSub));
            }
        } else {
            hasActiveSubscription = false;
            subscriptionData = null;
            if (!isAdminViewing) localStorage.removeItem("userSubscription");
        }
      } else {
        hasActiveSubscription = false;
        subscriptionData = null;
        if (!isAdminViewing) localStorage.removeItem("userSubscription");
      }
    } catch (error) {
      console.error("Failed to fetch user subscription from backend:", error);
      hasActiveSubscription = false;
      subscriptionData = null;
      // Don't clear local storage on network error, user might be offline but had data
    }
  }


  function formatSubscriptionDataForDisplay() {
    if (!subscriptionData) return;

    // Format Product Names
    if (subscriptionData.items && Array.isArray(subscriptionData.items)) {
      // If productMap is available, use it to get names, otherwise show IDs or a placeholder
      formattedProductNames = subscriptionData.items
        .map((item: any) => {
          const productName = productMap.get(BigInt(item.product_id)); // product_id is nat64
          return productName
            ? `${productName} (Qty: ${item.quantity})`
            : `Product ID: ${item.product_id} (Qty: ${item.quantity})`;
        })
        .join(", ");
    } else {
      formattedProductNames = "N/A";
    }
    
    // Format Dates
    const startDate = new Date(Number(subscriptionData.start_date) / 1_000_000); // Convert ns to ms
    const nextOrderDate = new Date(Number(subscriptionData.next_order_date) / 1_000_000); // Convert ns to ms

    const startDateStr = !isNaN(startDate.getTime())
      ? startDate.toLocaleDateString()
      : "Invalid Start Date";
    const nextOrderDateStr = !isNaN(nextOrderDate.getTime())
      ? nextOrderDate.toLocaleDateString()
      : "N/A";

    formattedSubscriptionDates = `Starts: ${startDateStr}, Next Order: ${nextOrderDateStr}`;

    // Placeholder for Est. Total Cost as it might need recalculation based on current prices or stored subscription cost
    // For now, if your backend's Subscription type doesn't have a total_cost, this will be an issue.
    // Let's assume it's not directly available on subscriptionData for now and needs logic
    // If you have `price_per_unit_at_subscription` on items, you can calculate.
    let calculatedCost = 0;
    if (subscriptionData.items && productMap.size > 0) { // Check if productMap is loaded
        subscriptionData.items.forEach((item: any) => {
            // This logic assumes we need to get current price from productMap for est. cost
            // If price_per_unit_at_subscription is on item, use that
            // const productDetails = products.find(p => p.id === item.product_id); 
            // For now, skipping detailed cost calculation in this refactor step.
            // It should ideally come from a field like `estimated_monthly_cost` on the subscription object
            // or be calculated using `price_per_unit_at_subscription` stored in `SubscriptionItem`.
        });
    }
    // For now, display N/A or a placeholder if not directly available
    // formattedTotalCost = calculatedCost > 0 ? `₹${calculatedCost.toFixed(2)}` : "Est. Cost: N/A (Recalculate)";
    // Let's assume there is a `total_estimated_cost` field or similar on subscriptionData for now, if not, it will show N/A
    const estCost = (subscriptionData as any).total_estimated_cost; // Example field
    formattedTotalCost = estCost ? `₹${Number(estCost).toFixed(2)}` : "Est. Cost: N/A";


  }

  function handleLogin() {
    if (phoneNumber.trim().length > 0) {
      // Save phone number to localStorage for persistence
      localStorage.setItem("userPhoneNumber", phoneNumber);
      isLoggedIn = true;
      loadProfile();
      checkForSubscription();
      loadProductsAndOrders();
    }
  }

  function handleUnsubscribe() {
    if (isAdminViewing) {
      toastsStore.show({ text: "Admin cannot unsubscribe from this view.", level: "info" });
      return;
    }
    if (
      window.confirm(
        "Are you sure you want to unsubscribe? This action cannot be undone."
      )
    ) {
      localStorage.removeItem("userSubscription");
      hasActiveSubscription = false;
      subscriptionData = null;
      // Optionally, you could show a message here
      // message = "Subscription cancelled successfully.";
      // Note: If using a message, ensure the message display logic handles this.
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

        // If admin is viewing, we don't need to cross-check localStorage for subscriptions.
        // The fetchUserSubscription will handle getting the data.
        // The original logic for clearing stale localStorage is fine for user view.
        if (!isAdminViewing) {
            try {
            const userSubscriptions = await getMySubscriptions(phoneNumber);
            if (
                userSubscriptions.length === 0 &&
                localStorage.getItem("userSubscription")
            ) {
                console.log(
                "Backend has no subscriptions but localStorage has data - clearing stale data"
                );
                localStorage.removeItem("userSubscription");
                hasActiveSubscription = false;
                subscriptionData = null;
            }
            } catch (err) {
            console.error("Failed to verify backend subscriptions:", err);
            }
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      message = "Failed to load profile";
    } finally {
      loading = false;
    }
  }

  async function loadProductsAndOrders() {
    if (!phoneNumber) { // Don't load if no phone number (e.g. admin view without phone)
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
    if (!profile) return;

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
        message = profile
          ? "Profile updated successfully!"
          : "Profile created successfully!";
        profile = updatedProfile;
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
    if (isAdminViewing) { // If admin is viewing, "logout" means going back or closing tab.
        goto("/admin/customers"); // Or some other appropriate admin page
        return;
    }
    localStorage.removeItem("userPhoneNumber");
    isLoggedIn = false;
    phoneNumber = "";
    profile = null;
    hasActiveSubscription = false;
    subscriptionData = null;
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

  function handleViewSubscriptionClick() {
    if (isAdminViewing) {
        if (hasActiveSubscription && subscriptionData) {
            goto(`/admin/subscriptions?userId=${phoneNumber}&subscriptionId=${subscriptionData.id}`);
        } else {
            toastsStore.show({text: "No active subscription for this user.", level: "info"});
        }
    } else {
      // For regular users, "Manage" or viewing subscription details might navigate to /subscription page
      // or show a modal. Current "Manage" button navigates to /subscription for new subscription.
      // This might need a dedicated page or modal for viewing *existing* sub details for user.
      // For now, let's assume the user clicks "Manage" which takes them to /subscription.
      // If they have a subscription, that page should probably display it.
      goto("/subscription");
    }
  }

  function refreshSubscriptionData() {
    if (!phoneNumber) return;
    toastsStore.show({ text: "Refreshing subscription data...", level: "info" });
    fetchUserSubscription(); // Fetch fresh subscription data
  }

</script>

<svelte:head>
  <title>{isAdminViewing ? `Admin View: ${name || phoneNumber}` : (name ? `${name}'s Profile` : 'User Profile')}</title>
</svelte:head>

<div class="profile-container">
  {#if isLoggedIn}
    <div class="profile-header">
      <h2>{isAdminViewing ? `Viewing Profile: ${name || phoneNumber}` : 'My Profile'}</h2>
      {#if !isAdminViewing}
        <button class="logout-btn" on:click={handleLogout}>Logout</button>
      {/if}
    </div>

    {#if loading}
      <p>Loading profile...</p>
    {:else if profile}
      {#if isAdminViewing}
        <div class="admin-notice">
          <p>ℹ️ You are viewing this profile as an Administrator. Editing is disabled.</p>
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
            <button type="button" class="cancel-btn" on:click={toggleEditMode}>Cancel</button>
          </div>
        </form>
      {/if}

      {#if message}<p class="message">{message}</p>{/if}

      <!-- Subscription Section -->
      <div class="subscription-section card">
        <h3>My Subscription</h3>
        {#if hasActiveSubscription && subscriptionData}
        <div class="subscription-info">
            <span class="status-badge {subscriptionData.status?.toLowerCase()}">{subscriptionData.status}</span>
            {#if subscriptionData.updated_at}
                <p class="updated-at">Last Updated: {new Date(Number(subscriptionData.updated_at)/1_000_000).toLocaleString()}</p>
            {/if}
            <p><strong>Products:</strong> {formattedProductNames || 'N/A'}</p>
            <p><strong>Delivery Days:</strong> {subscriptionData.delivery_days?.join(", ") || 'N/A'}</p>
            <p><strong>Time Slot:</strong> {subscriptionData.delivery_time_slot || 'N/A'}</p>
            <p><strong>Dates:</strong> {formattedSubscriptionDates || 'N/A'}</p>
            <p><strong>Est. Total Cost:</strong> {formattedTotalCost || 'N/A'}</p>
            <p><strong>Delivery Address:</strong> {subscriptionData.delivery_address || 'N/A'}</p>

            <div class="subscription-controls">
                {#if !isAdminViewing}
                    <button class="manage-btn" on:click={() => goto('/subscription?edit=true&id=' + subscriptionData?.id)}>Manage</button>
                    <button class="unsubscribe-btn" on:click={handleUnsubscribe}>Unsubscribe</button>
                    <button class="refresh-btn" on:click={refreshSubscriptionData}>Refresh Data</button>
                {:else}
                     <!-- For admin, a button to view this specific subscription in admin subscriptions page -->
                    <button class="action-btn admin-view-sub-btn" on:click={() => goto(`/admin/subscriptions?userId=${phoneNumber}&subscriptionId=${subscriptionData?.id}`)}>
                        View Subscription (Admin)
                    </button>
                {/if}
            </div>
        </div>
        {:else}
          <p>You have no active subscriptions.</p>
          {#if !isAdminViewing}
            <button class="subscribe-btn" on:click={() => goto("/subscription")}>
              Create New Subscription
            </button>
          {/if}
        {/if}
      </div>


      <!-- Current Order Section (Remains largely the same, but consider if admin needs different actions) -->
      <div class="current-order-section card">
        <h3>Current Order</h3>
        {#if ordersLoading}
          <p>Loading current order...</p>
        {:else if currentOrder}
          <div class="order-details">
            <p><strong>Order ID:</strong> #{currentOrder.id}</p>
            <p><strong>Status:</strong> <span class="status-badge {currentOrder.status.toLowerCase()}">{currentOrder.status}</span></p>
            <p><strong>Placed On:</strong> {new Date(Number(currentOrder.timestamp) / 1_000_000).toLocaleString()}</p>
            <p><strong>Delivery Address:</strong> {currentOrder.delivery_address}</p>
            <p><strong>Order Items:</strong></p>
            <ul>
              {#each currentOrder.items as item}
                <li>
                  {productMap.get(BigInt(item.product_id)) || `Product ID ${item.product_id}`}
                  - Quantity: {item.quantity}, 
                  Price: ₹{item.price_per_unit_at_order?.toFixed(2)}
                </li>
              {/each}
            </ul>
            <p><strong>Total:</strong> ₹{currentOrder.total_amount.toFixed(2)}</p>
          </div>
        {:else}
          <p>No active order found for the current subscription period.</p>
        {/if}
      </div>
      
      <!-- Buttons at the bottom -->
      <div class="profile-page-actions">
          {#if !isAdminViewing}
            <!-- Edit profile button is already above near profile details -->
          {/if}
          <button class="view-orders-btn" on:click={handleViewOrdersClick}>
            {isAdminViewing ? 'View All Orders (Admin)' : 'View My Orders'}
          </button>
      </div>

    {:else if !loading} <!-- if not loading and no profile -->
      <p>
        {#if isAdminViewing}
            Could not load profile for {phoneNumber}. Ensure the phone number is correct.
        {:else}
            Please enter your phone number to login or view your profile.
        {/if}
      </p>
      {#if !isAdminViewing}
        <div class="login-form">
          <input type="tel" bind:value={phoneNumber} placeholder="Enter phone number" />
          <button on:click={handleLogin} disabled={!phoneNumber.trim()}>Login / View Profile</button>
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
.status-badge.active, .status-badge.confirmed, .status-badge.pending, .status-badge.processing, .status-badge.outfordelivery { background-color: #28a745; /* Green for active/positive statuses */ }
.status-badge.pending { background-color: #ffc107; color: #333; } /* Yellow for pending */
.status-badge.paused { background-color: #fd7e14; /* Orange for paused */ }
.status-badge.cancelled, .status-badge.error { background-color: #dc3545; /* Red for cancelled/error */ }
.status-badge.delivered { background-color: #17a2b8; /* Info blue for delivered */ }


.profile-container { max-width: 800px; margin: 2rem auto; padding: 1rem; }
.profile-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.profile-header h2 { margin: 0; font-size: 1.8rem; color: #333; }
.logout-btn { background-color: #dc3545; color: white; }
.admin-notice { background-color: #e9f5ff; border-left: 4px solid #007bff; padding: 1rem; margin-bottom: 1rem; color: #004085; }
.profile-details { background-color: #f9f9f9; padding: 1rem; border-radius: 6px; margin-bottom: 1rem; }
.profile-details p { margin: 0.5rem 0; }
.profile-actions { margin-bottom: 1.5rem; }
.edit-btn, .save-btn, .cancel-btn, .subscribe-btn, .manage-btn, .unsubscribe-btn, .refresh-btn, .view-orders-btn, .action-btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-right: 0.5rem;
}
.edit-btn { background-color: #ffc107; color: #212529; } /* Yellow */
.save-btn { background-color: #28a745; color: white; } /* Green */
.cancel-btn { background-color: #6c757d; color: white; } /* Grey */
.subscribe-btn, .manage-btn { background-color: #007bff; color: white;} /* Blue */
.unsubscribe-btn { background-color: #dc3545; color: white; } /* Red */
.refresh-btn { background-color: #17a2b8; color: white; } /* Teal */
.view-orders-btn { background-color: #545b62; color: white; } /* Dark Grey */
.admin-view-sub-btn { background-color: #6f42c1; color:white;} /* Indigo */

.profile-form .form-group { margin-bottom: 1rem; }
.profile-form label { display: block; margin-bottom: 0.3rem; font-weight: 500; }
.profile-form input[type="text"], .profile-form textarea {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}
.profile-form .form-actions { display: flex; gap: 0.5rem; margin-top:1rem;}

.message {
  padding: 0.8rem;
  margin: 1rem 0;
  border-radius: 4px;
  background-color: #e2f0e8;
  color: #28a745;
  border: 1px solid #d0e9dd;
}
.message.error { background-color: #f8d7da; color: #721c24; border-color: #f5c6cb;}

.card {
    background-color: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.card h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.4rem;
    color: #333;
    border-bottom: 1px solid #eee;
    padding-bottom: 0.5rem;
}
.subscription-info p, .order-details p { margin: 0.4rem 0; line-height: 1.6; }
.subscription-info strong, .order-details strong { color: #555; }
.subscription-controls { margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem;}
.order-details ul { list-style: disc; margin-left: 1.5rem; padding-left: 0.5rem; }
.order-details li { margin-bottom: 0.3rem;}

.login-form { display: flex; gap: 0.5rem; align-items: center; margin-top: 1rem;}
.login-form input { padding: 0.6rem; border:1px solid #ccc; border-radius:4px; flex-grow:1;}
.login-form button { background-color: #007bff; color:white; }

.profile-page-actions {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #eee;
    display: flex;
    gap: 0.5rem;
}
.updated-at {
    font-size: 0.8em;
    color: #666;
    margin-bottom: 0.5rem;
}
  </style>
