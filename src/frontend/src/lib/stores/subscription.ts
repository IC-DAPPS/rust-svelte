import { writable, derived } from 'svelte/store';
import type { Subscription, SubscriptionStatus, Product } from '$lib/types';
import { getMySubscriptions, getProducts } from '$lib/api';

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

                if (subscriptions.length === 0) {
                    console.log('No subscriptions found in backend, clearing localStorage data for userSubscription.');
                    localStorage.removeItem('userSubscription');
                } else {
                    const activeSubscription = subscriptions.find(sub => 'Active' in sub.status);
                    if (activeSubscription) {
                        let allProducts: Product[] = [];
                        try {
                            allProducts = await getProducts();
                        } catch (e) {
                            console.error("Failed to fetch products for localStorage sync:", e);
                        }
                        const productInfoMap = new Map(allProducts.map(p => [Number(p.id), { name: p.name, price: p.price }]));

                        const productsForLocalStorage = activeSubscription.items.map(item => {
                            const productDetail = productInfoMap.get(Number(item.product_id));
                            return {
                                name: productDetail?.name || `Product ${item.product_id}`,
                                quantity: Number(item.quantity)
                            };
                        });

                        // Corrected total cost calculation
                        const startDateMs = Number(activeSubscription.start_date) / 1000000;
                        // For profile display, we assume a 30-day cycle if backend doesn't store end_date
                        const endDateMs = startDateMs + (30 * 24 * 60 * 60 * 1000);

                        // Calculate total days in the assumed period (e.g., 31 for a 30-day span)
                        const d1 = new Date(startDateMs);
                        const d2 = new Date(endDateMs);
                        // Ensure dates are valid before calculating diff
                        let totalSubscriptionDays = 0;
                        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                            totalSubscriptionDays = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        } else {
                            totalSubscriptionDays = 31; // Fallback to 31 days if date parsing has issues
                        }

                        const selectedDeliveryDaysCount = activeSubscription.delivery_days.length;

                        let costForOneFullDelivery = 0;
                        activeSubscription.items.forEach(item => {
                            const productDetail = productInfoMap.get(Number(item.product_id));
                            const price = productDetail?.price || 0;
                            costForOneFullDelivery += Number(item.quantity) * price;
                        });

                        let estimatedTotalDeliveries = 0;
                        if (totalSubscriptionDays > 0 && selectedDeliveryDaysCount > 0) {
                            estimatedTotalDeliveries = Math.ceil((totalSubscriptionDays / 7) * selectedDeliveryDaysCount);
                        }

                        const newEstimatedTotalCost = costForOneFullDelivery * estimatedTotalDeliveries;

                        const subscriptionForLocalStorage = {
                            id: activeSubscription.id,
                            status: activeSubscription.status,
                            preferredTime: activeSubscription.delivery_time_slot.includes('Morning') ? 'morning' : 'evening',
                            startDate: startDateMs,
                            endDate: endDateMs,
                            products: productsForLocalStorage,
                            totalCost: newEstimatedTotalCost // Use the new detailed calculation
                        };

                        console.log('Saving active subscription to localStorage from store (with corrected cost):', subscriptionForLocalStorage);
                        localStorage.setItem('userSubscription', JSON.stringify(subscriptionForLocalStorage));
                    } else {
                        // No active subscription found, clear localStorage if it exists
                        localStorage.removeItem('userSubscription');
                    }
                }

                set(subscriptions);
                isInitialized = true;
                cachedPhoneNumber = phoneNumber;
            } catch (error) {
                console.error('Error loading subscriptions:', error);
                localStorage.removeItem('userSubscription');
            } finally {
                isLoading = false;
            }
        },

        // Add a new subscription to the store
        addSubscription: (subscription: Subscription) => {
            update(currentSubscriptions => [...currentSubscriptions, subscription]);
            // Removed localStorage.setItem from here. 
            // The component creating the subscription will handle the initial, more detailed localStorage save.
        },

        // Update an existing subscription
        updateSubscription: (updatedSubscription: Subscription) => {
            update(subscriptions =>
                subscriptions.map(sub =>
                    sub.id === updatedSubscription.id ? updatedSubscription : sub
                )
            );
            // Potentially re-sync localStorage if the updated subscription is the active one
            if ('Active' in updatedSubscription.status && localStorage.getItem('userSubscription')) {
                const currentLocalSub = JSON.parse(localStorage.getItem('userSubscription') || '{}');
                if (currentLocalSub.id === updatedSubscription.id) {
                    // This would ideally re-fetch product details as well if items change
                    // For now, let's assume loadSubscriptions will handle a full refresh if needed,
                    // or the profile page's refresh button can be used.
                    // A simpler update for now:
                    const updatedLocalSub = {
                        ...currentLocalSub, // Keep existing fields like preferredTime, products, totalCost unless they changed
                        status: updatedSubscription.status,
                        startDate: Number(updatedSubscription.start_date) / 1000000,
                        // Re-calculate endDate if needed
                    };
                    // A more thorough update would require product details again for cost/names if items changed.
                    // This simplified update mainly syncs status and dates.
                    // localStorage.setItem('userSubscription', JSON.stringify(updatedLocalSub));
                    // Better to just rely on a full refresh via loadSubscriptions if significant changes occur.
                }
            }
        },

        // Remove a subscription from store (not just cancelling it on backend)
        removeSubscription: (subscriptionId: number) => {
            update(subscriptions =>
                subscriptions.filter(sub => sub.id !== subscriptionId)
            );

            const savedSubscription = localStorage.getItem('userSubscription');
            if (savedSubscription) {
                try {
                    const subData = JSON.parse(savedSubscription);
                    if (subData.id === subscriptionId) {
                        localStorage.removeItem('userSubscription');
                    }
                } catch (e) {
                    localStorage.removeItem('userSubscription');
                }
            }
        },

        // Reset the store
        reset: () => {
            set([]);
            isInitialized = false;
            cachedPhoneNumber = null;
            localStorage.removeItem('userSubscription'); // Also clear local storage on reset
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

// Create a derived store to calculate subscription counts by status
function createSubscriptionCountsStore() {
    return derived(subscriptionStore, ($subscriptions) => {
        const active = $subscriptions.filter(s => 'Active' in s.status).length;
        const paused = $subscriptions.filter(s => 'Paused' in s.status).length;
        const cancelled = $subscriptions.filter(s => 'Cancelled' in s.status).length;
        const total = $subscriptions.length;

        return { active, paused, cancelled, total };
    });
}

// Export the store instances
export const subscriptionCounts = createSubscriptionCountsStore(); 