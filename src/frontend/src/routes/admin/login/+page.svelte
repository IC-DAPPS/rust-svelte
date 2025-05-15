<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  let username = "";
  let password = "";
  let error = "";
  let isLoading = false;

  // Hardcoded admin credentials for demo
  // In a real app, use a proper authentication system
  const ADMIN_USERNAME = "admin";
  const ADMIN_PASSWORD = "dairy123";

  onMount(() => {
    // Check if already authenticated
    const adminAuth = localStorage.getItem("adminAuth");
    if (adminAuth === "true") {
      goto("/admin/products");
    }
  });

  function handleLogin() {
    error = "";
    isLoading = true;
    console.log("Login attempt with:", { username });

    if (!username || !password) {
      error = "Username and password required";
      isLoading = false;
      return;
    }

    // Simple credential check - in real app, use proper authentication
    setTimeout(() => {
      try {
        console.log("Checking credentials...");
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
          console.log("Login successful, setting auth in localStorage");
          localStorage.setItem("adminAuth", "true");
          console.log("Redirecting to products page");
          goto("/admin/products");
        } else {
          console.log("Invalid credentials");
          error = "Invalid username or password";
          isLoading = false;
        }
      } catch (err) {
        console.error("Login error:", err);
        error = "An error occurred during login";
        isLoading = false;
      }
    }, 800); // Simulate network delay
  }
</script>

<svelte:head>
  <title>Admin Login - Kaniya Dairy</title>
</svelte:head>

<div class="login-page">
  <div class="login-container">
    <div class="login-header">
      <h1>Admin Login</h1>
      <p>Kaniya Dairy Administration</p>
    </div>

    <form on:submit|preventDefault={handleLogin} class="login-form">
      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <div class="form-group">
        <label for="username">Username</label>
        <input
          type="text"
          id="username"
          bind:value={username}
          placeholder="Enter admin username"
          disabled={isLoading}
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          type="password"
          id="password"
          bind:value={password}
          placeholder="Enter admin password"
          disabled={isLoading}
        />
      </div>

      <p class="info-text">
        Use username: <strong>admin</strong> and password:
        <strong>dairy123</strong>
      </p>

      <button
        type="submit"
        class="login-btn"
        disabled={isLoading}
        on:click|preventDefault={() => {
          if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            localStorage.setItem("adminAuth", "true");
            window.location.href = "/admin/products";
          } else {
            error = "Invalid username or password";
          }
        }}
      >
        {#if isLoading}
          <span class="spinner-small"></span> Logging in...
        {:else}
          Login
        {/if}
      </button>
    </form>

    <div class="back-link">
      <a href="/">Back to Store</a>
    </div>
  </div>
</div>

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

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .form-group label {
    color: #555;
    font-size: 0.9rem;
  }

  .form-group input {
    padding: 0.8rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
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
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .login-btn:hover {
    background-color: #4c9a5e;
  }

  .login-btn:disabled {
    background-color: #a3c7ad;
    cursor: not-allowed;
  }

  .error-message {
    padding: 0.8rem;
    background-color: #ffebee;
    border: 1px solid #ffcdd2;
    color: #c62828;
    border-radius: 4px;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
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

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .info-text {
    font-size: 0.9rem;
    color: #666;
    background-color: #f5f5f5;
    padding: 0.5rem;
    border-radius: 4px;
    text-align: center;
  }
</style>
