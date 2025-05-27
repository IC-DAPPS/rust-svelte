import { writable } from 'svelte/store';
import type { UserProfile } from '$lib/types'; // Assuming UserProfile type is defined here
import { getProfile } from '$lib/api'; // To fetch profile if phone number exists

interface UserStoreState {
    isLoggedIn: boolean;
    firstName: string | null;
    profile: UserProfile | null;
    loading: boolean; // To track initial loading state
}

const initialUserState: UserStoreState = {
    isLoggedIn: false,
    firstName: null,
    profile: null,
    loading: true, // Start with loading true
};

const { subscribe, set, update } = writable<UserStoreState>(initialUserState);

// Function to set user data in store and localStorage
async function loginUser(phoneNumber: string, fetchedProfile?: UserProfile) {
    let userToSet: UserProfile | null = fetchedProfile || null;
    if (!userToSet) {
        try {
            userToSet = await getProfile(phoneNumber);
        } catch (error) {
            console.error("Error fetching profile for store:", error);
            // Keep user logged out if profile fetch fails critically
            update(state => ({ ...state, isLoggedIn: false, firstName: null, profile: null, loading: false }));
            localStorage.removeItem('userPhoneNumber');
            return;
        }
    }

    if (userToSet) {
        localStorage.setItem('userPhoneNumber', userToSet.phone_number);
        update(state => ({
            ...state,
            isLoggedIn: true,
            firstName: userToSet.name ? userToSet.name.split(' ')[0] : 'User',
            profile: userToSet,
            loading: false,
        }));
    } else {
        // If profile is not found or error occurs, treat as logged out
        logoutUser();
    }
}

function logoutUser() {
    localStorage.removeItem('userPhoneNumber');
    set({
        isLoggedIn: false,
        firstName: null,
        profile: null,
        loading: false,
    });
}

// Attempt to load user from localStorage on store initialization
async function initializeUserStore() {
    if (typeof window !== 'undefined') {
        const storedPhoneNumber = localStorage.getItem('userPhoneNumber');
        if (storedPhoneNumber) {
            await loginUser(storedPhoneNumber);
        } else {
            // No stored phone number, so user is not logged in
            update(state => ({ ...state, loading: false }));
        }
    }
}

initializeUserStore(); // Call on store creation

export const userStore = {
    subscribe,
    loginUser,
    logoutUser,
    // Function to explicitly trigger re-initialization if needed elsewhere, e.g. after manual storage change
    reinitialize: initializeUserStore,
}; 