
# 🧩 Backend Interview Challenge — Offline Task Sync API

## Overview

This project implements a **backend API** for a personal task management application that supports **offline-first functionality**.
Users can create, update, and delete tasks while offline, and these changes automatically **sync** once connectivity is restored.

---

## 🧠 Approach to the Sync Problem

1. **Offline-first design**

   * All operations (create/update/delete) are applied locally in SQLite.
   * Each operation is recorded in a `sync_queue` table with operation type and task data.

2. **Sync mechanism**

   * When connectivity is restored, the `SyncService` processes queued operations in **batches**.
   * Sync attempts update `sync_status` (`pending`, `synced`, `error`).
   * Failed syncs are retried up to 3 times before marking as `error`.

3. **Conflict resolution**

   * Implemented a **Last-Write-Wins** policy using the `updated_at` timestamp.
   * The most recent task version always overwrites older ones, ensuring consistency across devices.

4. **Soft deletes**

   * Tasks are never permanently removed. Instead, `is_deleted` is set to `true`, ensuring no data loss during sync conflicts.

5. **Error handling and resilience**

   * All network and database operations are wrapped in try/catch.
   * Sync failures never crash the app — they are retried later.

---

## 📌 Assumptions

* Users can perform operations offline; once online, all pending changes are sent to the server.
* Sync API endpoint (`POST /api/sync`) exists and can handle batch operations.
* SQLite is used for local persistence (as per challenge requirement).
* Environment variable `SYNC_BATCH_SIZE` controls batch size (default: 50).
* The app runs in a single-user mode (no multi-user auth scope needed).

---

## ⚙️ How to Run Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Run development server

```bash
npm run dev
```

*(Ensure `.env` file exists if required for configuration variables)*

### 3. Run all tests

```bash
npx vitest run
```

### 4. Run individual test files

```bash
npx vitest run tests/taskService.test.ts
npx vitest run tests/syncService.test.ts
npx vitest run tests/integration.test.ts
```

All tests should pass ✅

---

## 🧪 Test Coverage

| Module                | Description                                        | Status   |
| --------------------- | -------------------------------------------------- | -------- |
| **TaskService**       | CRUD operations + queue tracking                   | ✅ Passed |
| **SyncService**       | Connectivity, batching, retry, conflict resolution | ✅ Passed |
| **Integration Tests** | Offline-to-online sync flow                        | ✅ Passed |

---

## 🏁 Result

All tests successfully pass — confirming that the system correctly supports **offline task management**, **sync orchestration**, and **data integrity** during connectivity transitions.

