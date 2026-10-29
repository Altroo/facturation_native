# E.B.H Facturation Native

iOS and Android application for the E.B.H Facturation platform, connected to its Django backend. It follows the web application's business rules, API contracts and Redux conventions, with navigation and reusable controls adapted to mobile.

The application is under active development. Available actions depend on the account's permissions and the selected company's configuration.

## Contents

- [Key capabilities](#key-capabilities)
- [Stack](#stack)
- [Local setup](#local-setup)
- [Project structure](#project-structure)
- [Builds](#builds)
- [Quality checks](#quality-checks)
- [Dependency updates](#dependency-updates)
- [Versions and maintenance](#versions-and-maintenance)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## What It Shows

- Shared lists, forms and detail screens across business modules.
- Company-scoped data, authenticated navigation and permission-aware actions.
- Native image editing, PDF previews, notifications and keyboard-aware forms.
- Behavior tests for screens, components, services and application state.

## Key Capabilities

### Dashboard

Company-scoped indicators and charts for revenue, cash flow, sales, clients, discounts and margins. Filters include dates, currency, client and project. Administrators configure monthly objectives under Paramètres.

### Clients

Active and archived lists, creation, editing and details. Client details include document history and printable account statements.

### Articles

Active and archived lists, creation, editing, photos, pricing and classification. CSV/Excel import, an import guide and stock information use the existing Django endpoints.

### Quotes (Devis)

List, creation, editing, details, article selection, discounts, totals and status actions. Includes PDF generation and eligible document conversions.

### Pro-forma invoices

List, creation, editing and details, with article lines, payment terms, purchase-order references, discounts and PDFs. Eligible pro-formas can create client invoices.

### Client invoices

Regular and unpaid lists, currency statistics, creation, editing, details and PDFs. Includes payment creation/history, remaining balances and conversion to delivery notes when permitted.

### Credit notes (Factures d'avoir)

List, currency statistics, creation, details and status-dependent editing. Supports original-invoice prefill, reasons, article lines, discounts, deletion and PDFs.

### Delivery notes (Bons de livraison)

Regular and uninvoiced lists, creation, editing, details and delivery-person management. Includes price-free PDFs and status/stock-aware actions.

### Payments (Règlements)

List, editing, details, cancellation, deletion and printable receipts. Payment changes refresh the corresponding invoice balances.

### Stock

- **Balances:** quantities by article/location and stock adjustments.
- **Movements:** read-only movement history and details.
- **Receipts:** creation, details, validation and cancellation according to permissions.
- **Inventories:** creation, editing, details and validation.

Stock actions depend on company configuration and account permissions. Historical records remain readable when writes are unavailable.

### Logistics

Company-scoped dashboard and tracking list. Dossier creation, editing and detail actions remain disabled while the corresponding web workflow is in progress.

### Suppliers

Supplier list, creation, editing and details under Logistique, including linked dossier history.

### Users and companies

User and company lists, creation, editing and details. Includes user deletion, company suspension, managed-company relationships, avatars, company logos and stamps.

### Authentication and settings

Login, password recovery, profile editing, password changes and logout. Paramètres groups profile, password, notification preferences and administrator monthly objectives.

### Notifications and Nouveautés

Notification list, read status, unread count and preferences. Nouveautés displays the independent mobile release history published by Django.

### Mobile interface

- Server-side search, combined filters, sorting, infinite scrolling and pull to refresh.
- Shared cards, selection controls, confirmation dialogs and fixed action bars.
- Camera/gallery selection, image previews and cropping.
- French/English interface, saved light/dark appearance and animated startup branding.
- In-app notifications and system notifications from the active WebSocket connection.

Background push delivery and app-store distribution are not configured.

## Stack

- Expo SDK 58, Expo Router, React Native 0.88, React 19 and React Compiler.
- TypeScript 7 project compiler, ESLint 10, Prettier and Bun.
- Redux Toolkit, RTK Query, redux-saga and Axios.
- Formik, Zod and date-fns.
- Tailwind CSS through Uniwind, Material icons and Expo UI where appropriate.
- FlashList, shared grid controls and React Native Gifted Charts.
- Expo SecureStore, Keyboard Controller, image modules and native image cropping.
- Jest, jest-expo and React Native Testing Library.

`package.json` and `bun.lock` define exact versions. Dependencies use published packages without local package patches. The project compiler is `@typescript/native`; the separate `typescript` package supports tools that use its JavaScript API.

## Related Repository

- Web application: [Altroo/facturation_frontend](https://github.com/Altroo/facturation_frontend)
- Backend API: [Altroo/facturation_backend](https://github.com/Altroo/facturation_backend)

## Local Setup

### Requirements

- Bun 1.4.4 or newer, and Node.js matching `package.json` engines.
- Xcode for the iOS Simulator, or an Android SDK, compatible JDK and emulator/device.
- A running Django backend and an account with the required permissions.

### Install

```bash
bun install --frozen-lockfile
cp -n .env.example .env
```

### Backend addresses

Set these values in `.env`. Keep the module endpoint paths supplied by `.env.example`.

| Variable                   | Purpose                         |
| -------------------------- | ------------------------------- |
| `EXPO_PUBLIC_API_URL`      | Backend origin, without `/api`  |
| `EXPO_PUBLIC_ROOT_API_URL` | API root, including `/api`      |
| `EXPO_PUBLIC_ROOT_WS_URL`  | WebSocket root, including `/ws` |

Use an address reachable from the device:

| Target           | Example API root               | Example WebSocket root      |
| ---------------- | ------------------------------ | --------------------------- |
| iOS Simulator    | `http://localhost:8000/api`    | `ws://localhost:8000/ws`    |
| Android emulator | `http://10.0.2.2:8000/api`     | `ws://10.0.2.2:8000/ws`     |
| Physical phone   | `http://<Mac-LAN-IP>:8000/api` | `ws://<Mac-LAN-IP>:8000/ws` |

For a physical phone, Django must listen on the LAN and accept that host. A production backend uses its public HTTPS/WSS addresses.

`EXPO_PUBLIC_` values are included in the app bundle. Keep credentials and server secrets out of them. Private `.env` files are ignored by Git. Fully reload the app after changing configuration.

### First native run

```bash
bun run ios
# Or use an Android emulator/device:
bun run android
```

These commands build and install a development app. Run them again after adding or changing native dependencies. Image cropping and other native modules require this build; Expo Go is not the target runtime.

### Daily development

```bash
bun run dev
```

Keep Metro running while using the development app. It uses the default port and prompts if it is occupied. `bun run debug` restarts it with a cleared cache; `bun run web` opens a browser preview with limited native functionality.

## Project Structure

### Screens and navigation

Screens live directly in `src/app/`. A typical module uses:

```text
src/app/(app)/(drawer)/clients/
  index.tsx       List
  archived.tsx    Archived list
  form.tsx        Add/edit form
  [id]/index.tsx  Details
```

`(app)` and `(drawer)` are route groups; their names do not appear in URLs. Forms use an optional route ID to distinguish creation from editing.

### Layouts and access

- `src/app/_layout.tsx`: startup resources, providers and authentication guards for the complete `(app)` group.
- `src/app/(app)/_layout.tsx`: drawer and required password-change handling.
- `src/app/(app)/(drawer)/_layout.tsx`: module screen titles, headers and stack navigation.
- `src/app/login.tsx` and `src/app/reset-password/`: public authentication screens.

Native screens own their state, forms and query hooks directly. They do not need Next.js server/client component wrappers. Django handles business data and permission enforcement.

### Reusable components

- `src/components/nativeElements/`: individual controls such as inputs, buttons, selects and radios.
- `src/components/shared/`: reusable compositions and logic such as lists, form sections, detail cards, dialogs and action bars.
- `src/components/layouts/`: shared authentication and navigation layouts.
- `src/components/portals/`: global feedback, including toasts.

Declare the local `Props` type in the component's source file. Put contracts shared by several components in `src/types/`.

### State and storage

- `src/store/`: actions, services, sagas, slices and selectors.
- `src/contexts/` and `src/providers/`: initialization, sessions, language, appearance and feedback.
- `src/Storage/` and `src/local/auth/`: session/recovery storage and persistence adapters.

Native sessions use SecureStore instead of web cookies. Browser previews use an in-memory session. RTK Query handles requests and caching; initialization effects, actions and sagas synchronize account data and application events.

### Models, utilities and assets

- `src/models/` and `src/types/`: domain classes and shared contracts.
- `src/utils/`: hooks, API helpers, routes, raw data, themes and validation schemas.
- `src/styles/`, `src/translations/` and `assets/`: styling, translations, fonts and branding.

### Adding a module

Follow its web implementation and the closest existing native module. Keep screens in the module's route folder, reuse shared controls, and register routes and navigation entries in the existing layouts.

When adding an API service, register its reducer, middleware and logout cleanup. Keep search/filter/sort behavior on the server, as in the existing lists.

## Builds

### Native configuration

`app.json`, its plugins and `assets/` define native behavior and branding. Expo generates `ios/` and `android/`; these folders are ignored by Git. Keep configuration changes in their source files and rebuild the native app to apply them.

Camera/gallery permission messages are configured in `app.json`. Grant the requested camera, photo or notification access when testing the corresponding feature.

### Android production APK

Create a local `.env.production` with the intended backend addresses, then run:

```bash
bun run build:android:production
```

Output: `android/app/build/outputs/apk/release/app-release.apk`.

### Install on Android

Connect an authorized USB-debugging device, then run:

```bash
bun run android:production --device
```

The release bundles its JavaScript and assets and runs without Metro. Distribution signing is a separate step.

### iOS Simulator

```bash
bun run ios
```

This runs a local development build on the simulator. No iOS release build or physical iPhone is required for simulator testing.

### JavaScript exports

```bash
bun run build
```

This exports JavaScript and assets for all platforms. It does not create an installable APK or IPA. Native splash, icon, permission and dependency changes require a native rebuild.

## Quality Checks

### Lint and types

```bash
bun run lint
bun run typecheck
```

Use the direct ESLint script to preserve `eslint.config.ts`. Do not run `expo lint`.

### Tests

```bash
bun run test --coverage=false
bun run test:watch
bun run test:coverage
```

Use `bun run test`, not bare `bun test`: the project uses Jest. To run one file:

```bash
bun run test --coverage=false --runTestsByPath src/components/layouts/auth/authLayout.test.tsx
```

### Test locations

Component, utility, service and config tests sit beside the files they cover. Screen tests live in `src/__tests__/app/`, mirroring the route folders, so Expo Router does not treat them as pages.

Shared test setup lives directly in `src/__tests__/`. New screens and reusable components should include matching behavior tests.

### Combined checks and formatting

```bash
bun run check
bun run format:check
```

`check` runs TypeScript, ESLint and Jest. Verify shared UI changes on an emulator or device as well; mocked component tests do not measure the rendered native layout.

## Dependency Updates

### Check and align

```bash
bun run upgrade:check
bun run upgrade
bun run doctor
```

`upgrade` runs `expo install --fix --bun` to align packages with the installed SDK. A major SDK upgrade is a separate migration.

### Add a dependency

```bash
bun x expo install <package> --bun
```

Rebuild the development app if it contains native code. `bun run outdated` lists newer releases without installing them; retain versions required by Expo compatibility.

## Versions and Maintenance

### Mobile version

Keep `package.json` and `app.json` versions aligned. Mobile has its own version sequence, independent of the web.

Django's `version_mobile` controls mobile update notices; `version` controls web notices. Publish the mobile version only once that build is available to install.

### Update notices

Installed releases explain when a newer app is available. Closing the notice does not install an update. Automatic downloads and store links are not configured.

`src/app/api/app-version+api.ts` provides the local development version endpoint. Installed mobile releases use Django's maintenance/version data.

### Nouveautés

Publish bilingual entries through **Mobile changelog** in Django administration. The mobile app requests the changelog with `platform=mobile`, excluding web-only entries, drafts and future publications.

## Troubleshooting

### Backend or session connection fails

Check the configured backend address from the device's network, then inspect the Django response/logs. A phone's `localhost` refers to the phone, not the Mac. Production releases need the intended addresses in `.env.production` before rebuilding.

### A native module or development build is missing

Run `bun install --frozen-lockfile`, then rebuild with `bun run ios` or `bun run android`. Restarting Metro alone cannot add a native module to an installed app.

### Changes do not appear

Development builds need the matching project's Metro server. Production builds contain a bundled snapshot of the code, so rebuild and reinstall them after changes. Use `bun run debug` if the development bundle cache is stale.

### Images or PDFs do not open

Check device permissions for images and confirm the backend request succeeds. PDFs are generated by Django and opened through the native preview; check both the API response and device logs when previewing fails.

## Portfolio Note

The application continues to grow alongside the web platform. This repository documents the implemented modules and shared conventions; credentials and private runtime configuration remain outside Git.

## License

See [LICENSE](LICENSE).
