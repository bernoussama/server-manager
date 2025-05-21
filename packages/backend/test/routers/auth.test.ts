import { authRouter } from '../../src/routers/auth';
import { db } from '../../src/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { TRPCError } from '@trpc/server';
import type { UserSignupInputType, UserLoginInputType } from '@server-manager/shared/validators/userValidator';
import type { User } from '../../src/models/user';

// Mock the database interactions
jest.mock('../../src/lib/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock jsonwebtoken
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

// Create a caller for the auth router.
// For public procedures without context dependencies, context can be an empty object.
const caller = authRouter.createCaller({});

describe('authRouter', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('signup procedure', () => {
    it('should create a new user successfully', async () => {
      const input: UserSignupInputType = { email: 'test@example.com', password: 'password123' };
      const hashedPassword = 'hashedPassword';
      const mockUser: Omit<User, 'passwordHash' | 'createdAt' | 'updatedAt'> = { id: 1, email: input.email };
      
      // Mock db.select for checking existing user -> not found
      (db.select().from().where().limit as jest.Mock).mockResolvedValueOnce([]);
      // Mock bcrypt.hash
      mockedBcrypt.hash.mockResolvedValueOnce(hashedPassword);
      // Mock db.insert().returning for creating user
      (db.insert().values().returning as jest.Mock).mockResolvedValueOnce([{ id: mockUser.id, email: mockUser.email }]);

      const result = await caller.signup(input);

      expect(db.select().from().where().limit).toHaveBeenCalledTimes(1);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(input.password, 10); // 10 is SALT_ROUNDS from auth.ts
      expect(db.insert().values).toHaveBeenCalledWith({ email: input.email, passwordHash: hashedPassword });
      expect(result).toEqual({ message: 'User created successfully', user: mockUser });
    });

    it('should throw CONFLICT error if user already exists', async () => {
      const input: UserSignupInputType = { email: 'existing@example.com', password: 'password123' };
      const existingDbUser: User = { 
        id: 1, 
        email: input.email, 
        passwordHash: 'somehash', 
        createdAt: new Date(), 
        updatedAt: new Date() 
      };

      // Mock db.select for checking existing user -> found
      (db.select().from().where().limit as jest.Mock).mockResolvedValueOnce([existingDbUser]);

      await expect(caller.signup(input)).rejects.toThrowError(TRPCError);
      await expect(caller.signup(input)).rejects.toMatchObject({
        code: 'CONFLICT',
        message: 'User already exists',
      });
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(db.insert().values().returning).not.toHaveBeenCalled();
    });

    it('should throw INTERNAL_SERVER_ERROR if user creation fails in DB', async () => {
        const input: UserSignupInputType = { email: 'fail@example.com', password: 'password123' };
        const hashedPassword = 'hashedPassword';

        (db.select().from().where().limit as jest.Mock).mockResolvedValueOnce([]);
        mockedBcrypt.hash.mockResolvedValueOnce(hashedPassword);
        // Mock db.insert().returning to simulate database error (e.g., returning empty array)
        (db.insert().values().returning as jest.Mock).mockResolvedValueOnce([]);

        await expect(caller.signup(input)).rejects.toThrowError(TRPCError);
        await expect(caller.signup(input)).rejects.toMatchObject({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create user',
        });
    });
  });

  describe('login procedure', () => {
    const loginInput: UserLoginInputType = { email: 'user@example.com', password: 'password123' };
    const dbUser: User = { 
      id: 1, 
      email: loginInput.email, 
      passwordHash: 'hashedPasswordForLogin', 
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    const token = 'mockToken';

    it('should login successfully and return a token', async () => {
      // Mock db.select for finding user -> found
      (db.select().from().where().limit as jest.Mock).mockResolvedValueOnce([dbUser]);
      // Mock bcrypt.compare -> valid password
      mockedBcrypt.compare.mockResolvedValueOnce(true as never); // Cast to 'never' if type issues with boolean
      // Mock jwt.sign
      mockedJwt.sign.mockReturnValueOnce(token);

      const result = await caller.login(loginInput);
      
      const { passwordHash, ...expectedUserResponse } = dbUser;

      expect(db.select().from().where().limit).toHaveBeenCalledTimes(1);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginInput.password, dbUser.passwordHash);
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { userId: dbUser.id, email: dbUser.email },
        expect.any(String), // JWT_SECRET
        { expiresIn: '1h' }
      );
      expect(result).toEqual({ message: 'Login successful', token, user: expectedUserResponse });
    });

    it('should throw UNAUTHORIZED if user not found', async () => {
      // Mock db.select for finding user -> not found
      (db.select().from().where().limit as jest.Mock).mockResolvedValueOnce([]);

      await expect(caller.login(loginInput)).rejects.toThrowError(TRPCError);
      await expect(caller.login(loginInput)).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
      });
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
      expect(mockedJwt.sign).not.toHaveBeenCalled();
    });

    it('should throw UNAUTHORIZED if password does not match', async () => {
      // Mock db.select for finding user -> found
      (db.select().from().where().limit as jest.Mock).mockResolvedValueOnce([dbUser]);
      // Mock bcrypt.compare -> invalid password
      mockedBcrypt.compare.mockResolvedValueOnce(false as never);

      await expect(caller.login(loginInput)).rejects.toThrowError(TRPCError);
      await expect(caller.login(loginInput)).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
      });
      expect(mockedJwt.sign).not.toHaveBeenCalled();
    });

    it('should throw INTERNAL_SERVER_ERROR if user data is incomplete (no passwordHash)', async () => {
      const userWithoutPasswordHash = { ...dbUser };
      delete (userWithoutPasswordHash as any).passwordHash; // Simulate incomplete data

      (db.select().from().where().limit as jest.Mock).mockResolvedValueOnce([userWithoutPasswordHash as User]);
      
      await expect(caller.login(loginInput)).rejects.toThrowError(TRPCError);
      await expect(caller.login(loginInput)).rejects.toMatchObject({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'User data incomplete',
      });
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });
  });
});
