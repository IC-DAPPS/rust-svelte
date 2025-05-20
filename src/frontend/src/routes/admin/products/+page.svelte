<script lang="ts">
  import { onMount } from "svelte";
  import { getProducts, addProduct, updateProduct } from "$lib/api";
  import type { Product } from "$lib/types";

  let products: Product[] = [];
  let isLoading = true;
  let loadError = false;

  // New product form data
  let showAddForm = false;
  let newProduct = {
    name: "",
    description: "",
    price: 0,
    unit: "kg", // Default unit
  };
  let isAddingProduct = false;
  let addProductError = "";
  let addProductSuccess = "";

  // Edit product state
  let showEditForm = false;
  let editingProduct: Product | null = null;
  let isUpdatingProduct = false;
  let editProductError = "";
  let editProductSuccess = "";

  // Units for dropdown
  const units = ["kg", "litre", "piece"];

  onMount(async () => {
    await loadProducts();
  });

  async function loadProducts() {
    isLoading = true;
    loadError = false;

    try {
      products = await getProducts();
    } catch (error) {
      loadError = true;
      console.error("Failed to load products:", error);
    } finally {
      isLoading = false;
    }
  }

  function resetForm() {
    newProduct = {
      name: "",
      description: "",
      price: 0,
      unit: "kg",
    };
    addProductError = "";
    addProductSuccess = "";
  }

  async function handleAddProduct() {
    // Validate form
    if (!newProduct.name || !newProduct.description || newProduct.price <= 0) {
      addProductError = "Please fill all fields with valid values";
      return;
    }

    isAddingProduct = true;
    addProductError = "";
    addProductSuccess = "";

    try {
      const result = await addProduct(newProduct);

      if (result) {
        products = [...products, result];
        addProductSuccess = `Product "${result.name}" added successfully!`;
        resetForm();
        setTimeout(() => {
          showAddForm = false;
          addProductSuccess = "";
        }, 2000);
      } else {
        addProductError = "Failed to add product";
      }
    } catch (error) {
      console.error("Error adding product:", error);
      addProductError = "An error occurred while adding the product";
    } finally {
      isAddingProduct = false;
    }
  }

  function openEditForm(product: Product) {
    // Create a deep copy for editing to avoid mutating the original object directly in the list
    editingProduct = JSON.parse(JSON.stringify(product));
    showEditForm = true;
    showAddForm = false; // Hide add form if open
    editProductError = "";
    editProductSuccess = "";
  }

  function resetEditForm() {
    editingProduct = null;
    showEditForm = false;
    editProductError = "";
    editProductSuccess = "";
  }

  async function handleUpdateProduct() {
    if (!editingProduct) {
      editProductError = "No product selected for editing.";
      return;
    }

    // Validate form
    if (
      !editingProduct.name ||
      !editingProduct.description ||
      editingProduct.price <= 0
    ) {
      editProductError =
        "Please fill all fields with valid values for the product.";
      return;
    }

    isUpdatingProduct = true;
    editProductError = "";
    editProductSuccess = "";

    try {
      const updatedProductFromApi = await updateProduct(editingProduct);
      // Simulate API call for now
      // console.log("Simulating API call to updateProduct with:", editingProduct);
      // await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      // const updatedProductFromApi = { ...editingProduct }; // Simulate successful update

      if (updatedProductFromApi) {
        products = products.map((p) =>
          p.id === updatedProductFromApi.id ? updatedProductFromApi : p
        );
        editProductSuccess = `Product "${updatedProductFromApi.name}" updated successfully!`;
        setTimeout(() => {
          resetEditForm(); // Resets form and hides it
        }, 1500); // Keep success message visible for a bit
      } else {
        editProductError = "Failed to update product. API returned no data.";
      }
    } catch (error) {
      console.error("Error updating product:", error);
      // In a real scenario, parse error to be more specific
      editProductError =
        "An error occurred while updating the product. Please try again.";
    } finally {
      isUpdatingProduct = false;
    }
  }
</script>

<svelte:head>
  <title>Product Management - Admin</title>
