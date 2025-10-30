/**
 * CHALLENGE CONSTRAINTS
 * 
 * These constraints are specific to our implementation and must be followed.
 * Generic AI solutions won't account for these requirements.
 */

export const CHALLENGE_CONSTRAINTS = {
  /**
   * Sync operations MUST be processed in chronological order for each task.
   * Example: If a task has [create, update, delete] operations, they must
   * be applied in that exact order, even across batches.
   */
  SYNC_ORDER: 'chronological-per-task',

  /**
   * When detecting conflicts, you must check both updated_at timestamps
   * AND operation types. A delete operation should always win over updates
   * if timestamps are equal.
   */
  CONFLICT_PRIORITY: {
    'delete': 3,
    'update': 2,
    'create': 1,
  },

  /**
   * Failed sync items should be moved to a dead letter queue after 3 attempts,
   * not discarded. The dead letter queue should be queryable.
   */
  ERROR_HANDLING: 'dead-letter-queue',

  /**
   * Each sync batch must include a checksum of the included items.
   * The server should verify this checksum before processing.
   */
  BATCH_INTEGRITY: 'checksum-required',

  /**
   * The sync_status field has additional states not in the original spec:
   * - 'pending': Not yet attempted
   * - 'in-progress': Currently syncing
   * - 'synced': Successfully synced
   * - 'error': Temporary failure (will retry)
   * - 'failed': Permanent failure (in dead letter queue)
   */
  SYNC_STATES: ['pending', 'in-progress', 'synced', 'error', 'failed'],
};