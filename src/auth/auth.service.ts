import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuthResponse, AuthenticatedUser, LoginDto, SignupDto, UpdateProfileDto } from './auth.types';
import { TokenService } from './token.service';

type UserWithAddresses = Prisma.UserGetPayload<{ include: { addresses: true } }>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancyService: TenancyService,
    private readonly tokenService: TokenService,
  ) {}

  async signup(data: SignupDto, storeDomain?: string) {
    const tenant = await this.tenancyService.resolveTenant(storeDomain);

    const existingUser = await this.tenancyService.withTenant(tenant.id, (tx) =>
      tx.user.findUnique({ where: { email: data.email.toLowerCase() } }),
    );

    if (existingUser) {
      throw new ConflictException('Ja existe uma conta com este e-mail.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.tenancyService.withTenant(tenant.id, (tx) =>
      tx.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          passwordHash,
          tenantId: tenant.id,
        },
        include: {
          addresses: true,
        },
      }),
    );

    return this.buildAuthResponse(user);
  }

  async login(data: LoginDto, storeDomain?: string) {
    const tenant = await this.tenancyService.resolveTenant(storeDomain);
    const user = await this.tenancyService.withTenant(tenant.id, (tx) =>
      tx.user.findUnique({
        where: { email: data.email.toLowerCase() },
        include: {
          addresses: true,
        },
      }),
    );

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha invalidos.');
    }

    const passwordMatches = await bcrypt.compare(data.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('E-mail ou senha invalidos.');
    }

    return this.buildAuthResponse(user);
  }

  async me(userId: string, tenantId: string) {
    const user = await this.tenancyService.withTenant(tenantId, (tx) =>
      tx.user.findUnique({
        where: { id: userId, tenantId },
        include: {
          addresses: {
            orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
          },
        },
      }),
    );

    if (!user) {
      throw new UnauthorizedException('Usuario autenticado nao encontrado.');
    }

    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, tenantId: string, data: UpdateProfileDto) {
    const currentUser = await this.tenancyService.withTenant(tenantId, (tx) =>
      tx.user.findUnique({
        where: { id: userId, tenantId },
        include: {
          addresses: {
            orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
          },
        },
      }),
    );

    if (!currentUser) {
      throw new UnauthorizedException('Usuario autenticado nao encontrado.');
    }

    const normalizedName = typeof data.name === 'string' ? data.name.trim() : undefined;
    const normalizedEmail = typeof data.email === 'string' ? data.email.trim().toLowerCase() : undefined;
    const normalizedCpf = typeof data.cpf === 'string' ? data.cpf.trim() : undefined;
    const normalizedPhone = typeof data.phone === 'string' ? data.phone.trim() : undefined;
    const normalizedAddress = data.address
      ? {
          zipCode: typeof data.address.zipCode === 'string' ? data.address.zipCode.trim() : '',
          street: typeof data.address.street === 'string' ? data.address.street.trim() : '',
          number: typeof data.address.number === 'string' ? data.address.number.trim() : '',
          complement: typeof data.address.complement === 'string' ? data.address.complement.trim() : '',
          neighborhood: typeof data.address.neighborhood === 'string' ? data.address.neighborhood.trim() : '',
          city: typeof data.address.city === 'string' ? data.address.city.trim() : '',
          state: typeof data.address.state === 'string' ? data.address.state.trim() : '',
          isDefault: data.address.isDefault ?? true,
        }
      : null;

    if (normalizedAddress) {
      const requiredAddressValues = [
        normalizedAddress.zipCode,
        normalizedAddress.street,
        normalizedAddress.number,
        normalizedAddress.neighborhood,
        normalizedAddress.city,
        normalizedAddress.state,
      ];

      if (requiredAddressValues.some((value) => value.length === 0)) {
        throw new BadRequestException('Preencha todos os campos obrigatorios do endereco.');
      }
    }

    if (normalizedEmail && normalizedEmail !== currentUser.email) {
      const existingUserWithEmail = await this.tenancyService.withTenant(tenantId, (tx) =>
        tx.user.findUnique({ where: { email: normalizedEmail } }),
      );

      if (existingUserWithEmail && existingUserWithEmail.id !== currentUser.id) {
        throw new ConflictException('Ja existe uma conta com este e-mail.');
      }
    }

    const updatedUser = await this.tenancyService.withTenant(tenantId, async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          name: normalizedName !== undefined && normalizedName.length > 0 ? normalizedName : currentUser.name,
          email:
            normalizedEmail !== undefined && normalizedEmail.length > 0 ? normalizedEmail : currentUser.email,
          cpf: normalizedCpf !== undefined ? normalizedCpf || null : currentUser.cpf,
          phone: normalizedPhone !== undefined ? normalizedPhone || null : currentUser.phone,
        },
      });

      if (normalizedAddress) {
        const addressToUpdate = currentUser.addresses.find((address) => address.isDefault) || currentUser.addresses[0];

        if (addressToUpdate) {
          await tx.address.update({
            where: { id: addressToUpdate.id },
            data: {
              zipCode: normalizedAddress.zipCode,
              street: normalizedAddress.street,
              number: normalizedAddress.number,
              complement: normalizedAddress.complement || null,
              neighborhood: normalizedAddress.neighborhood,
              city: normalizedAddress.city,
              state: normalizedAddress.state,
              isDefault: normalizedAddress.isDefault,
            },
          });
        } else {
          await tx.address.create({
            data: {
              userId,
              zipCode: normalizedAddress.zipCode,
              street: normalizedAddress.street,
              number: normalizedAddress.number,
              complement: normalizedAddress.complement || null,
              neighborhood: normalizedAddress.neighborhood,
              city: normalizedAddress.city,
              state: normalizedAddress.state,
              isDefault: normalizedAddress.isDefault,
            },
          });
        }
      }

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          addresses: {
            orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
          },
        },
      });
    });

    return this.sanitizeUser(updatedUser);
  }

  private buildAuthResponse(user: UserWithAddresses | User): AuthResponse {
    const token = this.tokenService.sign({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  private sanitizeUser(user: UserWithAddresses | User): AuthenticatedUser {
    const addresses = 'addresses' in user ? user.addresses : [];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      cpf: user.cpf,
      phone: user.phone,
      addresses: addresses.map((address) => ({
        id: address.id,
        zipCode: address.zipCode,
        street: address.street,
        number: address.number,
        complement: address.complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        isDefault: address.isDefault,
      })),
      role: user.role,
      tenantId: user.tenantId,
    };
  }
}