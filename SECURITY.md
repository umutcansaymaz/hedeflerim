# Security Notes

## Public Repo Checklist

- Do not commit real Firebase project config for a personal production app.
- Do not commit VAPID private keys, service account JSON files, access tokens, debug logs, auth exports, local cache folders, or Playwright output.
- Keep `.firebaserc` local. Use `.firebaserc.example` as the public template.
- Restrict Firebase Web API keys in Google Cloud Console by HTTP referrer.
- Enable Firebase App Check before using a public client with a production Firestore project.
- Review `firestore.rules` before deploy and replace placeholder allowlist values.
- Rotate any key that was ever committed before making the repository public.

## Known Required Rotation

The previous working copy contained a hardcoded VAPID private key. Treat it as exposed:

1. Generate a new VAPID key pair.
2. Update `src/config/firebase-config.js` with the new public key.
3. Set the new private key in the Functions runtime environment as `VAPID_PRIVATE_KEY`.
4. Deploy Functions and ask users to re-enable push notifications if needed.

## History Scrub

Removing a secret from the latest commit is not enough if it exists in Git history. Before making the repository public, scan and rewrite history with a tool such as `git filter-repo` or BFG Repo-Cleaner, then force-push only after confirming the cleaned history.
