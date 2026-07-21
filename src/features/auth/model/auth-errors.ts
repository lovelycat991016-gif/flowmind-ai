import { zhCN } from "@/shared/i18n/zh-CN";

const AUTH_ERROR_MESSAGES: ReadonlyArray<readonly [string, string]> = [
  ["invalid login credentials", zhCN.auth.invalidCredentials],
  ["email not confirmed", zhCN.auth.emailUnconfirmed],
  ["user already registered", zhCN.auth.alreadyRegistered],
  ["password should be at least", zhCN.auth.passwordLength],
  ["token has expired or is invalid", zhCN.auth.otpCodeInvalid],
  ["email rate limit exceeded", zhCN.auth.otpRateLimited],
];

export function mapAuthError(providerMessage: string): string {
  const normalizedMessage = providerMessage.toLowerCase();
  const match = AUTH_ERROR_MESSAGES.find(([providerText]) =>
    normalizedMessage.includes(providerText),
  );

  return match?.[1] ?? zhCN.auth.authFailed;
}
