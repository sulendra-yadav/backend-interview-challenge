import { Router, Request, Response } from 'express';
import { TaskService } from '../services/taskService';
import { SyncService } from '../services/syncService';
import { Database } from '../db/database';

export function createTaskRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);
  const syncService = new SyncService(db, taskService);

  // Get all tasks
  router.get('/', async (req: Request, res: Response) => {
    try {
      const tasks = await taskService.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Get single task
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const task = await taskService.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch task' });
    }
  });

  // Create task
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { title, description, completed } = req.body ?? {};
      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const created = await taskService.createTask({
        title: title.trim(),
        description: description ?? undefined,
        completed: !!completed,
      });

      res.status(201).json(created);
    } catch (error: any) {
      console.error('[Tasks][POST] error:', error);
      res.status(500).json({ error: error.message || 'Failed to create task' });
    }
  });

  // Update task
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { title, description, completed } = req.body ?? {};

      const updates: any = {};
      if (title !== undefined) {
        if (typeof title !== 'string' || !title.trim()) {
          return res.status(400).json({ error: 'If provided, title must be a non-empty string' });
        }
        updates.title = title.trim();
      }
      if (description !== undefined) updates.description = description;
      if (completed !== undefined) updates.completed = !!completed;

      const updated = await taskService.updateTask(id, updates);
      if (!updated) return res.status(404).json({ error: 'Task not found' });

      res.json(updated);
    } catch (error: any) {
      console.error('[Tasks][PUT] error:', error);
      res.status(500).json({ error: error.message || 'Failed to update task' });
    }
  });

  // Delete task (soft delete)
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const deleted = await taskService.deleteTask(id);
      if (!deleted) return res.status(404).json({ error: 'Task not found or already deleted' });
      res.json({ success: true, message: 'Task soft-deleted' });
    } catch (error: any) {
      console.error('[Tasks][DELETE] error:', error);
      res.status(500).json({ error: error.message || 'Failed to delete task' });
    }
  });

  return router;
}
