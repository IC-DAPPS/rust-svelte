<script lang="ts">
  import type { Product } from "$lib/types";
  import { onMount } from "svelte";

  export let product: Product;
  export let onAddToCart: () => void;

  let quantity = 1;
  let imgSrc = "/images/products/dairy-default.jpg"; // Default image
  const fractionOptions = [0.25, 0.5, 0.75, 1];

  // Function to get the appropriate image based on product name
  function getProductImage(productName: string): string {
    const name = productName.toLowerCase();

    if (name.includes("milk")) {
      return "/images/products/milk.jpg";
    } else if (name.includes("paneer")) {
      return "/images/products/paneer.jpg";
    } else if (
      name.includes("methi dahi") ||
      name.includes("curd with fenugreek")
    ) {
      return "/images/products/methi-dahi.jpg";
    } else if (name.includes("khatti dahi") || name.includes("sour curd")) {
      return "/images/products/khatti-dahi.jpg";
    } else if (name.includes("matha") || name.includes("buttermilk")) {
      return "/images/products/buttermilk.jpg";
    } else if (name.includes("ghee")) {
      return "/images/products/ghee.jpg";
    } else if (name.includes("cream")) {
      return "/images/products/cream.jpg";
    } else if (name.includes("butter")) {
      return "/images/products/butter.jpg";
    } else {
      // Default image for other products
      return "/images/products/dairy-default.jpg";
    }
  }

  onMount(() => {
    imgSrc = getProductImage(product.name);
  });

  function incrementQuantity() {
    if (quantity < 1) {
      // If below 1, increment by 0.25
      quantity = Math.round((quantity + 0.25) * 100) / 100;
    } else {
      // If 1 or above, increment by 1
      quantity += 1;
    }
  }

  function decrementQuantity() {
    if (quantity > 1) {
      // If above 1, decrement by 1
      quantity -= 1;
    } else if (quantity > 0.25) {
      // If between 0.25 and 1, decrement by 0.25
      quantity = Math.round((quantity - 0.25) * 100) / 100;
    }
  }

  function handleQuantityInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);

    if (!isNaN(value) && value >= 0.25) {
      quantity = value;
    } else if (!isNaN(value) && value < 0.25) {
      quantity = 0.25;
    }
  }

  function setFraction(value: number) {
    quantity = value;
  }

  function handleAddToCart() {
    onAddToCart();
  }

  function handleImageError() {
    imgSrc = "/images/products/dairy-default.jpg";
  }
</script>

<div class="product-card">
  <div class="product-image-container">
    <div class="product-image">
      <!-- Use actual product images -->
      <img src={imgSrc} alt={product.name} on:error={handleImageError} />
    </div>
  </div>
  <div class="product-info">
    <h3 class="product-name">{product.name}</h3>
    <p class="product-description">{product.description}</p>
    <div class="product-meta">
      <span class="product-price">₹{product.price}/{product.unit}</span>
    </div>
    <div class="product-actions">
      <div class="quantity-section">
        <div class="quantity-control">
          <button on:click={decrementQuantity} aria-label="Decrease quantity"
            >-</button
          >
          <input
            type="number"
            bind:value={quantity}
            min="0.25"
            step="0.25"
            on:input={handleQuantityInput}
            class="quantity-input"
          />
          <button on:click={incrementQuantity} aria-label="Increase quantity"
            >+</button
          >
        </div>
        <div class="fraction-options">
          {#each fractionOptions as fraction}
            <button
              class="fraction-btn"
              class:active={quantity === fraction}
              on:click={() => setFraction(fraction)}
            >
              {fraction}
            </button>
          {/each}
        </div>
      </div>
      <button class="add-to-cart" on:click={handleAddToCart}>
        Add to Cart
      </button>
    </div>
  </div>
</div>

<style>
  .product-card {
    background-color: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
    transition:
      transform 0.3s,
      box-shadow 0.3s;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .product-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
  }

  .product-image-container {
    height: 180px;
    overflow: hidden;
    background-color: #f8f8f8;
  }

  .product-image {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .product-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .product-image img:hover {
    transform: scale(1.05);
  }

  .product-info {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }

  .product-name {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
    color: #333;
  }

  .product-description {
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 1rem;
    flex-grow: 1;
  }

  .product-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .product-price {
    font-weight: bold;
    font-size: 1.2rem;
    color: #5eaa6f;
  }

  .product-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .quantity-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .quantity-control {
    display: flex;
    align-items: center;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
  }

  .quantity-control button {
    background: #f8f8f8;
    border: none;
    width: 30px;
    height: 30px;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .quantity-control button:hover {
    background: #eee;
  }

  .quantity-input {
    width: 60px;
    border: none;
    text-align: center;
    font-size: 1rem;
    padding: 0.25rem;
  }

  .quantity-input::-webkit-inner-spin-button,
  .quantity-input::-webkit-outer-spin-button {
    opacity: 0;
  }

  .fraction-options {
    display: flex;
    justify-content: space-between;
    gap: 0.25rem;
  }

  .fraction-btn {
    flex: 1;
    background: #f8f8f8;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 0.2rem 0;
    font-size: 0.8rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .fraction-btn:hover {
    background-color: #eee;
  }

  .fraction-btn.active {
    background-color: #5eaa6f;
    color: white;
    border-color: #5eaa6f;
  }

  .add-to-cart {
    background-color: #5eaa6f;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
    width: 100%;
  }

  .add-to-cart:hover {
    background-color: #4e9a5f;
  }
</style>
