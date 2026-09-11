# Feature Trace: Notifications

## Scope

Notification center is independent from remote push. Valid message and social events are persisted for the recipient even when a conversation is muted, DND is active, or device push permission is denied. Those settings affect push delivery only.

## Backend trace

| Layer | Files |
|---|---|
| Routers | `backend/src/routers/notification.router.js`, `notificationPreference.router.js`, `pushDevice.router.js` |
| Controller | `backend/src/controllers/notification.controller.js` |
| Event/policy | `backend/src/services/notification.service.js` |
| Delivery | `backend/scripts/notification-worker.js` |
| Migration | `backend/scripts/migrate-notifications.js` |
| Producers | `message.controller.js`, `friendship.controller.js`, `conversation.controller.js`, `note.controller.js` |

The event payload stores IDs as strings only when it leaves the server for a push payload. It has no URL, token, email, phone, location, or media URL. The mobile client always refetches protected data through the existing API after navigation.

## Operational flags

| Variable | Default | Meaning |
|---|---:|---|
| `DB_SYNC_SCHEMA` | `false` | Allow Sequelize to create missing development tables. Production uses migrations. |
| `DB_SYNC_ALTER` | `false` | Enables unsafe Sequelize alter only for explicitly disposable development data. |
| `NOTIFICATIONS_ENABLED` | `false` | Enables rich notification event creation and inbox APIs after migration. |
| `PUSH_ENABLED` | `false` | Allows the worker to call Expo Push Service. Keep false for shadow/inbox rollout. |

## Mobile trace

- `NotificationProvider` restores inbox badge, registers safe Socket.IO updates, registers a physical device only after a user action, and handles notification taps.
- `NotificationCenterScreen` lists server inbox events, supports refresh, empty/error states and explicit read actions.
- `NotificationSettingsScreen` controls push categories and preview privacy; operating-system permission is always shown separately.
- Logout revokes the current installation token best-effort before local auth state is cleared.
- `ChatScreen` re-joins its conversation room after Socket.IO reconnect.
- Android Expo Go (SDK 54) keeps inbox/API/socket features but does not import or call native remote-push APIs. Notification settings explain that a development build is required. Media-library export is also deferred to a development build on Android Expo Go.
- Development builds expose a development-only “Gửi thông báo thử” action in notification settings. It schedules a local notification after five seconds, allowing permission/channel/banner testing without EAS push credentials. `mobile/eas.json` contains the internal Android APK profile; EAS project initialization still requires the owner's Expo login.

## Safe rollout

1. Completed 2026-08-13: stop backend, create a verified MySQL backup, then run `notifications:migrate:status`, `prepare`, `backfill`, `finalize` in order.
2. Completed 2026-08-13: start backend with `NOTIFICATIONS_ENABLED=true` and `PUSH_ENABLED=false`; verify schema/model access and protected inbox routing.
4. Configure a real EAS project ID plus FCM/APNs credentials in the release environment, build on physical Android/iOS devices, then set `PUSH_ENABLED=true` for a controlled rollout.
5. If delivery needs to stop, set `PUSH_ENABLED=false`; do not drop notification tables.
