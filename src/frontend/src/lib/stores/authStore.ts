import { writable } from 'svelte/store';
import type { Identity } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';

export interface AuthState {
    isAuthenticated: boolean;
    identity: Identity | null;
    principal: string;
    authClient: AuthClient | null;
    isLoading: boolean; // To track if initial auth check is done
}

const initialState: AuthState = {
    isAuthenticated: false,
    identity: null,
    principal: '',
    authClient: null,
    isLoading: true,
};

export const authStore = writable<AuthState>(initialState);

// Function to initialize the authClient and check initial state
export async function initializeAuth() {
    if (typeof window === 'undefined') return; // Ensure runs only in browser

    try {
        const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
        const client = await AuthClient.create({
            idleOptions: {
                idleTimeout: oneDayInMilliseconds,
            }
        });
        const authenticated = await client.isAuthenticated();
        let currentIdentity: Identity | null = null;
        let currentPrincipal = '';

        if (authenticated) {
            currentIdentity = client.getIdentity();
            currentPrincipal = currentIdentity.getPrincipal().toText();
        }

        authStore.set({
            isAuthenticated: authenticated,
            identity: currentIdentity,
            principal: currentPrincipal,
            authClient: client,
            isLoading: false,
        });

    } catch (error) {
        console.error("Error initializing auth store:", error);
        authStore.set({
            isAuthenticated: false,
            identity: null,
            principal: '',
            authClient: null,
            isLoading: false, // Still set loading to false on error
        });
    }
}

// Call initializeAuth once when the store is first imported in a browser context
// This is a common pattern but can be called explicitly from a root component/layout too.
if (typeof window !== 'undefined') {
    initializeAuth();
} 