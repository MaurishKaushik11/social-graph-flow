import express from 'express';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { UserService } from '../services/userService';
import { createUserSchema, updateUserSchema, userIdSchema, friendshipSchema } from '../validation';
import type { ApiResponse, ValidationError } from '../types';
import { supabase } from '../database/connection';

const router = express.Router();
const userService = new UserService();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Validation error handler
function handleValidationError(error: any): ValidationError[] {
  if (error.name === 'ZodError') {
    return error.errors.map((err: any) => ({
      field: err.path.join('.'),
      message: err.message
    }));
  }
  return [{ field: 'unknown', message: error?.message || 'Unknown error' }];
}

// GET /api/users - Fetch all users
router.get('/users', limiter, async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    const response: ApiResponse<typeof users> = {
      success: true,
      data: users
    };
    res.json(response);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
  return;
});

// POST /api/users - Create new user
router.post('/users', limiter, async (req, res) => {
  try {
    const validatedData = createUserSchema.parse(req.body);
    const user = await userService.createUser(validatedData);

    const response: ApiResponse<typeof user> = {
      success: true,
      data: user,
      message: 'User created successfully'
    };
    res.status(201).json(response);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const response: ApiResponse<ValidationError[]> = {
        success: false,
        error: 'Validation error',
        data: handleValidationError(error)
      };
      return res.status(400).json(response);
    }

    console.error('Error creating user:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error?.message || 'Internal server error'
    };
    res.status(500).json(response);
  }
  return;
});

// GET /api/users/:id - Get user by ID
router.get('/users/:id', limiter, async (req, res) => {
  try {
    const { id } = userIdSchema.parse({ id: req.params.id });
    const user = await userService.getUserById(id);

    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<typeof user> = {
      success: true,
      data: user
    };
    res.json(response);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid user ID format'
      };
      return res.status(400).json(response);
    }

    console.error('Error fetching user:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
  return;
});

// PUT /api/users/:id - Update user
router.put('/users/:id', limiter, async (req, res) => {
  try {
    const { id } = userIdSchema.parse({ id: req.params.id });
    const validatedData = updateUserSchema.parse(req.body);

    const user = await userService.updateUser(id, validatedData);

    const response: ApiResponse<typeof user> = {
      success: true,
      data: user,
      message: 'User updated successfully'
    };
    res.json(response);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const response: ApiResponse<ValidationError[]> = {
        success: false,
        error: 'Validation error',
        data: handleValidationError(error)
      };
      return res.status(400).json(response);
    }

    console.error('Error updating user:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error?.message || 'Internal server error'
    };
    res.status(error?.message?.includes('not found') ? 404 : 500).json(response);
  }
  return;
});

// DELETE /api/users/:id - Delete user
router.delete('/users/:id', limiter, async (req, res) => {
  try {
    const { id } = userIdSchema.parse({ id: req.params.id });
    await userService.deleteUser(id);

    const response: ApiResponse<null> = {
      success: true,
      message: 'User deleted successfully'
    };
    res.json(response);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid user ID format'
      };
      return res.status(400).json(response);
    }

    console.error('Error deleting user:', error);
    const statusCode = error?.message?.includes('not found') ? 404 :
                      error?.message?.includes('active friendships') ? 409 : 500;

    const response: ApiResponse<null> = {
      success: false,
      error: error?.message || 'Internal server error'
    };
    res.status(statusCode).json(response);
  }
  return;
});

// POST /api/users/:id/link - Create friendship
router.post('/users/:id/link', limiter, async (req, res) => {
  try {
    const { id } = userIdSchema.parse({ id: req.params.id });
    const { userId } = friendshipSchema.parse(req.body);

    const friendship = await userService.createFriendship(id, userId);

    const response: ApiResponse<typeof friendship> = {
      success: true,
      data: friendship,
      message: 'Friendship created successfully'
    };
    res.status(201).json(response);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const response: ApiResponse<ValidationError[]> = {
        success: false,
        error: 'Validation error',
        data: handleValidationError(error)
      };
      return res.status(400).json(response);
    }

    console.error('Error creating friendship:', error);
    const statusCode = error?.message?.includes('not found') ? 404 :
                      error?.message?.includes('already exists') ? 409 : 500;

    const response: ApiResponse<null> = {
      success: false,
      error: error?.message || 'Internal server error'
    };
    res.status(statusCode).json(response);
  }
  return;
});

