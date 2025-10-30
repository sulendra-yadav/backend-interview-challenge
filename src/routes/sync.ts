import { Router, Request, Response } from 'express';
import { SyncService } from '../services/syncService';
import { TaskService } from '../services/taskService';
import { Database } from '../db/database';
import { v4 as uuidv4 } from 'uuid';

export function createSyncRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);
  const syncService = new SyncService(db, taskService);

  // Trigger manual sync
  router.post('/sync', async (req: Request, res: Response) => {
    try {
      const connected = await syncService.checkConnectivity();
      if (!connected) {
        return res.status(503).json({ error: 'Cannot reach server - offline' });
      }
      const result = await syncService.sync();
      res.json(result);
    } catch (error: any) {
      console.error('[Sync][POST /sync] error:', error);
      res.status(500).json({ error: error.message || 'Sync failed' });
    }
  });

  // Check sync status
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const pendingRow = await db.get(`SELECT COUNT(*) as c FROM sync_queue`);
      const pending = pendingRow ? pendingRow.c : 0;
      const lastSyncRow = await db.get(`SELECT MAX(last_synced_at) as last FROM tasks`);
      const last_synced_at = lastSyncRow ? lastSyncRow.last : null;
      const connected = await syncService.checkConnectivity();

      res.json({
        pending_sync_items: pending,
        last_synced_at,
        online: connected,
      });
    } catch (error: any) {
      console.error('[Sync][GET /status] error:', error);
      res.status(500).json({ error: 'Failed to fetch sync status' });
    }
  });

  // Batch sync endpoint (for server-side)
  // NOTE: This endpoint simulates a server-side batch processor.
  // In a real deployment this would be implemented on the central server.
  router.post('/batch', async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const items = Array.isArray(body.items) ? body.items : [];
      const processed_items: any[] = [];

      // For the purposes of this challenge, we treat server as authoritative
      // and simply respond success for each client item assigning a server_id.
      for (const it of items) {
        const clientId = it.task_id || (it.data && it.data.id) || uuidv4();
        // server assigns/echoes a server_id
        const serverId = `srv-${uuidv4()}`;

        // Simulate conflict detection: here we don't have server db, so always success.
        processed_items.push({
          client_id: clientId,
          server_id: serverId,
          status: 'success',
          resolved_data: {
            ...(it.data || {}),
            server_id: serverId,
            // ensure updated_at exists
            updated_at: (it.data && it.data.updated_at) || new Date().toISOString(),
          },
        });
      }

      res.json({ processed_items });
    } catch (error: any) {
      console.error('[Sync][POST /batch] error:', error);
      res.status(500).json({ error: 'Batch processing failed' });
    }
  });

  // Health check endpoint
  router.get('/health', async (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  return router;
}
