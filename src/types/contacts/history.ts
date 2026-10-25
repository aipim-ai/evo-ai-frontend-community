import type { PaginatedResponse } from '@/types/core';
import type { PipelineTask } from '@/types/analytics';
import type { Contact } from './contact';

// What a history entry records. `note` is an internal remark; the other kinds
// are touches with the contact and count as "last contact" on the priority list.
export const HISTORY_KINDS = ['call', 'message', 'meeting', 'email', 'note'] as const;
export type HistoryKind = (typeof HISTORY_KINDS)[number];

// GET /contacts/:id/tasks — a pipeline task plus the deal it hangs on.
export interface ContactTask extends PipelineTask {
  pipeline_id: string;
  pipeline_name?: string;
  stage: {
    id: string;
    name: string;
    color?: string;
    stage_type?: 'active' | 'completed' | 'cancelled';
  } | null;
}

export const PRIORITY_GROUPS = ['overdue', 'today', 'cooling', 'ok'] as const;
export type PriorityGroup = (typeof PRIORITY_GROUPS)[number];
export type PriorityReason = 'overdue' | 'awaiting' | 'due_today' | 'cooling' | 'next' | 'none';
export type PrioritySort = 'priority' | 'recent' | 'name';

export interface ContactPriority {
  group: PriorityGroup;
  reason: PriorityReason;
  task: {
    id: string;
    title: string;
    due_date: string | null;
    pipeline_id: string;
    pipeline_item_id: string;
  } | null;
  awaiting_since: string | null;
  last_contact_at: string | null;
  open_tasks_count: number;
  stage: { name: string; color?: string; pipeline_name?: string } | null;
}

export interface PriorityContact extends Contact {
  priority: ContactPriority;
}

export interface PriorityContactsParams {
  q?: string;
  group?: PriorityGroup;
  sort?: PrioritySort;
  timezone?: string;
  page?: number;
  per_page?: number;
}

export type PriorityCounts = Record<PriorityGroup | 'all', number>;

export interface PriorityContactsResponse extends PaginatedResponse<PriorityContact> {
  meta: PaginatedResponse<PriorityContact>['meta'] & { counts: PriorityCounts };
}
