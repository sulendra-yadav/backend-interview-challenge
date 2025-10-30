# Backend Developer Interview Challenge: Task Sync API

## Overview

You are tasked with implementing a backend API for a personal task management application that supports offline functionality. The app allows users to create, update, and delete tasks while offline, and then sync these changes when they come back online.

This challenge evaluates your understanding of:
- REST API design
- Data synchronization concepts
- Database operations
- Error handling
- Offline-first architecture
- Conflict resolution

## Scenario

You're building the backend for a personal productivity app used by individuals in India. Users often work in areas with intermittent internet connectivity (trains, remote areas, etc.). They need to:

1. Create and manage tasks offline
2. Have their changes automatically sync when they reconnect
3. Access their tasks from multiple devices
4. Never lose data due to connectivity issues

## Core Requirements

### 1. Task Management API

Implement the following endpoints:

- `GET /api/tasks` - Get all non-deleted tasks
- `GET /api/tasks/:id` - Get a specific task
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update an existing task
- `DELETE /api/tasks/:id` - Soft delete a task

### 2. Sync Functionality

Implement the sync service that:

- Tracks which tasks need to be synced (created/updated/deleted offline)
- Queues sync operations when offline
- Processes the sync queue when online
- Handles conflicts using a "last-write-wins" strategy
- Provides feedback on sync status

### 3. Data Model

Each task should have:
- `id` - Unique identifier (UUID)
- `title` - Task title (required)
- `description` - Task description (optional)
- `completed` - Boolean flag
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp
- `is_deleted` - Soft delete flag
- `sync_status` - 'pending', 'synced', or 'error'
- `server_id` - ID assigned by server after sync
- `last_synced_at` - Last successful sync timestamp

### 4. Sync Queue

Implement a queue to track operations that need to be synced:
- Store operation type (create/update/delete)
- Store task data at the time of operation
- Track retry attempts
- Handle failed syncs gracefully

## Technical Requirements

### Database
- Use SQLite for local storage
- Implement proper database schema with foreign keys
- Handle database migrations/initialization

### Error Handling
- Network failures should not crash the app
- Failed syncs should be retried (max 3 attempts)
- Provide meaningful error messages
- Log sync conflicts and resolutions

### Conflict Resolution
- Implement "last-write-wins" based on `updated_at` timestamp
- When a conflict occurs, the more recent change wins
- Log all conflict resolutions for debugging

### Performance
- Batch sync operations (don't sync one task at a time)
- Use environment variable for batch size (default: 50)
- Minimize database queries

## Implementation Tasks

You need to complete the implementation in the following files:

1. **`src/services/taskService.ts`**
   - Implement all CRUD operations
   - Ensure sync queue is updated for each operation
   - Handle soft deletes properly

2. **`src/services/syncService.ts`**
   - Implement the main sync orchestration
   - Handle batch processing
   - Implement conflict resolution
   - Update sync status after operations

3. **`src/routes/tasks.ts`**
   - Complete the POST, PUT, and DELETE endpoints
   - Add proper validation
   - Return appropriate HTTP status codes

4. **`src/routes/sync.ts`**
   - Implement the sync trigger endpoint
   - Implement the status check endpoint
   - Handle the batch sync endpoint

## Evaluation Criteria

Your solution will be evaluated on:

1. **Functionality** (40%)
   - All endpoints work correctly
   - Sync logic handles all scenarios
   - Proper error handling

2. **Code Quality** (30%)
   - Clean, readable code
   - Proper separation of concerns
   - Consistent naming and style

3. **Problem Solving** (20%)
   - Understanding of sync concepts
   - Handling edge cases
   - Practical approach to offline scenarios

4. **Testing** (10%)
   - Basic test coverage
   - Testing sync scenarios
   - Error case testing

## Submission Guidelines

1. Complete all TODO items in the codebase
2. Ensure all tests pass
3. Run `npm run lint` and fix any issues
4. Run `npm run typecheck` and ensure no TypeScript errors
5. Create a brief README explaining:
   - Your approach to the sync problem
   - Any assumptions you made
   - How to run and test your solution
6. Push your code to a new branch and create a pull request

## Time Allocation

Expected time: 2-3 hours

- Understanding requirements: 30 minutes
- Implementation: 90 minutes
- Testing and refinement: 30-60 minutes

## Bonus Points

If you finish early, consider:
- Adding request validation middleware
- Implementing exponential backoff for retries
- Adding sync progress tracking
- Creating integration tests
- Optimizing database queries

## Questions?

If you have questions about the requirements, make reasonable assumptions and document them in your README. We're more interested in your problem-solving approach than perfect adherence to ambiguous requirements.

Good luck!