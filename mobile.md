# Student mobile app plan

This document describes a student-only mobile application for the LMS. It is a
planning and implementation guide; it does not scaffold a mobile app. The web
application and the existing Express backend remain the source of truth.

## 1. Product scope

The mobile app is for students only. It starts at authentication and covers:

- Sign up, login, logout, email verification and password reset
- Google sign-in through the backend OAuth flow
- Course catalog, search and filters
- Course details, outline and enrollment
- Coupon entry and final payable amount preview
- Pay-Confirm payment instructions and verification
- Student dashboard and order status
- Course learning page
- Authenticated offline course downloads and offline learning
- Milestone and module navigation
- Video, PDF, quiz and assignment content
- Progress, resume position and completion state
- Quiz result review after a single submission
- Assignment submission and status
- Announcements, notifications and discussion
- Certificates and profile settings

Admin and instructor features remain web-only. The app must never expose admin
or instructor navigation, endpoints, or role-changing controls.

## 2. Recommended technology

Recommended stack: bare React Native with the React Native Community CLI and TypeScript.

Use the official community template referenced by this project:
`https://github.com/react-native-community/template`

The template can be bootstrapped with:

```bash
npx @react-native-community/cli@latest init BanglaBox
```

Pin the React Native version used by the project when creating the app:

```bash
npx @react-native-community/cli init BanglaBox --version <VERSION>
```

This is a bare Android/iOS project. It requires Android Studio/SDK and JDK for
Android, and Xcode/CocoaPods for iOS. There is no Expo managed workflow, Expo
Router or Expo Go in this plan.

- React Navigation with native stack and bottom tabs
- TanStack Query for API data, caching and invalidation
- Zustand only for small client state such as theme, player UI and drafts
- React Hook Form and Zod for forms and client-side validation
- `react-native-keychain` for short-lived credentials and device secrets
- `@react-native-firebase/messaging` or OneSignal for push notifications
- `react-native-fs` for controlled PDF/download caching
- `react-native-video` for the protected video player
- `react-native-document-picker` and `react-native-image-picker` for uploads
- `react-native-permissions` for explicit native permission handling
- Sentry or an equivalent crash/error service

The app should share DTO types from `packages/types` if the mobile workspace can
consume the monorepo package safely. It must not import `packages/db` or query
Postgres directly.

## 3. Backend contract

All mobile requests go to `services/backend` through HTTPS. Use the same REST API
as the web application and add mobile-specific endpoints only when the existing
contract cannot support a good mobile experience.

Core endpoint groups:

| Feature | Existing/backend contract to use |
|---|---|
| Auth | `/auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me` |
| Verification | Email verification and password-reset endpoints |
| Catalog | `GET /courses`, `GET /courses/:slug` |
| Enrollment | `GET /courses/:slug/enrollment-status`, payment/order endpoints |
| Coupon | `POST /payments/coupons/preview` |
| Payment | `POST /payments/instructions`, order instruction/status endpoints, Pay-Confirm verification |
| Learning | Course learning/outline endpoints and signed video URL endpoint |
| Progress | Lecture progress, mark-complete and resume-position endpoints |
| Quiz | Quiz detail, submit once, result/review endpoints |
| Assignment | Assignment detail, submission and status endpoints |
| Discussion | Student post and teacher reply endpoints |
| Notifications | Student notification list/read endpoints |
| Certificates | Certificate list and download endpoint |
| Profile | Profile read/update and avatar upload flow |

Every endpoint must enforce the authenticated user and student role on the
backend. The mobile client must not rely on UI route protection for security.

## 4. Authentication and session design

The backend owns authentication. Supabase Auth must not be introduced.

Recommended mobile flow:

1. Login or signup over HTTPS.
2. Receive the backend access token and refresh token.
3. Store tokens only in `react-native-keychain`; never use AsyncStorage for tokens.
4. Keep the access token in memory when possible.
5. Attach `Authorization: Bearer <accessToken>` to API calls.
6. On `401`, call `/auth/refresh`, rotate the refresh token, update secure storage,
   and retry the original request once.
7. If refresh fails, clear the session and navigate to login.
8. Logout calls the backend revoke endpoint and clears secure storage.

The backend should support mobile refresh-token rotation without requiring browser
cookies. The web client can continue using httpOnly cookies while mobile uses the
same token service through a mobile-safe response mode.

Required safeguards:

- Short-lived access tokens and hashed, revocable refresh tokens
- Device/session listing and remote session revoke as a later enhancement
- Login, signup, reset and refresh rate limits
- Generic authentication error messages
- TLS certificate validation and no secrets in logs
- Do not log access tokens, refresh tokens, transaction IDs or full phone numbers

