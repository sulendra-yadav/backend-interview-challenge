import { v4 as uuidv4 } from 'uuid';
import { Task, SyncQueueItem } from '../types';
import { Database } from '../db/database';

export class TaskService {
  constructor(private db: Database) {}

  private nowIso(): string {
    return new Date().toISOString();
  }

  private rowToTask(row: any): Task {
    if (!row) return null as any;
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      completed: !!row.completed,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      is_deleted: !!row.is_deleted,
      sync_status: row.sync_status,
      server_id: row.server_id ?? undefined,
      last_synced_at: row.last_synced_at ? new Date(row.last_synced_at) : undefined,
    };
  }

  async createTask(taskData: Partial<Task>): Promise<Task> {
    const id = uuidv4();
    const title = (taskData.title || '').trim();
    if (!title) throw new Error('Title is required');

    const description = taskData.description || null;
    const completed = taskData.completed ? 1 : 0;
    const now = this.nowIso();
    const sync_status = 'pending';

    const sql = `
      INSERT INTO tasks (
        id, title, description, completed, created_at, updated_at, is_deleted, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this.db.run(sql, [id, title, description, completed, now, now, 0, sync_status]);

    // add to sync queue (operation: create)
    const queueId = uuidv4();
    const queueSql = `
      INSERT INTO sync_queue (id, task_id, operation, data, created_at, retry_count)
      VALUES (?, ?, ?, ?, ?, 0)
    `;
    const data = JSON.stringify({
      id,
      title,
      description,
      completed: !!completed,
      created_at: now,
      updated_at: now,
      is_deleted: false,
    });
    await this.db.run(queueSql, [queueId, id, 'create', data, now]);

    const row = await this.db.get(`SELECT * FROM tasks WHERE id = ?`, [id]);
    return this.rowToTask(row);
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const existingRow = await this.db.get(`SELECT * FROM tasks WHERE id = ?`, [id]);
    if (!existingRow) return null;

    const existing = this.rowToTask(existingRow);

    if (existing.is_deleted) return null;

    // Build updated values
    const title = updates.title !== undefined ? updates.title.trim() : existing.title;
    const description = updates.description !== undefined ? updates.description : existing.description;
    const completed = updates.completed !== undefined ? (updates.completed ? 1 : 0) : (existing.completed ? 1 : 0);
    const now = this.nowIso();
    const sync_status = 'pending';

    const sql = `
      UPDATE tasks
      SET title = ?, description = ?, completed = ?, updated_at = ?, sync_status = ?
      WHERE id = ?
    `;
    await this.db.run(sql, [title, description, completed, now, sync_status, id]);

    // Add update to sync queue
    const queueId = uuidv4();
    const queueSql = `
      INSERT INTO sync_queue (id, task_id, operation, data, created_at, retry_count)
      VALUES (?, ?, ?, ?, ?, 0)
    `;
    const data = JSON.stringify({
      id,
      title,
      description,
      completed: !!completed,
      created_at: existing.created_at.toISOString(),
      updated_at: now,
      is_deleted: false,
    });
    await this.db.run(queueSql, [queueId, id, 'update', data, now]);

    const row = await this.db.get(`SELECT * FROM tasks WHERE id = ?`, [id]);
    return this.rowToTask(row);
  }

  async deleteTask(id: string): Promise<boolean> {
    const existingRow = await this.db.get(`SELECT * FROM tasks WHERE id = ?`, [id]);
    if (!existingRow) return false;

    const existing = this.rowToTask(existingRow);
    if (existing.is_deleted) return false;

    const now = this.nowIso();
    const sync_status = 'pending';

    const sql = `
      UPDATE tasks
      SET is_deleted = 1, updated_at = ?, sync_status = ?
      WHERE id = ?
    `;
    await this.db.run(sql, [now, sync_status, id]);

    // Add delete to sync queue (store the last known data)
    const queueId = uuidv4();
    const queueSql = `
      INSERT INTO sync_queue (id, task_id, operation, data, created_at, retry_count)
      VALUES (?, ?, ?, ?, ?, 0)
    `;
    const data = JSON.stringify({
      id,
      title: existing.title,
      description: existing.description,
      completed: existing.completed,
      created_at: existing.created_at.toISOString(),
      updated_at: now,
      is_deleted: true,
    });
    await this.db.run(queueSql, [queueId, id, 'delete', data, now]);

    return true;
  }

  async getTask(id: string): Promise<Task | null> {
    const row = await this.db.get(`SELECT * FROM tasks WHERE id = ?`, [id]);
    if (!row) return null;
    const task = this.rowToTask(row);
    if (task.is_deleted) return null;
    return task;
  }

  async getAllTasks(): Promise<Task[]> {
    const rows = await this.db.all(`SELECT * FROM tasks WHERE is_deleted = 0 ORDER BY updated_at DESC`, []);
    return rows.map((r) => this.rowToTask(r));
  }

  async getTasksNeedingSync(): Promise<Task[]> {
    const rows = await this.db.all(
      `SELECT * FROM tasks WHERE sync_status = 'pending' OR sync_status = 'error' ORDER BY updated_at ASC`,
      []
    );
    return rows.map((r) => this.rowToTask(r));
  }
}
