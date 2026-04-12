export type UserAvatar = {
  emoji: string;
  color: string;
};

export type User = {
  name: string;
  username: string;
  avatar: UserAvatar;
};
