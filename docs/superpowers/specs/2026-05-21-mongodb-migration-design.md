# Design: Migrate Backend from AWS DynamoDB to MongoDB Atlas

- **Date:** 2026-05-21
- **Status:** Approved
- **Branch:** `migrate-to-mongodb`

## Context / Problem

The Tic-Tac-Toe backend (Express + Socket.IO) ran on AWS EC2 with AWS DynamoDB
as its data store. The AWS account has been **suspended for billing**, making
both the EC2 compute *and* the DynamoDB data inaccessible.

The app is being moved off AWS entirely:

- **Backend compute** → Render (a long-lived Node process, required for Socket.IO).
- **Database** → MongoDB Atlas free tier (M0), which needs no credit card and
  cannot surprise-bill the project offline.

This spec covers the **database migration only**. The Render deployment and the
later frontend deployment are tracked separately.

## Goals

- Replace all AWS DynamoDB access with MongoDB (native driver).
- Remove every AWS dependency from the backend.
- Keep all existing application behavior identical (API responses, socket events,
  game logic, chat, presence, stats).
- Be deployable on Render with no code dependency on AWS.

## Non-Goals (YAGNI)

- **Not** migrating existing AWS data — confirmed fresh start.
- **No** Mongoose / ODM / schema layer — native driver only.
- **No** automated test suite — manual smoke test only.
- **No** repository-pattern refactor — in-place swap, current file layout kept.
- **Not** deploying the frontend — separate later step.
- **Not** touching unrelated possibly-unused deps (`body-parser`, `node-fetch`).

## Decisions (from brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| Driver | Native `mongodb` driver | Maps ~1:1 to current imperative DynamoDB calls; fewest deps; matches existing code style. |
| Code structure | In-place swap | Smallest diff; keep current file layout. |
| Verification | Manual smoke test + `/test-db` health endpoint | Matches the current no-tests state; fastest path back online. |
| Existing data | Fresh start | AWS account suspended; data not recoverable without paying the bill. |

## Data Model

One database (`tictactoe`), three collections, same names as the DynamoDB tables:
**`users`**, **`games`**, **`messages`**.

### `_id` strategy

Reuse the existing application UUIDs as MongoDB's `_id`:

- `users._id`    = old `userID`
- `games._id`    = old `gameID`
- `messages._id` = old `messageID`

Each document **also keeps** its original `userID` / `gameID` / `messageID`
field. Consequences:

- Primary-key lookups use Mongo's free built-in unique `_id` index.
- Every existing `.userID` / `.gameID` / `.messageID` read in the code keeps
  working unchanged — minimal diff.

### Indexes

Created once on startup (`ensureIndexes()` in `config/db.js`):

- `users`  — `_id` only (small collection, looked up by id, otherwise full scan).
- `games`  — `_id` only (written on create, updated on end, never queried).
- `messages` — `{ messageType: 1 }` and `{ senderId: 1, receiverId: 1 }`
  (chat history is queried by these).

## Connection Handling — `config/db.js` (full rewrite)

- A single shared `MongoClient` built from `config.mongodb.uri`.
- `connectDB()` — connects once, caches and returns the `db` handle.
- `getDB()` — returns the connected handle; throws if called before connect.
- `ensureIndexes()` — creates the `messages` indexes (idempotent).
- Exports: `connectDB`, `getDB`, `ensureIndexes`, `client`.

Call sites obtain the handle at call time: `const db = getDB();`.

## Operation Mapping

| DynamoDB (current) | MongoDB (target) |
|---|---|
| `GetCommand {Key:{userID}}` | `collection.findOne({ _id })` |
| `PutCommand {Item}` | `collection.insertOne({ _id, ...item })` |
| `ScanCommand {TableName}` | `collection.find({}).toArray()` |
| `ScanCommand` + `ProjectionExpression` | `find({}, { projection }).toArray()` |
| `ScanCommand` + `FilterExpression` | `find({ <filter> }).toArray()` |
| `UpdateCommand SET` | `updateOne({ _id }, { $set })` |
| `UpdateCommand ADD :1` | `updateOne({ _id }, { $inc: { field: 1 } })` |
| `UpdateCommand SET x=if_not_exists(x,0)+v` | `updateOne({ _id }, { $inc: { x: v } })` — `$inc` treats missing as 0 |
| `UpdateCommand` returning `Attributes` | `findOneAndUpdate(..., { returnDocument: 'after' })` |
| `DeleteCommand` | `deleteOne({ _id })` / `deleteMany(...)` |

**Benign behavior change:** endpoints that returned only *changed* attributes
(DynamoDB `UPDATED_NEW`) will now return the **full document** — a harmless
superset the frontend ignores.

**Small improvement (in scope):** message-history queries gain
`.sort({ timestamp: 1 })` so chat renders in chronological order (DynamoDB scans
returned unordered results).

## File-by-File Changes (13 files)

