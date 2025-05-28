<script lang="ts">
  import { onMount } from "svelte";
  import { getProducts } from "$lib/api";
  import type { Product } from "$lib/types";
  import ProductCard from "$lib/components/ProductCard.svelte";
  import { cartStore } from "$lib/stores/cart";

  let products: Product[] = [];
  let loading = true;
  let error = false;

  onMount(async () => {
    try {
      products = await getProducts();
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
</script>

<svelte:head>
  <title>Kanhiya Dairy - Fresh Dairy Products</title>
</svelte:head>

<div class="homepage">
  <section class="hero">
    <div class="hero-content">
      <h1>Kanhiya Dairy</h1>
      <p>Fresh Dairy Products Delivered Daily</p>
      <a href="#products" class="btn-primary">Shop Now</a>
    </div>
  </section>

  <section id="products" class="products">
    <h2>Our Products</h2>

    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading products...</p>
      </div>
    {:else if error}
      <div class="error">
        <p>Failed to load products. Please try again later.</p>
        <button on:click={() => window.location.reload()}>Retry</button>
      </div>
    {:else if products.length === 0}
      <div class="no-products">
        <p>No products available right now. Please check back later.</p>
      </div>
    {:else}
      <div class="product-grid">
        {#each products as product (product.id)}
          <ProductCard
            {product}
            onAddToCart={(quantity) => addToCart(product, quantity)}
          />
        {/each}
      </div>
    {/if}
  </section>

  <section class="features">
    <div class="feature">
      <div class="icon">🚚</div>
      <h3>Free Local Delivery</h3>
      <p>Free delivery in Suhagi, Jabalpur area</p>
    </div>
    <div class="feature">
      <div class="icon">🐄</div>
      <h3>Fresh & Pure</h3>
      <p>All products delivered fresh daily</p>
    </div>
    <div class="feature">
      <div class="icon">🔄</div>
      <h3>Easy Subscription</h3>
      <p>Set up daily deliveries</p>
    </div>
  </section>
</div>

<style>
  .homepage {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .hero {
    background-color: #f8f4e3;
    padding: 4rem 2rem;
    border-radius: 8px;
    margin-bottom: 2rem;
    background-image: linear-gradient(
        rgba(255, 255, 255, 0.8),
        rgba(255, 255, 255, 0.8)
      ),
      url("/images/dairy-hero.jpg");
    background-size: cover;
    background-position: center;
  }

  .hero-content {
    max-width: 600px;
    text-align: center;
    margin: 0 auto;
  }

  h1 {
    font-size: 3rem;
    color: #5eaa6f;
    margin-bottom: 1rem;
  }

  .hero p {
    font-size: 1.25rem;
    margin-bottom: 2rem;
    color: #333;
  }

  .btn-primary {
    background-color: #5eaa6f;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 30px;
    text-decoration: none;
    font-weight: bold;
    transition: background-color 0.3s;
    display: inline-block;
  }

  .btn-primary:hover {
    background-color: #4e9a5f;
  }

  .products {
    padding: 2rem 1rem;
  }

  h2 {
    font-size: 2rem;
    color: #333;
    text-align: center;
    margin-bottom: 2rem;
    position: relative;
  }

  h2:after {
    content: "";
    display: block;
    width: 80px;
    height: 3px;
    background-color: #a3d2ca;
    margin: 0.5rem auto;
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
    padding: 3rem;
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

  .features {
    display: flex;
    justify-content: space-between;
    margin: 4rem 0;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .feature {
    flex: 1;
    min-width: 250px;
    padding: 2rem;
    text-align: center;
    background-color: #f8f9fa;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  }

  .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  h3 {
    margin-bottom: 0.5rem;
    color: #333;
  }

  @media (max-width: 768px) {
    .hero {
      padding: 3rem 1rem;
    }

    h1 {
      font-size: 2.5rem;
    }

    .product-grid {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }

    .features {
      flex-direction: column;
    }
  }
</style>
