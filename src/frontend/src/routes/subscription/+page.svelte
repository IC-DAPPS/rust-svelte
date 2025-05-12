<script lang="ts">
  import { onMount } from "svelte";
  import { getProfile } from "$lib/api";
  import type { UserProfile } from "$lib/types";
  // Removing the import for userStore since it doesn't exist

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
  }

  let allProductsData: SubscriptionProduct[] = [
    {
      id: BigInt(1),
      name: "Milk",
      description: "Fresh Cow\nMilk",
      selected: false,
      quantity: 1,
      unit: "litre",
      pricePerUnit: 70,
      displayPrice: "₹70/litre",
    },
    {
      id: BigInt(2),
      name: "Paneer",
      description: "Fresh\nHomemade\nPaneer",
      selected: false,
      quantity: 1,
      unit: "kg",
      pricePerUnit: 300,
      displayPrice: "₹300/kg",
    },
    {
      id: BigInt(3),
      name: "Methi\nDahi",
      description: "Curd with\nFenugreek",
      selected: false,
      quantity: 1,
      unit: "kg",
      pricePerUnit: 100,
      displayPrice: "₹100/kg",
    },
    {
      id: BigInt(4),
      name: "Khatti\nDahi",
      description: "Sour Curd",
      selected: false,
      quantity: 1,
      unit: "kg",
      pricePerUnit: 50,
      displayPrice: "₹50/kg",
    },
    {
      id: BigInt(5),
      name: "Matha",
      description: "Buttermilk",
      selected: false,
      quantity: 1,
      unit: "litre",
      pricePerUnit: 20,
      displayPrice: "₹20/litre",
    },
    {
      id: BigInt(6),
      name: "Ghee",
      description: "Pure Desi Ghee",
      selected: false,
      quantity: 1,
      unit: "kg",
      pricePerUnit: 600,
      displayPrice: "₹600/kg",
    },
    {
      id: BigInt(7),
      name: "Cream",
      description: "Fresh Milk Cream",
      selected: false,
      quantity: 1,
      unit: "kg",
      pricePerUnit: 300,
      displayPrice: "₹300/kg",
    },
  ];

  // State for the form - initialized with defaults or loaded from storage
  let selectedProducts: SubscriptionProduct[] = []; // Initialize empty, will be populated in onMount

  // Fraction options for quantity selection
  const fractionOptions = [0.25, 0.5, 0.75, 1];

  let deliveryDays = {
    monday: false, // Default to false, load from storage if exists
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  };

  let preferredTime = "morning";
  let startDate = "";
  let endDate = "";

  // Variable to hold raw JSON string from localStorage, accessible in template
  let existingSubscriptionJSON: string | null = null;

  onMount(async () => {
    // Set default dates ONLY if not loading existing data
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultStartDate = tomorrow.toISOString().split("T")[0];

    const defaultEndDateObj = new Date();
    defaultEndDateObj.setDate(defaultEndDateObj.getDate() + 30);
    const defaultEndDate = defaultEndDateObj.toISOString().split("T")[0];

    // Check for existing subscription
    existingSubscriptionJSON = localStorage.getItem("userSubscription");

    if (existingSubscriptionJSON) {
      const existingSubscription = JSON.parse(existingSubscriptionJSON);

      // Load existing data
      deliveryDays = existingSubscription.deliveryDays;
      preferredTime = existingSubscription.preferredTime;
      startDate = existingSubscription.startDate;
      endDate = existingSubscription.endDate;

      // Populate selectedProducts based on existing subscription and allProductsData
      selectedProducts = allProductsData.map((p) => {
        const existingProduct = existingSubscription.products.find(
          (ep: any) => ep.id === p.id.toString()
        ); // Find by string ID
        return {
          ...p,
          selected: !!existingProduct, // Check if product exists in subscription
          quantity: existingProduct ? existingProduct.quantity : p.quantity, // Use saved quantity or default
        };
      });
    } else {
      // No existing subscription, use defaults
      startDate = defaultStartDate;
      endDate = defaultEndDate;
      // Use default delivery days (e.g., all true or all false as preferred)
      deliveryDays = {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
      };
      // Initialize selectedProducts with defaults (all unselected)
      selectedProducts = allProductsData.map((p) => ({
        ...p,
        selected: false,
        quantity: 1,
      }));
    }

    // Check login status and load profile (remains the same)
    const storedPhoneNumber = localStorage.getItem("userPhoneNumber");
    isLoggedIn = !!storedPhoneNumber;
    if (isLoggedIn && storedPhoneNumber) {
      phoneNumber = storedPhoneNumber;
      try {
        userProfile = await getProfile(phoneNumber);
      } catch (error) {
        console.error("Failed to load user profile:", error);
      }
    }
  });

  function handleSubmit() {
    subscriptionLoading = true;
    subscriptionError = false;

    const currentlySelectedProducts = selectedProducts.filter(
      (p) => p.selected
    );
    const hasSelectedProducts = currentlySelectedProducts.length > 0;
    const hasSelectedDays = Object.values(deliveryDays).some((day) => day);

    if (
      !hasSelectedProducts ||
      !hasSelectedDays ||
      !startDate ||
      !endDate ||
      !isLoggedIn
    ) {
      subscriptionError = true;
      subscriptionLoading = false;
      return;
    }

    // --- Calculate Total Price ---
    let totalCost = 0;
    const totalSubscriptionDays = daysBetween(startDate, endDate);
    const selectedDayCount = Object.values(deliveryDays).filter(Boolean).length;

    // Estimate number of delivery instances for each selected day
    // This is an approximation. A more precise calculation would iterate through each day.
    // For simplicity, let's assume an even distribution over the period.
    const deliveriesPerSelectedDay = Math.ceil(
      totalSubscriptionDays * (selectedDayCount / 7)
    );

    currentlySelectedProducts.forEach((product) => {
      const costPerDelivery = product.pricePerUnit * product.quantity;
      totalCost += costPerDelivery * deliveriesPerSelectedDay;
    });
    // --- End Price Calculation ---

    // Create subscription object
    const subscriptionData = {
      products: currentlySelectedProducts.map((p) => ({
        // Use currentlySelectedProducts
        id: p.id.toString(), // Convert BigInt ID to string
        name: p.name,
        quantity: p.quantity,
        unit: p.unit,
        pricePerUnit: p.pricePerUnit,
        displayPrice: p.displayPrice,
        // We don't need description or selected status saved inside the product list
      })),
      deliveryDays,
      preferredTime,
      startDate,
      endDate,
      address: userProfile?.address || "",
      phoneNumber,
      totalCost: totalCost, // Add total cost
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage
    localStorage.setItem("userSubscription", JSON.stringify(subscriptionData));

    // Simulate API call
    setTimeout(() => {
      subscriptionLoading = false;
      subscriptionSuccess = true;
    }, 1500);
  }

  // --- Quantity Functions (remain largely the same, ensure they work with the new selectedProducts structure) ---

  // Simple increment function - ensure index is valid
  function incrementQuantity(index: number) {
    if (index >= 0 && index < selectedProducts.length) {
      selectedProducts[index].quantity = parseFloat(
        (selectedProducts[index].quantity + 0.25).toFixed(2)
      );
      selectedProducts = [...selectedProducts]; // Trigger reactivity
    }
  }

  // Simple decrement function - ensure index is valid
  function decrementQuantity(index: number) {
    if (index >= 0 && index < selectedProducts.length) {
      const currentQuantity = selectedProducts[index].quantity;
      if (currentQuantity > 0.25) {
        selectedProducts[index].quantity = parseFloat(
          (currentQuantity - 0.25).toFixed(2)
        );
        selectedProducts = [...selectedProducts]; // Trigger reactivity
      }
    }
  }

  // Direct fraction setter - ensure index is valid
  function setQuantity(index: number, amount: number) {
    if (index >= 0 && index < selectedProducts.length) {
      selectedProducts[index].quantity = amount;
      selectedProducts = [...selectedProducts]; // Trigger reactivity
    }
  }

  // Handle input change - ensure index is valid
  function handleInputChange(index: number, event: Event) {
    if (index >= 0 && index < selectedProducts.length) {
      const input = event.target as HTMLInputElement;
      const value = parseFloat(input.value);

      if (!isNaN(value) && value >= 0.25) {
        selectedProducts[index].quantity = value;
        selectedProducts = [...selectedProducts]; // Trigger reactivity
      }
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
  {:else if selectedProducts.length > 0}
    <form on:submit|preventDefault={handleSubmit} class="subscription-form">
      <div class="form-section">
        <h2>1. Select Products</h2>
        <div class="products-list">
          {#each selectedProducts as product, index (product.id)}
            <div class="product-item">
              <div class="product-details">
                <input
                  type="checkbox"
                  bind:checked={product.selected}
                  id={`product-${product.id}`}
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
          {/each}
        </div>
      </div>

      <div class="form-section">
        <h2>2. Delivery Days</h2>
        <div class="days-selection">
          <label class="day-item">
            <input type="checkbox" bind:checked={deliveryDays.monday} />
            <span>Mon</span>
          </label>
          <label class="day-item">
            <input type="checkbox" bind:checked={deliveryDays.tuesday} />
            <span>Tue</span>
          </label>
          <label class="day-item">
            <input type="checkbox" bind:checked={deliveryDays.wednesday} />
            <span>Wed</span>
          </label>
          <label class="day-item">
            <input type="checkbox" bind:checked={deliveryDays.thursday} />
            <span>Thu</span>
          </label>
          <label class="day-item">
            <input type="checkbox" bind:checked={deliveryDays.friday} />
            <span>Fri</span>
          </label>
          <label class="day-item">
            <input type="checkbox" bind:checked={deliveryDays.saturday} />
            <span>Sat</span>
          </label>
          <label class="day-item">
            <input type="checkbox" bind:checked={deliveryDays.sunday} />
            <span>Sun</span>
          </label>
        </div>
      </div>

      <div class="form-section">
        <h2>3. Preferred Time</h2>
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
        <h2>4. Subscription Period</h2>
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

      <div class="delivery-address">
        <h2>5. Delivery Address</h2>
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

      {#if subscriptionError}
        <div class="error-message">
          Please fill all required fields and select at least one product and
          delivery day.
        </div>
      {/if}

      <div class="form-actions">
        <button
          type="submit"
          class="btn btn-primary"
          disabled={subscriptionLoading}
        >
          {#if subscriptionLoading}
            <span class="spinner-small"></span> Processing...
          {:else}
            {existingSubscriptionJSON
              ? "Update Subscription"
              : "Create Subscription"}
          {/if}
        </button>
      </div>
    </form>
  {:else}
    <p>Loading subscription form...</p>
  {/if}
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
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 15px;
    background-color: #f8f8f8;
    border-radius: 8px;
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
    margin-left: 15px;
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

  /* Other existing styles */
  .days-selection {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .day-item {
    flex: 1;
    min-width: 60px;
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
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: rgba(229, 57, 53, 0.1);
    border-radius: 4px;
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

    .product-item {
      flex-direction: row;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 10px;
    }

    .product-details {
      width: 100%;
      margin-bottom: 10px;
    }

    .quantity-controls {
      width: 100%;
      margin-left: 0;
      align-self: flex-end;
      max-width: 250px;
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
</style>
