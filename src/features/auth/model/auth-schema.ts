import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.");

const matchingPasswords = {
  password: passwordSchema,
  confirmPassword: z.string(),
};

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z
  .object({
    email: emailSchema,
    ...matchingPasswords,
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const updatePasswordSchema = z
  .object(matchingPasswords)
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
