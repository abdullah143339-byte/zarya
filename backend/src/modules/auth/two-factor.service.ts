import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as otplib from 'otplib';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TwoFactorService {
  private readonly APP_NAME = 'NOVAX';

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async generateSecret(userId: string, email: string) {
    const existing = await this.prisma.twoFactorAuth.findUnique({ where: { userId } });
    if (existing?.isEnabled) {
      throw new BadRequestException('2FA is already enabled. Disable it first.');
    }

    const secret = otplib.generateSecret();
    const backupCodes = this.generateBackupCodes();

    const otpauth = otplib.generateURI({
      secret,
      issuer: this.APP_NAME,
      label: email,
    });

    if (existing) {
      await this.prisma.twoFactorAuth.update({
        where: { userId },
        data: { secret, backupCodes: JSON.stringify(backupCodes) },
      });
    } else {
      await this.prisma.twoFactorAuth.create({
        data: {
          userId,
          secret,
          backupCodes: JSON.stringify(backupCodes),
          method: 'TOTP',
        },
      });
    }

    return { secret, otpauth, backupCodes };
  }

  async enable2FA(userId: string, token: string) {
    const record = await this.prisma.twoFactorAuth.findUnique({ where: { userId } });
    if (!record) throw new BadRequestException('No 2FA setup found. Run setup first.');
    if (record.isEnabled) throw new BadRequestException('2FA is already enabled.');

    const result = await otplib.verify({ token, secret: record.secret });
    if (!result.valid) throw new UnauthorizedException('Invalid verification code.');

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { isEnabled: true, lastUsedAt: new Date() },
    });

    return { message: '2FA enabled successfully' };
  }

  async disable2FA(userId: string, token: string) {
    const record = await this.prisma.twoFactorAuth.findUnique({ where: { userId } });
    if (!record?.isEnabled) throw new BadRequestException('2FA is not enabled.');

    const isValid = await this.verifyTokenOrBackupCode(record.secret, token, record.backupCodes);
    if (!isValid) throw new UnauthorizedException('Invalid verification code.');

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { isEnabled: false },
    });

    return { message: '2FA disabled successfully' };
  }

  async verify2FA(userId: string, token: string): Promise<boolean> {
    const record = await this.prisma.twoFactorAuth.findUnique({ where: { userId } });
    if (!record?.isEnabled) throw new BadRequestException('2FA is not enabled.');

    const isValid = await this.verifyTokenOrBackupCode(record.secret, token, record.backupCodes);
    if (!isValid) throw new UnauthorizedException('Invalid verification code.');

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { lastUsedAt: new Date() },
    });

    return true;
  }

  async get2FAStatus(userId: string) {
    const record = await this.prisma.twoFactorAuth.findUnique({ where: { userId } });
    return {
      isEnabled: record?.isEnabled ?? false,
      method: record?.method ?? null,
      lastUsedAt: record?.lastUsedAt ?? null,
    };
  }

  async regenerateBackupCodes(userId: string, token: string) {
    const record = await this.prisma.twoFactorAuth.findUnique({ where: { userId } });
    if (!record?.isEnabled) throw new BadRequestException('2FA is not enabled.');

    const result = await otplib.verify({ token, secret: record.secret });
    if (!result.valid) throw new UnauthorizedException('Invalid verification code.');

    const backupCodes = this.generateBackupCodes();

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { backupCodes: JSON.stringify(backupCodes), lastUsedAt: new Date() },
    });

    return { backupCodes };
  }

  private async verifyTokenOrBackupCode(secret: string, token: string, backupCodesJson: string): Promise<boolean> {
    try {
      const result = await otplib.verify({ token, secret });
      if (result.valid) return true;
    } catch {
      // Not a valid TOTP token, check backup codes
    }

    const codes: string[] = JSON.parse(backupCodesJson);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const index = codes.indexOf(tokenHash);
    if (index !== -1) {
      codes.splice(index, 1);
      return true;
    }

    return false;
  }

  private generateBackupCodes(count = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const raw = crypto.randomBytes(4).toString('hex');
      codes.push(crypto.createHash('sha256').update(raw).digest('hex'));
    }
    return codes;
  }
}
