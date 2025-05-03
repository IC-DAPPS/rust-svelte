<script lang="ts">
  import { cartItemCount, cartTotal } from "$lib/stores/cart";
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { getProfile } from "$lib/api";
  import type { UserProfile } from "$lib/types";

  let mobileMenuOpen = false;
  let isLoggedIn = false;
  let userProfile: UserProfile | null = null;
  let userFirstName = "";

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  let isEnglish = true;

  function toggleLanguage() {
    isEnglish = !isEnglish;
    // In a real implementation, this would trigger language switching
  }

  onMount(async () => {
    // Check if user is logged in
    const storedPhoneNumber = localStorage.getItem("userPhoneNumber");
    isLoggedIn = !!storedPhoneNumber;

    if (isLoggedIn && storedPhoneNumber) {
      try {
        userProfile = await getProfile(storedPhoneNumber);
        if (userProfile && userProfile.name) {
          // Get first name only
          userFirstName = userProfile.name.split(" ")[0];
        }
      } catch (error) {
        console.error("Failed to load user profile for navbar:", error);
      }
    }
  });
</script>

<nav class="navbar">
  <div class="container">
    <div class="navbar-content">
      <a href="/" class="logo">
        <span class="logo-text">Kaniya Dairy</span>
      </a>

      <button
        class="mobile-menu-toggle"
        on:click={toggleMobileMenu}
        aria-expanded={mobileMenuOpen}
      >
        <span class="sr-only">Menu</span>
        <div class="hamburger" class:open={mobileMenuOpen}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      <div class="menu-container" class:open={mobileMenuOpen}>
        <ul class="nav-menu">
          <li class:active={$page.url.pathname === "/"}>
            <a href="/">{isEnglish ? "Home" : "होम"}</a>
          </li>
          <li
            class:active={$page.url.pathname === "/products" ||
              $page.url.pathname.startsWith("/products/")}
          >
            <a href="/products">{isEnglish ? "Products" : "उत्पाद"}</a>
          </li>
          <li
            class:active={$page.url.pathname === "/subscription" ||
              $page.url.pathname.startsWith("/subscription/")}
          >
            <a href="/subscription">{isEnglish ? "Subscription" : "सदस्यता"}</a>
          </li>
          <li
            class:active={$page.url.pathname === "/orders" ||
              $page.url.pathname.startsWith("/orders/")}
          >
            <a href="/orders">{isEnglish ? "My Orders" : "मेरे ऑर्डर"}</a>
          </li>
          <li
            class:active={$page.url.pathname === "/about" ||
              $page.url.pathname.startsWith("/about/")}
          >
            <a href="/about">{isEnglish ? "About Us" : "हमारे बारे में"}</a>
          </li>
        </ul>

        <div class="nav-actions">
          <button class="lang-toggle" on:click={toggleLanguage}>
            {isEnglish ? "हिंदी" : "English"}
          </button>

          <a href="/cart" class="cart-button">
            <span class="cart-icon">🛒</span>
            {#if $cartItemCount > 0}
              <span class="cart-count">{$cartItemCount}</span>
            {/if}
            <span class="cart-total">₹{$cartTotal.toFixed(2)}</span>
          </a>

          <a href="/profile" class="profile-link">
            <span class="profile-icon">👤</span>
            {#if isLoggedIn && userFirstName}
              <span class="user-name">{userFirstName}</span>
            {/if}
          </a>
        </div>
      </div>
    </div>
  </div>
</nav>

<style>
  .navbar {
    background-color: #ffffff;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .navbar-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 70px;
  }

  .logo {
    display: flex;
    align-items: center;
    text-decoration: none;
  }

  .logo-text {
    font-size: 1.5rem;
    font-weight: bold;
    color: #5eaa6f;
    margin-left: 0.5rem;
  }

  .menu-container {
    display: flex;
    align-items: center;
  }

  .nav-menu {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .nav-menu li {
    margin: 0 1rem;
  }

  .nav-menu a {
    text-decoration: none;
    color: #333;
    font-weight: 500;
    padding: 0.5rem 0;
    position: relative;
  }

  .nav-menu a:hover {
    color: #5eaa6f;
  }

  .nav-menu li.active a {
    color: #5eaa6f;
  }

  .nav-menu li.active a::after {
    content: "";
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: #5eaa6f;
  }

  .nav-actions {
    display: flex;
    align-items: center;
    margin-left: 2rem;
  }

  .lang-toggle {
    background: none;
    border: 1px solid #ddd;
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    font-size: 0.9rem;
    cursor: pointer;
    margin-right: 1rem;
  }

  .cart-button {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: #333;
    margin-right: 1rem;
    position: relative;
  }

  .cart-icon {
    font-size: 1.5rem;
    margin-right: 0.5rem;
  }

  .cart-count {
    position: absolute;
    top: -8px;
    left: 15px;
    background-color: #5eaa6f;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 0.8rem;
  }

  .cart-total {
    font-weight: 500;
  }

  .profile-link {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: #333;
  }

  .profile-icon {
    font-size: 1.5rem;
  }

  .mobile-menu-toggle {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
  }

  .hamburger {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 24px;
    height: 20px;
  }

  .hamburger span {
    display: block;
    height: 2px;
    width: 100%;
    background-color: #333;
    transition: all 0.3s ease;
  }

  .hamburger.open span:nth-child(1) {
    transform: translateY(9px) rotate(45deg);
  }

  .hamburger.open span:nth-child(2) {
    opacity: 0;
  }

  .hamburger.open span:nth-child(3) {
    transform: translateY(-9px) rotate(-45deg);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  @media (max-width: 768px) {
    .mobile-menu-toggle {
      display: block;
      z-index: 101;
    }

    .menu-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100vh;
      background-color: white;
      flex-direction: column;
      justify-content: center;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      z-index: 100;
    }

    .menu-container.open {
      transform: translateX(0);
    }

    .nav-menu {
      flex-direction: column;
      align-items: center;
    }

    .nav-menu li {
      margin: 1rem 0;
    }

    .nav-actions {
      margin: 2rem 0 0;
      flex-direction: column;
      align-items: center;
    }

    .lang-toggle,
    .cart-button,
    .profile-link {
      margin: 0.5rem 0;
    }
  }

  .user-name {
    margin-left: 0.5rem;
    font-weight: 500;
    color: #5eaa6f;
  }
</style>
