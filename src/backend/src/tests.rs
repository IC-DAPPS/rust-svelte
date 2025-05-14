#[cfg(test)]
mod tests {
    use crate::calculate_initial_next_order_date;
    use crate::models::{Subscription, SubscriptionItem, SubscriptionStatus};
    use ic_cdk::api::time;

    #[test]
    fn test_calculate_initial_next_order_date() {
        // Test with empty delivery days
        let start_date = time();
        assert_eq!(
            calculate_initial_next_order_date(start_date, &[]),
            start_date,
            "With empty delivery days should return start date"
        );

        // Test with future start date
        let future_date = time() + 172_800_000_000_000; // 2 days in future
        assert_eq!(
            calculate_initial_next_order_date(future_date, &["Mon".to_string()]),
            future_date,
            "With future start date should return that date"
        );

        // Test with past start date
        let past_date = time() - 86_400_000_000_000; // 1 day in past
        let result = calculate_initial_next_order_date(past_date, &["Mon".to_string()]);
        assert!(
            result > time(),
            "With past start date should return a future date"
        );
    }

    // Add more tests for other functions
}
