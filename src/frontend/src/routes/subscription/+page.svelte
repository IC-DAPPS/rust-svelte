<script lang="ts">
  import { onMount } from "svelte";
  import { getProfile, getProducts, createSubscription } from "$lib/api";
  import {
    subscriptionStore,
    subscriptionCounts,
  } from "$lib/stores/subscription";
  import type { UserProfile, Product } from "$lib/types";

  // Helper function to calculate days between two dates
  function daysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    // Calculate the difference in milliseconds
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    // Calculate the difference in days
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end date
  }

  let subscriptionLoading = false;
  let subscriptionSuccess = false;
  let subscriptionError = false;
  let userProfile: UserProfile | null = null;
  let isLoggedIn = false;
  let phoneNumber = ""; // Added for user identification

  // Add the message variable declaration
  let message = "";

  // Subscription form data structure
  interface SubscriptionProduct {
    id: bigint;
    name: string;
    description: string;
    selected: boolean;
    quantity: number;
    unit: string;
    pricePerUnit: number; // Added price per unit
    displayPrice: string;
    deliveryDays: { [key: string]: boolean }; // Delivery days per product
  }

  // Function to calculate estimated subtotal for a single product
  function calculateProductSubtotal(
    product: SubscriptionProduct,
    sDate: string,
    eDate: string
  ): number {
    if (!product.selected || !sDate || !eDate) {
      return 0;
    }
    const totalSubscriptionDays = daysBetween(sDate, eDate);
    if (totalSubscriptionDays <= 0) {
      return 0;
    }

    const productSelectedDayCount = Object.values(product.deliveryDays).filter(
      Boolean
    ).length;

    if (productSelectedDayCount > 0 && product.quantity > 0) {
      const deliveriesPerSelectedDayType = Math.ceil(totalSubscriptionDays / 7); // How many Mondays, Tuesdays etc. in the period
      // More accurate: count actual specific days
      // For simplicity here, we'll use a proportional estimate based on selected days
      // This might not be perfectly accurate if the period is short / doesn't align with full weeks

      // Estimate total deliveries for this product
      // A simple approach: (total days / 7) * number of selected days for this product
      // This effectively gives an average number of deliveries per week for chosen days.
      const estimatedDeliveries = Math.ceil(
        (totalSubscriptionDays / 7) * productSelectedDayCount
      );

      const costPerDelivery = product.pricePerUnit * product.quantity;
      return costPerDelivery * estimatedDeliveries;
    }
    return 0;
  }

  // Initialize with empty array and load from API
  let allProductsData: SubscriptionProduct[] = [];

  const fractionOptions = [0.25, 0.5, 0.75, 1];

  let preferredTime = "morning";
  let startDate = "";
  let endDate = "";

  // Reactive variable for total estimated subscription cost
  let totalEstimatedSubscriptionCost = 0;

  // Reactive statement to update total estimated cost
  $: {
    let currentTotal = 0;
    if (allProductsData && startDate && endDate) {
      allProductsData.forEach((product) => {
        if (product.selected) {
          currentTotal += calculateProductSubtotal(product, startDate, endDate);
        }
      });
    }
    totalEstimatedSubscriptionCost = currentTotal;
  }

  // Update state for the form - holds the current state of products
  let selectedProducts: SubscriptionProduct[] = [];

  // Updating the selectedProducts when a product is selected or deselected
  function updateSelectedProducts() {
    selectedProducts = allProductsData.filter((p) => p.selected);
  }

  // --- Quantity Functions ---
  // Simple increment function - ensure index is valid
  function incrementQuantity(index: number) {
    if (index >= 0 && index < allProductsData.length) {
      allProductsData[index].quantity = parseFloat(
        (allProductsData[index].quantity + 0.25).toFixed(2)
      );
      allProductsData = [...allProductsData]; // Trigger reactivity
      updateSelectedProducts();
    }
  }

  // Simple decrement function - ensure index is valid
  function decrementQuantity(index: number) {
    if (index >= 0 && index < allProductsData.length) {
      const currentQuantity = allProductsData[index].quantity;
      if (currentQuantity > 0.25) {
        allProductsData[index].quantity = parseFloat(
          (currentQuantity - 0.25).toFixed(2)
        );
        allProductsData = [...allProductsData]; // Trigger reactivity
        updateSelectedProducts();
      }
    }
  }

  // Direct fraction setter - ensure index is valid
  function setQuantity(index: number, amount: number) {
    if (index >= 0 && index < allProductsData.length) {
      allProductsData[index].quantity = amount;
      allProductsData = [...allProductsData]; // Trigger reactivity
      updateSelectedProducts();
    }
  }

  // Handle input change - ensure index is valid
  function handleInputChange(index: number, event: Event) {
    if (index >= 0 && index < allProductsData.length) {
      const input = event.target as HTMLInputElement;
      const value = parseFloat(input.value);

      if (!isNaN(value) && value >= 0.25) {
        allProductsData[index].quantity = value;
        allProductsData = [...allProductsData]; // Trigger reactivity
        updateSelectedProducts();
      }
    }
  }

  // Add loading state for products
  let isLoading = true;

  onMount(async () => {
    // Set default dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    startDate = tomorrow.toISOString().split("T")[0];

    const oneMonthLater = new Date(tomorrow);
    oneMonthLater.setDate(oneMonthLater.getDate() + 30);
    endDate = oneMonthLater.toISOString().split("T")[0];

    // Load user profile
    try {
      isLoading = true;
      // For demo, use a hardcoded phone number or get from localStorage
      phoneNumber = localStorage.getItem("userPhoneNumber") || "7389345065"; // Default for testing
      userProfile = await getProfile(phoneNumber);
      isLoggedIn = !!userProfile;

      if (isLoggedIn) {
        // Load user's subscriptions
        await subscriptionStore.loadSubscriptions(phoneNumber);
      }

      // Load products from backend API
      const products = await getProducts();

      // Map backend products to subscription product format
      allProductsData = products.map((p) => ({
        id: BigInt(p.id),
        name: p.name,
        description: p.description,
        selected: false,
        quantity: 1,
        unit: p.unit,
        pricePerUnit: p.price,
        displayPrice: `₹${p.price}/${p.unit}`,
        deliveryDays: defaultProductDeliveryDays(),
      }));

      // Initially nothing is selected
      updateSelectedProducts();
    } catch (error) {
      console.error("Error initializing subscription page:", error);
    } finally {
      isLoading = false;
    }
  });

  // === Default Delivery Days (Helper) ===
  const defaultProductDeliveryDays = () => ({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });

  // Handle form submission
  async function handleSubscriptionSubmit() {
    if (!isLoggedIn || !userProfile) {
      message = "Please log in to create a subscription";
      subscriptionError = true;
      return;
    }

    const validProducts = selectedProducts.filter(
      (p) => p.selected && Object.values(p.deliveryDays).some(Boolean)
    );

    if (validProducts.length === 0) {
      message = "Please select at least one product and delivery day";
      subscriptionError = true;
      return;
    }

    subscriptionLoading = true;
    subscriptionError = false;
    subscriptionSuccess = false;

    try {
      // Convert selected days to array format expected by backend
      const getSelectedDaysArray = (product: SubscriptionProduct): string[] => {
        return Object.entries(product.deliveryDays)
          .filter(([_, selected]) => selected)
          .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1));
      };

      // Create subscription payload
      const subscriptionItems = validProducts.map((product) => ({
        product_id: Number(product.id),
        quantity: product.quantity,
      }));

      // Get all selected days across all products (can be handled differently if needed)
      const allSelectedDays = new Set<string>();
      validProducts.forEach((product) => {
        getSelectedDaysArray(product).forEach((day) =>
          allSelectedDays.add(day)
        );
      });

      // Create the payload
      const payload = {
        items: subscriptionItems,
        delivery_days: Array.from(allSelectedDays),
        delivery_time_slot:
          preferredTime === "morning"
            ? "Morning (6 AM - 9 AM)"
            : "Evening (5 PM - 8 PM)",
        delivery_address: userProfile.address,
        start_date: new Date(startDate).getTime() * 1000000, // Convert to nanoseconds for backend
      };

      // Call backend API
      const result = await createSubscription(phoneNumber, payload);

      if (result) {
        subscriptionSuccess = true;
        subscriptionStore.addSubscription(result);
        message = "Subscription created successfully!";

        // Reset form
        selectedProducts = [];
        allProductsData = allProductsData.map((p) => ({
          ...p,
          selected: false,
          quantity: 1,
          deliveryDays: defaultProductDeliveryDays(),
        }));
      } else {
        subscriptionError = true;
        message = "Failed to create subscription";
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      subscriptionError = true;
      message = "An error occurred while creating your subscription";
    } finally {
      subscriptionLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Subscribe - Kaniya Dairy</title>
</svelte:head>

<div class="subscription-page container">
  <h1>Daily Subscription</h1>
  <p class="intro-text">
    Setup regular delivery of your favorite dairy products
  </p>

  {#if !isLoggedIn}
    <div class="login-required">
      <p>Please login to create or manage a subscription</p>
      <a href="/profile" class="btn btn-primary">Login Now</a>
    </div>
  {:else if subscriptionSuccess}
    <div class="success-message">
      <h2>Subscription Saved!</h2>
      <p>Your daily subscription has been successfully saved.</p>
      <a href="/profile" class="btn btn-outline">View in Profile</a>
    </div>
  {:else if isLoading}
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading subscription form...</p>
    </div>
  {:else if allProductsData.length > 0}
    <form
      on:submit|preventDefault={handleSubscriptionSubmit}
      class="subscription-form"
    >
      <div class="form-section">
        <h2>1. Select Products &amp; Delivery Days</h2>
        <div class="products-list">
          {#each allProductsData as product, index (product.id)}
            <div class="product-item {product.selected ? 'is-selected' : ''}">
              <div class="product-main-row">
                <div class="product-details">
                  <input
                    type="checkbox"
                    bind:checked={product.selected}
                    id={`product-${product.id}`}
                    on:change={updateSelectedProducts}
                  />
                  <label for={`product-${product.id}`} class="product-info">
                    <h3 class="product-name">
                      {@html product.name.replace(/\n/g, "<br>")}
                    </h3>
                    <p class="product-description">
                      {@html product.description.replace(/\n/g, "<br>")}
                    </p>
                    <p class="product-price">{product.displayPrice}</p>
                  </label>
                </div>

                {#if product.selected}
                  <div class="quantity-controls">
                    <div class="quantity-input-group">
                      <button
                        type="button"
                        class="quantity-btn"
                        on:click={() => decrementQuantity(index)}>-</button
                      >
                      <input
                        type="text"
                        inputmode="decimal"
                        class="quantity-input"
                        bind:value={product.quantity}
                        on:input={(e) => handleInputChange(index, e)}
                        min="0.25"
                        step="0.25"
                      />
                      <button
                        type="button"
                        class="quantity-btn"
                        on:click={() => incrementQuantity(index)}>+</button
                      >
                    </div>

                    <div class="fraction-group">
                      {#each fractionOptions as fraction}
                        <button
                          type="button"
                          class="fraction-btn {product.quantity === fraction
                            ? 'active'
                            : ''}"
                          on:click={() => setQuantity(index, fraction)}
                        >
                          {fraction}
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>

              {#if product.selected}
                <div class="product-delivery-days">
                  <h4 class="delivery-days-title">
                    Select Delivery Days for {product.name.replace(/\n/g, " ")}:
                  </h4>
                  <div class="days-selection product-specific-days">
                    <label class="day-item">
                      <input
                        type="checkbox"
                        bind:checked={product.deliveryDays.monday}
                      /> <span>Mon</span>
                    </label>
                    <label class="day-item">
                      <input
                        type="checkbox"
                        bind:checked={product.deliveryDays.tuesday}
                      /> <span>Tue</span>
                    </label>
                    <label class="day-item">
                      <input
                        type="checkbox"
                        bind:checked={product.deliveryDays.wednesday}
                      /> <span>Wed</span>
                    </label>
                    <label class="day-item">
                      <input
                        type="checkbox"
                        bind:checked={product.deliveryDays.thursday}
                      /> <span>Thu</span>
                    </label>
                    <label class="day-item">
                      <input
                        type="checkbox"
                        bind:checked={product.deliveryDays.friday}
                      /> <span>Fri</span>
                    </label>
                    <label class="day-item">
                      <input
                        type="checkbox"
                        bind:checked={product.deliveryDays.saturday}
                      /> <span>Sat</span>
                    </label>
                    <label class="day-item">
                      <input
                        type="checkbox"
                        bind:checked={product.deliveryDays.sunday}
                      /> <span>Sun</span>
                    </label>
                  </div>
                </div>

                <!-- Display Estimated Product Subtotal -->
                <div class="product-subtotal">
                  Estimated Cost for {product.name.replace(/\n/g, " ")}:
                  <strong>
                    ₹{calculateProductSubtotal(
                      product,
                      startDate,
                      endDate
                    ).toFixed(2)}
                  </strong>
                  <p class="subtotal-note">
                    (Updates with quantity, days, and period)
                  </p>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <div class="form-section">
        <h2>2. Preferred Time</h2>
        <div class="time-selection">
          <label class="radio-container">
            <input
              type="radio"
              name="time"
              value="morning"
              bind:group={preferredTime}
            />
            <span class="radio-label">Morning (6 AM - 9 AM)</span>
          </label>
          <label class="radio-container">
            <input
              type="radio"
              name="time"
              value="evening"
              bind:group={preferredTime}
            />
            <span class="radio-label">Evening (5 PM - 7 PM)</span>
          </label>
        </div>
      </div>

      <div class="form-section">
        <h2>3. Subscription Period</h2>
        <div class="date-selection">
          <div class="form-group">
            <label for="start-date">Start Date:</label>
            <input
              type="date"
              id="start-date"
              bind:value={startDate}
              min={new Date().toISOString().split("T")[0]}
              required
            />
          </div>
          <div class="form-group">
            <label for="end-date">End Date:</label>
            <input
              type="date"
              id="end-date"
              bind:value={endDate}
              min={startDate}
              required
            />
          </div>
        </div>
      </div>

      <div class="delivery-address form-section">
        <h2>4. Delivery Address</h2>
        <p>We'll deliver to your registered address:</p>
        <div class="address-display">
          {#if userProfile}
            <p>{userProfile.address}</p>
          {:else}
            <p>Loading address...</p>
          {/if}
        </div>
        <a href="/profile" class="address-change-link">Update address</a>
      </div>

      {#if message && !subscriptionSuccess}
        <div class="error-message">
          {message}
        </div>
      {/if}

      <div class="form-section total-cost-display">
        <h3>Total Estimated Subscription Cost:</h3>
        <p class="total-cost-value">
          ₹{totalEstimatedSubscriptionCost.toFixed(2)}
        </p>
      </div>

      <div class="form-actions">
        <button
          type="submit"
          class="btn btn-primary"
          disabled={subscriptionLoading}
        >
          {#if subscriptionLoading}
            <span class="spinner-small"></span> Processing...
          {:else}
            Create Subscription
          {/if}
        </button>
      </div>
    </form>
  {:else}
    <div class="error-container">
      <p>Failed to load products. Please try again later.</p>
    </div>
  {/if}
</div>

<div class="debug-section" style="display: none;">
  <!-- Debug info if needed -->
  <p>User: {phoneNumber || "Not logged in"}</p>
</div>

<style>
  .product-item label.product-info {
    cursor: pointer;
    flex-grow: 1;
    margin-left: 10px;
  }

  .subscription-page {
    padding: 2rem 1rem;
    max-width: 800px;
    margin: 0 auto;
  }

  h1 {
    color: #333;
    text-align: center;
    margin-bottom: 0.5rem;
  }

  .intro-text {
    text-align: center;
    color: #666;
    margin-bottom: 2rem;
  }

  .subscription-form {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 2rem;
  }

  .form-section {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #eee;
  }

  .form-section h2 {
    font-size: 1.2rem;
    margin-bottom: 1rem;
    color: #5eaa6f;
  }

  /* Product selection styles */
  .products-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .product-item {
    flex-direction: column;
    align-items: stretch;
    padding: 15px;
    background-color: #f8f8f8;
    border-radius: 8px;
    border: 1px solid #eee;
    transition: background-color 0.2s ease;
  }

  .product-item.is-selected {
    background-color: #e8f5e9;
    border-left: 4px solid #5eaa6f;
    padding-left: 11px;
  }

  .product-main-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    width: 100%;
    flex-wrap: wrap;
    gap: 10px;
  }

  .product-details {
    display: flex;
    align-items: flex-start;
    width: 40%;
    flex-grow: 1;
  }

  .product-details input[type="checkbox"] {
    margin-top: 6px;
    margin-right: 0;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .product-info {
    display: flex;
    flex-direction: column;
  }

  .product-name {
    font-weight: 600;
    font-size: 1.2rem;
    margin: 0 0 2px 0;
    color: #333;
    line-height: 1.2;
  }

  .product-description {
    color: #666;
    font-size: 0.9rem;
    margin: 0 0 2px 0;
    line-height: 1.2;
  }

  .product-price {
    color: #5eaa6f;
    font-size: 1.1rem;
    font-weight: 500;
    margin: 2px 0 0 0;
  }

  .quantity-controls {
    display: flex;
    flex-direction: column;
    width: 55%;
    gap: 10px;
    margin-top: 5px;
    flex-shrink: 0;
    margin-left: auto;
  }

  .quantity-input-group {
    display: flex;
    height: 40px;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
    background: white;
  }

  .quantity-btn {
    width: 40px;
    height: 40px;
    background: #f1f1f1;
    border: none;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    position: relative;
    z-index: 2;
  }

  .quantity-btn:hover {
    background: #e0e0e0;
  }

  .quantity-input {
    flex: 1;
    text-align: center;
    border: none;
    font-size: 16px;
    width: 50px;
    min-width: 40px;
  }

  .fraction-group {
    display: flex;
    gap: 5px;
  }

  .fraction-btn {
    flex: 1;
    padding: 6px 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    position: relative;
    z-index: 2;
  }

  .fraction-btn:hover {
    background: #f5f5f5;
  }

  .fraction-btn.active {
    background: #5eaa6f;
    border-color: #5eaa6f;
    color: white;
  }

  .product-delivery-days {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px dashed #ddd;
  }

  .delivery-days-title {
    font-size: 1rem;
    font-weight: 600;
    color: #555;
    margin-bottom: 10px;
  }

  .product-specific-days {
    padding: 0.5rem;
    background-color: #fff;
    border-radius: 4px;
    border: 1px solid #eee;
  }

  .product-subtotal {
    margin-top: 15px;
    padding: 10px;
    background-color: #f0fff0; /* Light green background */
    border: 1px solid #d0f0d0; /* Light green border */
    border-radius: 4px;
    font-size: 0.95rem;
    color: #38761d; /* Darker green text */
  }
  .product-subtotal strong {
    font-weight: bold;
    font-size: 1.05rem;
  }
  .subtotal-note {
    font-size: 0.8rem;
    color: #555;
    margin-top: 4px;
  }

  .days-selection {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 5px;
  }

  .day-item {
    flex: 1 1 auto;
    min-width: 55px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
  }

  .day-item span {
    margin-top: 0.3rem;
  }

  .day-item input {
    margin-bottom: 0;
  }

  .time-selection {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .radio-container {
    display: flex;
    align-items: center;
  }

  .radio-container input {
    margin-right: 0.5rem;
  }

  .date-selection {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .form-group {
    flex: 1;
    min-width: 200px;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: #555;
  }

  .form-group input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .delivery-address {
    margin-bottom: 2rem;
  }

  .address-display {
    background: #f9f9f9;
    padding: 1rem;
    border-radius: 4px;
    margin: 0.5rem 0;
  }

  .address-change-link {
    color: #5eaa6f;
    font-size: 0.9rem;
    text-decoration: underline;
  }

  .error-message {
    color: #e53935;
    margin: 1rem 0;
    padding: 0.75rem 1rem;
    background: rgba(229, 57, 53, 0.1);
    border-radius: 4px;
    border: 1px solid rgba(229, 57, 53, 0.2);
    text-align: center;
  }

  .form-actions {
    text-align: center;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 30px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    font-size: 1rem;
  }

  .btn-primary {
    background: #5eaa6f;
    color: white;
  }

  .btn-outline {
    background: transparent;
    border: 2px solid #5eaa6f;
    color: #5eaa6f;
  }

  .spinner-small {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 1s ease infinite;
    margin-right: 0.5rem;
  }

  .success-message {
    text-align: center;
    padding: 2rem;
    background: #f1f9f3;
    border-radius: 8px;
  }

  .success-message h2 {
    color: #5eaa6f;
    margin-bottom: 1rem;
  }

  .login-required {
    text-align: center;
    padding: 2rem;
    border: 1px dashed #ddd;
    border-radius: 8px;
    margin: 2rem 0;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 768px) {
    .subscription-form {
      padding: 1.5rem 1rem;
    }

    .product-main-row {
      flex-direction: column;
    }
  }

  @media (max-width: 480px) {
    .product-item {
      align-items: stretch;
    }
    .product-details {
      width: auto;
      flex-grow: 1;
      margin-right: 10px;
      margin-bottom: 0;
    }
    .quantity-controls {
      width: auto;
      max-width: none;
      align-self: center;
      flex-shrink: 0;
    }
    .quantity-input-group {
      height: 35px;
    }
    .quantity-btn {
      width: 35px;
      height: 35px;
      font-size: 16px;
    }
    .quantity-input {
      font-size: 14px;
    }
    .fraction-group {
      gap: 3px;
    }
    .fraction-btn {
      padding: 4px 0;
      font-size: 0.8rem;
    }
  }

  .total-cost-display {
    margin-top: 1.5rem;
    padding: 1rem;
    background-color: #e8f5e9; /* Light green background */
    border: 1px solid #c8e6c9; /* Slightly darker green border */
    border-radius: 8px;
    text-align: center;
  }

  .total-cost-display h3 {
    font-size: 1.1rem;
    color: #38761d; /* Dark green text */
    margin-bottom: 0.5rem;
  }

  .total-cost-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #2e7d32; /* Stronger green for the value */
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
  }

  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border-left-color: #5eaa6f;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  .error-container {
    padding: 2rem;
    text-align: center;
    background-color: #fff3f3;
    border: 1px solid #ffcdd2;
    border-radius: 8px;
    color: #d32f2f;
    margin: 2rem 0;
  }

  /* Spinner animation */
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
