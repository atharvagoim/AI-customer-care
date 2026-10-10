# AI Customer Care

AI-first customer support in **one app**: the AI answers every customer automatically, and the
admin can watch any chat live, take it over, and hand it back to the AI at any time.

One folder · one `npm install` · one command · one port. No separate client/server, no CORS, no
API URL to configure.

| URL | Who | What |
|---|---|---|
| `/` | Customer | "Need help ?" — **New chat** / **Previous chat** |
| `/chat`, `/chat/:id` | Customer | Chat (AI, or a human once one takes over) |
| `/admin` | Admin | Password screen |
| `/admin/dashboard` | Admin | Stats, charts, tickets |
| `/admin/chats` | Admin | Live inbox: watch, take over, AI-draft replies, hand back to AI |

---

## Run it

Needs **Node 20.19+** (22 recommended) and **MongoDB** (free Atlas cluster or local).

```bash
cp .env.example .env     # fill in DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD (+ OPENROUTER_API_KEY)
npm install
npm run seed             # optional demo data
npm run dev              # → http://localhost:3000   (admin: /admin)
```

`npm run dev` runs the backend with the frontend's hot reload built in — edit any file in `src/`
or `server/` and it updates.

**Production:**

```bash
npm run build && npm start
```

Deploy as a single Node web service (Render, Railway, Fly.io, a VPS…):
build command `npm install && npm run build`, start command `npm start`, and set the `.env`
variables in the host's settings. The host must support websockets (all of those do).

### `.env`

| Variable | |
|---|---|
| `DATABASE_URL` | **required** — MongoDB connection string |
| `JWT_SECRET` | **required** — 32+ random characters: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ADMIN_PASSWORD` | password for `/admin` (10+ characters required in production) |
| `OPENROUTER_API_KEY` | AI key from https://openrouter.ai/keys (without it the AI sends a polite fallback) |
| `OPENROUTER_MODEL` | default `openai/gpt-4o-mini` |
| `PORT` | default `3000` |
| `ADMIN_SESSION_HOURS` | how long an admin stays signed in, default `12` |
| `TRUST_PROXY` | number of proxies in front (default `1` in production) — needed for correct rate limiting |

The app refuses to start with a missing/weak `JWT_SECRET` or (in production) a short `ADMIN_PASSWORD`.

---

## How AI ↔ manual works

- **AI autopilot** (switch on the Chats page): new chats are answered by the AI, or wait for a human.
- **Per-chat switch** ("AI replying" / "You're replying") flips any chat between AI and manual.
- **Typing a reply takes over automatically** — the AI goes silent in that chat and the customer sees
  "A support agent has joined the chat". Messages arrive instantly both ways.
- **AI draft** button in the admin reply box: the AI drafts a reply for you to edit before sending.
- **Customer "+ → Talk to a human"**: creates a ticket, switches the chat to manual, and it pops up in
  the inbox with an unread badge.
- If the AI itself decides a human is needed, it opens an escalation ticket.

---

## Security

- **No tokens in the browser.** Admin sessions and visitor identity are `httpOnly` cookies that page
  JavaScript can't read, so an XSS bug can't steal a session. In production they're `Secure` and
  `__Host-` prefixed.
- **Admin session**: short-lived (12h default), `SameSite=Strict`, and tied to the current password —
  changing `ADMIN_PASSWORD` signs every admin out. Password check is constant-time; 8 failed attempts
  lock that IP out for 15 minutes.
- **Visitors** get a random id in an HMAC-signed cookie. Each browser can open only its own chats;
  forged cookies and other people's chat ids return 404. The id is never sent back in any response.
- **CSRF**: every write must come from this site's origin **and** carry a custom header (on top of
  SameSite cookies). The live-chat socket rejects handshakes from other origins (blocks cross-site
  WebSocket hijacking).
- **Headers** (Helmet): strict Content-Security-Policy in production (only this site's scripts),
  no framing, `nosniff`, HSTS, same-origin referrer.
- **Input**: 16 KB request limit, 2,000-character messages, enum-validated filters, regex-escaped
  search, ObjectId validation (no NoSQL operator injection), tiny socket payload limit and throttled
  socket events.
- **Rate limits**: 300 req/min per IP overall, 15 AI messages/min per visitor, AI drafts limited.
- **Smaller attack surface** than before: removed open customer signup/login, the seeded demo admin
  accounts with a published password, the unauthenticated ticket-creation endpoint, unused FAQ admin
  routes, and the old CORS rule that trusted *any* `*.vercel.app` site.
- Errors are generic for clients; details stay in server logs. No source maps shipped.

## Performance

- One process serves everything; responses are gzip-compressed.
- Built assets have hashed names and are cached for a year (`immutable`); the HTML is never stale.
- Code splitting: customers never download the admin/chart code; vendor libraries are in separate,
  long-cached chunks.
- Database indexes for every list and filter used (inbox, previous chats, messages, tickets).
- AI context and message history queries are bounded (latest messages only), so long chats stay
  fast and cheap; one AI call returns both the reply and its classification.
- Settings are cached in memory; live updates go only to the people viewing that chat plus admins.

---

## Project layout

```
server/
  index.js                 app entry — API, live chat, website (Vite in dev, /dist in prod)
  config/                  env validation, MongoDB connection
  middleware/              session cookies, CSRF + security headers, rate limits, errors
  routes/                  auth, chat (customer), admin, tickets
  services/                AI (OpenRouter), conversation logic (AI reply, takeover, escalation)
  realtime/                Socket.IO rooms & events
  models/                  Conversation, Message, Ticket, FAQ, Setting
  prompts/                 AI system prompt
  seed.js                  demo data
src/                       React app (pages/, admin/, components/, lib/, api/)
index.html, vite.config.js, tailwind.config.js
```

## API

All under `/api`. Writes require the `X-Requested-With: fetch` header (the app sends it).

| Method | Route | Who | |
|---|---|---|---|
| POST | `/auth/admin` | — | `{ password }` → sets admin cookie |
| POST | `/auth/admin/logout` | — | clears it |
| GET | `/auth/admin/me` | — | `{ admin: true/false }` |
| GET | `/chat/conversations` | visitor | this browser's chats |
| POST | `/chat` | visitor | send a message (creates the chat on the first one) |
| GET | `/chat/:id` | visitor | own chat + messages |
| POST | `/chat/:id/escalate` | visitor | talk to a human |
| GET | `/admin/dashboard` | admin | stats |
| GET/PUT | `/admin/settings` | admin | `{ aiAutopilot }` |
| GET | `/admin/conversations` | admin | inbox (`?mode=ai|human&status=&search=`) |
| GET/PATCH | `/admin/conversations/:id` | admin | read / `{ aiEnabled, status }` |
| POST | `/admin/conversations/:id/messages` | admin | manual reply (takes over) |
| POST | `/admin/conversations/:id/suggest` | admin | AI draft |
| GET / PUT | `/tickets`, `/tickets/:id` | admin | list (filters, paging) / update |