1. **`backend/package.json`** — remove `@aws-sdk/client-dynamodb`,
   `@aws-sdk/lib-dynamodb`, `aws-sdk`; add `mongodb`, `uuid`
   (`uuid` is currently `require`'d in 3 files but only resolved transitively
   via `aws-sdk` — it must be declared explicitly once `aws-sdk` is removed).
2. **`backend/src/config/index.js`** — remove `aws` block; add
   `mongodb: { uri: MONGODB_URI, dbName: MONGODB_DB_NAME || 'tictactoe' }`;
   keep `port` and `corsOptions`.
3. **`backend/src/config/db.js`** — full rewrite (see Connection Handling).
4. **`backend/src/server.js`** — drop DynamoDB imports; wrap startup in an async
   `start()`: `await connectDB()` → `ensureIndexes()` → initial cleanup →
   `server.listen()`. Keep the 10-minute cleanup `setInterval`. Replace the
   `/test-aws` route with `/test-db` (pings MongoDB).
5. **`backend/src/services/userService.js`** — `updateUserStats` →
   `findOneAndUpdate` + `$inc`; `getUserProfile` → `findOne`.
6. **`backend/src/services/cleanupService.js`** — `find` the users collection;
   delete docs whose `username` is missing/empty/whitespace
   (`deleteMany` with an equivalent `$or` query); drop manual scan pagination.
7. **`backend/src/controllers/userController.js`** — `getAllUsers` → `find`+projection;
   `updateGameStatus` → `findOneAndUpdate`+`$set`; `getUserById` → `findOne`;
   `updatePresence` → `findOneAndUpdate` with dynamic `$set`.
8. **`backend/src/controllers/authController.js`** — `registerOrLoginUser` →
   `insertOne({ _id: userId, userID: userId, ... })`.
9. **`backend/src/routes/userStatsRoutes.js`** — rewrite from AWS SDK **v2** to
   the MongoDB driver; `findOne({ _id: userId })` → return `{ wins, losses, draws }`.
10. **`backend/src/socket/index.js`** — `setUserOnlineStatus` → `updateOne`+`$set`.
11. **`backend/src/socket/handlers/chatHandler.js`** — `saveMessageToDB` →
    `insertOne`; `fetchPublicMessages` / `fetchPrivateMessages` → `find`+`sort`.
12. **`backend/src/socket/handlers/userHandler.js`** — `setUserOnlineStatus` →
    `updateOne`; `getAllUsersFromDB` → `find().toArray()`.
13. **`backend/src/socket/handlers/gameHandler.js`** — `updateGameInDB` →
    `updateOne`/`findOneAndUpdate` with dynamic `$set`; `createNewGame` →
    `insertOne`; inline `updatePlayerStats` → `updateOne`+`$inc`.

**`render.yaml`** (repo root) — remove the 6 `AWS_*` / `DYNAMODB_*` env vars;
add `MONGODB_URI` (secret) and `MONGODB_DB_NAME` (optional); keep `FRONTEND_URL`.

The `christopher` AI special-casing and all pure game logic in `gameService.js`
are unaffected (no DB access).

## Environment Variables

| Variable | Notes |
|---|---|
| `MONGODB_URI` | Atlas connection string (secret) — entered in Render dashboard. |
| `MONGODB_DB_NAME` | Optional; defaults to `tictactoe`. |
| `FRONTEND_URL` | CORS origin; set once the frontend is deployed. |
| `PORT` | Injected automatically by Render — never set manually. |

Removed: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
`DYNAMODB_USERS_TABLE`, `DYNAMODB_GAMES_TABLE`, `DYNAMODB_MESSAGES_TABLE`.

## Verification Plan

1. **Local:** run the backend against a local MongoDB (Docker) and hit `/health`
   and `/test-db`.
2. **Smoke checklist** (local, then again after Render deploy):
   - Register a name → user created.
   - User appears in the user list with correct presence.
   - Public chat: send + receive, history loads in order.
   - Private chat: send + receive between two users.
   - Challenge another human → play a full game.
   - Challenge Christopher (AI) → play a full game.
   - Win / loss / draw → stats increment correctly.
   - Let the 10-second move timer expire → timeout result fires.

## Deployment Plan (after migration code is verified)

1. Push the `migrate-to-mongodb` branch; merge to `master`.
2. **User:** create MongoDB Atlas M0 cluster, DB user, network access
   (`0.0.0.0/0` — Render free-tier egress IPs are not static; the connection is
   still protected by credentials + TLS). Copy the connection string.
3. **User:** create the Render service from `render.yaml` (Blueprint), connect
   the GitHub repo, paste `MONGODB_URI`.
4. Verify `/health` + `/test-db` on the live Render URL; run the smoke checklist.

## Division of Labor

- **Claude:** all code changes, `render.yaml`, commit & push, local verification
  against a Docker MongoDB.
- **User:** create the Atlas cluster (signup/captcha not automatable; password is
  a user-held secret), connect the GitHub repo to Render (browser OAuth), paste
  the `MONGODB_URI` secret into Render. No credentials are shared with Claude;
  the code only reads secrets from environment variables.
