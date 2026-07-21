import { z } from "zod";
import { zhCN } from "@/shared/i18n/zh-CN";

const emailSchema = z.string().trim().toLowerCase().email(zhCN.auth.validEmail);

const passwordSchema = z
  .string()
  .min(8, zhCN.auth.passwordLength)
  .max(128, zhCN.auth.passwordMax);

const matchingPasswords = {
  password: passwordSchema,
  confirmPassword: z.string(),
};

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, zhCN.auth.passwordRequired),
});

const otpTokenSchema = z
  .string()
  .trim()
  .min(1, zhCN.auth.otpCodeRequired)
  .regex(/^\d{6}$/, zhCN.auth.otpCodeInvalid);

export const emailOtpRequestSchema = z.object({ email: emailSchema });

export const emailOtpVerificationSchema = z.object({
  email: emailSchema,
  token: otpTokenSchema,
});

export const signUpSchema = z
  .object({
    email: emailSchema,
    ...matchingPasswords,
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: zhCN.auth.passwordMismatch,
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const updatePasswordSchema = z
  .object(matchingPasswords)
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: zhCN.auth.passwordMismatch,
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type EmailOtpRequestInput = z.infer<typeof emailOtpRequestSchema>;
export type EmailOtpVerificationInput = z.infer<
  typeof emailOtpVerificationSchema
>;
export type SignUpInput = z.infer<typeof signUpSchema>;
