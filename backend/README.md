# MCU Knowledge Base API

REST API foundation for authentication, systems, categories, users, announcements, notifications, visits, and analytics.

Configure `.env`, then run `npm install && npm run dev`.

## Running the API

Use `npm run dev` only for local development. The watch process automatically
restarts the API when source files change, so do not start it in a second terminal.

For production, use `npm start` behind a reverse proxy and run exactly one process
manager service for each configured port. A process manager such as PM2, systemd,
or the hosting platform should restart the service after a genuine failure. If
multiple application instances are required, place them behind a load balancer and
assign a separate port to each instance. Never make the API silently select a random
port because the frontend and Microsoft Entra callback require a stable API URL.

An `EADDRINUSE` startup message means another process is already listening on the
configured `PORT`; it does not indicate a database or API-route failure.

No database schema, migrations, or existing website data are bundled with this project. Define the new website's data model before enabling the database-backed endpoints.

## Document API

`POST /api/documents/upload` accepts multipart form data using the `file` field plus `title`, `department`, `description`, `tags`, `visibility`, `allowed_role_ids`, and `allowed_departments`. Uploading requires Admin or Super admin access. New documents and replacement versions start as `pending`.

Document metadata, versions, approval status, and access rules are stored in MySQL. Original files use randomized names in protected storage and are served only through `GET /api/documents/:id/download`, which performs authorization again.

Visibility rules are: `public` for every authenticated active account, `internal` for users whose department matches the owning department, and `restricted` for explicitly listed role IDs or departments. Admin and Super admin can review all documents. Only published documents appear to normal users and chatbot search.

Main endpoints:

- `GET /api/documents/search?q=...` — permission-filtered document search.
- `GET /api/documents/admin` — administrative document list.
- `POST /api/documents/upload` — upload a new pending document.
- `POST /api/documents/:id/versions` — upload a replacement version and return it to pending approval.
- `PATCH /api/documents/:id/status` — publish, reject, archive, or return a document to pending.
- `PATCH /api/documents/:id/access` — update visibility and role/department access rules.
- `GET /api/documents/:id/download` — authorized download.
- `DELETE /api/documents/:id` — Super admin deletion.

## Authentication

All `/api` endpoints require an authenticated session, except the Microsoft login/callback flow and the deployment `/health` check. This project uses Microsoft-only authentication because the `users` table does not store local passwords. A JWT is issued only after Microsoft Entra ID authentication succeeds and the MySQL account is active.

Microsoft sign-in uses the authorization-code flow with `User.Read`. The callback retrieves `/me` from Microsoft Graph, finds the MySQL account by email, updates its Microsoft profile or creates it with Student role ID `3`, and stores the resulting JWT in the HTTP-only `mcu_session` cookie. The JWT is never placed in a redirect URL or browser storage.

Run `database/migrations/20260810_create_roles_and_assign_users.sql` after creating the new `users` table. Role ID `1` is Super admin and role ID `2` is Admin. Accounts with a `NULL` role can sign in and use authenticated knowledge-base features, but both the API and React route guard deny access to the admin dashboard.

All API responses use `{ data }` for resources or `{ message }` for status. Protected routes require `Authorization: Bearer <JWT>`; admin mutations also require an `admin` or `super_admin` role.
