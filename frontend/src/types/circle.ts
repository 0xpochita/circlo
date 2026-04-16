export type CircleCategory =
  | "fitness"
  | "finance"
  | "education"
  | "health"
  | "productivity"
  | "social"
  | "other";

export type CirclePrivacy = "public" | "private";

export type CircleRole = "owner" | "admin" | "member";

export type Circle = {
  id: string;
  name: string;
  description: string;
  category: CircleCategory;
  privacy: CirclePrivacy;
  contractAddress: string;
  creatorWallet: string;
  memberCount: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CircleMember = {
  id: string;
  userId: string;
  circleId: string;
  wallet: string;
  role: CircleRole;
  displayName: string | null;
  avatar: string | null;
  joinedAt: string;
};