</svelte:head>

<div class="admin-page">
  <div class="page-header">
    <h1>Product Management</h1>
    <button
      class="add-btn"
      on:click={() => {
        showAddForm = !showAddForm;
        resetForm();
      }}
    >
      {showAddForm ? "Cancel" : "Add New Product"}
    </button>
  </div>

  {#if showAddForm}
    <div class="add-product-form">
      <h2>Add New Product</h2>

      {#if addProductError}
        <div class="error-message">{addProductError}</div>
      {/if}

      {#if addProductSuccess}
        <div class="success-message">{addProductSuccess}</div>
      {/if}

      <form on:submit|preventDefault={handleAddProduct}>
        <div class="form-group">
          <label for="product-name">Product Name *</label>
          <input
            type="text"
            id="product-name"
            bind:value={newProduct.name}
            placeholder="Enter product name"
            required
          />
        </div>

        <div class="form-group">
          <label for="product-description">Description *</label>
          <textarea
            id="product-description"
            bind:value={newProduct.description}
            placeholder="Enter product description"
            rows="3"
            required
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="product-price">Price (₹) *</label>
            <input
              type="number"
              id="product-price"
              bind:value={newProduct.price}
              min="0"
              step="0.01"
              required
            />
          </div>

          <div class="form-group">
            <label for="product-unit">Unit *</label>
            <select id="product-unit" bind:value={newProduct.unit}>
              {#each units as unit}
                <option value={unit}>{unit}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="form-actions">
          <button
            type="button"
            class="cancel-btn"
            on:click={() => (showAddForm = false)}
          >
            Cancel
          </button>
          <button type="submit" class="submit-btn" disabled={isAddingProduct}>
            {#if isAddingProduct}
              <span class="spinner-small"></span> Adding...
            {:else}
              Add Product
            {/if}
          </button>
        </div>
      </form>
    </div>
  {/if}

  {#if showEditForm && editingProduct}
    <div class="edit-product-form product-form">
      <h2>Edit Product (ID: {editingProduct.id})</h2>

      {#if editProductError}
        <div class="error-message">{editProductError}</div>
      {/if}

      {#if editProductSuccess}
        <div class="success-message">{editProductSuccess}</div>
      {/if}

      <form on:submit|preventDefault={handleUpdateProduct}>
        <div class="form-group">
          <label for="edit-product-name">Product Name *</label>
          <input
            type="text"
            id="edit-product-name"
            bind:value={editingProduct.name}
            placeholder="Enter product name"
            required
          />
        </div>

        <div class="form-group">
          <label for="edit-product-description">Description *</label>
          <textarea
            id="edit-product-description"
            bind:value={editingProduct.description}
            placeholder="Enter product description"
            rows="3"
            required
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="edit-product-price">Price (₹) *</label>
            <input
              type="number"
              id="edit-product-price"
              bind:value={editingProduct.price}
              min="0"
              step="0.01"
              required
            />
          </div>

          <div class="form-group">
            <label for="edit-product-unit">Unit *</label>
            <select id="edit-product-unit" bind:value={editingProduct.unit}>
              {#each units as unit (unit)}
                <option value={unit}>{unit}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="cancel-btn" on:click={resetEditForm}>
            Cancel
          </button>
          <button type="submit" class="submit-btn" disabled={isUpdatingProduct}>
            {#if isUpdatingProduct}
              <span class="spinner-small"></span> Updating...
            {:else}
              Update Product
            {/if}
          </button>
        </div>
      </form>
    </div>
  {/if}

  <div class="products-section">
    <div class="section-header">
      <h2>All Products</h2>
      <button class="refresh-btn" on:click={loadProducts} disabled={isLoading}>
        🔄 Refresh
      </button>
    </div>

    {#if isLoading}
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading products...</p>
      </div>
    {:else if loadError}
      <div class="error-container">
        <p>Failed to load products. Please try again.</p>
        <button class="retry-btn" on:click={loadProducts}>Try Again</button>
      </div>
    {:else if products.length === 0}
      <div class="empty-state">
        <p>No products found. Add your first product!</p>
      </div>
    {:else}
      <div class="products-table-container">
        <table class="products-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Image</th>
              <th>Name</th>
              <th>Description</th>
              <th>Price</th>
              <th>Unit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each products as product (product.id)}
              <tr>
                <td>{product.id}</td>
                <td>
                  {#if product.imageUrl}
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      class="product-thumbnail"
                    />
                  {:else}
                    <span class="no-image">No Image</span>
                  {/if}
                </td>
                <td>{product.name}</td>
                <td>{product.description}</td>
                <td>₹{product.price}</td>
                <td>{product.unit}</td>
                <td class="actions-cell">
                  <button
                    class="action-btn edit-btn"
                    on:click={() => openEditForm(product)}>Edit</button
                  >
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<style>
  .admin-page {
    max-width: 1200px;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 1.8rem;
    color: #333;
    margin: 0;
  }

  .add-btn {
    padding: 0.6rem 1.2rem;
    background-color: #5eaa6f;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }

  .add-product-form {
    background-color: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }

  .add-product-form h2 {
    font-size: 1.4rem;
    color: #333;
    margin-top: 0;
    margin-bottom: 1.2rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.4rem;
    font-weight: 500;
    color: #555;
  }

  .form-group input,
  .form-group textarea,
  .form-group select {
    width: 100%;
    padding: 0.7rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  .form-row {
    display: flex;
    gap: 1rem;
  }

  .form-row .form-group {
    flex: 1;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .cancel-btn {
    padding: 0.7rem 1.5rem;
    background-color: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
  }

  .submit-btn {
    padding: 0.7rem 1.5rem;
    background-color: #5eaa6f;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .submit-btn:disabled {
    background-color: #a3c7ad;
    cursor: not-allowed;
  }

  .products-section {
    background-color: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-header h2 {
    font-size: 1.4rem;
    color: #333;
    margin: 0;
  }

  .refresh-btn {
    padding: 0.5rem 1rem;
    background-color: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
  }

  .products-table-container {
    overflow-x: auto;
  }

  .products-table {
    width: 100%;
    border-collapse: collapse;
  }

  .products-table th,
  .products-table td {
    padding: 0.8rem;
    text-align: left;
    border-bottom: 1px solid #eee;
  }

  .products-table th {
    background-color: #f5f5f5;
    font-weight: 600;
  }

  .product-thumbnail {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid #eee;
  }
  .no-image {
    font-size: 0.8rem;
    color: #999;
    display: inline-block;
    width: 60px;
    height: 60px;
    line-height: 60px;
    text-align: center;
    background-color: #f5f5f5;
    border-radius: 4px;
  }

  .actions-cell {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    padding: 0.4rem 0.8rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .edit-btn {
    background-color: #2196f3;
    color: white;
  }

  .loading-container,
  .empty-state,
  .error-container {
    padding: 2rem;
    text-align: center;
  }

  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 4px solid #5eaa6f;
    width: 36px;
    height: 36px;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
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

  .error-message {
    padding: 0.8rem;
    background-color: #ffebee;
    border: 1px solid #ffcdd2;
    color: #c62828;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .success-message {
    padding: 0.8rem;
    background-color: #e8f5e9;
    border: 1px solid #c8e6c9;
    color: #2e7d32;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .retry-btn {
    padding: 0.6rem 1.2rem;
    background-color: #5eaa6f;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 1rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 768px) {
    .form-row {
      flex-direction: column;
      gap: 0;
    }

    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .add-btn {
      width: 100%;
    }
  }

  /* Shared form styling */
  .product-form {
    background-color: #fff;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }
  .product-form h2 {
    font-size: 1.5rem;
    color: #333;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid #eee;
    padding-bottom: 0.8rem;
  }
  .add-product-form {
    /* Extend common styles or add specific ones */
  }
  .edit-product-form {
    /* Extend common styles or add specific ones */
    border-left: 4px solid #2196f3; /* Blue accent for edit form */
  }
</style>
