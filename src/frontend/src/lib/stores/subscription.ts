import { writable, derived } from 'svelte/store';
import type { Subscription, SubscriptionStatus } from '$lib/types';
import { getMySubscriptions } from '$lib/api';

// Create the subscription store
function createSubscriptionStore() {
    const { subscribe, set, update } = writable<Subscription[]>([]);
    let isLoading = false;
    let isInitialized = false;

    // Cached phone number to avoid unnecessary refetches
    let cachedPhoneNumber: string | null = null;

    return {
        subscribe,

        // Load subscriptions for a user
        loadSubscriptions: async (phoneNumber: string) => {
            if (isLoading || (isInitialized && phoneNumber === cachedPhoneNumber)) return;

            try {
                isLoading = true;
                const subscriptions = await getMySubscriptions(phoneNumber);
                set(subscriptions);
                isInitialized = true;
                cachedPhoneNumber = phoneNumber;
            } catch (error) {
                console.error('Error loading subscriptions:', error);
            } finally {
                isLoading = false;
            }
        },

        // Add a new subscription to the store
        addSubscription: (subscription: Subscription) => {
            update(subscriptions => [...subscriptions, subscription]);
        },

        // Update an existing subscription
        updateSubscription: (updatedSubscription: Subscription) => {
            update(subscriptions =>
                subscriptions.map(sub =>
                    sub.id === updatedSubscription.id ? updatedSubscription : sub
                )
            );
        },

        // Remove a subscription from store (not just cancelling it on backend)
        removeSubscription: (subscriptionId: number) => {
            update(subscriptions =>
                subscriptions.filter(sub => sub.id !== subscriptionId)
            );
        },

        // Reset the store
        reset: () => {
            set([]);
            isInitialized = false;
            cachedPhoneNumber = null;
        }
    };
}

// Create and export the subscription store
export const subscriptionStore = createSubscriptionStore();

// Helper function to check subscription status
function hasStatus(status: SubscriptionStatus, statusName: string): boolean {
    return statusName in status;
}

// Derived store for active subscriptions
export const activeSubscriptions = derived(
    subscriptionStore,
    $subscriptions => $subscriptions.filter(sub =>
        'Active' in sub.status
    )
);

// Derived store for subscription counts by status
export const subscriptionCounts = derived(
    subscriptionStore,
    $subscriptions => {
        return {
            active: $subscriptions.filter(sub => 'Active' in sub.status).length,
            paused: $subscriptions.filter(sub => 'Paused' in sub.status).length,
            cancelled: $subscriptions.filter(sub => 'Cancelled' in sub.status).length,
            total: $subscriptions.length
        };
    }
); 