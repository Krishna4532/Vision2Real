export const Roles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  FOUNDER: 'FOUNDER',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];
