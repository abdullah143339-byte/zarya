/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from '../../common/dto/register.dto';
import { LoginDto } from '../../common/dto/auth.dto';
import { JwtPayload } from './jwt.strategy';
import { TwoFactorService } from './two-factor.service';
import { MailService } from '../mail/mail.service';
import { LoginThrottleService } from '../../common/services/login-throttle.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private twoFactorService: TwoFactorService,
    private mailService: MailService,
    private loginThrottle: LoginThrottleService,
  ) {}

  private sanitizeInput(input: string): string {
    if (!input) return input;
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  async register(dto: RegisterDto) {
    const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existingEmail) throw new ConflictException('Email already registered');

    const existingUsername = await this.prisma.user.findUnique({ where: { username: dto.username.toLowerCase() } });
    if (existingUsername) throw new ConflictException('Username already taken');

    const reservedNames = ['admin', 'system', 'support', 'nova', 'novax', 'api', 'root', 'moderator', 'help'];
    if (reservedNames.includes(dto.username.toLowerCase())) {
      throw new ConflictException('Username is reserved');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        username: dto.username.toLowerCase(),
        passwordHash,
        firstName: this.sanitizeInput(dto.firstName),
        lastName: this.sanitizeInput(dto.lastName),
        displayName: `${this.sanitizeInput(dto.firstName)} ${this.sanitizeInput(dto.lastName)}`,
        bio: dto.bio ? this.sanitizeInput(dto.bio) : undefined,
        location: dto.location ? this.sanitizeInput(dto.location) : undefined,
        profile: { create: {} },
        userSettings: { create: {} },
        wallet: { create: {} },
        reputation: { create: {} },
      },
      select: { id: true, email: true, username: true, firstName: true, lastName: true, createdAt: true },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.username, 'USER');
    await this.createSession(user.id, tokens.refreshToken);

    return { user, ...tokens };
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    // 1) Hard lockout gate — checked BEFORE any work, so a locked IP cannot
    //    trigger expensive bcrypt work or even learn account existence.
    const lock = this.loginThrottle.isLocked(ip);
    if (lock.locked) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many login attempts. Please try again in 15 minutes.',
          retryAfter: lock.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.identifier.toLowerCase() },
          { username: dto.identifier.toLowerCase() },
        ],
      },
    });

    if (!user || !user.passwordHash) {
      this.loginThrottle.recordFailure(ip);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      this.loginThrottle.recordFailure(ip);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      this.loginThrottle.recordFailure(ip);
      throw new UnauthorizedException('Account is not active');
    }
    if (user.isSuspended) {
      this.loginThrottle.recordFailure(ip);
      throw new UnauthorizedException('Account is suspended');
    }

    // Password correct + account active → this is a successful authentication.
    this.loginThrottle.recordSuccess(ip);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastActiveAt: new Date() },
    });

    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId: user.id },
    });

    if (twoFactorAuth?.isEnabled) {
      const tempToken = await this.jwtService.signAsync(
        { sub: user.id, purpose: '2fa-verify' },
        {
          secret: this.configService.get('JWT_SECRET')!,
          expiresIn: '5m',
        },
      );

      return {
        requires2FA: true,
        tempToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        },
      };
    }

    const tokens = await this.generateTokens(user.id, user.email, user.username, user.role);
    await this.createSession(user.id, tokens.refreshToken, ip, userAgent);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
      },
      ...tokens,
    };
  }

  async verify2FAAndLogin(tempToken: string, code: string, ip?: string, userAgent?: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(tempToken, {
        secret: this.configService.get('JWT_SECRET')!,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    if (payload.purpose !== '2fa-verify') {
      throw new UnauthorizedException('Invalid token purpose');
    }

    await this.twoFactorService.verify2FA(payload.sub, code);

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not active');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.username, user.role);
    await this.createSession(user.id, tokens.refreshToken, ip, userAgent);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const session = await this.prisma.session.findFirst({
        where: { refreshToken, isActive: true, userId: payload.sub },
      });

      if (!session) throw new UnauthorizedException('Invalid refresh token');

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('User not active');

      const tokens = await this.generateTokens(user.id, user.email, user.username, user.role);

      await this.prisma.session.update({
        where: { id: session.id },
        data: { refreshToken: tokens.refreshToken, lastActivity: new Date() },
      });

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, sessionId?: string) {
    if (sessionId) {
      await this.prisma.session.updateMany({
        where: { id: sessionId, userId },
        data: { isActive: false },
      });
    } else {
      await this.prisma.session.updateMany({
        where: { userId },
        data: { isActive: false },
      });
    }
    return { message: 'Logged out successfully' };
  }

  async getSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, isActive: true },
      select: {
        id: true, deviceId: true, browser: true, os: true, country: true, city: true,
        ipAddress: true, lastActivity: true, createdAt: true,
      },
      orderBy: { lastActivity: 'desc' },
    });
  }

  async oauthLogin(
    provider: 'google' | 'github',
    profile: {
      googleId?: string;
      githubId?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      username?: string;
      displayName?: string;
      avatar?: string;
    },
  ) {
    const email = profile.email?.toLowerCase();
    if (!email) {
      throw new UnauthorizedException('OAuth provider did not return an email address');
    }

    const providerId = provider === 'github' ? profile.githubId : profile.googleId;

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { connectedAccounts: { some: { provider, providerId } } }] },
    });

    if (!user) {
      const baseUsername =
        profile.username ||
        email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') ||
        'user_' + Date.now();

      let username = baseUsername;
      let counter = 1;
      while (await this.prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      const firstName = profile.firstName || profile.displayName?.split(' ')[0] || '';
      const lastName = profile.lastName || (profile.displayName?.split(' ').slice(1).join(' ') || '');

      user = await this.prisma.user.create({
        data: {
          email,
          username,
          firstName,
          lastName,
          displayName: `${firstName} ${lastName}`.trim() || profile.username || username,
          avatar: profile.avatar,
          isEmailVerified: true,
          profile: { create: {} },
          userSettings: { create: {} },
          wallet: { create: {} },
          reputation: { create: {} },
          connectedAccounts: {
            create: { provider, providerId: String(providerId) },
          },
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), lastActiveAt: new Date() },
      });

      const existing = await this.prisma.connectedAccount.findFirst({
        where: { userId: user.id, provider, providerId: String(providerId) },
      });
      if (!existing && providerId) {
        await this.prisma.connectedAccount.create({
          data: { userId: user.id, provider, providerId: String(providerId) },
        });
      }
    }

    const tokens = await this.generateTokens(user.id, user.email, user.username, user.role);
    await this.createSession(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
      },
      ...tokens,
    };
  }

  async googleLogin(profile: { googleId: string; email: string; firstName: string; lastName: string; avatar?: string }) {
    return this.oauthLogin('google', profile);
  }

  async githubLogin(profile: {
    githubId?: string;
    email?: string;
    username?: string;
    displayName?: string;
    avatar?: string;
  }) {
    return this.oauthLogin('github', profile);
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    const showDevOtp = process.env.NODE_ENV !== 'production' && process.env.SHOW_DEV_OTP === 'true';

    if (!user) {
      return {
        message: 'If an account exists for this email, a reset code has been sent.',
        ...(showDevOtp ? { devOtp: null } : {}),
      };
    }

    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: tokenHash, resetPasswordExpires: expires },
    });

    try {
      await this.mailService.sendPasswordResetOtp(user.email, otp);
    } catch (error: any) {
      if (!showDevOtp) {
        throw new BadRequestException(
          'We could not send the verification email. Please try again later.',
        );
      }
    }

    return {
      message: 'If an account exists for this email, a reset code has been sent.',
      ...(showDevOtp ? { devOtp: otp } : {}),
    };
  }

  async validatePasswordResetToken(token: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.prisma.user.findFirst({
      where: { resetPasswordToken: tokenHash },
    });

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Reset token is invalid or has expired');
    }

    return { email: user.email, username: user.username };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Password change not available for this account');
    }
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.session.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      }),
    ]);
    return { changed: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.prisma.user.findFirst({
      where: { resetPasswordToken: tokenHash },
    });

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Reset token is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      }),
      this.prisma.session.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false },
      }),
    ]);

    return { message: 'Password has been reset successfully. You can now sign in.' };
  }

  async deleteAccount(userId: string, password?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new NotFoundException('User not found');

    if (user.passwordHash) {
      if (!password) {
        throw new BadRequestException('Password confirmation is required');
      }
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        throw new UnauthorizedException('Password is incorrect');
      }
    }

    // Marketplace items owned by this user must have their dependent
    // records (reviews, purchases, orderItems, carts, wishlists) cleaned
    // before the items themselves are removed.
    const items = await this.prisma.marketplaceItem.findMany({
      where: { sellerId: userId },
      select: { id: true },
    });
    const itemIds = items.map((i) => i.id);

    await this.prisma.$transaction([
      // Social graph
      this.prisma.follow.deleteMany({
        where: { OR: [{ followerId: userId }, { followingId: userId }] },
      }),
      this.prisma.reaction.deleteMany({ where: { userId } }),
      this.prisma.comment.deleteMany({ where: { authorId: userId } }),
      this.prisma.post.deleteMany({ where: { authorId: userId } }),
      this.prisma.bookmark.deleteMany({ where: { userId } }),
      this.prisma.share.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({
        where: { OR: [{ userId }, { actorId: userId }] },
      }),
      // Messaging
      this.prisma.conversationParticipant.deleteMany({ where: { userId } }),
      this.prisma.message.deleteMany({ where: { senderId: userId } }),
      // Marketplace
      ...(itemIds.length > 0
        ? [
            this.prisma.review.deleteMany({ where: { itemId: { in: itemIds } } }),
            this.prisma.purchase.deleteMany({ where: { itemId: { in: itemIds } } }),
            this.prisma.orderItem.deleteMany({ where: { itemId: { in: itemIds } } }),
            this.prisma.marketplaceItem.deleteMany({ where: { id: { in: itemIds } } }),
          ]
        : []),
      this.prisma.cartItem.deleteMany({ where: { userId } }),
      this.prisma.wishlistItem.deleteMany({ where: { userId } }),
      this.prisma.order.deleteMany({ where: { buyerId: userId } }),
      this.prisma.orderItem.deleteMany({ where: { sellerId: userId } }),
      // Communities & learning memberships
      this.prisma.communityMember.deleteMany({ where: { userId } }),
      this.prisma.courseEnrollment.deleteMany({ where: { userId } }),
      this.prisma.enrolledLearningPath.deleteMany({ where: { userId } }),
      this.prisma.aIConversation.deleteMany({ where: { userId } }),
      this.prisma.learningProgress.deleteMany({ where: { userId } }),
      this.prisma.userAchievement.deleteMany({ where: { userId } }),
      this.prisma.transaction.deleteMany({ where: { wallet: { userId } } }),
      this.prisma.wallet.deleteMany({ where: { userId } }),
      // Sessions must go (self-referential FK via user onDelete)
      this.prisma.session.deleteMany({ where: { userId } }),
      // Finally the user itself — dependent rows with onDelete: Cascade
      // (profile, reputation, settings, stories, blocks, AI, etc.)
      // are removed automatically.
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    await this.prisma.securityEvent.create({
      data: { userId, type: 'ACCOUNT_DELETION', severity: 'MEDIUM', description: 'Account deleted by user' },
    });

    return { deleted: true };
  }

  private async generateTokens(userId: string, email: string, username: string, role: string) {
    const payload: JwtPayload = { sub: userId, email, username, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET')!,
        expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET')!,
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async createSession(userId: string, refreshToken: string, ip?: string, userAgent?: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prisma.session.create({
      data: {
        userId,
        token: refreshToken,
        refreshToken,
        ipAddress: ip,
        userAgent,
        expiresAt,
      },
    });
  }
}
