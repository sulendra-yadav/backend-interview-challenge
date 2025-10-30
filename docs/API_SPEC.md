# API Specification

## Base URL
```
http://localhost:3000/api
```

## Endpoints

### Task Management

#### Get All Tasks
```
GET /tasks
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Complete project documentation",
    "description": "Write comprehensive docs for the new API",
    "completed": false,
    "created_at": "2024-01-10T10:00:00Z",
    "updated_at": "2024-01-10T10:00:00Z",
    "is_deleted": false,
    "sync_status": "synced",
    "server_id": "srv_123456",
    "last_synced_at": "2024-01-10T10:05:00Z"
  }
]
```

#### Get Single Task
```
GET /tasks/:id
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Complete project documentation",
  "description": "Write comprehensive docs for the new API",
  "completed": false,
  "created_at": "2024-01-10T10:00:00Z",
  "updated_at": "2024-01-10T10:00:00Z",
  "is_deleted": false,
  "sync_status": "synced",
  "server_id": "srv_123456",
  "last_synced_at": "2024-01-10T10:05:00Z"
}
```

**Error Response (404):**
```json
{
  "error": "Task not found",
  "timestamp": "2024-01-10T10:00:00Z",
  "path": "/api/tasks/invalid-id"
}
```

#### Create Task
```
POST /tasks
```

**Request Body:**
```json
{
  "title": "New task",
  "description": "Task description (optional)"
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "New task",
  "description": "Task description",
  "completed": false,
  "created_at": "2024-01-10T10:00:00Z",
  "updated_at": "2024-01-10T10:00:00Z",
  "is_deleted": false,
  "sync_status": "pending",
  "server_id": null,
  "last_synced_at": null
}
```

#### Update Task
```
PUT /tasks/:id
```

**Request Body:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "completed": true
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Updated title",
  "description": "Updated description",
  "completed": true,
  "created_at": "2024-01-10T10:00:00Z",
  "updated_at": "2024-01-10T11:00:00Z",
  "is_deleted": false,
  "sync_status": "pending",
  "server_id": "srv_123456",
  "last_synced_at": "2024-01-10T10:05:00Z"
}
```

#### Delete Task
```
DELETE /tasks/:id
```

**Response (204):**
No content

### Sync Operations

#### Trigger Sync
```
POST /sync
```

**Response:**
```json
{
  "success": true,
  "synced_items": 5,
  "failed_items": 1,
  "errors": [
    {
      "task_id": "550e8400-e29b-41d4-a716-446655440000",
      "operation": "update",
      "error": "Conflict resolved using last-write-wins",
      "timestamp": "2024-01-10T10:00:00Z"
    }
  ]
}
```

#### Check Sync Status
```
GET /status
```

**Response:**
```json
{
  "pending_sync_count": 3,
  "last_sync_timestamp": "2024-01-10T10:00:00Z",
  "is_online": true,
  "sync_queue_size": 3
}
```

#### Batch Sync (Server Implementation)
```
POST /batch
```

**Request Body:**
```json
{
  "items": [
    {
      "id": "queue-item-1",
      "task_id": "550e8400-e29b-41d4-a716-446655440000",
      "operation": "create",
      "data": {
        "title": "New task",
        "description": "Description"
      },
      "created_at": "2024-01-10T10:00:00Z",
      "retry_count": 0
    }
  ],
  "client_timestamp": "2024-01-10T10:00:00Z"
}
```

**Response:**
```json
{
  "processed_items": [
    {
      "client_id": "550e8400-e29b-41d4-a716-446655440000",
      "server_id": "srv_123456",
      "status": "success",
      "resolved_data": {
        "id": "srv_123456",
        "title": "New task",
        "description": "Description",
        "completed": false,
        "created_at": "2024-01-10T10:00:00Z",
        "updated_at": "2024-01-10T10:00:00Z"
      }
    }
  ]
}
```

#### Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-10T10:00:00Z"
}
```

## Error Responses

All endpoints may return the following error structure:

```json
{
  "error": "Error message",
  "timestamp": "2024-01-10T10:00:00Z",
  "path": "/api/endpoint"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content (successful delete)
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable (when offline)