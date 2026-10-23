# Integration notes

Working notes for the `feature/api-integration` branch (see `API_INTEGRATION_WALKTHROUGH.md`, Part C).

## Phase 1 – Inventory (2026-10-23)

### Summary

The repository does not match the "current state" described in the walkthrough (Part A):

1. **The pages are not plain HTML.** Every `site/*.html` file is a self-unpacking export from a
   design-canvas tool. Each file is about 310–330 KB and contains:
   - a loader script that runs on `DOMContentLoaded`, decodes a gzipped/base64 manifest, and
     **replaces the whole document** (`document.documentElement.replaceWith(...)`) with a template;
   - an embedded copy of React 18.3.1 + ReactDOM (UMD) and a ~45 KB "DC" runtime;
   - 11 embedded IBM Plex woff2 fonts;
   - the real page markup inside a JSON-escaped `<script type="__bundler/template">`, written in
     the tool's template language (`<x-dc>`, `<sc-for list="{{rows}}">`, `{{r.name}}`,
     `sc-camel-on-click`, `<sc-raw-table>`), with page logic in a `class Component extends DCLogic`.
2. **The page scripts are empty.** `site/js/Intake.js`, `Job.js`, `Login.js`, `Main.js`,
   `Phone.js`, `Saved.js` and `index.js` are all 0 bytes. There are no "expected IDs" comment
   blocks to compare against.
3. **No element in any page has an `id` or `name`.** Forms have no submit buttons (the "Sign in"
   and "Register device" controls are `<a href>` links to the next mock page).
4. **The module script tags would not work even if the scripts existed.** The
   `<script type="module" src="/js/…">` tag sits in the outer wrapper, outside the template. The
   loader throws the wrapper away when it swaps in the template, and React then renders and
   re-renders the DOM, so DOM changes made by an outside script would be lost.
5. **A real `.env` is committed** (`site/.env`, added in commit `2f2d4b0`). It is also inside
   `site.zip`. It holds the live API URL, user pool ID and app client ID.

### Pages

| File | Purpose (from content) | Walkthrough name | Title | Script tag in wrapper | Hard-coded sample data |
|---|---|---|---|---|---|
| `site/index.html` | **Login** (byte-identical template to `Login.dc.html`) | `index.html` = dashboard | Staff login | `/js/dashboard.js` (missing) **and** `/js/index.js` (empty) | — |
| `site/Login.dc.html` | Login | `login.html` | Staff login | `/js/login.js` (wrong case; file is `Login.js`, so it 404s on Linux/S3) | Placeholder `you@etcomputers.ng` only |
| `site/Main.dc.html` | Dashboard | `index.html` | Dashboard | `/js/Main.js` | 8 fake jobs (`ETC-0042`–`ETC-0049`, names, masked phones, faults, dates), counts derived from them, date "Thursday, 8 October 2026", "[Technician name]" / "Admin" |
| `site/Intake.dc.html` | New intake | `intake.html` | New intake | `/js/Intake.js` | Arrival "8 Oct 2026, 23:42"; preselected condition (screen No display, battery Weak, body Scratches) and accessories (Charger, Bag); example `ETC-0050` |
| `site/JobDetail.dc.html` | Job detail | `job.html` | Job ETC-0049 | `/js/Main.js` (**wrong**: dashboard script) | Whole job ETC-0049 (Adaeze Okafor, phone, email, device, fault, diagnosis, specs, accessories, notes, promised 2026-10-10, 4 photos, 4 history entries) |
| `site/Phone.dc.html` | Photos (phone, 390 px) | `photos.html` | Photos for ETC-0050 | `/js/Phone.js` | ETC-0050 job card, "Uploaded · 3", fake 62% upload progress, "Compressed from 4.1 MB to 380 KB" |
| `site/Saved.dc.html` | "Device registered" confirmation | *(none; plan uses `job.html?new=1`)* | Intake saved | `/js/Saved.js` | ETC-0050 summary, "Customer notified · SMS sent… Email sent…", **fake QR** (pseudo-random 21×21 grid), `[your-domain]/jobs/ETC-0050/photos` |

Inline scripts on every page: the bundler loader, the embedded runtime/React, and one
`text/x-dc` component script (holding the mock data listed above).

### Page scripts vs HTML

None of the scripts the walkthrough describes exists with content, so the comparison is between
what the walkthrough's tasks need and what the markup provides:

