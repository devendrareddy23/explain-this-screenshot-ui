# Copilot Instructions for explain-this-screenshot-ui

## 1) Project purpose and architecture
- Single-page React app (Vite) implementing resume tailoring, cover letter generation, job search, saved jobs, and auto-apply features.
- Main UI in `src/App.jsx`; heavy feature logic split into `src/components/JobsTab.jsx` and `src/components/AutoApplyPanel.jsx`.
- API client in `src/utils/api.js`; backend base URL in `src/config.js` (`VITE_API_BASE_URL || http://localhost:8000`).
- Forms and actions are managed with `useState` + `useEffect`; no external state library.

## 2) API flow and endpoints
- Auth bootstrap: `GET /api/auth/me` (via `apiRequest` in App bootstrap).
- Resume: `POST /api/resume-tailor` expects `{ resumeText, jobDescription }`.
- Cover letter: `POST /api/cover-letter` expects `{ resumeText, jobDescription, companyName, jobTitle }`.
- Jobs search + persistence: `POST /api/jobs/search`, `POST /api/jobs/save`, `GET /api/jobs/stored`, `PATCH /api/jobs/:id/applied`, `PATCH /api/jobs/:id/skip`.
- Auto apply: `GET /api/auto-apply/me`, `POST /api/auto-apply/me`, `PATCH /api/auto-apply/me/toggle`, `POST /api/auto-apply/me/run-now` (Pro feature gating in `AutoApplyPanel.jsx`).

## 3) Developer workflow
- Local install: `npm install`
- Run: `npm run dev` (Vite dev server); web app on default `localhost:5173`.
- Build: `npm run build`.
- Preview build: `npm run preview`.
- Lint: `npm run lint`.

## 4) Project-specific conventions
- API errors are surfaced via: `throw new Error(data.message || 'Request failed.')` in `src/utils/api.js` and `catch` branches in component handlers.
- Token lookup uses localStorage key `token`, else `VITE_DEV_TOKEN` in `.env` (use for local backend bypass).
- Resume text auto-saved to `localStorage.savedResumeText`; bootstraps from backend user profile if absent.
- Usage of maximum 1 API status set (e.g., `resumeLoading`, `resumeError`) per feature in `src/App.jsx`.

## 5) Enhancement focus / safe change zones
- `App.jsx` contains many UI/UX states; for new features prefer adding separate component files and `apiRequest` paths.
- Keep `apiRequest` header strategy consistent; if adding new endpoints don't bypass `.utils/api.js`.
- For new Pro feature gating, follow `AutoApplyPanel` pattern: guard by token and `user.plan === 'pro'`.

## 6) Check before commit (codebase got no tests yet)
- verify `src/App.jsx`, `src/components/JobsTab.jsx`, `src/components/AutoApplyPanel.jsx` have 200+ lines; prefer modular extract for new logic.
- validate env variable usage: `VITE_API_BASE_URL`, `VITE_DEV_TOKEN`, and localStorage keys.
- run `npm run lint` before push.

> After generating or modifying features, confirm end-to-end with live backend stubs because many endpoints are external and may return various payload shapes.