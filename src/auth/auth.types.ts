import { Role } from '@prisma/client';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: Role;
  exp: number;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  addresses: UserAddress[];
  role: Role;
  tenantId: string;
}

export interface UserAddress {
  id: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  isDefault: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthenticatedUser;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface SignupDto extends LoginDto {
  name: string;
}

export interface UpdateProfileDto {
  name?: string;
  email?: string;
  cpf?: string;
  phone?: string;
  address?: {
    zipCode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    isDefault?: boolean;
  };
}