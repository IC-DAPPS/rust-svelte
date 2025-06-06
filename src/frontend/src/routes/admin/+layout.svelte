<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { authStore, initializeAuth } from "$lib/stores/authStore";
  import { getAuthenticatedActor, getAnonymousActor } from "$lib/agent";

  let isMobileMenuOpen = false;
  let copyStatus = ""; // For feedback on copy action

  $: currentPath = $page.url.pathname;
  $: isLoginPage =
    currentPath === "/admin/login" || currentPath === "/admin/login/";

  $: {
    if (!$authStore.isLoading) {
      if (!$authStore.isAuthenticated && !isLoginPage) {
        console.log(
          "Admin layout: Store says not authenticated and not on login page, redirecting to login"
        );
        goto("/admin/login");
      }
    }
  }

  async function handleIiLogout() {
    if (!$authStore.authClient) {
      console.error("AuthClient not available in store for logout.");
      return;
    }
    console.log("Admin layout: Logging out from II via authStore");
    await $authStore.authClient.logout();

    authStore.set({
      isAuthenticated: false,
      identity: null,
      principal: "",
      authClient: $authStore.authClient,
      isLoading: false,
    });

    goto("/admin/login");
  }

  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  function closeMenuAfterNavigation() {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      isMobileMenuOpen = false;
    }
  }

  async function copyPrincipalToClipboard() {
    if ($authStore.principal) {
      try {
        await navigator.clipboard.writeText($authStore.principal);
        copyStatus = "Copied!";
        setTimeout(() => (copyStatus = ""), 2000); // Reset status after 2 seconds
      } catch (err) {
        console.error("Failed to copy principal:", err);
        copyStatus = "Failed!";
        setTimeout(() => (copyStatus = ""), 2000);
      }
    }
  }
</script>

{#if isLoginPage}
  <!-- If on login page, let login page handle its own logic -->
  <slot />
{:else if $authStore.isLoading}
  <div class="loading-container">
    <div class="spinner"></div>
    <p>Loading admin dashboard...</p>
  </div>
{:else if $authStore.isAuthenticated}
  <!-- Authenticated: Show Admin Layout -->
  <div class="admin-layout">
    <div class="mobile-header">
      <span
        >Kanhaiya Admin ({$authStore.principal
          ? $authStore.principal.substring(0, 5)
          : "User"}...)</span
      >
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
        {#if $authStore.principal}
          <div class="principal-display-container" title={$authStore.principal}>
            <span class="admin-principal-text">
              {$authStore.principal.substring(
                0,
                5
              )}...{$authStore.principal.substring(
                $authStore.principal.length - 3
              )}
            </span>
            <button
              class="copy-principal-btn"
              on:click={copyPrincipalToClipboard}
              title="Copy Principal ID"
            >
              {#if copyStatus}
                <span class="copy-status">{copyStatus}</span>
              {:else}
                <!-- Temporarily use text instead of icon for debugging -->
                <span style="color: #5eaa6f; font-weight: bold;">COPY</span>
                <!-- <iconify-icon icon="mdi:content-copy" class="copy-icon"></iconify-icon> -->
              {/if}
            </button>
          </div>
        {/if}
      </div>
      <nav class="admin-nav">
        <a
          href="/admin/products"
          class="nav-item"
          class:active={currentPath.startsWith("/admin/products")}
          on:click={closeMenuAfterNavigation}
        >
          <iconify-icon icon="mdi:package-variant-closed" class="nav-icon"
          ></iconify-icon>
          <span>📦 Products</span>
        </a>
        <a
          href="/admin/orders"
          class="nav-item"
          class:active={currentPath.startsWith("/admin/orders")}
          on:click={closeMenuAfterNavigation}
        >
          <iconify-icon icon="mdi:cart-outline" class="nav-icon"></iconify-icon>
          <span>🛒 Orders</span>
        </a>
        <a
          href="/admin/customers"
          class="nav-item"
          class:active={currentPath.startsWith("/admin/customers")}
          on:click={closeMenuAfterNavigation}
        >
          <iconify-icon icon="mdi:account-group-outline" class="nav-icon"
          ></iconify-icon>
          <span>👥 Customers</span>
        </a>
        <a
          href="/admin/hosting-balance"
          class="nav-item"
          class:active={currentPath.startsWith("/admin/hosting-balance")}
          on:click={closeMenuAfterNavigation}
        >
          <iconify-icon icon="mdi:wallet-bifold" class="nav-icon"
          ></iconify-icon>
          <span>₹ Hosting Balance</span>
        </a>
      </nav>
      <div class="admin-footer">
        <button class="logout-btn" on:click={handleIiLogout}>
          Logout II
        </button>
      </div>
    </aside>
    <main class="admin-content">
      <slot />
    </main>
  </div>
{:else}
  <!-- Not authenticated and not on login page (should have been redirected by reactive block) -->
  <!-- This section might be reached briefly or if redirection logic has race conditions -->
  <div class="auth-required">
    <p>
      Authenticating or redirecting... If you see this for more than a moment,
      please check console or try to <a href="/admin/login">login</a> manually.
    </p>
  </div>
{/if}

<style>
  .admin-layout {
    display: flex;
    min-height: 100vh;
  }
  .admin-principal {
    font-size: 0.7rem;
    color: #ccc;
    word-break: break-all;
    padding: 0 0.5rem;
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
    flex-direction: column; /* Ensure content stacks */
    align-items: center;
    justify-content: center;
    height: 100vh;
    background-color: #f5f5f5;
    text-align: center; /* Center text */
  }

  .auth-required p {
    margin-bottom: 1rem; /* Space between text and link */
  }

  .auth-required a {
    color: #5eaa6f;
    text-decoration: underline;
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
  .principal-display-container {
    display: flex;
    align-items: center;
    justify-content: space-between; /* Pushes text and button apart */
    background-color: rgba(255, 255, 255, 0.05);
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    margin-top: 0.5rem;
    width: 90%; /* Adjust as needed */
    max-width: 200px; /* Ensure it doesn't get too wide */
    cursor: default; /* Default cursor for the container */
  }
  .admin-principal-text {
    font-size: 0.75rem;
    color: #ccc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 0.5rem; /* Space between text and button */
    user-select: text; /* Make principal text selectable */
  }
  .copy-principal-btn {
    background: none;
    border: none;
    color: #ccc;
    cursor: pointer;
    padding: 0.2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
  }
  .copy-principal-btn:hover {
    color: #fff;
    background-color: rgba(255, 255, 255, 0.1);
  }
  .copy-principal-btn .copy-icon {
    font-size: 1.1em; /* Slightly larger */
    color: #d2e3d6 !important; /* Theme green, important to override for visibility */
  }
  .copy-principal-btn .copy-status {
    font-size: 0.75em;
    padding: 0 0.2em; /* Give status text a bit of padding */
  }
</style>
