# E.B.H Facturation

The React Native version of `facturation_frontend`. Work continues in this project only.

## Run the app

```sh
cd ~/Desktop/expo_projects/facturation_native
bun install --frozen-lockfile
# First checkout only, if .env does not exist:
cp -n .env.example .env
bun run ios
```

Use `bun run android` for Android or `bun run web` for browser preview. The scripts let Expo select its default port and prompt if it is busy. You can also choose a port explicitly with `bun x expo start --port 8083`.

`bun run ios` and `bun run android` build and open a local development client. This project uses native notifications, which Expo Go does not fully support. After the first build, use `bun run dev` to start Metro for that client. Rebuild the local app after changing native dependencies. No EAS project is required.

The native splash screen uses the existing Facturation logo, with light and dark backgrounds. It stays visible while Poppins, Material icons, the login logo and saved theme/language preferences load. Once the first app view has laid out, the splash closes. Resource or preference failures fall back to the existing UI instead of blocking launch. Session/API requests use the app's loading and retry screens after this local preparation.

`metro.config.ts` keeps Expo Asset's native imports connected directly to React Native. Uniwind 1.12 does not expose React Native 0.88's `AssetRegistry`; routing the asset loader through its wrapper would crash startup. App components still use Uniwind for Tailwind classes. No installed library is patched.

`babel.config.ts` omits ignored dependency arrays from `react-native-drawer-layout`'s native animation hooks. Drawer 4.2 still passes those web-only arguments, which produce warnings in Reanimated 4.7. Web code and app hooks are unchanged; the npm package is installed normally.

