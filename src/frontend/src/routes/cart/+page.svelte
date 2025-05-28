<script lang="ts">
  import { cartStore, cartTotal, type CartItem } from "$lib/stores/cart";
  import { createOrder, createProfile, getProfileByPhone } from "$lib/api";
  import { goto } from "$app/navigation";
  import type { UserProfile } from "$lib/types";

  let phoneNumber = "";
  let address = "";
  let submitting = false;
  let errorMessage = "";
  let cartItems: CartItem[] = [];

  // Load saved phone number from localStorage if available
  $: {
    const savedPhone = localStorage.getItem("userPhoneNumber");
    if (savedPhone && phoneNumber === "") {
      phoneNumber = savedPhone;
    }
  }

  // Try to load saved address if available
  $: if (phoneNumber && phoneNumber.trim() !== "" && address === "") {
    loadSavedAddress();
  }

  async function loadSavedAddress() {
    try {
      const userProfile = await getProfileByPhone(phoneNumber);
      if (userProfile) {
        address = userProfile.address;
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  }

  // Subscribe to cart store changes
  cartStore.subscribe((items) => {
    cartItems = items;
  });

  function removeFromCart(productId: number) {
    cartStore.removeItem(productId);
  }

  function updateQuantity(productId: number, quantity: number) {
    if (quantity > 0) {
      cartStore.updateQuantity(productId, quantity);
    }
  }

  function clearCart() {
    if (confirm("Kya aap apna cart khali karna chahte hain?")) {
      cartStore.clearCart();
    }
  }

  async function handleCheckout() {
    if (!phoneNumber.trim()) {
      errorMessage = "Kripya apna phone number daalein";
      return;
    }

    if (!address.trim()) {
      errorMessage = "Kripya apna delivery address daalein";
      return;
    }

    if (cartItems.length === 0) {
      errorMessage = "Aapka cart khali hai";
      return;
    }

    submitting = true;
    errorMessage = "";

    try {
      // Save phone number for future use
      localStorage.setItem("userPhoneNumber", phoneNumber);

      // First, check if user profile exists
      const userProfile = await getProfileByPhone(phoneNumber);

      // If profile doesn't exist, create one
      if (!userProfile) {
        const newProfile: UserProfile = {
          phone_number: phoneNumber,
          name: "Customer", // Default name, user can update later
          address: address,
          order_ids: [], // Add empty order_ids array
        };

        const profileCreated = await createProfile(newProfile);
        if (!profileCreated) {
          errorMessage =
            "Profile create karne mein problem hui. Kripya dobara koshish karein.";
          submitting = false;
          return;
        }
      }

      // Convert cart items to OrderItemInput format
      const orderItems = cartItems.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }));

      const orderId = await createOrder(phoneNumber, orderItems, address);

      if (orderId !== null) {
        // Clear cart and redirect to order confirmation
        cartStore.clearCart();
        // Set a flag to indicate a new order was created
        localStorage.setItem("newOrderCreated", "true");
        localStorage.setItem("lastOrderId", String(orderId));
        goto(`/orders/${orderId}`);
      } else {
        errorMessage =
          "Order create karne mein problem hui. Kripya dobara koshish karein.";
      }
    } catch (error) {
      console.error("Error creating order:", error);
      errorMessage =
        "Aapka order process karte samay koi error aaya. Kripya dobara koshish karein.";
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Your Cart - Kanhaiya Dairy</title>
</svelte:head>

<div class="cart-page container">
  <h1>Your Cart</h1>

  {#if cartItems.length === 0}
    <div class="empty-cart">
      <p>Aapka cart khali hai</p>
      <a href="/" class="btn btn-primary">Shopping Jari Rakhein</a>
    </div>
  {:else}
    <div class="cart-container">
      <div class="cart-items">
        {#each cartItems as item (item.product.id)}
          <div class="cart-item">
            <div class="item-info">
              <h3>{item.product.name}</h3>
              <p class="item-price">
                ₹{item.product.price}/{item.product.name === "Ghee"
                  ? "kg"
                  : item.product.unit}
              </p>
            </div>

            <div class="item-quantity">
              <button
                on:click={() =>
                  updateQuantity(item.product.id, item.quantity - 1)}
                class="quantity-btn"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span class="quantity">{item.quantity}</span>
              <button
                on:click={() =>
                  updateQuantity(item.product.id, item.quantity + 1)}
                class="quantity-btn"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <div class="item-total">
              ₹{(item.product.price * item.quantity).toFixed(2)}
            </div>

            <button
              on:click={() => removeFromCart(item.product.id)}
              class="remove-btn"
              aria-label="Remove item"
            >
              ✕
            </button>
          </div>
        {/each}

        <div class="cart-actions">
          <button on:click={clearCart} class="btn btn-outline"
            >Cart Khali Karein</button
          >
        </div>
      </div>

      <div class="order-summary">
        <h2>Order Summary</h2>

        <div class="summary-item">
          <span
            >Items ({cartItems.reduce(
              (sum, item) => sum + item.quantity,
              0
            )})</span
          >
          <span>₹{$cartTotal.toFixed(2)}</span>
        </div>

        <div class="summary-item">
          <span>Delivery</span>
          <span>Free</span>
        </div>

        <div class="summary-total">
          <span>Total</span>
          <span>₹{$cartTotal.toFixed(2)}</span>
        </div>

        <div class="payment-method-note">
          <p>
            <strong>Payment Method:</strong> We currently accept Cash on Delivery
            only.
          </p>
        </div>

        <div class="checkout-form">
          <div class="form-group">
            <label for="phone">Phone Number*</label>
            <input
              type="tel"
              id="phone"
              bind:value={phoneNumber}
              placeholder="Apna phone number daalein"
              required
            />
          </div>

          <div class="form-group">
            <label for="address">Delivery Address*</label>
            <textarea
              id="address"
              bind:value={address}
              placeholder="Apna delivery address daalein"
              rows="3"
              required
            ></textarea>
          </div>

          {#if errorMessage}
            <div class="error-message">
              {errorMessage}
            </div>
          {/if}

          <button
            on:click={handleCheckout}
            class="btn btn-primary checkout-btn"
            disabled={submitting}
          >
            {#if submitting}
              Processing...
            {:else}
              Checkout
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .cart-page {
    padding: 2rem 1rem;
  }

  h1 {
    margin-bottom: 2rem;
    color: #333;
    text-align: center;
  }

  .empty-cart {
    text-align: center;
    padding: 3rem;
    background-color: #f8f8f8;
    border-radius: 8px;
    margin: 2rem 0;
  }

  .empty-cart p {
    font-size: 1.2rem;
    color: #666;
    margin-bottom: 1.5rem;
  }

  .cart-container {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
  }

  .cart-items {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
  }

  .cart-item {
    display: flex;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid #eee;
  }

  .item-info {
    flex: 3;
  }

  .item-info h3 {
    margin: 0 0 0.5rem;
    font-size: 1.2rem;
  }

  .item-price {
    color: #666;
    font-size: 0.9rem;
  }

  .item-quantity {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .quantity-btn {
    width: 30px;
    height: 30px;
    border: 1px solid #ddd;
    background: #f8f8f8;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .quantity {
    margin: 0 0.5rem;
    min-width: 30px;
    text-align: center;
  }

  .item-total {
    flex: 1;
    font-weight: bold;
    text-align: right;
    color: #5eaa6f;
  }

  .remove-btn {
    background: none;
    border: none;
    color: #999;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0 0 0 1rem;
  }

  .remove-btn:hover {
    color: #d9534f;
  }

  .cart-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }

  .order-summary {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
    position: sticky;
    top: 100px;
  }

  .order-summary h2 {
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
    color: #333;
  }

  .summary-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .summary-total {
    display: flex;
    justify-content: space-between;
    margin: 1.5rem 0;
    padding-top: 1rem;
    border-top: 1px solid #eee;
    font-weight: bold;
    font-size: 1.2rem;
  }

  .payment-method-note {
    padding: 0.75rem;
    background-color: #f8f9fa; /* Light background for emphasis */
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .payment-method-note p {
    margin: 0;
    font-size: 0.95rem;
    color: #333;
  }

  .checkout-form {
    margin-top: 2rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  textarea {
    resize: vertical;
  }

  .error-message {
    color: #d9534f;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .checkout-btn {
    width: 100%;
    padding: 0.8rem;
    font-size: 1.1rem;
  }

  @media (max-width: 768px) {
    .cart-container {
      grid-template-columns: 1fr;
    }

    .cart-item {
      flex-wrap: wrap;
    }

    .item-info {
      flex: 1 0 100%;
      margin-bottom: 1rem;
    }

    .item-quantity,
    .item-total {
      flex: 1;
    }
  }
</style>
