<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/stores/authStore";
  import { getPrincipalFromIdentity } from "$lib/utils";
  import { getAuthenticatedActor, getAnonymousActor } from "$lib/agent"; // For re-initializing actor
  // import { actorStore } from "$lib/stores/actorStore"; // Example if you create an actorStore

  let localIsLoading = true;

  // Subscribe to authStore
  authStore.subscribe((value) => {
    localIsLoading = value.isLoading;
    if (!value.isLoading && value.isAuthenticated) {
      // If initial check is done and user is authenticated by store, redirect
      console.log("Login page: authStore says authenticated, redirecting...");
      goto("/admin/products");
    }
  });

  onMount(() => {
    // Initial check is now handled by authStore's initializeAuth()
    // We just react to store changes.
    // If after store initialization, we are still not authenticated and not loading, UI will show login button.
    const unsubscribe = authStore.subscribe((value) => {
      if (!value.isLoading && !value.isAuthenticated) {
        console.log("Login page: authStore ready, user not authenticated.");
      }
    });
    return unsubscribe; // Cleanup subscription
  });

  async function loginWithII() {
    const currentAuthValue = $authStore; // Get current value for authClient
    if (!currentAuthValue.authClient) {
      console.error("AuthClient not available in store for login.");
      return;
    }

    await currentAuthValue.authClient.login({
      identityProvider: "https://identity.ic0.app/#authorize",
      onSuccess: async () => {
        if (!currentAuthValue.authClient) return; // Should not happen if login was called
        const identity = currentAuthValue.authClient.getIdentity();
        const principal = getPrincipalFromIdentity(identity);

        // Update the authStore with new authenticated state
        authStore.set({
          isAuthenticated: true,
          identity: identity,
          principal: principal,
          authClient: currentAuthValue.authClient, // Keep the same client
          isLoading: false,
        });

        // Re-initialize actor for authenticated calls
        // This part depends on how you manage your actor for API calls
        // Option 1: Update a global actor (if $lib/agent exports a mutable actor or uses a store)
        // await getAuthenticatedActor(identity); // This function from agent.ts returns an actor
        // You might need to set it to a global variable or another store, e.g., actorStore.set(await getAuthenticatedActor(identity))
        console.log("Logged in with II, principal:", principal);

        goto("/admin/products");
      },
      onError: (error) => {
        console.error("II Login Error:", error);
        // Optionally update authStore to reflect login failure or show error to user
        authStore.update((s) => ({ ...s, isLoading: false }));
      },
    });
  }

  async function logout() {
    const currentAuthValue = $authStore;
    if (!currentAuthValue.authClient) return;

    await currentAuthValue.authClient.logout();

    // Reset authStore to initial (logged out) state
    authStore.set({
      isAuthenticated: false,
      identity: null,
      principal: "",
      authClient: currentAuthValue.authClient, // Keep client for next login
      isLoading: false,
    });

    // Re-initialize actor for anonymous calls
    // await getAnonymousActor(); // Similar to login, manage your actor instance
    // e.g., actorStore.set(await getAnonymousActor());
    console.log("Logged out from II");

    // No need to goto /admin/login, as the page will react to store change and show login button
    // However, if you want to ensure a clean state or were on a different page, uncomment:
    // goto("/admin/login");
  }
</script>

<svelte:head>
  <title>Admin Login - Kanhaiya Dairy</title>
</svelte:head>

<!-- UI part reacts to $authStore.isAuthenticated and $authStore.isLoading -->
{#if $authStore.isLoading}
  <div class="login-page">
    <div class="login-container">
      <div class="spinner"></div>
      <p>Checking authentication...</p>
    </div>
  </div>
{:else if $authStore.isAuthenticated}
  <!-- This part should ideally not be reached if redirection works, -->
  <!-- but as a fallback or if on this page directly while authenticated -->
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <h1>Admin Login</h1>
        <p>Kanhaiya Dairy Administration</p>
      </div>
      <div class="info-text">
        <p>Logged in as: <strong>{$authStore.principal}</strong></p>
        <button class="login-btn" on:click={logout}>Logout from II</button>
        <p><a href="/admin/products">Go to Admin Dashboard</a></p>
      </div>
    </div>
  </div>
{:else}
  <!-- Not loading and not authenticated: Show Login Button -->
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <h1>Admin Login</h1>
        <p>Kanhaiya Dairy Administration</p>
      </div>
      <button class="login-btn" on:click={loginWithII}>
        Login with Internet Identity
      </button>
      <div class="back-link">
        <a href="/">Back to Store</a>
      </div>
    </div>
  </div>
{/if}

<style>
  .login-page {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: #f5f5f5;
  }
  .login-container {
    width: 100%;
    max-width: 400px;
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    text-align: center;
  }
  .login-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  .login-header h1 {
    color: #5eaa6f;
    margin-bottom: 0.5rem;
  }
  .login-header p {
    color: #666;
  }
  .login-btn {
    padding: 0.8rem;
    background-color: #5eaa6f;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-top: 1rem;
    display: inline-block;
    width: auto;
    min-width: 200px;
  }
  .login-btn:hover {
    background-color: #4c9a5e;
  }
  .login-btn:disabled {
    background-color: #a3c7ad;
    cursor: not-allowed;
  }
  .info-text {
    font-size: 0.9rem;
    color: #666;
    background-color: #f0f0f0;
    padding: 1rem;
    border-radius: 4px;
    text-align: center;
    margin-bottom: 1rem;
  }
  .info-text p {
    margin: 0.5rem 0;
  }
  .info-text strong {
    color: #333;
  }
  .info-text a {
    color: #5eaa6f;
    text-decoration: underline;
  }
  .back-link {
    text-align: center;
    margin-top: 2rem;
    font-size: 0.9rem;
  }
  .back-link a {
    color: #5eaa6f;
    text-decoration: none;
  }
  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-left-color: #5eaa6f;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    animation: spin 1s linear infinite;
    margin: 20px auto;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
