import { SubagentInfo } from '../shared/types';
import { addSubagentInfo as fileAddSubagentInfo } from './file-operations';

class SubagentQueue {
  private queue: Array<{ subagent: SubagentInfo; resolve: () => void; reject: (error: any) => void }> = [];
  private processing = false;

  async add(subagent: SubagentInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ subagent, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      try {
        await fileAddSubagentInfo(item.subagent);
        item.resolve();
      } catch (error) {
        console.error('Failed to process subagent:', error);
        item.reject(error);
      }

      // Small delay to ensure file writes complete
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.processing = false;
  }
}

// Export a singleton instance
export const subagentQueue = new SubagentQueue();

// Export a wrapper function that uses the queue
export async function addSubagentInfo(subagent: SubagentInfo): Promise<void> {
  return subagentQueue.add(subagent);
}

// Export a function to update parent-child relationships
export async function updateSubagentParent(childId: string, parentId: string): Promise<void> {
  // This would need to be implemented in file-operations.ts
  // For now, we'll handle parent-child relationships when creating subagents
  console.log(`Would update child ${childId} with parent ${parentId}`);
}