// DELETE /api/users/:id/unlink - Remove friendship
router.delete('/users/:id/unlink', limiter, async (req, res) => {
  try {
    const { id } = userIdSchema.parse({ id: req.params.id });
    const { userId } = friendshipSchema.parse(req.body);

    await userService.removeFriendship(id, userId);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Friendship removed successfully'
    };
    res.json(response);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const response: ApiResponse<ValidationError[]> = {
        success: false,
        error: 'Validation error',
        data: handleValidationError(error)
      };
      return res.status(400).json(response);
    }

    console.error('Error removing friendship:', error);
    const statusCode = error?.message?.includes('not found') ? 404 : 500;

    const response: ApiResponse<null> = {
      success: false,
      error: error?.message || 'Internal server error'
    };
    res.status(statusCode).json(response);
  }
  return;
});

// GET /api/graph - Get graph data
router.get('/graph', limiter, async (req, res) => {
  try {
    const graphData = await userService.getGraphData();

    const response: ApiResponse<typeof graphData> = {
      success: true,
      data: graphData
    };
    res.json(response);
  } catch (error: any) {
    console.error('Error fetching graph data:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
  return;
});

// POST /api/users/:id/hobbies - Add hobby to user
router.post('/users/:id/hobbies', limiter, async (req, res) => {
  try {
    const { id } = userIdSchema.parse({ id: req.params.id });
    const { hobbyName } = z.object({ hobbyName: z.string() }).parse(req.body);

    // Check if hobby exists, if not create it
    let { data: hobby } = await supabase
      .from('hobbies')
      .select('id')
      .eq('name', hobbyName)
      .single();

    if (!hobby) {
      const hobbyId = uuidv4();
      const { error } = await supabase
        .from('hobbies')
        .insert({ id: hobbyId, name: hobbyName });

      if (error) throw error;
      hobby = { id: hobbyId };
    }

    // Add hobby to user (if not already added)
    const { error } = await supabase
      .from('user_hobbies')
      .upsert({ user_id: id, hobby_id: hobby.id }, { onConflict: 'user_id,hobby_id' });

    if (error) throw error;

    const response: ApiResponse<null> = {
      success: true,
      message: `Added ${hobbyName} to user!`
    };
    res.status(201).json(response);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const response: ApiResponse<ValidationError[]> = {
        success: false,
        error: 'Validation error',
        data: handleValidationError(error)
      };
      return res.status(400).json(response);
    }

    console.error('Error adding hobby:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error?.message || 'Internal server error'
    };
    res.status(error?.message?.includes('not found') ? 404 : 500).json(response);
  }
  return;
});

// DELETE /api/users/:id/hobbies/:hobbyName - Remove hobby from user
router.delete('/users/:id/hobbies/:hobbyName', limiter, async (req, res) => {
  try {
    const { id } = userIdSchema.parse({ id: req.params.id });
    const { hobbyName } = z.object({ hobbyName: z.string() }).parse({ hobbyName: req.params.hobbyName });

    // Get hobby ID
    const { data: hobby } = await supabase
      .from('hobbies')
      .select('id')
      .eq('name', hobbyName)
      .single();

    if (!hobby) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Hobby not found'
      };
      return res.status(404).json(response);
    }

    // Remove hobby from user
    const { error } = await supabase
      .from('user_hobbies')
      .delete()
      .eq('user_id', id)
      .eq('hobby_id', hobby.id);

    if (error) throw error;

    const response: ApiResponse<null> = {
      success: true,
      message: `Removed ${hobbyName} from user!`
    };
    res.json(response);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const response: ApiResponse<ValidationError[]> = {
        success: false,
        error: 'Validation error',
        data: handleValidationError(error)
      };
      return res.status(400).json(response);
    }

    console.error('Error removing hobby:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error?.message || 'Internal server error'
    };
    res.status(500).json(response);
  }
  return;
});

export default router;
