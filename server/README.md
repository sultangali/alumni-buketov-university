# Alumni Hall of Fame — Backend

Node + Express + TypeScript + MongoDB (Mongoose) backend for the alumni
"Hall of Fame" kiosk app. Serves the content datasets, staff auth,
public submissions, and media uploads.

## Requirements

- Node 18+
- A running MongoDB (default `mongodb://127.0.0.1:27017/alumni`)

## Setup

```bash
cd server
npm install
cp .env.example .env   # optional; defaults work for local dev
```

## Run a local MongoDB (dev)

```bash
mkdir -p /tmp/mongo-alumni
mongod --dbpath /tmp/mongo-alumni --port 27017 --bind_ip 127.0.0.1
```

## Seed the database

```bash
npm run seed
```

Wipes and inserts: 15 faculties, 26 people (9 alumni, 6 teachers,
6 laureates, 5 veterans), teacher refs, audit + moderator rows, and two
staff users:

- `admin` / `admin123` (role `admin`)
- `moderator` / `moder123` (role `moderator`, fac `mit`)

## Develop / build / start

```bash
npm run dev     # tsx watch
npm run build   # tsc -> dist/
npm start       # node dist/index.js
```

Server listens on `http://127.0.0.1:4000`.

## Environment

| var          | default                                | purpose                |
| ------------ | -------------------------------------- | ---------------------- |
| `PORT`       | `4000`                                 | HTTP port              |
| `MONGO_URI`  | `mongodb://127.0.0.1:27017/alumni`     | MongoDB connection     |
| `JWT_SECRET` | `dev-secret-change-me`                 | JWT signing secret     |

## API

All routes under `/api`.

### Content (public)

- `GET /api/bootstrap` — `{ faculties, alumni, teach, teachers, laureates, veterans }` (hydrates the whole frontend)
- `GET /api/faculties`
- `GET /api/faculties/:id`
- `GET /api/faculties/:id/alumni`
- `GET /api/people/:id`
- `GET /api/collections/:kind` — `kind` ∈ `teacher | laureate | veteran`
- `GET /api/feat` — featured alumni

### Auth

- `POST /api/auth/login` — `{ username, password }` → `{ token, role, username, fac? }` (JWT, 12h)

### Submissions

- `POST /api/submissions` — public; creates with `status: 'review'`
- `GET /api/submissions` — auth; newest first
- `PATCH /api/submissions/:id` — auth; `{ action: 'approve' | 'reject' }`

### Media

- `POST /api/media` — public; multipart `file` (image/* or video/*, ≤25MB) → `{ url, name, kind }`
- `GET /media/<filename>` — static file serving

Authenticated routes expect `Authorization: Bearer <jwt>`.
