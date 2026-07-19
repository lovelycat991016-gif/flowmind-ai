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
export type SignUpInput = z.infer<typeof signUpSchema>;
