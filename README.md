# E.B.H Facturation Native

Mobile version of the Facturation platform for iOS and Android. The application is under active development: authentication, users, companies, clients, articles, quotes, pro-formas, client invoices, credit notes, delivery notes, payments and account settings provide the foundation for progressively bringing the web application's business modules to mobile.

The project follows the web application's folder structure, API contracts and Redux conventions, adapting navigation, storage and interface components to native devices.

## What It Shows

- A mobile interface connected to the existing Django backend and permission system.
- Reusable forms, entity cards, image controls, dialogs and bottom sheets.
- State management with Redux Toolkit, RTK Query and redux-saga.
- Native navigation, keyboard handling, persistent preferences and session storage.
- Behavior tests for screens, components, authentication, services and state transitions.

## Key Capabilities

- Login and password recovery: reset request, verification code, new password and completion.
- Users and companies: full-detail cards, server-side search, filtering and sorting, infinite scrolling and pull to refresh.
- User creation, editing and deletion; company creation, editing and suspension, with permission checks and confirmation dialogs.
- Clients: active and archived lists, creation, editing, details, account statements and document history.
- Articles: active and archived lists, creation, editing, photos, HT/TTC pricing, classification and stock snapshots. CSV/Excel import and the import guide use the same Django endpoints as the web.
- Quotes (Devis): company-scoped list, header creation followed by article lines, editing, details, discounts, totals, status permissions, deletion and four PDF formats in French, English or Dutch. Quotes with status Sent or Accepted can be converted to a pro-forma after confirmation.
- Pro-formas: company-scoped list, creation, editing, details, payment terms, purchase-order reference, article lines, discounts, status controls, PDF generation and conversion to a client invoice.
- Client invoices: regular and unpaid lists, company statistics by currency, creation, editing, details, payment creation and history, balances, validation permissions and PDF generation. Quotes and pro-formas can create client invoices. Payments use the invoice currency and remaining balance, and refresh the invoice after saving. Eligible client invoices can create a delivery note after confirmation.
- Credit notes (Factures d’avoir): company-scoped list and currency statistics, original-invoice prefill, required reasons, article lines, discounts, draft-only editing, status permissions, detail views, deletion and PDF generation. Changes refresh invoice balances.
- Delivery notes (Bons de livraison): regular and uninvoiced lists, creation, editing, details, delivery-person management, status permissions, article lines and stock-aware deletion. Accepted or invoiced notes keep their lines read-only. Price-free PDFs use a direct French, English or Dutch choice.
- Payments (Règlements): company-scoped cards, server search and combined filters, sorting, infinite scrolling, bulk deletion, cancellation, edit/detail screens and receipts in French, English or Dutch. Invoice balances refresh after successful changes; invoice history reuses the same payment cards.
- Stock: balances, immutable movement history, receipts and inventories, with server-side search, combined filters, sorting, infinite scrolling and pull to refresh. Cashiers can record signed adjustments and validate inventories; Logistics can receive incoming order lines and cancel validated receipts. Company settings control writes while historical records remain readable. If validation fails after creating a receipt or inventory, the saved draft opens for retry.
- Dashboard: company-scoped KPIs, monthly objectives, financial, commercial, operational, cash-flow, client, discount and margin charts. Date, currency, client and project filters use the web dashboard's Django endpoints. Native charts support touch interaction and portrait layouts. Administrators configure monthly objectives from Paramètres.
- Profile editing, avatar upload, password changes and logout.
- Compact drawer navigation and stack navigation that returns to the previous screen.
- French/English translations, flag controls and saved light/dark appearance.
- In-app notifications, notification preferences and system notifications from the active WebSocket connection.
- Camera/gallery selection, image preview and cropping for avatars, company logos, stamps and article photos.
- A logo splash screen while local resources and preferences load.
- Backend-controlled maintenance and local development version checks.
- Nouveautés: bilingual release history from Django, limited to Mobile and shared Web/Mobile updates.

Business modules beyond the dashboard, users, companies, clients, articles, quotes, pro-formas, client invoices, credit notes, delivery notes, payments and stock are not fully migrated; their menu destinations remain placeholders. Logistics currently supplies the order lookups needed by Stock receipts; its full screens are deferred while the web module is in progress. Django controls maintenance and version data. Background push delivery and app-store distribution are not configured.

## Stack

- Expo SDK 58, Expo Router, React Native 0.88, React 19.3 and React Compiler
- TypeScript 7, ESLint 10, Prettier and Bun
- Redux Toolkit, RTK Query, redux-saga and Axios
- `axios-auth-refresh` and Expo SecureStore for native sessions
- Formik, Zod and date-fns
- Tailwind CSS through Uniwind, Material icons and Expo UI where appropriate
- FlashList and `expo-flash-datagrid` filter/sort contracts
- React Native Keyboard Controller and autocomplete controls
- Expo ImagePicker/ImageManipulator, image previews and native cropping with `react-native-image-crop-picker`
- Jest 30, jest-expo and React Native Testing Library

