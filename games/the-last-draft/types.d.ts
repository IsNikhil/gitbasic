export type Documents = Record<string, string>;
export interface Revision {
  id: string;
  parents: string[];
  docs: Documents;
  message: string;
  author: string;
}
export interface Conflict {
  line: number | null;
  base: string;
  ours: string;
  theirs: string;
}
export type Decision = "comment" | "changes_requested" | "approved";
export interface Review {
  id: string;
  source: string;
  target: string;
  title: string;
  author: string;
  status: "open" | "changes_requested" | "approved" | "merged";
  comments: {
    reviewer: string;
    decision: Decision;
    text: string;
    head: string;
  }[];
  approvedHead: string | null;
}
export interface PendingMerge {
  docs: Documents;
  conflicts: Record<string, Conflict[]>;
  ours: string;
  theirs: string;
  source?: string;
  message: string;
  reviewId?: string | null;
  kind: "merge" | "revert";
}
export interface Repository {
  commits: Record<string, Revision>;
  branches: Record<string, string>;
  current: string;
  working: Documents;
  next: number;
  pending: PendingMerge | null;
  reviews: Review[];
  publication: { revision: string; docs: Documents } | null;
}
export interface Mission {
  repo: Repository;
  recovery: string;
  evidence: Record<string, boolean | string>;
  hint: number;
  inspected: string | null;
  compareBranch: string | null;
  read: boolean;
  finalApproval: string | null;
  complication: string | null;
  resolutionDrafts: Documents;
  resolutionNote?: string;
  noteDraft: string;
  reviewDraft: string;
  branchDraft: string;
  selectedDoc: string;
  reviewHead?: string;
}
export interface Campaign {
  schema: number;
  chapter: number;
  unlocked: number;
  completed: number[];
  missions: Record<number, Mission>;
  gitMode: boolean;
  started: boolean;
}
export type Action =
  | {
      type:
        | "start"
        | "mode"
        | "restart"
        | "read"
        | "hint"
        | "restore"
        | "cancelMerge"
        | "openReview"
        | "inspectReview"
        | "receive"
        | "mergeReview"
        | "revert"
        | "approveIssue"
        | "publish"
        | "complete";
    }
  | { type: "chapter"; chapter: number }
  | { type: "select"; doc: string }
  | { type: "edit"; doc: string; text: string }
  | { type: "inspect"; id: string }
  | { type: "commit"; message: string }
  | { type: "branch" | "switch" | "compare"; name: string }
  | { type: "merge"; source: string }
  | { type: "resolve"; resolutions: Documents; message: string }
  | { type: "review"; decision: Decision; comment: string };
export type ProgressStorage = Pick<Storage, "getItem" | "setItem">;
