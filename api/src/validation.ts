import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string()
    .min(2, 'Username must be at least 2 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  age: z.number()
    .int('Age must be a whole number')
    .min(1, 'Age must be at least 1')
    .max(150, 'Age must be less than 150')
});

export const updateUserSchema = z.object({
  username: z.string()
    .min(2, 'Username must be at least 2 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  age: z.number()
    .int('Age must be a whole number')
    .min(1, 'Age must be at least 1')
    .max(150, 'Age must be less than 150')
    .optional()
});

export const userIdSchema = z.object({
  id: z.string().uuid('Invalid user ID format')
});

export const friendshipSchema = z.object({
  userId: z.string().uuid('Invalid user ID format')
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserIdInput = z.infer<typeof userIdSchema>;
export type FriendshipInput = z.infer<typeof friendshipSchema>;
