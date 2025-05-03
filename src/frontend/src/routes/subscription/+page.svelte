<script lang="ts">
  import { onMount } from "svelte";
  import { getProfile } from "$lib/api";
  import type { UserProfile } from "$lib/types";
  // Removing the import for userStore since it doesn't exist

  let subscriptionLoading = false;
  let subscriptionSuccess = false;
  let subscriptionError = false;
  let userProfile: UserProfile | null = null;
  let isLoggedIn = false;
  let phoneNumber = ""; // Added for user identification

  // Subscription form data
  let selectedProducts: {
    id: bigint;
    name: string;
    selected: boolean;
    quantity: number;
  }[] = [
    { id: BigInt(1), name: "Milk (500ml)", selected: false, quantity: 1 },
    { id: BigInt(2), name: "Cow Milk (1L)", selected: false, quantity: 1 },
    { id: BigInt(3), name: "Curd (200g)", selected: false, quantity: 1 },
    { id: BigInt(4), name: "Butter (100g)", selected: false, quantity: 1 },
    { id: BigInt(5), name: "Paneer (250g)", selected: false, quantity: 1 },
  ];

  let deliveryDays = {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: true,
  };

  let preferredTime = "morning";
  let startDate = "";
  let endDate = "";

  onMount(async () => {
    // Set minimum start date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    startDate = tomorrow.toISOString().split("T")[0];

    // Set default end date to 30 days from tomorrow
    const defaultEndDate = new Date();
    defaultEndDate.setDate(defaultEndDate.getDate() + 30);
    endDate = defaultEndDate.toISOString().split("T")[0];

    // Check if user is logged in - using localStorage instead of userStore
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

    // Validation
    const hasSelectedProducts = selectedProducts.some((p) => p.selected);
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

    // Simulate API call for subscription
    setTimeout(() => {
      subscriptionLoading = false;
      subscriptionSuccess = true;
    }, 1500);
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

  {#if subscriptionSuccess}
    <div class="success-message">
      <h2>Subscription Created!</h2>
      <p>
        Your daily subscription has been successfully set up. We'll start
        delivering as per your schedule.
      </p>
      <a href="/profile" class="btn btn-outline">View in Profile</a>
    </div>
  {:else if !isLoggedIn}
    <div class="login-required">
      <p>Please login to create a subscription</p>
      <a href="/profile" class="btn btn-primary">Login Now</a>
    </div>
  {:else}
    <form on:submit|preventDefault={handleSubmit} class="subscription-form">
      <div class="form-section">
        <h2>1. Select Products</h2>
        <div class="products-selection">
          {#each selectedProducts as product (product.id)}
            <div class="product-item">
              <label class="checkbox-container">
                <input type="checkbox" bind:checked={product.selected} />
                <span class="checkmark"></span>
                {product.name}
              </label>
              {#if product.selected}
                <div class="quantity-selector">
                  <button
                    type="button"
                    on:click={() =>
                      (product.quantity = Math.max(1, product.quantity - 1))}
                    >-</button
                  >
                  <span>{product.quantity}</span>
                  <button type="button" on:click={() => (product.quantity += 1)}
                    >+</button
                  >
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
            Create Subscription
          {/if}
        </button>
      </div>
    </form>
  {/if}
</div>

<style>
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

  .products-selection {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }

  .product-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    border-radius: 4px;
    background: #f9f9f9;
  }

  .checkbox-container {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .checkbox-container input {
    margin-right: 0.5rem;
  }

  .quantity-selector {
    display: flex;
    align-items: center;
  }

  .quantity-selector button {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1px solid #ddd;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .quantity-selector span {
    margin: 0 0.5rem;
    min-width: 20px;
    text-align: center;
  }

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

  .day-item input {
    margin-bottom: 0.3rem;
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

  @media (max-width: 600px) {
    .subscription-form {
      padding: 1.5rem 1rem;
    }

    .products-selection {
      grid-template-columns: 1fr;
    }

    .days-selection {
      justify-content: flex-start;
    }

    .day-item {
      min-width: 40px;
    }
  }
</style>
