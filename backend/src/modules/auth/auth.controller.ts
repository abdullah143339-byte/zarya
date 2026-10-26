import { Controller, Post, Body, Get, Req, Res, UseGuards, HttpCode, HttpStatus, Query, UnauthorizedException, Delete, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { RegisterDto } from '../../common/dto/register.dto';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto, RefreshTokenDto, ChangePasswordDto } from '../../common/dto/auth.dto';
import { Verify2FATokenDto, VerifyLoginDto } from './two-factor.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly REFRESH_COOKIE = 'novax_refresh';
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private twoFactorService: TwoFactorService,
  ) {}

  private refreshCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
      path: '/api/v1/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(this.REFRESH_COOKIE, token, this.refreshCookieOptions());
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(this.REFRESH_COOKIE, this.refreshCookieOptions());
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _rt, ...safe } = result;
    return ApiResponseDto.ok(safe, 'Account created successfully');
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with credentials' })
  async login(@Body() dto: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto, req.ip, req.get('user-agent'));
    if ('refreshToken' in result && result.refreshToken) {
      this.setRefreshCookie(res, result.refreshToken);
    }
    if ('refreshToken' in result) {
      const { refreshToken: _rt, ...safe } = result;
      return ApiResponseDto.ok(safe, 'Login successful');
    }
    return ApiResponseDto.ok(result, 'Login successful');
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const token = dto.refreshToken || req.cookies?.[this.REFRESH_COOKIE];
    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }
    const result = await this.authService.refreshTokens(token);
    this.setRefreshCookie(res, result.refreshToken);
    return ApiResponseDto.ok(result, 'Tokens refreshed');
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current session' })
  async logout(@CurrentUser('id') userId: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logout(userId);
    this.clearRefreshCookie(res);
    return ApiResponseDto.ok(result);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active sessions' })
  async getSessions(@CurrentUser('id') userId: string) {
    const sessions = await this.authService.getSessions(userId);
    return ApiResponseDto.ok(sessions);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  async getMe(@CurrentUser() user: any) {
    return ApiResponseDto.ok(user);
  }

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth() {}

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Req() req: any, @Res() res: any) {
    try {
      const result = await this.authService.googleLogin(req.user);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      this.setRefreshCookie(res, result.refreshToken);
      const params = new URLSearchParams({
        accessToken: result.accessToken,
      });
      return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
    } catch (error) {
      this.logger.error(`Google OAuth callback failed: ${error instanceof Error ? error.message : String(error)}`);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  }

  @Get('github')
  @Public()
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Initiate GitHub OAuth login' })
  async githubAuth() {}

  @Get('github/callback')
  @Public()
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  async githubCallback(@Req() req: any, @Res() res: any) {
    try {
      const result = await this.authService.githubLogin(req.user);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      this.setRefreshCookie(res, result.refreshToken);
      const params = new URLSearchParams({
        accessToken: result.accessToken,
      });
      return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?error=github_auth_failed`);
    }
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset link' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.authService.requestPasswordReset(dto.email);
    return ApiResponseDto.ok(result, 'If an account exists for this email, a reset link has been sent');
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(dto.token, dto.password);
    return ApiResponseDto.ok(result, 'Password has been reset successfully');
  }

  @Get('password-reset/validate')
  @Public()
  @ApiOperation({ summary: 'Validate a password reset token' })
  async validatePasswordReset(@Query('token') token: string) {
    const result = await this.authService.validatePasswordResetToken(token);
    return ApiResponseDto.ok(result, 'Reset token is valid');
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for the current user' })
  async changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    const result = await this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
    return ApiResponseDto.ok(result, 'Password updated. Please sign in again.');
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete the current user account' })
  async deleteAccount(@CurrentUser('id') userId: string, @Body() body: { password?: string }, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.deleteAccount(userId, body.password);
    this.clearRefreshCookie(res);
    return ApiResponseDto.ok(result, 'Account deleted');
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate 2FA secret and QR code URL' })
  async setup2FA(@CurrentUser('id') userId: string, @CurrentUser('email') email: string) {
    const result = await this.twoFactorService.generateSecret(userId, email);
    return ApiResponseDto.ok(result, '2FA secret generated');
  }
  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable 2FA with verification token' })
  async enable2FA(@CurrentUser('id') userId: string, @Body() dto: Verify2FATokenDto) {
    const result = await this.twoFactorService.enable2FA(userId, dto.token);
    return ApiResponseDto.ok(result);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA' })
  async disable2FA(@CurrentUser('id') userId: string, @Body() dto: Verify2FATokenDto) {
    const result = await this.twoFactorService.disable2FA(userId, dto.token);
    return ApiResponseDto.ok(result);
  }

  @Post('2fa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a 2FA token' })
  async verify2FA(@CurrentUser('id') userId: string, @Body() dto: Verify2FATokenDto) {
    const result = await this.twoFactorService.verify2FA(userId, dto.token);
    return ApiResponseDto.ok(result);
  }

  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get 2FA status' })
  async get2FAStatus(@CurrentUser('id') userId: string) {
    const result = await this.twoFactorService.get2FAStatus(userId);
    return ApiResponseDto.ok(result);
  }

  @Post('2fa/backup-codes/regenerate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate backup codes' })
  async regenerateBackupCodes(@CurrentUser('id') userId: string, @Body() dto: Verify2FATokenDto) {
    const result = await this.twoFactorService.regenerateBackupCodes(userId, dto.token);
    return ApiResponseDto.ok(result);
  }

  @Post('2fa/verify-login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login with 2FA code' })
  async verify2FALogin(@Body() dto: VerifyLoginDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verify2FAAndLogin(dto.tempToken, dto.code, req.ip, req.get('user-agent'));
    this.setRefreshCookie(res, result.refreshToken);
    return ApiResponseDto.ok(result, 'Login successful');
  }
}
