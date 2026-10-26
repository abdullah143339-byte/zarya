import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {}

  private getDriver(): 'smtp' | 'formsubmit' {
    const configured = this.configService.get('MAIL_DRIVER');
    if (configured === 'smtp' || configured === 'formsubmit') return configured;
    const hasSmtp = this.configService.get('SMTP_USER') && this.configService.get('SMTP_PASS');
    return hasSmtp ? 'smtp' : 'formsubmit';
  }

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;
    const user = this.configService.get('SMTP_USER');
    const pass = this.configService.get('SMTP_PASS');
    if (!user || !pass) return null;
    const port = Number(this.configService.get('SMTP_PORT')) || 465;
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST') || 'smtp.gmail.com',
      port,
      // Port 465 = implicit TLS; everything else (587 etc.) uses STARTTLS.
      secure: port === 465,
      auth: { user, pass },
    });
    return this.transporter;
  }

  private async sendViaSmtp(to: string, subject: string, html: string, text: string) {
    const transporter = this.getTransporter();
    if (!transporter) throw new Error('SMTP is not configured (SMTP_USER/SMTP_PASS missing)');
    const from = this.configService.get('SMTP_FROM') || 'NOVAX <noreply@zarya.app>';
    await transporter.sendMail({ from, to, subject, html, text });
  }

  private async sendViaFormSubmit(to: string, subject: string, html: string, text: string) {
    const origin = this.configService.get('FRONTEND_URL') || 'https://zarya.app';
    const endpoint = `https://formsubmit.co/ajax/${encodeURIComponent(to)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // FormSubmit rejects requests without a valid web-page referer.
        Referer: `${origin.replace(/\/$/, '')}/`,
      },
      body: JSON.stringify({
        email: to,
        _subject: subject,
        message: text,
        _template: 'table',
        _captcha: 'false',
      }),
    });
    if (!response.ok) {
      throw new Error(`FormSubmit relay returned HTTP ${response.status}`);
    }
    const body: any = await response.json();
    if (body && body.success === 'false') {
      throw new Error(body.message || 'FormSubmit relay rejected the email');
    }
  }

  async sendPasswordResetOtp(to: string, otp: string) {
    const subject = 'Your NOVAX password reset code';
    const text = `Your NOVAX password reset verification code is: ${otp}\n\nThis code is valid for 10 minutes. If you did not request a password reset, you can safely ignore this email.\n\n- NOVAX`;
    const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0F1115;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1115;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#171B22;border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px;">
                <p style="margin:0 0 6px;font-size:13px;color:#6C63FF;font-weight:bold;">NOVAX</p>
                <h1 style="margin:0 0 8px;font-size:20px;color:#FFFFFF;">Password reset verification</h1>
                <p style="margin:0 0 20px;font-size:14px;color:#9CA3AF;line-height:1.6;">
                  We received a request to reset your password. Use the code below to continue:
                </p>
                <div style="background:rgba(108,99,255,0.12);border:1px solid rgba(108,99,255,0.4);border-radius:12px;padding:16px;text-align:center;">
                  <span style="font-size:32px;font-weight:bold;letter-spacing:10px;color:#A78BFA;font-family:monospace;">${otp}</span>
                </div>
                <p style="margin:20px 0 0;font-size:13px;color:#6B7280;line-height:1.6;">
                  This code is valid for <strong>10 minutes</strong>. If you did not request a password reset, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px;background:rgba(255,255,255,0.03);">
                <p style="margin:0;font-size:12px;color:#6B7280;">&copy; ${new Date().getFullYear()} NOVAX &middot; Think Beyond Social</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    const driver = this.getDriver();
    const attempts: Array<'smtp' | 'formsubmit'> = driver === 'smtp' ? ['smtp', 'formsubmit'] : ['formsubmit', 'smtp'];
    let lastError: any = null;
    for (const attempt of attempts) {
      try {
        if (attempt === 'smtp') {
          await this.sendViaSmtp(to, subject, html, text);
        } else {
          await this.sendViaFormSubmit(to, subject, html, text);
        }
        this.logger.log(`Password reset OTP sent to ${to} via ${attempt}`);
        return;
      } catch (error: any) {
        this.logger.error(`Failed to send OTP email to ${to} via ${attempt}: ${error?.message}`);
        lastError = error;
      }
    }
    throw lastError || new Error('No mail driver available');
  }
}
