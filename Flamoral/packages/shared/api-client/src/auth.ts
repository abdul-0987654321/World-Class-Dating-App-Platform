import { ApiClient } from './client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenResponse,
  VerifyEmailRequest,
  VerifyPhoneRequest,
  ResetPasswordRequest
} from '@flamoral/types';

export class AuthApi {
  constructor(private client: ApiClient) {}

  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.client.post<LoginResponse>('/auth/login', data);
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.client.post<RegisterResponse>('/auth/register', data);
  }

  async logout(): Promise<void> {
    return this.client.post<void>('/auth/logout');
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    return this.client.post<RefreshTokenResponse>('/auth/refresh', { refreshToken });
  }

  async verifyEmail(data: VerifyEmailRequest): Promise<void> {
    return this.client.post<void>('/auth/verify-email', data);
  }

  async resendEmailVerification(email: string): Promise<void> {
    return this.client.post<void>('/auth/resend-verification', { email });
  }

  async verifyPhone(data: VerifyPhoneRequest): Promise<void> {
    return this.client.post<void>('/auth/verify-phone', data);
  }

  async sendPhoneVerification(phone: string): Promise<void> {
    return this.client.post<void>('/auth/send-phone-verification', { phone });
  }

  async requestPasswordReset(email: string): Promise<void> {
    return this.client.post<void>('/auth/request-password-reset', { email });
  }

  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    return this.client.post<void>('/auth/reset-password', data);
  }

  async getCurrentUser(): Promise<any> {
    return this.client.get<any>('/auth/me');
  }
}
