export type NotificationType =
  | "circle_invite"
  | "goal_created"
  | "goal_staked"
  | "goal_locked"
  | "goal_resolved"
  | "goal_claimed"
  | "member_joined"
  | "referral_reward";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};