`package.json` and `bun.lock` are the source of truth for exact versions. Dependencies are installed from their published packages; no local package patches are required.

## Related Repository

- Web application: [Altroo/facturation_frontend](https://github.com/Altroo/facturation_frontend)
- Backend API: [Altroo/facturation_backend](https://github.com/Altroo/facturation_backend)

## Screenshots

Mobile screenshots are not included yet. The interface and available modules continue to evolve.

## Local Setup

### Requirements

- Bun 1.4.4 or newer and a Node.js version matching `package.json` (`^22.18.0`, `^24.3.0` or `>=26.0.0`).
- Xcode for the iOS Simulator, or Android Studio with an SDK, JDK and emulator/device for Android.
- The Django backend and an existing account with the appropriate permissions.

### Configuration

```bash
bun install --frozen-lockfile
cp -n .env.example .env
```

Choose a backend address reachable from the target device:

| Target                   | API root                       | WebSocket root              |
| ------------------------ | ------------------------------ | --------------------------- |
| iOS Simulator or browser | `http://localhost:8000/api`    | `ws://localhost:8000/ws`    |
| Android emulator         | `http://10.0.2.2:8000/api`     | `ws://10.0.2.2:8000/ws`     |
| Physical phone           | `http://<Mac-LAN-IP>:8000/api` | `ws://<Mac-LAN-IP>:8000/ws` |

Set `EXPO_PUBLIC_ROOT_API_URL` and `EXPO_PUBLIC_ROOT_WS_URL` accordingly. Set `EXPO_PUBLIC_API_URL` to the backend origin without `/api`; the Administration action uses it to open Django administration. For a physical phone, Django must listen on the LAN and allow that host.

The remaining endpoint variables follow the web names with an `EXPO_PUBLIC_` prefix. Services, authentication and sagas read them from the environment. Keep the entries in `.env.example` when adapting the backend address, and fully reload the app after changing them.

`EXPO_PUBLIC_` values are bundled into the app. They must never contain server secrets or credentials. Private environment files stay outside Git.

### Run

Build a local development client on the first checkout or after changing native dependencies:

```bash
bun run ios
# Or:
bun run android
```

Image cropping uses a native editor on iOS and Android and requires this development build. Camera and gallery permissions are configured through `expo-image-picker` in `app.json`; CocoaPods and Gradle link the cropper automatically. iOS also declares French and English in `CFBundleLocalizations`. Browser previews do not include the native crop editor.

For subsequent sessions, use `bun run dev`. Expo uses its default port and prompts if it is occupied. `bun run web` opens the browser preview. Native modules require a development build; Expo Go is not the target runtime.

For a local Android release, configure your Android SDK/JDK and create a local `.env.production` with the intended backend addresses:

```bash
bun run build:android:production
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`. `bun run android:production --device` builds and installs on a connected phone. The release bundles JavaScript and assets and runs without Metro. Distribution signing is a separate step.

### Project Structure

| Location                                                  | Purpose                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/app/login.tsx`, `src/app/reset-password/`            | Login and password recovery screens                                                  |
| `src/app/(app)/(drawer)/`                                 | Dashboard and module folders sharing one navigation stack                            |
| `src/app/(app)/(drawer)/clients/`, `companies/`, `users/` | Each module’s list, form, detail screen, and archive when applicable                 |
| `src/app/api/app-version+api.ts`                          | Local version endpoint, equivalent to the web API route                              |
| `src/components/nativeElements/`                          | Individual controls: inputs, selects, buttons, checkboxes and dialogs                |
| `src/components/shared/`                                  | Reusable compositions and logic: list cards, actions, confirmations and retry blocks |
| `src/components/layouts/`, `portals/`                     | Navigation, auth layout and toasts                                                   |
| `src/contexts/`, `src/providers/`                         | Initialization, sessions, theme, language and feedback                               |
| `src/store/`                                              | Actions, services, sagas, slices and selectors                                       |
| `src/models/`, `src/types/`                               | Domain models and shared data contracts                                              |
| `src/utils/`                                              | API helpers, hooks, routes, `rawData.ts` and separate validation schemas             |
| `src/Storage/`, `src/local/auth/`                         | Session/recovery storage and persistent storage adapters                             |
| `src/styles/`, `src/translations/`                        | Theme styles and French/English text                                                 |
| `src/__tests__/app/`                                      | Route behavior tests, kept outside Expo Router's screen tree                         |

Tests sit beside the files they cover, including `babel.config.test.ts` and `metro.config.test.ts` beside the root configs. Screen and navigation tests are the Expo Router exception: they stay in `src/__tests__/app/` because files inside `src/app/` become routes. Inside `src/__tests__/app/`, folders mirror `src/app/`, including `(app)/(drawer)/articles`, `devis`, `clients`, `companies`, `users`, `settings`, each module’s forms and `[id]` views, `reset-password`, and `api`. Test filenames match their screen where possible; `reset-password/flow.test.tsx` covers the complete recovery journey, and `form-navigation.test.tsx` covers navigation across modules. Shared autocomplete test helpers live beside `customAutoCompleteSelect`, and query test helpers live in `src/store/` beside `setupApiStore`.

Route groups such as `(app)` and `(drawer)` organize navigators without adding URL segments. All authenticated screens live in `src/app/(app)/(drawer)/`, grouped by module: `articles/`, `devis/`, `clients/`, `companies/`, `users/`, and `settings/`. Each module keeps its list (`index.tsx`), archive when applicable (`archived.tsx`), form (`form.tsx`), and detail (`[id]/index.tsx`) together. The drawer wraps one shared stack, so Back follows the actual visit history across modules. The dashboard, lists, and archives show the menu button; forms, details, and settings use Back when history exists. Direct links have the dashboard as their Back destination. An optional route ID distinguishes creation from editing.

Authentication is enforced in `src/app/_layout.tsx`: `Stack.Protected` guards the entire `(app)` group, including its nested drawer lists. `src/app/(app)/_layout.tsx` provides the drawer and redirects accounts that must change their default password. `src/app/(app)/(drawer)/_layout.tsx` configures every screen’s title and menu or Back header in one stack. Its `Stack.Screen` entries configure navigation; the root guard decides whether the group is accessible. Module permissions remain separate checks in the screens and Django API.

Screens are ordinary client-side React Native components. They own state, Formik forms and query hooks directly. Django handles database operations and permissions. Next.js server-page wrappers and `use client` directives are unnecessary here; server-only API handlers remain separate from device storage.

Native sessions use SecureStore through `src/Storage/`, replacing NextAuth's browser-cookie mechanism. Browser preview uses an in-memory session and requires login again after a full reload. `InitEffects` synchronizes fetched account data with Redux through actions and sagas. RTK Query handles requests, caching and mutation invalidation.

Lists share `paginatedDataGrid`, inline search, filters, sorting sheets and selection controls. Its `rows` prop contains the records loaded so far, rendered as complete cards. Searches and filters are sent to Django; scrolling requests another page. Forms share keyboard-aware scrolling and image controls. Component-only `Props` live beside their component; shared domain contracts stay in `types`.

The version endpoint reads this project's package version. Local update checks use Axios through `apiHelpers.ts`, with reload helpers in `helpers.ts`. Installed release builds show a dismissible notice when a newer published Mobile or shared release is available, explaining that the latest app must be installed to get its features. They check on sign-in, on returning to the foreground and when the server announces a new version. Web-only release notes do not trigger this notice. Closing the notice does not install or reload anything; automatic downloads and store links are not configured.

Release notes use the same Django changelog and version sequence as the web. In Django administration, choose **Web**, **Mobile** or **Web and Mobile** for each entry, complete both languages, then publish it. The mobile page requests `EXPO_PUBLIC_CHANGELOG` with `platform=mobile`; the web requests `platform=web`. Both include shared entries and exclude drafts and future dates. Existing history remains Web. Backend migrations `ws.0013` and `ws.0014` add targeting and seed seven days of mobile history from native commits without overwriting admin edits; `ws.0015` corrects the versions copied by the initial seed. Historical entries use the corresponding web version for their date, documented in the backend's `docs/mobile-changelog-history-sources.json`. Nearby dates can share a version when the web version did not change. Keep the current package version and Expo app version aligned with the shared release; do not replace historical entry versions when increasing it.

When adding another module, follow the equivalent web service, actions, selectors and screen flow, reuse these native controls, and register any new API middleware, reducer and logout cache cleanup.

### Maintenance Commands

| Command                 | Purpose                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `bun run upgrade:check` | Check dependency compatibility with the installed Expo SDK |
| `bun run upgrade`       | Run `expo install --fix --bun` to align SDK dependencies   |
| `bun run outdated`      | Inspect newer package releases without installing them     |
| `bun run doctor`        | Diagnose Expo configuration and dependencies               |
| `bun run debug`         | Start Metro with a cleared cache                           |
| `bun run analyse`       | Start Expo Atlas bundle analysis                           |

Install dependencies with `bun x expo install <package> --bun`. An SDK major upgrade is an explicit migration; dependency alignment alone does not perform it.

## Quality Checks

```bash
bun run check
bun run format:check
bun run build
```

`check` runs TypeScript, ESLint and Jest. Use `bun run lint` directly, not `expo lint`, to preserve `eslint.config.ts`. Use `bun run test`, not bare `bun test`, because the project uses Jest. For example:

```bash
bun run test --runTestsByPath src/auth.test.ts --coverage=false
bun run test:coverage
```

`build` exports the JavaScript/assets for all platforms; it does not produce an installable APK or IPA. Rebuild the development/release app to verify native dependency, splash, permission or keyboard changes on a device. Test compilation includes React Compiler, matching the app's compilation behavior.

## Portfolio Note

This is an evolving mobile application, intended to grow alongside the web platform. The repository documents implemented foundations and reusable workflows without claiming that all business modules have already been migrated. Credentials and private runtime configuration stay outside Git.
