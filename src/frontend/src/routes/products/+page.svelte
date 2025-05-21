<script lang="ts">
  import { onMount } from "svelte";
  import { getProducts } from "$lib/api";
  import type { Product } from "$lib/types";
  import ProductCard from "$lib/components/ProductCard.svelte";
  import { cartStore } from "$lib/stores/cart";

  let products: Product[] = [];
  let loading = true;
  let error = false;
  let searchQuery = "";
  let filteredProducts: Product[] = [];

  onMount(async () => {
    try {
      products = await getProducts();
      filteredProducts = [...products];
      cartStore.validateCart(products);
      loading = false;
    } catch (err) {
      console.error("Failed to load products:", err);
      error = true;
      loading = false;
    }
  });

  function addToCart(product: Product, quantity: number) {
    cartStore.addItem(product, quantity);
  }

  function filterProducts() {
    if (!searchQuery.trim()) {
      filteredProducts = [...products];
      return;
    }

    const query = searchQuery.toLowerCase();
    filteredProducts = products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query)
    );
  }

  $: {
    searchQuery;
    if (products.length > 0) {
      filterProducts();
    }
  }
</script>

<svelte:head>
  <title>Products - Kaniya Dairy</title>
</svelte:head>

<div class="products-page container">
  <h1>Our Products</h1>

  <div class="search-bar">
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Search products..."
      class="search-input"
    />
  </div>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading products...</p>
    </div>
  {:else if error}
    <div class="error">
      <p>Failed to load products. Please try again later.</p>
      <button class="btn btn-primary" on:click={() => window.location.reload()}
        >Retry</button
      >
    </div>
  {:else if filteredProducts.length === 0}
    <div class="no-products">
      {#if searchQuery.trim()}
        <p>No products match your search. Try a different query.</p>
        <button
          class="btn btn-outline"
          on:click={() => {
            searchQuery = "";
            filterProducts();
          }}>Clear Search</button
        >
      {:else}
        <p>No products available right now. Please check back later.</p>
      {/if}
    </div>
  {:else}
    <div class="product-grid">
      {#each filteredProducts as product (product.id)}
        <ProductCard
          {product}
          onAddToCart={(quantity) => addToCart(product, quantity)}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .products-page {
    padding: 2rem 1rem;
  }

  h1 {
    margin-bottom: 2rem;
    color: #333;
    text-align: center;
  }

  .search-bar {
    max-width: 600px;
    margin: 0 auto 2rem;
  }

  .search-input {
    width: 100%;
    padding: 0.8rem 1.2rem;
    border-radius: 30px;
    border: 1px solid #ddd;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
    font-size: 1rem;
  }

  .search-input:focus {
    border-color: #5eaa6f;
    box-shadow: 0 2px 10px rgba(94, 170, 111, 0.15);
  }

  .product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 2rem;
  }

  .loading,
  .error,
  .no-products {
    text-align: center;
    padding: 4rem 2rem;
    color: #666;
  }

  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 4px solid #5eaa6f;
    width: 40px;
    height: 40px;
    margin: 0 auto 1rem;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 768px) {
    .product-grid {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
  }
</style>
