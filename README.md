# Feel

Feel is a private, installable mood journal. Check-ins, notes, saved emotions, and preferences stay in this browser’s IndexedDB. There are no accounts or remote data services.

```sh
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm build
pnpm preview
```

Use a current Node 22 release (22.13+) or newer. Deploy the contents of `dist/` to a static HTTPS host. The production build installs a service worker and can reload offline after its first successful online visit. On iOS, open the deployed site in Safari and use **Share → Add to Home Screen**.

Daily reminders work at or after the selected time while Feel is running. With browser permission, Feel sends a system notification where supported. Otherwise it shows the message in the app. Use Settings to export a copy of your data before clearing browser storage.

See [the implementation plan](implementation-plan.md) for the feature decisions and emotion references.
