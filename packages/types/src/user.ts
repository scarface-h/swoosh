export type UserRole = "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";

export type User = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerAddress = {
  id: string;
  userId: string;
  label: string;
  name: string;
  phone: string;
  division: string;
  district: string;
  area: string;
  address: string;
  isDefault: boolean;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
};
