export type NonceResponse = {
  nonce: string;
};

export type VerifyResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type AuthUser = {
  id: string;
  wallet: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  createdAt: string;
};

export type RefreshResponse = {
  accessToken: string;
};
