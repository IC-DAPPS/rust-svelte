<script lang="ts">
  import { onMount } from "svelte";
  import { getProfileByPhone, createProfile, updateProfile } from "$lib/api";
  import type { UserProfile } from "$lib/types";

  let phoneNumber = "";
  let profile: UserProfile | null = null;
  let name = "";
  let address = "";
  let loading = false;
  let submitting = false;
  let message = "";
  let isLoggedIn = false;
  let isEditMode = false;

  // For subscription tracking
  let hasActiveSubscription = false;
  let subscriptionData: any = null;

  // Computed properties for display
  let formattedDeliveryDays = "";
  let formattedProductNames = "";
  let formattedSubscriptionDates = "";
  let formattedTotalCost = "";

  onMount(() => {
    // Check if user is already logged in via localStorage
    const storedPhoneNumber = localStorage.getItem("userPhoneNumber");
    if (storedPhoneNumber) {
      phoneNumber = storedPhoneNumber;
      isLoggedIn = true;
      loadProfile();
      checkForSubscription();
    }
  });

  function checkForSubscription() {
    const savedSubscription = localStorage.getItem("userSubscription");
    if (savedSubscription) {
      try {
        subscriptionData = JSON.parse(savedSubscription);
        hasActiveSubscription = true;
        formatSubscriptionDataForDisplay(); // Format data after loading
      } catch (e) {
        console.error("Failed to parse saved subscription", e);
        // Reset subscription state if parsing fails
        hasActiveSubscription = false;
        subscriptionData = null;
      }
    } else {
      // Explicitly reset if no subscription found
      hasActiveSubscription = false;
      subscriptionData = null;
    }
  }

  function formatSubscriptionDataForDisplay() {
    if (!subscriptionData) return;

    // Format Delivery Days (e.g., Mon, Tue, Wed)
    const dayMap: { [key: string]: string } = {
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thu",
      friday: "Fri",
      saturday: "Sat",
      sunday: "Sun",
    };
    formattedDeliveryDays = Object.entries(subscriptionData.deliveryDays)
      .filter(([_, isSelected]) => isSelected)
      .map(([day]) => dayMap[day] || day)
      .join(", ");

    // Format Product Names (e.g., Milk, Paneer)
    formattedProductNames = subscriptionData.products
      .map((p: any) => p.name.replace(/\n/g, " "))
      .join(", ");

    // Format Dates (e.g., 15/12/2024 - 14/01/2025)
    const startDate = new Date(subscriptionData.startDate).toLocaleDateString();
    const endDate = new Date(subscriptionData.endDate).toLocaleDateString();
    formattedSubscriptionDates = `${startDate} - ${endDate}`;

    // Format Total Cost (e.g., ₹1234.50)
    formattedTotalCost =
      subscriptionData.totalCost &&
      typeof subscriptionData.totalCost === "number"
        ? `₹${subscriptionData.totalCost.toFixed(2)}`
        : "N/A"; // Show N/A if cost is missing or not a number
  }

  function handleLogin() {
    if (phoneNumber.trim().length > 0) {
      // Save phone number to localStorage for persistence
      localStorage.setItem("userPhoneNumber", phoneNumber);
      isLoggedIn = true;
      loadProfile();
      checkForSubscription();
    }
  }

  function handleUnsubscribe() {
    if (
      window.confirm(
        "Are you sure you want to unsubscribe? This action cannot be undone."
      )
    ) {
      localStorage.removeItem("userSubscription");
      hasActiveSubscription = false;
      subscriptionData = null;
      // Optionally, you could show a message here
      // message = "Subscription cancelled successfully.";
      // Note: If using a message, ensure the message display logic handles this.
    }
  }

  async function loadProfile() {
    loading = true;
    message = "";

    try {
      profile = await getProfileByPhone(phoneNumber);

      if (profile) {
        name = profile.name;
        address = profile.address;
      }

      loading = false;
    } catch (err) {
      console.error("Failed to load profile:", err);
      message = "Failed to load profile. Please try again.";
      loading = false;
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      message = "Please enter your name";
      return;
    }

    if (!address.trim()) {
      message = "Please enter your address";
      return;
    }

    submitting = true;
    message = "";

    try {
      const updatedProfile: UserProfile = {
        name,
        address,
        phone_number: phoneNumber,
      };

      let success;

      if (profile) {
        // Update existing profile
        success = await updateProfile(updatedProfile);
      } else {
        // Create new profile
        success = await createProfile(updatedProfile);
      }

      if (success) {
        message = profile
          ? "Profile updated successfully!"
          : "Profile created successfully!";
        profile = updatedProfile;
        isEditMode = false;
      } else {
        message = "Failed to save profile. Please try again.";
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      message = "An error occurred. Please try again.";
    } finally {
      submitting = false;
    }
  }

  function toggleEditMode() {
    isEditMode = !isEditMode;

    if (profile) {
      // Reset form data to current profile data
      name = profile.name;
      address = profile.address;
    }
  }
</script>

<svelte:head>
  <title>My Profile - Kaniya Dairy</title>
</svelte:head>

<div class="profile-page container">
  <h1>My Profile</h1>

  {#if !isLoggedIn}
    <div class="login-prompt">
      <p>Please enter your phone number to view or create your profile</p>
      <div class="login-form">
        <input
          type="tel"
          bind:value={phoneNumber}
          placeholder="Phone number"
          maxlength="10"
        />
        <button class="btn btn-primary" on:click={handleLogin}>Continue</button>
      </div>
    </div>
  {:else if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading your profile...</p>
    </div>
  {:else if profile && !isEditMode}
    <div class="profile-card">
      <div class="profile-header">
        <div class="profile-avatar">
          <div class="avatar">{name[0]}</div>
        </div>
        <div class="profile-details">
          <h2>{name}</h2>
          <p class="phone">{phoneNumber}</p>
        </div>
      </div>

      <div class="profile-info">
        <div class="info-section">
          <h3>Delivery Address</h3>
          <p>{address}</p>
        </div>
      </div>

      <!-- Subscription section -->
      <div class="info-section">
        <h3>Subscriptions</h3>
        {#if hasActiveSubscription && subscriptionData}
          <div class="subscription-card">
            <div class="subscription-header">
              <span class="badge active">Active</span>
              <!-- Display formatted dates -->
              <span class="subscription-date">{formattedSubscriptionDates}</span
              >
            </div>
            <div class="subscription-details">
              <!-- Display formatted product names -->
              <p><strong>Products:</strong> {formattedProductNames}</p>
              <!-- Display formatted delivery days -->
              <p><strong>Delivery:</strong> {formattedDeliveryDays}</p>
              <!-- Display preferred time -->
              <p>
                <strong>Time:</strong>
                {subscriptionData.preferredTime === "morning"
                  ? "Morning (6 AM - 9 AM)"
                  : "Evening (5 PM - 7 PM)"}
              </p>
              <!-- Display formatted total cost -->
              <p><strong>Est. Total Cost:</strong> {formattedTotalCost}</p>
            </div>
            <div class="subscription-actions">
              <!-- Link Manage button to /subscription -->
              <a href="/subscription" class="btn btn-outline btn-sm">Manage</a>
              <!-- Add Unsubscribe button -->
              <button
                class="btn btn-danger btn-sm unsubscribe-btn"
                on:click={handleUnsubscribe}>Unsubscribe</button
              >
            </div>
          </div>
        {:else}
          <div class="no-subscription">
            <p>You don't have any active subscriptions.</p>
            <a href="/subscription" class="btn btn-primary"
              >Setup Daily Delivery</a
            >
          </div>
        {/if}
      </div>

      <div class="profile-actions">
        <button class="btn btn-primary" on:click={toggleEditMode}
          >Edit Profile</button
        >
        <a href="/orders" class="btn btn-outline">View Orders</a>
      </div>
    </div>
  {:else}
    <!-- Create or edit profile form -->
    <div class="profile-form">
      <h2>{profile ? "Edit Profile" : "Create Profile"}</h2>

      {#if message}
        <div
          class={message.includes("successfully")
            ? "success-message"
            : "error-message"}
        >
          {message}
        </div>
      {/if}

      <div class="form-group">
        <label for="name">Name*</label>
        <input
          type="text"
          id="name"
          bind:value={name}
          placeholder="Enter your name"
          required
        />
      </div>

      <div class="form-group">
        <label for="address">Delivery Address*</label>
        <textarea
          id="address"
          bind:value={address}
          placeholder="Enter your delivery address"
          rows="3"
          required
        ></textarea>
      </div>

      <div class="form-group">
        <label for="phone">Phone Number</label>
        <input type="tel" id="phone" value={phoneNumber} disabled />
        <p class="form-hint">Phone number cannot be changed</p>
      </div>

      <div class="form-actions">
        <button
          class="btn btn-primary"
          on:click={handleSubmit}
          disabled={submitting}
        >
          {#if submitting}
            Saving...
          {:else}
            Save Profile
          {/if}
        </button>

        {#if profile}
          <button
            class="btn btn-outline"
            on:click={toggleEditMode}
            disabled={submitting}
          >
            Cancel
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .profile-page {
    padding: 2rem 1rem;
  }

  h1 {
    margin-bottom: 2rem;
    color: #333;
    text-align: center;
  }

  .login-prompt {
    max-width: 500px;
    margin: 0 auto;
    padding: 2rem;
    background-color: #f8f8f8;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    text-align: center;
  }

  .login-form {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  .login-form input {
    flex: 1;
  }

  .loading {
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

  .profile-card,
  .profile-form {
    max-width: 700px;
    margin: 0 auto;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 2rem;
  }

  .profile-header {
    display: flex;
    align-items: center;
    margin-bottom: 2rem;
  }

  .profile-avatar {
    margin-right: 1.5rem;
  }

  .avatar {
    width: 80px;
    height: 80px;
    background-color: #5eaa6f;
    color: white;
    font-size: 2.5rem;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }

  .profile-details h2 {
    margin: 0 0 0.5rem;
    font-size: 1.8rem;
    color: #333;
  }

  .phone {
    color: #666;
    font-size: 1.1rem;
  }

  .profile-info {
    margin-bottom: 2rem;
  }

  .info-section {
    margin-bottom: 1.5rem;
  }

  .info-section h3 {
    font-size: 1.2rem;
    color: #666;
    margin-bottom: 0.5rem;
  }

  .info-section p {
    font-size: 1.1rem;
    color: #333;
  }

  .profile-actions {
    display: flex;
    gap: 1rem;
  }

  .profile-form h2 {
    margin-bottom: 1.5rem;
    font-size: 1.8rem;
    color: #333;
    text-align: center;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .form-hint {
    font-size: 0.875rem;
    color: #666;
    margin-top: 0.25rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }

  .success-message,
  .error-message {
    padding: 0.75rem 1rem;
    border-radius: 4px;
    margin-bottom: 1.5rem;
  }

  .success-message {
    background-color: #d4edda;
    color: #155724;
  }

  .error-message {
    background-color: #f8d7da;
    color: #721c24;
  }

  @media (max-width: 768px) {
    .login-form {
      flex-direction: column;
    }

    .profile-header {
      flex-direction: column;
      text-align: center;
    }

    .profile-avatar {
      margin-right: 0;
      margin-bottom: 1rem;
    }

    .profile-actions,
    .form-actions {
      flex-direction: column;
    }

    .profile-actions button,
    .form-actions button {
      width: 100%;
      margin-bottom: 0.5rem;
    }
  }

  .subscription-card {
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 1rem;
    margin-top: 0.5rem;
    border: 1px solid #eee;
  }

  .subscription-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: bold;
  }

  .badge.active {
    background-color: #5eaa6f;
    color: white;
  }

  .subscription-date {
    font-size: 0.85rem;
    color: #666;
  }

  .subscription-details p {
    margin: 0.5rem 0;
  }

  .subscription-actions {
    margin-top: 1rem;
    display: flex;
    justify-content: flex-end;
  }

  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.9rem;
  }

  .no-subscription {
    text-align: center;
    padding: 1.5rem;
    color: #666;
  }

  .no-subscription p {
    margin-bottom: 1rem;
  }

  /* Add styles for danger button */
  .btn-danger {
    background-color: #dc3545; /* Red */
    color: white;
    border-color: #dc3545;
  }

  .btn-danger:hover {
    background-color: #c82333;
    border-color: #bd2130;
  }

  /* Add margin to unsubscribe button */
  .unsubscribe-btn {
    margin-left: 0.5rem; /* Add space between buttons */
  }
</style>
