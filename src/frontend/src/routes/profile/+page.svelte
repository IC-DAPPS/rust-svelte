<script lang="ts">
  import { onMount } from "svelte";
  import { getProfileByPhone, createProfile, updateProfile } from "$lib/api";
  import type { UserProfile } from "$lib/types";
  import { userStore } from "$lib/stores/userStore"; // Import userStore

  let phoneNumber = "";
  // let profile: UserProfile | null = null; // Will come from userStore
  // let name = ""; // Will come from userStore
  // let address = ""; // Will come from userStore
  let localLoading = true; // Renamed to avoid conflict with store's loading
  let submitting = false;
  let message = "";
  // let isLoggedIn = false; // Will come from userStore
  let isEditMode = false;

  // Subscribe to userStore for reactive updates
  let storeData:
    | {
        isLoggedIn: boolean;
        firstName: string | null;
        profile: UserProfile | null;
        loading: boolean;
      }
    | undefined;
  userStore.subscribe((value) => {
    storeData = value;
    if (value.profile) {
      // Initialize form fields if profile is loaded from store
      // This is especially for the case when user is already logged in
      // and navigates to profile page, or when store updates after login
      phoneNumber = value.profile.phone_number;
      // name = value.profile.name; // No longer needed as local var
      // address = value.profile.address; // No longer needed as local var
    }
    if (!value.loading && value.isLoggedIn && value.profile === null) {
      // If store is done loading, user is marked as logged in, but no profile yet (e.g. just phone number)
      // attempt to load profile for the page view.
      if (phoneNumber && phoneNumber.length > 0) loadProfile(phoneNumber);
    }
    localLoading = value.loading; // Sync local loading state with store's initial loading
  });

  onMount(() => {
    // userStore now handles initial load from localStorage
    // So, if store is not loading and user is not logged in, and there's a stored phone number (e.g. old session)
    // we might still want to trigger a login attempt via store for this page context.
    const storedPhoneNumber = localStorage.getItem("userPhoneNumber");
    if (storedPhoneNumber && !storeData?.isLoggedIn && !storeData?.loading) {
      phoneNumber = storedPhoneNumber;
      userStore.loginUser(storedPhoneNumber); // Trigger store login which will also attempt to fetch profile
    } else if (storeData?.isLoggedIn && storeData.profile) {
      // If store already has profile, set form fields
      phoneNumber = storeData.profile.phone_number;
      // name = storeData.profile.name;
      // address = storeData.profile.address;
    } else if (!storeData?.loading && !storedPhoneNumber) {
      // If store is not loading and no phone number, set local loading to false
      localLoading = false;
    }
  });

  async function handleLogin() {
    console.log("Button clicked with phone:", phoneNumber); // Added for debugging
    if (phoneNumber.trim().length > 0) {
      localLoading = true;
      try {
        await userStore.loginUser(phoneNumber.trim());
        // After loginUser completes, storeData.profile should be updated by the store's subscription.
        // The reactive subscription to userStore is responsible for updating storeData.
        // Then, isEditMode should be set based on the new storeData.profile.
        // If storeData.profile is null (user not found), isEditMode becomes true.
        isEditMode = !storeData?.profile;
        if (isEditMode) {
          // If creating a new profile, initialize form fields
          formNameDisplay = "";
          formAddressDisplay = "";
          formPhoneNumberForDisplay = phoneNumber.trim(); // Use the number entered by the user
        } else if (storeData?.profile) {
          // If profile exists and we are not in edit mode (e.g. just viewing)
          // This case might not be typical after login if we auto-switch to view or edit
          formNameDisplay = storeData.profile.name;
          formAddressDisplay = storeData.profile.address;
          formPhoneNumberForDisplay = storeData.profile.phone_number;
        }
      } catch (e) {
        console.error("Login error in handleLogin:", e); // Log the error
        // Fallback: if userStore.loginUser throws an error (e.g., network issue, or unhandled backend error),
        // explicitly set to edit mode as the profile couldn't be fetched or determined.
        isEditMode = true;
      } finally {
        localLoading = false;
      }
    }
  }

  async function loadProfile(phone: string) {
    // Accepts phone as param
    if (!phone) return;
    localLoading = true;
    message = "";
    try {
      // Profile will be fetched by userStore.loginUser if not already fetched.
      // Here we ensure the store attempts to log in / fetch.
      // If the user is already logged in via store, it might re-fetch or use cached, depending on store logic.
      await userStore.loginUser(phone);
      // After this, storeData.profile should be updated.
      if (storeData?.profile) {
        formNameDisplay = storeData.profile.name;
        formAddressDisplay = storeData.profile.address;
        formPhoneNumberForDisplay = storeData.profile.phone_number;
        isEditMode = false; // Profile found, switch to view mode initially
      } else {
        // If profile is still null after store tried, it means it wasn't found or error
        message = "Profile not found. You can create one.";
        isEditMode = true; // Allow creating profile
        formNameDisplay = "";
        formAddressDisplay = "";
        formPhoneNumberForDisplay = phone.trim(); // Use the phone number passed to loadProfile
      }
    } catch (err) {
      console.error("Failed to load profile via store:", err);
      message = "Failed to load profile. Please try again.";
    } finally {
      localLoading = false;
    }
  }

  // Reactive assignments for form fields based on store data for display or initial edit values
  let formNameDisplay = "";
  let formAddressDisplay = "";
  let formPhoneNumberForDisplay = "";

  /* This reactive block is causing issues with bind:value and will be removed.
  $: {
    formNameDisplay = storeData?.profile?.name || "";
    formAddressDisplay = storeData?.profile?.address || "";
    formPhoneNumberForDisplay = storeData?.profile?.phone_number || phoneNumber;
  }
  */

  async function handleSubmit() {
    // Use bound variables directly instead of document.getElementById
    let currentName = formNameDisplay.trim();
    let currentAddress = formAddressDisplay.trim();
    let formPhoneNumberFromInput = formPhoneNumberForDisplay
      .replace(/\D/g, "")
      .trim();

    // currentName = currentName.trim(); // Already trimmed above
    // currentAddress = currentAddress.trim(); // Already trimmed above

    if (!currentName) {
      message = "Please enter your name";
      return;
    }
    if (!currentAddress) {
      message = "Please enter your address";
      return;
    }
    if (!formPhoneNumberFromInput || formPhoneNumberFromInput.length !== 10) {
      message = "Please enter a valid 10-digit phone number";
      return;
    }

    submitting = true;
    message = "";
    try {
      const profileToSave: UserProfile = {
        name: currentName,
        address: currentAddress,
        phone_number: formPhoneNumberFromInput,
        order_ids: storeData?.profile?.order_ids || [], // Preserve existing order_ids or init as empty
      };

      let success;
      let newProfileData: UserProfile | null = null;
      if (storeData?.profile) {
        // If profile exists in store, we are updating
        success = await updateProfile(profileToSave);
        if (success) newProfileData = profileToSave;
      } else {
        // Else, creating new profile
        const created = await createProfile(profileToSave);
        if (created) {
          // Assuming createProfile returns the created profile or confirms success
          success = true; // Or use specific success field from `created` if available
          newProfileData = profileToSave; // Or use returned profile from `created`
        }
      }

      if (success && newProfileData) {
        // Update store with the new profile data
        await userStore.loginUser(newProfileData.phone_number, newProfileData);
        message = storeData?.profile
          ? "Profile updated successfully!"
          : "Profile created successfully!";
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
    if (isEditMode && storeData?.profile) {
      // Entering edit mode with an existing profile, populate form
      formNameDisplay = storeData.profile.name;
      formAddressDisplay = storeData.profile.address;
      formPhoneNumberForDisplay = storeData.profile.phone_number;
      // Ensure phoneNumber (used for login input) is also in sync if it was potentially cleared
      phoneNumber = storeData.profile.phone_number;
    } else if (!isEditMode && storeData?.profile) {
      // Cancelling edit mode, reset form display vars to current profile (view mode)
      formNameDisplay = storeData.profile.name;
      formAddressDisplay = storeData.profile.address;
      formPhoneNumberForDisplay = storeData.profile.phone_number;
    } else if (isEditMode && !storeData?.profile) {
      // Entering edit mode to create a new profile
      // formPhoneNumberForDisplay should have been set by handleLogin or onMount logic
      // If not, ensure it's at least the current phoneNumber value
      if (!formPhoneNumberForDisplay)
        formPhoneNumberForDisplay = phoneNumber.trim();
      formNameDisplay = "";
      formAddressDisplay = "";
    }
  }
</script>

<svelte:head>
  <title>My Profile - Kanhaiya Dairy</title>
</svelte:head>

<div class="profile-page container">
  <h1>My Profile</h1>

  {#if !storeData?.isLoggedIn && !storeData?.loading && !isEditMode}
    <!-- Use store's isLoggedIn and loading, and also check isEditMode -->
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
  {:else if storeData?.loading || localLoading}
    <!-- Show loading if store is loading OR page action is loading -->
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading your profile...</p>
    </div>
  {:else if storeData?.profile && !isEditMode}
    <div class="profile-card">
      <div class="profile-header">
        <div class="profile-avatar">
          <!-- Use storeData.firstName for avatar, or first letter of profile name -->
          <div class="avatar">
            {storeData?.firstName
              ? storeData.firstName[0].toUpperCase()
              : storeData?.profile?.name
                ? storeData.profile.name[0].toUpperCase()
                : "U"}
          </div>
        </div>
        <div class="profile-details">
          <h2>{storeData?.profile?.name}</h2>
          <p class="phone">{storeData?.profile?.phone_number}</p>
        </div>
      </div>

      <div class="profile-info">
        <div class="info-section">
          <h3>Delivery Address</h3>
          <p>{storeData?.profile?.address}</p>
        </div>
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
    <form class="profile-form" on:submit|preventDefault={handleSubmit}>
      <h2>{storeData?.profile ? "Edit Profile" : "Create Profile"}</h2>

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
          bind:value={formNameDisplay}
          placeholder="Enter your name"
          required
        />
      </div>

      <div class="form-group">
        <label for="address">Delivery Address*</label>
        <textarea
          id="address"
          bind:value={formAddressDisplay}
          placeholder="Enter your delivery address"
          rows="3"
          required
        ></textarea>
      </div>

      <div class="form-group">
        <label for="phone">Phone Number</label>
        <input
          type="tel"
          id="phone"
          bind:value={formPhoneNumberForDisplay}
          maxlength="10"
          placeholder="Enter 10-digit phone number"
          required
        />
        <p class="form-hint">
          Enter your 10-digit phone number. This will be used for login if
          creating a new profile or can be updated.
        </p>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" disabled={submitting}>
          {#if submitting}
            Saving...
          {:else}
            Save Profile
          {/if}
        </button>
        {#if storeData?.profile && isEditMode}
          <button
            type="button"
            class="btn btn-outline"
            on:click={toggleEditMode}
          >
            Cancel
          </button>
        {/if}
      </div>
    </form>
  {/if}
</div>

<style>
  .profile-page {
    max-width: 700px;
    margin: 2rem auto;
    padding: 2rem;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  h1 {
    text-align: center;
    margin-bottom: 2rem;
    color: #333;
  }

  .login-prompt {
    text-align: center;
    padding: 2rem;
  }

  .login-prompt p {
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }

  .login-form {
    display: flex;
    gap: 0.5rem;
    max-width: 400px;
    margin: 0 auto;
  }

  .login-form input {
    flex-grow: 1;
  }

  .loading {
    text-align: center;
    padding: 3rem;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 5px solid #f3f3f3;
    border-top: 5px solid #5eaa6f;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .profile-card {
    padding: 1.5rem;
  }

  .profile-header {
    display: flex;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #eee;
  }

  .avatar {
    width: 80px;
    height: 80px;
    background-color: #5eaa6f;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: bold;
    margin-right: 1.5rem;
    text-transform: uppercase;
  }

  .profile-details h2 {
    margin: 0 0 0.25rem;
    font-size: 1.8rem;
    color: #333;
  }

  .profile-details .phone {
    color: #666;
    font-size: 1rem;
  }

  .info-section h3 {
    font-size: 1.2rem;
    color: #555;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px dotted #ddd;
  }

  .info-section p {
    font-size: 1rem;
    color: #333;
    line-height: 1.6;
  }

  .profile-actions {
    margin-top: 2rem;
    display: flex;
    gap: 1rem;
    justify-content: flex-start;
  }

  /* Form styles */
  .profile-form h2 {
    text-align: center;
    margin-bottom: 1.5rem;
    font-size: 1.6rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #444;
  }

  .form-group input[type="text"],
  .form-group input[type="tel"],
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }

  .form-group textarea {
    min-height: 100px;
    resize: vertical;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    border-color: #5eaa6f;
    box-shadow: 0 0 0 2px rgba(94, 170, 111, 0.2);
    outline: none;
  }

  .form-hint {
    font-size: 0.85rem;
    color: #777;
    margin-top: 0.3rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
  }

  .success-message {
    background-color: #e6fffa;
    color: #007a5a;
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1.5rem;
    border: 1px solid #a3d2ca;
  }

  .error-message {
    background-color: #fff0f0;
    color: #c00;
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1.5rem;
    border: 1px solid #fdb8b8;
  }
</style>
