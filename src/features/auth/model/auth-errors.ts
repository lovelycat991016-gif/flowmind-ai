const AUTH_ERROR_MESSAGES: ReadonlyArray<readonly [string, string]> = [
  ["invalid login credentials", "Email or password is incorrect."],
  ["email not confirmed", "Confirm your email before signing in."],
  ["user already registered", "An account already exists for this email."],
  ["password should be at least", "Password must be at least 8 characters."],
];

export function mapAuthError(providerMessage: string): string {
  const normalizedMessage = providerMessage.toLowerCase();
  const match = AUTH_ERROR_MESSAGES.find(([providerText]) =>
    normalizedMessage.includes(providerText),
  );

  return match?.[1] ?? "Authentication failed. Please try again.";
}
