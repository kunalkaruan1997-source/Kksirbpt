# Security Specification: KK Sir bpt

## Data Invariants
1. Students cannot access content marked as `hidden: true`.
2. Premium content (`isPremium: true`) can ONLY be accessed by users with `isPremium: true` in their profile OR if the content ID is explicitly in their `unlockedContent` list.
3. Users can only read/write their own profiles, results, and notifications.
4. Payment requests can only be created by the user for themselves, and only updated by Admins.
5. Global chat messages can only be sent if chat is enabled in settings (unless the sender is an Admin).
6. Admins have full read/write access to all collections.
7. Timestamps must be server-controlled where applicable.

## The Dirty Dozen Payloads (Rejection Targets)
1. **Identity Spoof**: Student tries to create a user profile with `role: "admin"`.
2. **Identity Spoof**: Student tries to update their own `isPremium` field to `true`.
3. **Identity Spoof**: Student tries to update their own `blocked` status.
4. **Relationship Bypass**: Student tries to read a video with `hidden: true`.
5. **Paywall Bypass**: Student with `isPremium: false` tries to read a video with `isPremium: true` which is not in their `unlockedContent`.
6. **State Shortcut**: Student tries to approve their own `paymentRequest` by updating `status` to `"approved"`.
7. **Resource Poisoning**: Student tries to use a 2MB string as a `transactionId`.
8. **PII Leak**: Student tries to list all user profiles to see emails of other students.
9. **Chat Injection**: Student tries to send a message when `settings/chat` shows `enabled: false`.
10. **Data Corruption**: Student tries to update a `testResult` of another student.
11. **Shadow Field**: Student tries to add a `verified: true` field to a content document.
12. **Timestamp Fraud**: Student tries to set a future date in `createdAt`.

## Test Runner (Conceptual)
A `firestore.rules.test.ts` would verify these rejections.