Splash appearance comes from the `expo-splash-screen` plugin in `app.json`. Rebuild the local app after changing it. Expo Go and development launch screens can differ from the final native splash; a JavaScript reload does not apply native splash configuration. See [Expo's splash-screen guide](https://docs.expo.dev/versions/v58.0.0/sdk/splash-screen/).

The app calls the existing Django backend. Start that backend separately and sign in with an existing account. On a new checkout, copy `.env.example` to `.env` before starting the app. Set `EXPO_PUBLIC_ROOT_API_URL` and `EXPO_PUBLIC_ROOT_WS_URL` for your device:

- iOS Simulator: `http://localhost:8000/api`
- Android emulator: `http://10.0.2.2:8000/api`
- Physical phone: your Mac's LAN address, with Django listening on the LAN and allowing that host.

Set `EXPO_PUBLIC_API_URL` to the same backend origin without `/api`. The staff-only Administration action uses it to open the existing Django administration site in the browser.

`EXPO_PUBLIC_` values are included in the app. Keep credentials and server secrets in Django.

Store API services retain the web endpoint-variable names with the `EXPO_PUBLIC_` prefix, for example `NEXT_PUBLIC_USERS_ROOT` becomes `EXPO_PUBLIC_USERS_ROOT`. Every migrated endpoint is configured in `.env.example` and declared in `env.d.ts`, following the web structure. Auth, services and Sagas read these variables directly; there are no hardcoded endpoint fallbacks. Fully reload the app after changing `.env`.

## What works, and where to find it

| In the app                                           | Source in this project                                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Login                                                | `src/app/login.tsx`                                                                            |
| Reset password, enter code, set password, completion | `src/app/reset-password/`                                                                      |
| Home skeleton after login                            | `src/app/(app)/index.tsx`                                                                      |
| Companies: list, details, create, edit, suspend      | `src/app/(app)/companies/`                                                                     |
| Users: list, details, create, edit, delete           | `src/app/(app)/users/`                                                                         |
| Profile and avatar                                   | `src/app/(app)/settings/edit-profile.tsx`                                                      |
| Change password                                      | `src/app/(app)/settings/password.tsx`                                                          |
| Notification preferences                             | `src/app/(app)/settings/notifications.tsx`                                                     |
| Compact menu, notification panel, logout             | `src/components/layouts/navigationBar/`                                                        |
| Dark mode and EN/FR flags                            | `src/components/shared/themeToggle/`, `languageSwitcher/`                                      |
| Automatic maintenance display                        | `src/components/shared/maintenance/`, `src/store/sagas/_initSaga.ts`, `wsSaga.ts`              |
| Local version check and update prompt                | `src/app/api/app-version+api.ts`, `src/utils/updateApp.ts`, `src/components/shared/appUpdate/` |

Open the menu to use these screens. Companies and users require staff access; user edit/delete actions also follow the backend role rules. Other original business destinations are placeholders for the modules you will merge later. There is no separate version or maintenance management page; Django controls those values.

Lists keep the complete cards. Search, filters and sorting go to Django. Use the sort button to choose a field and direction. Scrolling requests the next page of 10 records; pull-to-refresh starts again at page 1. Failed next-page requests keep the cards already loaded and offer Retry.

User selection covers the loaded cards, excluding your own account. Company “select all” collects every page matching the current server search and filters. Changing search, filters or sorting, or refreshing, clears selection. Delete and suspend actions require confirmation.

## Follow the web project

The existing names and folders remain the starting point for manual merging:

| Folder or file                                                | What belongs there                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/app`                                                     | Screens and Expo Router `_layout.tsx` navigation                    |
| `src/components/formikElements`                               | Form controls and API error/loading displays                        |
| `src/components/htmlElements`                                 | Buttons and modals, including image preview                         |
| `src/components/portals`                                      | Toast display                                                       |
| `src/contexts`, `src/providers`                               | `InitContext`, `InitEffects`, language, toast and application setup |
| `src/store`                                                   | Original actions, Sagas, slices, selectors and API services         |
| `src/models/classes.ts`, `src/types`                          | Data models and TypeScript definitions                              |
| `src/utils/formValidationSchemas.ts`                          | Zod schemas                                                         |
| `src/utils/hooks.ts`, `helpers.ts`, `rawData.ts`, `routes.ts` | Hooks, helpers, constants and route names                           |
| `src/local`                                                   | Generic key/value storage, analogous to the web cookie base         |
| `src/Storage`                                                 | Session and password-recovery storage built on that base            |
| `src/styles`, `src/translations`                              | Tailwind styles and the original FR/EN dictionaries                 |

Screen implementations live directly in route files. User and company forms are `src/app/(app)/users/form.tsx` and `src/app/(app)/companies/form.tsx`: open without an `id` to create, or pass an `id` to edit. The existing ADD/EDIT helpers in `utils/routes.ts` build those destinations. There are no separate import-only new/edit pages. Types and Zod validation stay outside components. Arrow functions are used; Redux Saga generators keep `function*`.

For the next module, copy its original types, models, schema, API service and Redux code into these same locations, then adapt the page markup. Register a new API's reducer/middleware in `store.ts` and clear its cache on logout. Keep Django's permission checks: hiding a button is not authorization.

## The necessary mobile differences

| Web                               | Native equivalent                                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Next.js routes and navigation     | Expo Router; named destinations remain in `utils/routes.ts`                                                    |
| NextAuth and server cookies       | Django JWT session in `auth.ts`, refresh/retry queuing through `axios-auth-refresh`, SecureStore on the device |
| MUI components and Sass           | Native controls, Material icons, Tailwind classes through Uniwind                                              |
| MUI Data Grid                     | Published `expo-flash-datagrid` filter models/helpers, app-owned controls and virtualized FlashList cards      |
| `react-cropper`                   | ImagePicker, CropZoom from `react-native-zoom-toolkit`, ImageManipulator and FileSystem                        |
| React Testing Library DOM / jsdom | React Native Testing Library and `jest-expo`                                                                   |
| Next build/analyser               | Expo export and Expo Atlas                                                                                     |
| Browser `Notification`            | Local notifications through `expo-notifications`, triggered by the same WebSocket events                       |

Session/recovery handling belongs in `src/Storage`, while `src/local` only exposes `getItem`, `setItem` and `removeItem`. Axios sends the bearer token; device storage does not send cookies automatically. Passwords are never stored. Theme/language preferences use AsyncStorage.

Native session operations return `{ success: true, data }` or `{ success: false, error }`. Sagas handle failed login/restore/logout results using the existing error and retry UI. Expired sessions clear authentication and notify `SessionExpiredListener`, which shows the existing toast. Axios still rejects failed HTTP requests as required by its refresh/retry library; API callers handle those rejections. There are no explicit `throw` statements in application source.

Logout clears the session, API caches and recovery email/code/completion state before reopening login. Storage or server failures use the existing logout warning.

The web's `src/app/api/cookies/route.ts` handles browser cookies on the Next.js server. Its mobile replacement, `src/local`, directly calls SecureStore on the device; the `.web.ts` implementation uses browser sessionStorage for preview. These are ordinary imported modules, not HTTP endpoints. They stay outside `src/app` because a `+api.ts` handler runs on a server and cannot access the phone's SecureStore. The generic storage base already contains its implementation directly, without a re-export wrapper.

Browser preview uses in-memory login tokens, so reloading returns to login. Recovery progress uses browser sessionStorage and expires after 24 hours or tab closure; Django still checks the code's own lifetime.

Initialization follows the web names: `InitEffects` sends `initAppSessionTokensAction`, its Saga updates `_init.initStateToken`, and `InitContextProvider` reads `getInitStateToken`. Token rotation sends the original `refreshAppTokenStatesAction` to `refreshAppTokenStatesSaga`; both paths reject stale sessions. The native session still owns SecureStore and token refresh; Redux mirrors the current session for components and clears it on logout. Foreground/background handling remains in `InitEffects`. The default-password redirect stays in the authenticated layout, after the navigator mounts.

The authenticated navigation bar requests OS notification permission, as on the web, and creates the Android notification channel first. When permission is granted, existing WebSocket events also display a system notification. In-app notifications still work if permission is denied. This uses the active local app connection; it does not add background push delivery or an EAS project.

Notification preferences require a successful initial load before editing or saving. A failed load shows the API error and Retry, so fallback values cannot overwrite saved preferences. A failed background refresh retains unsaved edits.

The local version flow also follows the web: Django announces `version` through maintenance HTTP/WebSocket data, then the update prompt checks `/api/app-version` before reloading. `src/app/api/app-version+api.ts` contains the `GET` handler directly, equivalent to the web's `src/app/api/app-version/route.ts`. On SDK 58, `web.output: "static"` with the Router plugin's `apiRoutes: true` preserves the previous rendering behavior and enables API routes. With Metro running, `curl http://localhost:8081/api/app-version` returns this native project's `package.json` version with `Cache-Control: no-store`. Expo resolves the same relative fetch URL from the simulator to Metro. The API does not return the Next.js project's version.

This reload flow is for local development and browser preview. A higher Django version only offers a reload when the local API reports that version or newer; otherwise an error toast keeps the current app open. Packaged mobile builds do not show this prompt because reloading an installed bundle does not install new code. Release distribution is outside the current local setup.

Image upload retains the original image separately from the PNG crop. Avatars use a square crop; company logos/stamps use the original 36:25 ratio. Preview, re-crop, remove and cancel remain available. Crop errors appear inline and as a toast.

Select fields expand their choices directly below the field. Autocomplete only adds search when there are more than five choices. Their implementations stay in `customDropDownSelect` and `customAutoCompleteSelect`; callers keep the same props and callbacks. Notifications use a compact React Native modal with an X, backdrop dismissal and Android Back support. Confirmation dialogs and maintenance retain their existing controlled dismissal, while lists retain FlashList and server-side queries.

`expo-flash-datagrid` is installed unchanged from npm. Its public column/filter/sort types and filter helpers are used by the app. `shared/paginatedDataGrid` owns the search/sort controls, card list and loading footer, using FlashList on devices and FlatList for browser preview. `shared/filterPanel/customFilterPanel.tsx` adapts the web filter panel with native form controls. Search, filters and sorting only change the server query when you press Apply. No local patch, fork, or modified package files are needed: run `bun install --frozen-lockfile` on another computer.

`tsconfig.json` uses `customConditions: []` so TypeScript reads published package declarations. Otherwise this library selects its original source, whose unused grid components reference an old React Native style API. Metro still selects native runtime entries; this setting changes type resolution only.

### Server and client components

In Next.js, a Server Component runs on the server and can read server cookies or secrets. A Client Component handles state and interaction on the device/browser.

This app uses ordinary Expo Router client screens. State, Formik and API hooks run in those screens; Django handles authentication, permissions and database operations. There is no need for a server page that only imports a separate client page, or for `'use client'` directives here.

Expo has an opt-in Server Components implementation, but full Server Component routes are experimental and are not enabled in this project. They require additional server infrastructure and have navigation limitations. See [Expo's Server Components documentation](https://docs.expo.dev/guides/server-components/).

For example, the web user detail page reads a session on the server and passes `id` into its client component. Here, `src/app/(app)/users/[id]/index.tsx` reads the route ID with `useLocalSearchParams`, validates it and calls `useGetUserQuery`. The authenticated layout and Redux state control access; Django validates the request.

## Commands and versions

| Command                                                         | Purpose                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| `bun run check`                                                 | TypeScript, ESLint and all Jest tests                              |
| `bun run typecheck`                                             | TypeScript 7.0.2                                                   |
| `bun run lint`                                                  | ESLint 10 with Expo rules                                          |
| `bun run format` / `bun run format:check`                       | Prettier                                                           |
| `bun run test` / `bun run test:watch` / `bun run test:coverage` | Tests and coverage                                                 |
| `bun run upgrade`                                               | `expo install --fix --bun`, aligning packages with the current SDK |
| `bun run upgrade:check`                                         | Check Expo SDK compatibility                                       |
| `bun run outdated`                                              | List available package versions without installing them            |
| `bun run doctor`                                                | Expo configuration/dependency checks                               |
| `bun run build`                                                 | Export JavaScript/assets for iOS, Android and web                  |
| `bun run build:ios` / `bun run build:android`                   | Export one platform                                                |
| `bun run debug`                                                 | Start Metro with a cleared cache                                   |
| `bun run analyse`                                               | Expo Atlas                                                         |

Use `bun run test` for Jest and `bun run upgrade` for Expo updates. Bare `bun test` runs Bun's own test runner; bare `bun upgrade` updates Bun itself.

Install packages with `bun x expo install <package> --bun`; add `--dev` for development tools. `bun run upgrade` aligns the current SDK rather than jumping to a new SDK major.

Use Bun 1.4.3 or newer. The project uses Expo 58.0.13, React 19.3 and React Native 0.88, aligned with Expo's compatibility check. Use Node 22.18+ in the 22.x line, 24.3+ in the 24.x line, or 26+. See the [SDK version matrix](https://docs.expo.dev/versions/v58.0.0/).

`bun run outdated` compares package ranges with registry releases; an update notice alone does not mean the installed version is old or compatible with Expo. Babel stays on the latest 7.x releases because the Expo preset still requires Babel 7. Babel 8 is a separate, incompatible major upgrade for this toolchain.

Like the web project, `@typescript/native` provides the TypeScript 7.0.2 compiler, while the `typescript` alias provides the legacy TypeScript 6 API for ESLint and IDE tooling. `bun run typecheck` calls the 7.0.2 compiler explicitly. ESLint 10 uses `@eslint/compat` for Expo's plugin rules. Use `bun run lint`, not Expo's lint wrapper, which does not discover this TypeScript config.

ESLint uses the same recommended React, React Hooks and TypeScript rules as the web, with Prettier. Expo environment checks replace Next.js and DOM rules. The requested native-only difference is `react-hooks/set-state-in-effect: 'error'`; the web configuration is unchanged. Neither arrow functions nor an array notation style is enforced.

Expo's SDK 58 version service still recommends Jest 29 and Metro 0.84. The [SDK 58 testing instructions](https://docs.expo.dev/develop/unit-testing/#migrate-tests-to-sdk-58) require Jest 30, and the installed `@expo/metro` 58 and React Native 0.88 packages use Metro 0.87.1. Those three development packages (`jest`, `@types/jest`, `metro`) are excluded from Expo's automatic alignment so `bun run upgrade` does not downgrade them. Their versions are checked through the test suite and platform exports.

Metro, Babel, ESLint and Jest configs are TypeScript files. Jest 30 uses `scripts/jest.ts` to load its config through jiti; run the package scripts instead of calling Jest directly. React Native Testing Library 14 uses `test-renderer` for React 19.3. Await renders, events and `act`, including Router's `renderRouter` helper.

Jest keeps the web project’s `spec`/`test` discovery and V8 coverage reports (`text-summary`, `lcov`, and Cobertura). The Expo preset and native mocks replace Next.js/jsdom. To skip coverage during a focused check, use `bun run test --coverage=false --runTestsByPath <test-file>`.

Route tests live in `src/__tests__/app` so Expo Router does not treat them as screens. Other tests sit beside their source files.

`bun run build` does not produce a signed IPA/APK. Store signing, release builds and updates are separate work. The app icons reuse the original web artwork; the largest source is 310px, so a high-resolution source is still needed before preparing store artwork.
