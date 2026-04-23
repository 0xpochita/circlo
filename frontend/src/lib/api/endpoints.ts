import { fetchApi } from "./client";

export const authApi = {
  nonce: (walletAddress: string) =>
    fetchApi<{ nonce: string }>("/auth/nonce", {
      method: "POST",
      body: JSON.stringify({ walletAddress }),
    }),

  verify: (message: string, signature: string) =>
    fetchApi<{
      accessToken: string;
      refreshToken?: string;
      user: {
        id: string;
        walletAddress: string;
        name: string | null;
        username: string | null;
        avatarEmoji: string | null;
        avatarColor: string | null;
        createdAt: string;
      };
    }>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ message, signature }),
    }),

  refresh: () =>
    fetchApi<{ accessToken: string }>("/auth/refresh", {
      method: "POST",
    }),

  logout: () =>
    fetchApi<{ success: boolean }>("/auth/logout", {
      method: "POST",
    }),
};

export const usersApi = {
  me: () =>
    fetchApi<{
      id: string;
      walletAddress: string;
      name: string | null;
      username: string | null;
      avatarEmoji: string | null;
      avatarColor: string | null;
      createdAt: string;
    }>("/users/me"),

  update: (data: {
    name?: string;
    username?: string;
    avatarEmoji?: string;
    avatarColor?: string;
  }) =>
    fetchApi<{
      id: string;
      walletAddress: string;
      name: string | null;
      username: string | null;
      avatarEmoji: string | null;
      avatarColor: string | null;
      createdAt: string;
    }>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  search: (query: string) =>
    fetchApi<
      {
        id: string;
        walletAddress: string;
        name: string | null;
        username: string | null;
        avatarEmoji: string | null;
        avatarColor: string | null;
        createdAt: string;
      }[]
    >(`/users/search?q=${encodeURIComponent(query)}`),

  myStats: () =>
    fetchApi<{
      totalStaked: string;
      totalClaimed: string;
      pnl: string;
      pnlPercentage: string | null;
    }>("/users/me/stats"),
};

export const circlesApi = {
  list: (cursor?: string) =>
    fetchApi<{
      items: CircleResponse[];
      nextCursor: string | null;
      hasMore: boolean;
    }>(`/circles${cursor ? `?cursor=${cursor}` : ""}`),

  public: (category?: string, search?: string, cursor?: string) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    if (cursor) params.set("cursor", cursor);
    const qs = params.toString();
    return fetchApi<{
      items: CircleResponse[];
      nextCursor: string | null;
      hasMore: boolean;
    }>(`/circles/public${qs ? `?${qs}` : ""}`);
  },

  detail: (circleId: string) =>
    fetchApi<CircleDetailResponse>(`/circles/${circleId}`),

  create: (data: {
    chainId?: number;
    name: string;
    description?: string;
    category: string;
    privacy: string;
    avatarEmoji?: string;
    avatarColor?: string;
  }) =>
    fetchApi<CircleResponse>("/circles", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  join: (circleId: string, inviteCode?: string) =>
    fetchApi<{ success: boolean; alreadyMember?: boolean }>(
      `/circles/${circleId}/join`,
      {
        method: "POST",
        body: JSON.stringify(inviteCode ? { inviteCode } : {}),
      },
    ),

  leave: (circleId: string) =>
    fetchApi<{ success: boolean }>(`/circles/${circleId}/leave`, {
      method: "DELETE",
    }),

  invite: (circleId: string, usernames: string[]) =>
    fetchApi<{ success: boolean; invalidUsernames?: string[] }>(
      `/circles/${circleId}/invite`,
      {
        method: "POST",
        body: JSON.stringify({ usernames }),
      },
    ),

  acceptInvite: (circleId: string) =>
    fetchApi<{ success: boolean; alreadyMember?: boolean }>(
      `/circles/${circleId}/accept-invite`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    ),

  members: (circleId: string, cursor?: string) =>
    fetchApi<{
      items: MemberResponse[];
      nextCursor: string | null;
      hasMore: boolean;
    }>(`/circles/${circleId}/members${cursor ? `?cursor=${cursor}` : ""}`),

  goals: (circleId: string, status?: string, cursor?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (cursor) params.set("cursor", cursor);
    const qs = params.toString();
    return fetchApi<{
      items: GoalResponse[];
      nextCursor: string | null;
      hasMore: boolean;
    }>(`/circles/${circleId}/goals${qs ? `?${qs}` : ""}`);
  },
};