| Page | What the tasks need | What the markup has |
|---|---|---|
| Login | form submit, email/password fields, error area | `<form>` without `id`; inputs with no `id`/`name`; "Sign in" is `<a href="Main.dc.html">`, not a submit button; no error area |
| Dashboard | count elements, filter buttons, table body, search form, load-more, `#error`, loading state | counts/filters/rows rendered by `sc-for` from mock arrays; search `<input type="search">` not inside a form, no `name`; no load-more, error or loading elements; row links all go to `JobDetail.dc.html` |
| Intake | inputs with `name`s, code values on radios/checkboxes, `required`, submit | text inputs with no `name`; device type, condition and accessories are `<button>` pills with **labels** as state, not form controls with code values; no `required` attributes ("*" in label text only); "Register device" is a link; no `<form>` element at all |
| Job detail | fields to fill, status control, date, diagnosis, save, history, QR canvas, `#error` | all values hard-coded; status pills are buttons bound to component state; Save is `type="button"` with no handler; photos grid is mock; no QR element |
| Photos | ticket/device/customer fields, disabled upload button | hard-coded values; "Take photo" button active; mock progress bar and thumbnails |
| Saved | *(not in plan)* | duplicates what the plan puts on `job.html?new=1` |

Nav/link mismatches: sidebar "All jobs" points at `JobDetail.dc.html`; "Log out" is a plain link
to `Login.dc.html` (does not sign out); links use `*.dc.html` names, the plan uses
`index/login/intake/job/photos.html`.

### Copy that conflicts with the walkthrough

Notifications are not built (Part E3), but the designs say they are:
- Intake sidebar: "Customer gets an SMS (and email, if given)…"; phone hint "SMS updates go to this number"; email hint "If given, email updates are sent too".
- Job detail: "Changing this date sends the customer an SMS with the new date."; Completed note "Saving sends the customer an SMS (and email)…"; history entries "· SMS sent".
- Saved page: "Customer notified · SMS sent to … · Email sent to …".
- Saved page shows a fake QR and a URL format (`/jobs/ETC-0050/photos`) that differs from the plan (`/photos.html?ticket=`).

### `js/auth.js` vs contract (C.3)

| Requirement | State |
|---|---|
| Configures Amplify from `import.meta.env` | Yes (`VITE_USER_POOL_ID`, `VITE_USER_POOL_CLIENT_ID`) |
| Exports `login`, `logout`, `requireLogin`, `api` | Yes, all four |
| `api()` error carries `err.status` and server `message` | No: `new Error(data.message)` only |
| Non-JSON error body / network failure | Not handled (`res.json()` throws a SyntaxError; `fetch` TypeError propagates) |
| 401 → login and stop | Redirects but `return`s `undefined`, so callers continue with no data |
| `requireLogin` stops the page | Redirects but resolves normally, so the page keeps running |
| `CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED` | Not handled; `login` silently does nothing |
| Already-signed-in on login | Not handled (`signIn` throws `UserAlreadyAuthenticatedException`) |
| Redirect targets | `/login.html`, `/index.html`, which don't exist with the current file names |
| Missing ID token | Sends `Bearer undefined` |
| `Content-Type` header | Always set, also overwrites any caller `headers` |

### Tooling files

| File | State |
|---|---|
| `package.json` (repo root) | Exists. `aws-amplify ^6.22.2`, `vite ^8.3.4`. Has `dev`/`build`, **no `preview`**. `"type": "commonjs"`. `description` contains garbled UTF-16 text. No `qrcode`. |
| `package-lock.json` | Exists. `node_modules/` not installed. |
| `vite.config.js` | In `site/`, but `package.json` is at the repo root, so `npm run dev` from the root would not find it. Inputs reference **non-existent** files `login.dc.html` and `Job.dc.html` (actual: `Login.dc.html`, `JobDetail.dc.html`). No `build.target`. |
| `.gitignore` | Exists, contains only `node_modules`. Missing `dist/`, `.env`, `.env.*`, `!.env.example`, `.DS_Store`. |
| `.env.example` | **Missing.** |
| `site/.env` | **Committed** (should be removed from git and the values rotated if considered sensitive). Uses `KEY = value` with spaces around `=`. |
| `README.md` | UTF-16 LE with CRLF; contains only the title. |
| `site.zip` | Older copy of the whole `site/` folder (CRLF line endings), including `.env`. |

Environment: Node v22.23.1, npm 10.9.8.