## 5. Navigation map

Use a public stack and an authenticated student stack.

```text
Public
├── Welcome
├── Login
├── Sign up
├── Verify email
├── Forgot password
└── Reset password

Student tabs
├── Home
├── Browse
├── My learning
├── Notifications
└── Profile

Student stack
├── Course detail
├── Checkout / coupon
├── Payment instructions
├── Payment status
├── Learning player
├── Quiz
├── Quiz result
├── Assignment submission
├── Discussion
├── Announcement detail
├── Certificates
└── Settings
```

Use deep links for:

- `lms://course/{slug}`
- `lms://learn/{courseId}`
- `lms://payment/{orderId}`
- `lms://verify-email/{token}`
- `lms://reset-password/{token}`

Also configure universal links/app links for the production web domain.

## 6. Screen requirements

### Welcome and authentication

- Explain the platform in one screen.
- Login with email/password and Google.
- Signup creates a student account only.
- Show email-verification state clearly.
- Support password reset and expired-link retry.
- Preserve a safe `next` destination after login.

### Student home

Show:

- Continue learning card
- Active courses and progress
- Pending payment status
- Recent announcements
- Quiz average and watch time when available
- Certificates shortcut
- Browse courses CTA

Use skeleton loading, empty states and pull-to-refresh. Do not show admin or
instructor metrics.

### Browse and course detail

- Search by title/description.
- Filter by category, level and price.
- Course thumbnail, instructor, description, milestones and modules.
- Show content types: video, PDF, quiz and assignment.
- Show correct enrollment state: active, pending, rejected or not started.
- Do not show a payment button for an already active enrollment.

### Coupon checkout

1. Student taps Enroll.
2. Open a dedicated checkout screen.
3. Enter a coupon and tap Apply coupon.
4. Call `POST /payments/coupons/preview`.
5. Show original price, discount and final amount.
6. Never trust the client-calculated amount.
7. Continue to payment; the backend validates the coupon again while creating
   the order.

The Apply button must have a loading state, prevent duplicate taps and show a
clear invalid-code message.

### Pay-Confirm payment

- Display course, order/reference code and exact amount.
- Display the configured receiver number and payment instructions.
- Let the student choose bKash, Nagad or Rocket when configured.
- Validate sender number locally, then submit it to the backend.
- Accept the transaction ID and show a blocking verification state.
- Disable repeat submission while verification is pending.
- On success, show confirmation and navigate to the correct learning page.
- On failure, preserve the order and show a resubmission path.
- Never expose the Pay-Confirm API token in the mobile app.

Only the backend talks to the external payment verification service. The app
must not call the external service directly.

### Learning experience

The hierarchy is:

```text
Course → Milestone → Module → Content
Content → Video | PDF | Quiz | Assignment
```

- Milestones and modules are collapsible.
- Keep the active content and next/previous controls obvious.
- Show the module name and content index.
- Load video URLs only through the backend signed URL endpoint.
- Resume from the last saved position.
- Save progress periodically and on pause/background.
- Mark content complete only through the backend.
- Keep the learner email watermark on every video view, repositioned every
  8–12 seconds.
- Do not allow raw public video URLs or unrestricted downloads.

### Offline course downloads

Offline learning is available only to a logged-in student with an active
enrollment for that specific course. The app must not download a course before
the backend confirms access.

Recommended flow:

1. Student logs in and opens an actively enrolled course.
2. The app requests an offline manifest from the backend, for example
   `POST /courses/:courseId/offline-manifest`.
3. The backend verifies the student, enrollment status and course access, then
   returns only allowed content and short-lived signed download URLs.
4. The app downloads content one item at a time with progress, pause, retry and
   cancel controls.
5. Store the manifest and files in app-private storage, never in a public/shared
   device folder.
6. Encrypt downloaded files at rest using a key protected by the platform
   keychain/Android Keystore. Do not store the raw decryption key in a normal
   database or AsyncStorage.
7. Show downloaded milestones/modules with an offline indicator.
8. Allow video and PDF playback offline only inside the authenticated app
   player. Do not expose a raw file path or unrestricted share action.
9. Queue progress, quiz drafts/results and assignment metadata locally while
   offline, then sync them when connectivity returns.
10. Resolve sync conflicts on the backend using server timestamps and explicit
    attempt rules; never silently overwrite a quiz result.

Offline rules:

- Download access is course-specific, user-specific and revocable.
- A pending, rejected or revoked enrollment cannot start a new download.
- The app must revalidate the entitlement when it reconnects and periodically
  while the cached license is valid.
- A refund/reversal/revoked enrollment must invalidate the local course license
  on the next successful sync.
