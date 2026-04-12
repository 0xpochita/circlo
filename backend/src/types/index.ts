export interface JwtPayload {
  sub: string;
  wallet: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest {
  user: JwtPayload;
}

export type NotificationType =
  | "circle.invited"
  | "circle.active"
  | "goal.created"
  | "goal.staked"
  | "goal.resolution_needed"
  | "goal.resolved"
  | "goal.disputed"
  | "reward.claimable"
  | "referral.verified";

export type EntityType = "circle" | "goal";

export type CircleCategory =
  | "general"
  | "crypto"
  | "fitness"
  | "gaming"
  | "music"
  | "other";

export type CirclePrivacy = "public" | "private";

export type CircleRole = "owner" | "admin" | "member";

export type GoalOutcomeType = "binary" | "multi" | "numeric";

export type GoalStatus =
  | "open"
  | "locked"
  | "resolving"
  | "resolved"
  | "disputed"
  | "paid_out";

export type ReferralStatus = "pending" | "verified" | "rewarded";

export interface PaginationResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

export interface ProcessReferralJobData {
  userId: string;
  goalId: string;
}

export interface LockExpiredGoalsJobData {}

export interface DetectDisputesJobData {}
