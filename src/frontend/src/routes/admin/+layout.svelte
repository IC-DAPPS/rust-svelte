<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";

  // Simple admin authentication check
  let isAuthenticated = false;
  let isLoading = true;
  let isMobileMenuOpen = false;

  // Check for login page, accounting for trailing slash variation
  $: currentPath = $page.url.pathname;

  $: isLoginPage =
    $page.url.pathname === "/admin/login" ||
    $page.url.pathname === "/admin/login/";

  onMount(() => {
    // In a real app, you would check for admin credentials
    // For now, we'll use localStorage as a simple authentication mechanism
    console.log("Admin layout onMount - checking authentication");

    try {
      const adminAuth = localStorage.getItem("adminAuth");
      console.log("localStorage adminAuth value:", adminAuth);

      isAuthenticated = adminAuth === "true";
      console.log("isAuthenticated:", isAuthenticated);
    } catch (err) {
      console.error("Error accessing localStorage:", err);
      isAuthenticated = false;
    }

    isLoading = false;

    // Don't redirect if already on login page
    if (!isAuthenticated && !isLoginPage) {
      console.log(
        "Not authenticated and not on login page, redirecting to login"
      );
      // Redirect to login if not authenticated
      goto("/admin/login");
    }
  });

  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  function closeMenuAfterNavigation() {
    if (window.innerWidth <= 768) {
      isMobileMenuOpen = false;
    }
  }
</script>

{#if isLoginPage}
  <slot />
{:else if isLoading}
  <div class="loading-container">
    <div class="spinner"></div>
    <p>Loading admin dashboard...</p>
  </div>
{:else if isAuthenticated}
  <div class="admin-layout">
    <div class="mobile-header">
      <span>Kanhaiya Admin</span>
      <button class="menu-toggle" on:click={toggleMobileMenu}>
        {#if isMobileMenuOpen}
          ❌
        {:else}
          ☰
        {/if}
      </button>
    </div>

    <aside class="admin-sidebar" class:sidebar-open={isMobileMenuOpen}>
      <div class="admin-logo">
        <img
          src="/images/logo/logo.jpg"
          alt="Kanhaiya Dairy Logo"
          class="sidebar-logo-img"
        />
        <h2>Kanhaiya Admin</h2>
      </div>
      <nav class="admin-nav">
        <a
          href="/admin/products"
          class="nav-item"
          class:active={$page.url.pathname.startsWith("/admin/products")}
          on:click={closeMenuAfterNavigation}
        >
          <iconify-icon icon="mdi:package-variant-closed" class="nav-icon"
          ></iconify-icon>
          <span>📦 Products</span>
        </a>
        <a
          href="/admin/orders"
          class="nav-item"
          class:active={$page.url.pathname.startsWith("/admin/orders")}
          on:click={closeMenuAfterNavigation}
        >
          <iconify-icon icon="mdi:cart-outline" class="nav-icon"></iconify-icon>
          <span>🛒 Orders</span>
        </a>
        <a
          href="/admin/customers"
          class="nav-item"
          class:active={$page.url.pathname.startsWith("/admin/customers")}
          on:click={closeMenuAfterNavigation}
        >
          <iconify-icon icon="mdi:account-group-outline" class="nav-icon"
          ></iconify-icon>
          <span>👥 Customers</span>
        </a>
      </nav>
      <div class="admin-footer">
        <button
          class="logout-btn"
          on:click={() => {
            console.log("Logging out, removing adminAuth");
            localStorage.removeItem("adminAuth");
            goto("/admin/login");
          }}
        >
          Logout
        </button>
      </div>
    </aside>
    <main class="admin-content">
      <slot />
    </main>
  </div>
{:else}
  <!-- Authentication placeholder - should be redirected anyway -->
  <div class="auth-required">
    <p>Admin authentication required</p>
  </div>
{/if}

<style>
  .admin-layout {
    display: flex;
    min-height: 100vh;
  }

  .mobile-header {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background-color: #333;
    color: #fff;
    padding: 0 1rem;
    align-items: center;
    justify-content: space-between;
    z-index: 1000;
  }

  .menu-toggle {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
  }

  .admin-sidebar {
    width: 250px;
    background-color: #333;
    color: #fff;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #444;
  }

  .admin-logo {
    padding: 1.5rem 1rem;
    border-bottom: 1px solid #444;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .admin-logo h2 {
    margin: 0;
    margin-top: 5px;
    font-size: 1.4rem;
    color: #5eaa6f;
  }

  .sidebar-logo-img {
    height: 45px;
    margin-bottom: 5px;
    border-radius: 4px;
  }

  .admin-nav {
    flex: 1;
    padding: 1rem 0;
  }

  .nav-item {
    display: flex;
    align-items: center;
    padding: 0.8rem 1.5rem;
    color: #ddd;
    text-decoration: none;
    transition:
      background-color 0.2s,
      color 0.2s;
  }

  .nav-item:hover {
    background-color: #444;
    color: #fff;
  }

  .nav-item .nav-icon {
    margin-right: 0.8rem;
    font-size: 1.3em;
    vertical-align: middle;
  }

  .nav-item span {
    vertical-align: middle;
  }

  .admin-content {
    flex: 1;
    padding: 2rem;
    background-color: #f5f5f5;
    overflow-y: auto;
  }

  .admin-footer {
    padding: 1rem;
    border-top: 1px solid #444;
  }

  .logout-btn {
    width: 100%;
    padding: 0.6rem;
    background-color: transparent;
    color: #ddd;
    border: 1px solid #666;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .logout-btn:hover {
    background-color: #444;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
  }

  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 4px solid #5eaa6f;
    width: 36px;
    height: 36px;
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

  .auth-required {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background-color: #f5f5f5;
  }

  @media (max-width: 768px) {
    .mobile-header {
      display: flex;
    }

    .admin-layout {
      flex-direction: column;
      padding-top: 60px;
    }

    .admin-sidebar {
      position: fixed;
      top: 60px;
      left: -250px;
      height: calc(100vh - 60px);
      transition: left 0.3s ease;
      z-index: 999;
    }

    .sidebar-open {
      left: 0;
    }

    .admin-content {
      width: 100%;
      padding: 1rem;
    }
  }

  .nav-item.active {
    background-color: #5eaa6f;
    color: #ffffff;
    font-weight: bold;
  }

  .main-content {
    flex: 1;
    padding: 2rem;
    background-color: #f5f5f5;
    overflow-y: auto;
  }
</style>