export const goalsApi = {
  create: (data: {
    circleId: string;
    title: string;
    description?: string;
    avatarEmoji?: string;
    avatarColor?: string;
    outcomeType: string;
    deadline: string;
    minStake: string;
    resolverIds?: string[];
  }) =>
    fetchApi<GoalResponse>("/goals", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  confirm: (goalId: string, chainId: number, txHash: string) =>
    fetchApi<GoalResponse>(`/goals/${goalId}/confirm`, {
      method: "POST",
      body: JSON.stringify({ chainId, txHash }),
    }),

  detail: (goalId: string) => fetchApi<GoalResponse>(`/goals/${goalId}`),

  participants: (goalId: string, cursor?: string) =>
    fetchApi<{
      items: ParticipantResponse[];
      nextCursor: string | null;
      hasMore: boolean;
    }>(`/goals/${goalId}/participants${cursor ? `?cursor=${cursor}` : ""}`),

  myStake: (goalId: string) =>
    fetchApi<{
      staked: boolean;
      data: {
        side: number;
        amount: string;
        claimedAmount: string | null;
      } | null;
    }>(`/goals/${goalId}/my-stake`),

  mine: (cursor?: string) =>
    fetchApi<{
      items: GoalResponse[];
      nextCursor: string | null;
      hasMore: boolean;
    }>(`/goals/mine${cursor ? `?cursor=${cursor}` : ""}`),

  feed: (cursor?: string) =>
    fetchApi<{
      items: GoalResponse[];
      nextCursor: string | null;
      hasMore: boolean;
    }>(`/goals/feed${cursor ? `?cursor=${cursor}` : ""}`),
};

export const notificationsApi = {
  list: (cursor?: string) =>
    fetchApi<{
      items: NotificationResponse[];
      nextCursor: string | null;
      hasMore: boolean;
    }>(`/notifications${cursor ? `?cursor=${cursor}` : ""}`),

  markRead: (ids: string[]) =>
    fetchApi<{ success: boolean }>("/notifications/mark-read", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
};

export const referralsApi = {
  me: () =>
    fetchApi<{
      code: string;
      invitedCount: number;
      verifiedCount: number;
      totalEarned: string;
    }>("/referrals/me"),

  track: (code: string) =>
    fetchApi<{ success: boolean }>("/referrals/track", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
};

export type CircleResponse = {
  id: string;
  chainId: string | null;
  ownerId: string;
  name: string;
  description: string | null;
  category: string;
  privacy: string;
  inviteCode: string | null;
  avatarEmoji: string | null;
  avatarColor: string | null;
  memberCount?: number;
  createdAt: string;
};

export type CircleDetailResponse = CircleResponse & {
  membersPreview: MemberResponse[];
};

export type MemberResponse = {
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    walletAddress: string;
    name: string | null;
    username: string | null;
    avatarEmoji: string | null;
    avatarColor: string | null;
  };
};

export type GoalResponse = {
  id: string;
  chainId: string | null;
  circleId: string;
  creatorId: string;
  title: string;
  description: string | null;
  avatarEmoji: string | null;
  avatarColor: string | null;
  outcomeType: string;
  deadline: string;
  minStake: string;
  status: string;
  winningSide: string | null;
  participantCount: number;
  createdAt: string;
};

export type NotificationResponse = {
  id: string;
  userId: string;
  type: string;
  actorId: string | null;
  entityType: string | null;
  entityId: string | null;
  title: string;
  description: string;
  unread: boolean;
  createdAt: string;
};

export type ParticipantResponse = {
  userId: string;
  side: number;
  staked: string;
  claimed: boolean;
  claimedAmount: string | null;
  createdAt: string;
  user: {
    id: string;
    walletAddress: string;
    name: string | null;
    username: string | null;
    avatarEmoji: string | null;
    avatarColor: string | null;
  };
};
