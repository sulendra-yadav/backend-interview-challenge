import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  Task,
  SyncQueueItem,
  SyncResult,
  BatchSyncRequest,
  BatchSyncResponse,
  SyncError,
} from '../types';
import { Database } from '../db/database';
import { TaskService } from './taskService';

const DEFAULT_BATCH = 50;
const DEFAULT_RETRIES = 3;

export class SyncService {
  private apiUrl: string;
  private batchSize: number;
  private maxRetries: number;

  constructor(private db: Database, private taskService: TaskService, apiUrl: string = process.env.API_BASE_URL || 'http://localhost:3000/api') {
    this.apiUrl = apiUrl;
    this.batchSize = parseInt(process.env.SYNC_BATCH_SIZE || `${DEFAULT_BATCH}`, 10);
    this.maxRetries = parseInt(process.env.SYNC_RETRY_ATTEMPTS || `${DEFAULT_RETRIES}`, 10);
  }

  private async fetchSyncQueueItems(): Promise<SyncQueueItem[]> {
    const rows = await this.db.all(`SELECT * FROM sync_queue ORDER BY created_at ASC`, []);
    // parse data from JSON
    return rows.map((r: any) => ({
      id: r.id,
      task_id: r.task_id,
      operation: r.operation,
      data: JSON.parse(r.data),
      created_at: new Date(r.created_at),
      retry_count: r.retry_count,
      error_message: r.error_message ?? undefined,
    }));
  }

  async sync(): Promise<SyncResult> {
    const result: SyncResult = { success: true, synced_items: 0, failed_items: 0, errors: [] };
    const connected = await this.checkConnectivity();
    if (!connected) {
      return { ...result, success: false, errors: [{ task_id: '', operation: 'sync', error: 'Offline', timestamp: new Date() }] };
    }

    const items = await this.fetchSyncQueueItems();
    if (!items.length) return result;

    // batch processing
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      try {
        const batchResp = await this.processBatch(batch);
        // examine response processed_items
        if (batchResp && batchResp.processed_items) {
          for (const pi of batchResp.processed_items) {
            if (pi.status === 'success') {
              result.synced_items++;
              // update local task sync status
              await this.updateSyncStatus(pi.client_id, 'synced', { server_id: pi.server_id, ...pi.resolved_data });
            } else if (pi.status === 'conflict') {
              // conflict resolved on server -> server provided resolved_data
              result.synced_items++;
              await this.updateSyncStatus(pi.client_id, 'synced', { server_id: pi.server_id, ...pi.resolved_data });
              console.log(`[Sync] Conflict resolved for ${pi.client_id}, server chose:`, pi.resolved_data);
            } else if (pi.status === 'error') {
              result.failed_items++;
              result.success = false;
              result.errors.push({ task_id: pi.client_id, operation: 'sync', error: pi.error || 'unknown', timestamp: new Date() });
              // mark error / increment retry
              const queueItem = batch.find((it) => it.task_id === pi.client_id);
              if (queueItem) await this.handleSyncError(queueItem, new Error(pi.error || 'sync error'));
            }
          }
        }
      } catch (err: any) {
        // process failure for whole batch - increment retry_count for all
        for (const item of batch) {
          await this.handleSyncError(item, err);
          result.failed_items++;
          result.success = false;
          result.errors.push({ task_id: item.task_id, operation: item.operation, error: String(err.message || err), timestamp: new Date() });
        }
      }
    }

    return result;
  }

  async addToSyncQueue(taskId: string, operation: 'create' | 'update' | 'delete', data: Partial<Task>): Promise<void> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO sync_queue (id, task_id, operation, data, created_at, retry_count)
      VALUES (?, ?, ?, ?, ?, 0)
    `;
    await this.db.run(sql, [id, taskId, operation, JSON.stringify(data), now]);
  }

  private async processBatch(items: SyncQueueItem[]): Promise<BatchSyncResponse> {
    // Send to server batch endpoint
    const payload: BatchSyncRequest = { items, client_timestamp: new Date() };
    try {
      const resp = await axios.post(`${this.apiUrl}/batch`, payload, { timeout: 20000 });
      const data = resp.data as BatchSyncResponse;
      return data;
    } catch (err) {
      // Re-throw so caller can handle per-item retries
      throw err;
    }
  }

  private async resolveConflict(localTask: Task, serverTask: Task): Promise<Task> {
    // last-write-wins according to updated_at
    const localTs = new Date(localTask.updated_at).getTime();
    const serverTs = new Date(serverTask.updated_at).getTime();
    const winner = serverTs >= localTs ? serverTask : localTask;
    console.log(`[Sync][Conflict] task=${localTask.id} local.updated_at=${localTask.updated_at} server.updated_at=${serverTask.updated_at} -> winner=${winner.id || 'server'}`);
    return winner;
  }

  private async updateSyncStatus(taskId: string, status: 'synced' | 'error', serverData?: Partial<Task>): Promise<void> {
    const now = new Date().toISOString();
    const server_id = serverData?.server_id ?? null;
    const sql = `
      UPDATE tasks
      SET sync_status = ?, server_id = ?, last_synced_at = ?
      WHERE id = ?
    `;
    await this.db.run(sql, [status, server_id, now, taskId]);

    // remove corresponding queue items for this task if synced successfully
    if (status === 'synced') {
      try {
        await this.db.run(`DELETE FROM sync_queue WHERE task_id = ?`, [taskId]);
      } catch (err) {
        console.error('[Sync] Failed to clear sync_queue for', taskId, err);
      }
    }
  }

  private async handleSyncError(item: SyncQueueItem, error: Error): Promise<void> {
    // increment retry_count, set error_message
    const newRetry = item.retry_count + 1;
    const sql = `UPDATE sync_queue SET retry_count = ?, error_message = ? WHERE id = ?`;
    await this.db.run(sql, [newRetry, String(error.message || error), item.id]);

    if (newRetry >= this.maxRetries) {
      // mark task sync_status as error (permanent)
      await this.db.run(`UPDATE tasks SET sync_status = 'error' WHERE id = ?`, [item.task_id]);
      console.error(`[Sync] Permanent failure for ${item.task_id}: ${error.message}`);
    } else {
      console.warn(`[Sync] Will retry (${newRetry}/${this.maxRetries}) for ${item.task_id}: ${error.message}`);
    }
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
