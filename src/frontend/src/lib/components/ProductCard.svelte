<script lang="ts">
  import type { Product } from "$lib/types";

  export let product: Product;
  export let onAddToCart: () => void;

  let quantity = 1;

  function incrementQuantity() {
    quantity += 1;
  }

  function decrementQuantity() {
    if (quantity > 1) {
      quantity -= 1;
    }
  }

  function handleAddToCart() {
    onAddToCart();
  }
</script>

<div class="product-card">
  <div class="product-image-container">
    <div class="product-image">
      <!-- Will add actual images later -->
      <div class="placeholder-image">{product.name[0]}</div>
    </div>
  </div>
  <div class="product-info">
    <h3 class="product-name">{product.name}</h3>
    <p class="product-description">{product.description}</p>
    <div class="product-meta">
      <span class="product-price">₹{product.price}/{product.unit}</span>
    </div>
    <div class="product-actions">
      <div class="quantity-control">
        <button on:click={decrementQuantity} aria-label="Decrease quantity"
          >-</button
        >
        <span class="quantity">{quantity}</span>
        <button on:click={incrementQuantity} aria-label="Increase quantity"
          >+</button
        >
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

  .placeholder-image {
    width: 80px;
    height: 80px;
    background-color: #a3d2ca;
    color: white;
    font-size: 2rem;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
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
    align-items: center;
    justify-content: space-between;
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

  .quantity {
    padding: 0 10px;
    min-width: 30px;
    text-align: center;
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
  }

  .add-to-cart:hover {
    background-color: #4e9a5f;
  }
</style>