- The backend may set a download expiry and maximum device/session count.
- Course content should support selective download by milestone/module instead
  of forcing the entire course at once.
- Show available storage and estimated download size before starting.
- Never cache payment secrets, refresh tokens or private API responses in a
  user-visible file location.
- Offline video availability is a product decision: use encrypted local media
  playback and platform DRM where required; signed URLs alone do not protect a
  file after it has been downloaded.

Backend requirements for offline mode:

- Offline manifest endpoint with enrollment authorization
- Per-content download authorization and short-lived URLs
- Content version/hash in the manifest for update detection
- Revocation/expiry response and a way to invalidate cached licenses
- Download audit events without logging file contents or secrets
- Sync endpoint for progress and queued learning events
- Idempotency keys for every offline sync batch

Suggested mobile modules:

```text
mobile/src/offline/offline-manifest.ts
mobile/src/offline/download-manager.ts
mobile/src/offline/secure-file-store.ts
mobile/src/offline/sync-queue.ts
mobile/src/offline/offline-license.ts
```

Offline acceptance tests:

- Anonymous user cannot download or open protected course content offline.
- Student can download only an actively enrolled course.
- App can play an authorized downloaded video and open a downloaded PDF after
  the network is disabled.
- Closing/reopening the app does not lose the encrypted download state.
- Progress made offline syncs once after reconnect without duplicate events.
- A revoked/refunded enrollment loses access after entitlement revalidation.
- Interrupted downloads resume safely and never produce a falsely complete file.
- Logout removes or locks the local student license and protected downloads.

### PDFs and assignments

- Open PDFs through authenticated, time-limited URLs.
- Show download availability only when the backend permits it.
- Assignment submission must show accepted file types, size limit, upload state,
  retry and final status.
- Never mark an assignment complete before the backend confirms submission.

### Quizzes

- Load quiz questions from the backend.
- Save local draft answers only as temporary UI state.
- Show a confirmation dialog before the final submit.
- Disable submission immediately after the request starts.
- Enforce one submission on the backend.
- After submission, show score, summary, selected answers and correct answers as
  returned by the backend.
- Never calculate the authoritative score only on the client.

### Notifications, discussions and certificates

- Register push-token after login and associate it with the student profile.
- Deep link announcement notifications to the relevant course or announcement.
- Mark notifications read on open.
- Discussion posts need moderation-safe length limits and retry handling.
- Certificates should open through a signed download endpoint.

## 7. Data and caching rules

TanStack Query should own server state.

- Public catalog: cache briefly and invalidate on pull-to-refresh.
- Profile/session: stale time around 5 minutes, clear on logout.
- Course detail: cache by slug.
- Learning outline: cache by course ID, invalidate after content completion.
- Progress: debounce writes and flush when the app backgrounds.
- Payment/order status: refetch while pending with a bounded interval; stop after
  a terminal state.
- Never persist sensitive payment data or raw tokens in an offline cache.

Handle these common states everywhere:

- Initial loading skeleton
- Pull-to-refresh
- Empty result
- Offline/network error
- Unauthorized/session expired
- Permission denied
- Rate limited
- Server error with retry

## 8. Push notifications

Backend work required:

- Add a `push_devices` table with user ID, provider, token, platform, last-used
  timestamp and revoked timestamp.
- Add register/unregister device endpoints.
- Remove invalid tokens after provider feedback.
- Send notifications for payment success/failure, new announcement, quiz result,
  assignment feedback and certificate availability.
- Do not include transaction secrets, sender numbers or private course data in the
  notification payload.

## 9. File and media policy

- Videos remain in Cloudflare R2.
- PDFs, certificates and permitted materials remain in Supabase Storage.
- Thumbnails and avatars continue using the existing UploadThing flow.
- Mobile receives signed URLs from the backend only.
- Add size, MIME type and extension validation on the backend.
- Cancel uploads on navigation and support resumable/retry behavior where the
  provider permits it.

## 10. API/client implementation rules

Create a typed mobile API client with:

- Base URL from build-time configuration
- Request ID header for support/debugging
- Auth header injection
- Refresh-once interceptor
- JSON parsing and typed API errors
- Abort/cancellation support
- Timeout handling
- No raw fetch calls scattered through screens

Suggested client modules:

```text
mobile/src/api/client.ts
mobile/src/api/auth.ts
mobile/src/api/courses.ts
mobile/src/api/payments.ts
mobile/src/api/learning.ts
mobile/src/api/quizzes.ts
mobile/src/api/assignments.ts
mobile/src/api/notifications.ts
mobile/src/api/profile.ts
```

## 11. Backend additions needed for mobile

