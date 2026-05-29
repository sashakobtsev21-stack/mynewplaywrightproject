**Most likely root cause**

The login succeeded but `expectLoggedIn()` asserts the Login button becomes hidden, while this build keeps the button mounted and instead shows an "Invalid credentials" alert — so the assertion is checking the wrong post-login signal.

**Next steps**

1. Confirm in the trace whether the credentials were actually accepted (network call to `/auth/login`), since the alert suggests they were rejected.
2. If login is genuinely rejected, fix the credentials/env; if it succeeds, change `expectLoggedIn()` to wait for a post-login element (logout control or the admin landing) instead of the Login button being hidden.
3. Re-run the admin-login spec headed to verify the new signal is stable.
