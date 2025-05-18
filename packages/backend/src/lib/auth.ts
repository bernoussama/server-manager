import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import logger from './logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Store this in .env!
const SALT_ROUNDS = 10;

/**
 * Authentication service to handle password hashing and JWT operations
 */
class AuthService {
  /**
   * Hash a password
   * @param password - Plain text password to hash
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      return hashedPassword;
    } catch (error) {
      logger.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a password against a hash
   * @param password - Plain text password to verify
   * @param hash - Hash to verify against
   * @returns boolean indicating if password is valid
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      return isValid;
    } catch (error) {
      logger.error('Error verifying password:', error);
      throw new Error('Failed to verify password');
    }
  }

  /**
   * Generate a JWT token for a user
   * @param payload - Data to include in token
   * @returns JWT token
   */
  generateToken(payload: object): string {
    try {
      return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '1h', // Token expires in 1 hour
      });
    } catch (error) {
      logger.error('Error generating token:', error);
      throw new Error('Failed to generate token');
    }
  }

  /**
   * Verify a JWT token
   * @param token - JWT token to verify
   * @returns Decoded token payload
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      logger.error('Error verifying token:', error);
      throw new Error('Invalid token');
    }
  }
}

export const authService = new AuthService(); 