Before release, confirm or add:

- Mobile token response/refresh path that does not depend on browser cookies
- Stable pagination for catalog, notifications, discussions and enrollments
- `GET /students/me/dashboard` aggregate endpoint to reduce startup requests
- `GET /courses/:id/learning-outline` with ordered milestones/modules/content
- Signed PDF/material URL endpoint with student enrollment authorization
- Quiz result detail endpoint
- Assignment upload/submission status endpoint
- Push-device registration endpoints
- Consistent error DTO: `{ error: { code, message, fieldErrors? } }`
- Request ID returned in every error response
- Rate limits and audit logs for payment verification and account security

## 12. Environment configuration

Mobile-safe public configuration:

```text
MOBILE_API_URL=https://api.example.com
MOBILE_WEB_URL=https://example.com
MOBILE_SENTRY_DSN=...
MOBILE_GOOGLE_IOS_CLIENT_ID=...
MOBILE_GOOGLE_ANDROID_CLIENT_ID=...
```

Never put these in the mobile bundle:

- `DATABASE_URL`
- JWT signing secrets
- refresh-token database secrets
- Supabase service-role key
- R2 secret access key
- UploadThing server token
- Pay-Confirm API token
- SMTP credentials

## 13. Security checklist

- Enforce student role on every backend request.
- Use HTTPS in every non-local environment.
- Store tokens in secure device storage.
- Use refresh-token rotation and revocation.
- Do not trust client price, coupon, score, progress or course ID alone.
- Authorize course access on every learning/material/video request.
- Use short-lived signed URLs.
- Keep the required watermark on every video player.
- Redact payment and identity data from logs and crash reports.
- Add certificate pinning only after a maintenance plan exists; it can make
  emergency certificate rotation difficult.
- Add jailbreak/root and screen-capture policy only if the product/legal policy
  requires it; these are not a substitute for backend authorization.

## 14. Testing plan

Unit tests:

- Token storage and refresh behavior
- API error mapping
- Coupon display state
- Price formatting
- Progress debouncing
- Quiz answer/result rendering

Integration tests:

- Signup → verify email → login
- Login → refresh → logout
- Course browse → checkout → coupon preview
- Payment success → active enrollment → learning page
- Payment failure → pending/retry path
- Revoked enrollment → access denied
- Video signed URL and watermark presence
- Quiz one-attempt behavior
- Assignment upload/retry/status

Device tests:

- Android and iOS current supported versions
- Small and large phones/tablets
- Slow 3G, offline and reconnect
- Background/foreground during video and payment verification
- Deep links from cold and warm starts
- Push notification open behavior
- Keyboard, screen reader and dynamic text size

## 15. Release plan

### Development

- Run the backend locally over a reachable HTTPS tunnel for devices.
- Use a separate test database and test payment records.
- Add development bundle IDs and app icons.

### Staging

- Deploy a staging backend and web domain.
- Use separate R2/Supabase buckets where possible.
- Configure test push credentials and test OAuth redirect URIs.
- Run the full payment and learning acceptance suite.

### Production

- Configure iOS and Android bundle/package IDs.
- Configure Apple Developer and Google Play Console accounts.
- Configure signing certificates, Android keystore and CI secrets.
- Configure OAuth mobile redirect URIs.
- Configure push notification credentials.
- Set production API URL and HTTPS.
- Enable crash reporting, performance monitoring and alerting.
- Publish privacy policy, terms, payment/refund policy and support contact.
- Prepare store screenshots, description, age rating and data-safety answers.
- Submit internal testing builds before public release.
- Use staged rollout and a rollback plan.

## 16. Suggested implementation phases

1. Mobile workspace, navigation and design tokens
2. Auth and session refresh
3. Catalog and course detail
4. Coupon checkout and Pay-Confirm flow
5. Student dashboard and learning outline
6. Video player, watermark and progress
7. PDFs, quizzes and assignments
8. Notifications, discussion and certificates
9. Accessibility, offline states and analytics
10. Device testing, store compliance and staged release

## 17. Definition of done

The student app is ready when:

- A new student can sign up and reach the dashboard.
- An existing student can log in and survive access-token expiry.
- A coupon can be previewed and the server-calculated final amount is shown.
- A successful payment activates only the purchased course.
- A failed or pending payment never grants course access.
- A student can complete the full video/PDF/quiz/assignment learning flow.
- Progress resumes correctly after leaving and reopening the app.
- Quiz attempts cannot be duplicated.
- Push notifications and deep links work on both platforms.
- No server secret is present in the app bundle.
- Crash, payment and authorization failures are observable.
- App Store and Google Play privacy disclosures match actual data collection.
