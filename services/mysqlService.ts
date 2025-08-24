// MySQL Service Layer - Replaces Firebase services
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { executeQuery, executeTransaction, generateUUID, timestampToDateTime, dateTimeToISO } from '@/database/config';
import { User, UserRole, UserFormData } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export interface SessionInfo {
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

// ========================================
// AUTHENTICATION SERVICES
// ========================================

export const authService = {
  /**
   * Authenticate user with email and password
   */
  async login(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    try {
      // Get user by email
      const users = await executeQuery<any>(
        'SELECT * FROM users WHERE email = ? AND email_verified = TRUE',
        [email]
      );

      if (users.length === 0) {
        return { success: false, message: 'Invalid email or password' };
      }

      const user = users[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Save session
      const sessionId = generateUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await executeQuery(
        `INSERT INTO user_sessions (id, user_id, token, expires_at, ip_address, user_agent) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, user.id, token, expiresAt, ipAddress, userAgent]
      );

      // Update last login
      await executeQuery(
        'UPDATE users SET last_login = NOW() WHERE id = ?',
        [user.id]
      );

      // Return user data (exclude password)
      const userData: User = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasErpAccess: user.has_erp_access,
        hasPayrollAccess: user.has_payroll_access,
        hasProjectsAccess: user.has_projects_access
      };

      return { success: true, user: userData, token };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  },

  /**
   * Verify JWT token and get user info
   */
  async verifyToken(token: string): Promise<AuthResult> {
    try {
      // Verify JWT
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      // Check if session exists and is valid
      const sessions = await executeQuery<any>(
        'SELECT * FROM user_sessions WHERE token = ? AND expires_at > NOW()',
        [token]
      );

      if (sessions.length === 0) {
        return { success: false, message: 'Session expired' };
      }

      // Get user data
      const users = await executeQuery<any>(
        'SELECT * FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (users.length === 0) {
        return { success: false, message: 'User not found' };
      }

      const user = users[0];
      const userData: User = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasErpAccess: user.has_erp_access,
        hasPayrollAccess: user.has_payroll_access,
        hasProjectsAccess: user.has_projects_access
      };

      return { success: true, user: userData, token };
    } catch (error) {
      console.error('Token verification error:', error);
      return { success: false, message: 'Invalid or expired token' };
    }
  },

  /**
   * Logout user and invalidate session
   */
  async logout(token: string): Promise<boolean> {
    try {
      await executeQuery(
        'DELETE FROM user_sessions WHERE token = ?',
        [token]
      );
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  },

  /**
   * Create new user account
   */
  async createUser(userData: UserFormData): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUsers = await executeQuery<any>(
        'SELECT id FROM users WHERE email = ?',
        [userData.email]
      );

      if (existingUsers.length > 0) {
        return { success: false, message: 'User with this email already exists' };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 12);

      // Generate user ID
      const userId = generateUUID();

      // Insert user
      await executeQuery(
        `INSERT INTO users (
          id, name, email, password_hash, role, 
          has_erp_access, has_payroll_access, has_projects_access, email_verified
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          userData.name,
          userData.email,
          passwordHash,
          userData.role,
          userData.hasErpAccess ?? true,
          userData.hasPayrollAccess ?? false,
          userData.hasProjectsAccess ?? false,
          true // Auto-verify email for now
        ]
      );

      const user: User = {
        id: userId,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        hasErpAccess: userData.hasErpAccess ?? true,
        hasPayrollAccess: userData.hasPayrollAccess ?? false,
        hasProjectsAccess: userData.hasProjectsAccess ?? false
      };

      return { success: true, user };
    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, message: 'Failed to create user account' };
    }
  }
};

// ========================================
// USER MANAGEMENT SERVICES
// ========================================

export const userService = {
  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    try {
      const users = await executeQuery<any>(
        `SELECT id, name, email, role, has_erp_access, has_payroll_access, 
                has_projects_access, created_at, last_login 
         FROM users 
         ORDER BY created_at DESC`
      );

      return users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasErpAccess: user.has_erp_access,
        hasPayrollAccess: user.has_payroll_access,
        hasProjectsAccess: user.has_projects_access
      }));
    } catch (error) {
      console.error('Get users error:', error);
      throw new Error('Failed to fetch users');
    }
  },

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      const users = await executeQuery<any>(
        `SELECT id, name, email, role, has_erp_access, has_payroll_access, has_projects_access 
         FROM users WHERE id = ?`,
        [id]
      );

      if (users.length === 0) return null;

      const user = users[0];
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasErpAccess: user.has_erp_access,
        hasPayrollAccess: user.has_payroll_access,
        hasProjectsAccess: user.has_projects_access
      };
    } catch (error) {
      console.error('Get user by ID error:', error);
      return null;
    }
  },

  /**
   * Update user
   */
  async updateUser(id: string, userData: Partial<UserFormData>): Promise<boolean> {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (userData.name !== undefined) {
        updates.push('name = ?');
        values.push(userData.name);
      }

      if (userData.role !== undefined) {
        updates.push('role = ?');
        values.push(userData.role);
      }

      if (userData.hasErpAccess !== undefined) {
        updates.push('has_erp_access = ?');
        values.push(userData.hasErpAccess);
      }

      if (userData.hasPayrollAccess !== undefined) {
        updates.push('has_payroll_access = ?');
        values.push(userData.hasPayrollAccess);
      }

      if (userData.hasProjectsAccess !== undefined) {
        updates.push('has_projects_access = ?');
        values.push(userData.hasProjectsAccess);
      }

      if (updates.length === 0) {
        return true; // No updates needed
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
      await executeQuery(query, values);

      return true;
    } catch (error) {
      console.error('Update user error:', error);
      return false;
    }
  },

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<boolean> {
    try {
      await executeQuery('DELETE FROM users WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Delete user error:', error);
      return false;
    }
  },

  /**
   * Change user password
   */
  async changePassword(id: string, newPassword: string): Promise<boolean> {
    try {
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await executeQuery(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [passwordHash, id]
      );
      return true;
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    }
  }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Clean up expired sessions
 */
export const cleanupExpiredSessions = async (): Promise<void> => {
  try {
    await executeQuery('DELETE FROM user_sessions WHERE expires_at < NOW()');
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
};

/**
 * Get active sessions count for a user
 */
export const getActiveSessionsCount = async (userId: string): Promise<number> => {
  try {
    const result = await executeQuery<{ count: number }>(
      'SELECT COUNT(*) as count FROM user_sessions WHERE user_id = ? AND expires_at > NOW()',
      [userId]
    );
    return result[0]?.count || 0;
  } catch (error) {
    console.error('Get active sessions error:', error);
    return 0;
  }
};

export default { authService, userService, cleanupExpiredSessions, getActiveSessionsCount };