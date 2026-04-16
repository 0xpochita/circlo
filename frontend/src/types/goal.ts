export enum GoalStatus {
  Active = 0,
  Locked = 1,
  Resolved = 2,
  Claimed = 3,
  Cancelled = 4,
}

export enum GoalOutcomeType {
  Success = "success",
  Failure = "failure",
  Partial = "partial",
}

export enum StakeSide {
  Yes = 0,
  No = 1,
}

export type Goal = {
  id: string;
  circleId: string;
  creatorWallet: string;
  title: string;
  description: string;
  deadline: string;
  stakeAmount: string;
  yesPool: string;
  noPool: string;
  status: GoalStatus;
  outcome: GoalOutcomeType | null;
  contractGoalId: number;
  createdAt: string;
  updatedAt: string;
};

export type GoalParticipant = {
  id: string;
  goalId: string;
  wallet: string;
  side: StakeSide;
  amount: string;
  claimed: boolean;
};

export type GoalResolver = {
  id: string;
  goalId: string;
  wallet: string;
  vote: GoalOutcomeType | null;
  votedAt: string | null;
};
