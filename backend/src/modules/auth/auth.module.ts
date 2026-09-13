import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { GitHubStrategy } from './github.strategy';
import { TwoFactorService } from './two-factor.service';
import { MailModule } from '../mail/mail.module';
import { LoginThrottleService } from '../../common/services/login-throttle.service';

function jwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET');
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return 'dev-only-fallback-secret';
}

@Module({
  imports: [
    MailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: jwtSecret(configService),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN') || '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TwoFactorService,
    JwtStrategy,
    GoogleStrategy,
    LoginThrottleService,
    ...(process.env.GITHUB_CLIENT_ID ? [GitHubStrategy] : []),
  ],
  exports: [AuthService, TwoFactorService, LoginThrottleService, JwtModule],
})
export class AuthModule {}
