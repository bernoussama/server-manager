import { usersRouter } from '../../src/routers/users';
import { db } from '../../src/lib/db';
import bcrypt from 'bcrypt';
import { TRPCError } from '@trpc/server';
import type { 
  UserCreateInputType, 
  UserUpdateInputType, 
  UserIdInputType,
  UserOutputType,
} from '@server-manager/shared/validators/userValidator';
import type { User } from '../../src/models/user'; // For full user object with passwordHash

// Mock the database interactions
jest.mock('../../src/lib/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    returning: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock logger
jest.mock('../../src/lib/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const caller = usersRouter.createCaller({});

// Helper to create a mock user object (including passwordHash)
const createMockDbUser = (id: number, email: string, overrides: Partial<User> = {}): User => ({
  id,
  email,
  passwordHash: `hashedPasswordFor${email}`,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Helper to create the expected sanitized user output
const createExpectedUserOutput = (dbUser: User): UserOutputType => ({
  id: dbUser.id,
  email: dbUser.email,
  createdAt: dbUser.createdAt,
  updatedAt: dbUser.updatedAt,
});


describe('usersRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll procedure', () => {
    it('should return an array of all users, sanitized', async () => {
      const mockDbUsers = [
        createMockDbUser(1, 'user1@example.com'),
        createMockDbUser(2, 'user2@example.com'),
      ];
      (db.select().from as jest.Mock).mockResolvedValueOnce(mockDbUsers);

      const result = await caller.getAll();

      expect(db.select().from).toHaveBeenCalledWith(expect.anything()); // 'users' model
      expect(result).toEqual(mockDbUsers.map(createExpectedUserOutput));
      expect(result[0]).not.toHaveProperty('passwordHash');
    });

    it('should throw INTERNAL_SERVER_ERROR if DB query fails', async () => {
        (db.select().from as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
        await expect(caller.getAll()).rejects.toThrowError(TRPCError);
        await expect(caller.getAll()).rejects.toMatchObject({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch users',
        });
    });
  });

  describe('getById procedure', () => {
    it('should return a sanitized user if found', async () => {
      const mockUser = createMockDbUser(1, 'test@example.com');
      (db.select().from().where().limit as jest.Mock).mockResolvedValueOnce([mockUser]);
      
      const input: UserIdInputType = { id: 1 };
      const result = await caller.getById(input);

      expect(db.select().from().where().limit).toHaveBeenCalledTimes(1);
      expect(result).toEqual(createExpectedUserOutput(mockUser));
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NOT_FOUND if user not found', async () => {
      (db.select().from().where().limit as jest.Mock).mockResolvedValueOnce([]);
      const input: UserIdInputType = { id: 99 };
      
      await expect(caller.getById(input)).rejects.toThrowError(TRPCError);
      await expect(caller.getById(input)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should throw BAD_REQUEST for invalid ID (e.g. non-positive)', async () => {
        // @ts-expect-error Testing invalid input type
        await expect(caller.getById({ id: 0 })).rejects.toThrowError(TRPCError);
        await expect(caller.getById({ id: 0 })).rejects.toMatchObject({
             code: 'BAD_REQUEST', // Zod parsing error becomes BAD_REQUEST
        });
    });
  });

  describe('create procedure', () => {
    const validInput: UserCreateInputType = { email: 'new@example.com', password: 'password123' };
    const hashedPassword = 'hashedNewPassword';

    it('should create and return a sanitized new user', async () => {
      const createdDbUser = createMockDbUser(3, validInput.email, { passwordHash: hashedPassword });
      (db.select().from().where().limit as jest.Mock).mockResolvedValueOnce([]); // No existing user
      mockedBcrypt.hash.mockResolvedValueOnce(hashedPassword);
      (db.insert().values().returning as jest.Mock).mockResolvedValueOnce([createdDbUser]);

      const result = await caller.create(validInput);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(validInput.password, 10);
      expect(db.insert().values).toHaveBeenCalledWith({ email: validInput.email, passwordHash: hashedPassword });
      expect(result).toEqual(createExpectedUserOutput(createdDbUser));
    });

    it('should throw CONFLICT if email already exists', async () => {
      const existingUser = createMockDbUser(1, validInput.email);
      (db.select().from().where().limit as jest.Mock).mockResolvedValueOnce([existingUser]);
      
      await expect(caller.create(validInput)).rejects.toThrowError(TRPCError);
      await expect(caller.create(validInput)).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('should throw INTERNAL_SERVER_ERROR if DB insertion fails', async () => {
        (db.select().from().where().limit as jest.Mock).mockResolvedValueOnce([]);
        mockedBcrypt.hash.mockResolvedValueOnce(hashedPassword);
        (db.insert().values().returning as jest.Mock).mockResolvedValueOnce([]); // DB returns empty

        await expect(caller.create(validInput)).rejects.toThrowError(TRPCError);
        await expect(caller.create(validInput)).rejects.toMatchObject({ 
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create user due to database error.' 
        });
    });
    
    it('should throw BAD_REQUEST for invalid email', async () => {
        const invalidInput = { email: 'invalid', password: 'password123' };
        await expect(caller.create(invalidInput)).rejects.toThrowError(TRPCError);
        await expect(caller.create(invalidInput)).rejects.toMatchObject({ code: 'BAD_REQUEST'});
    });

    it('should throw BAD_REQUEST for short password', async () => {
        const invalidInput = { email: 'new@example.com', password: '123' };
        await expect(caller.create(invalidInput)).rejects.toThrowError(TRPCError);
        await expect(caller.create(invalidInput)).rejects.toMatchObject({ code: 'BAD_REQUEST'});
    });
  });

  describe('update procedure', () => {
    const userId = 1;
    const originalUser = createMockDbUser(userId, 'original@example.com');
    
    it('should update user email and return sanitized user', async () => {
      const updateInputData: UserUpdateInputType = { email: 'updated@example.com' };
      const updatedDbUser = { ...originalUser, ...updateInputData, updatedAt: new Date() };
      
      (db.select().from().where().limit as jest.Mock)
        .mockResolvedValueOnce([originalUser]) // Check user exists
        .mockResolvedValueOnce([]); // Check new email conflict (none)
      (db.update().set().where().returning as jest.Mock).mockResolvedValueOnce([updatedDbUser]);

      const result = await caller.update({ id: userId, data: updateInputData });
      
      expect(db.update().set).toHaveBeenCalledWith(expect.objectContaining({ email: updateInputData.email, updatedAt: expect.any(Date) }));
      expect(result).toEqual(createExpectedUserOutput(updatedDbUser));
    });

    it('should throw NOT_FOUND if user to update does not exist', async () => {
      (db.select().from().where().limit as jest.Mock).mockResolvedValueOnce([]); // User not found
      
      await expect(caller.update({ id: 99, data: { email: 'any@example.com' } })).rejects.toThrowError(TRPCError);
      await expect(caller.update({ id: 99, data: { email: 'any@example.com' } })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should throw CONFLICT if updated email is taken by another user', async () => {
      const updateInputData: UserUpdateInputType = { email: 'taken@example.com' };
      const otherUserWithEmail = createMockDbUser(2, 'taken@example.com');

      (db.select().from().where().limit as jest.Mock)
        .mockResolvedValueOnce([originalUser]) // Original user exists
        .mockResolvedValueOnce([otherUserWithEmail]); // New email is taken by user ID 2
      
      await expect(caller.update({ id: userId, data: updateInputData })).rejects.toThrowError(TRPCError);
      await expect(caller.update({ id: userId, data: updateInputData })).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('should throw BAD_REQUEST if no data provided for update', async () => {
        await expect(caller.update({ id: userId, data: {} })).rejects.toThrowError(TRPCError);
        await expect(caller.update({ id: userId, data: {} })).rejects.toMatchObject({ code: 'BAD_REQUEST', message: 'No update data provided.' });
    });

    it('should throw INTERNAL_SERVER_ERROR if DB update fails', async () => {
        const updateInputData: UserUpdateInputType = { email: 'updated@example.com' };
        (db.select().from().where().limit as jest.Mock)
            .mockResolvedValueOnce([originalUser]) // Check user exists
            .mockResolvedValueOnce([]); // Check new email conflict (none)
        (db.update().set().where().returning as jest.Mock).mockResolvedValueOnce([]); // DB returns empty

        await expect(caller.update({ id: userId, data: updateInputData })).rejects.toThrowError(TRPCError);
        await expect(caller.update({ id: userId, data: updateInputData })).rejects.toMatchObject({ 
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update user due to database error.'
        });
    });
  });

  describe('delete procedure', () => {
    it('should delete a user successfully', async () => {
      const input: UserIdInputType = { id: 1 };
      (db.delete().where().returning as jest.Mock).mockResolvedValueOnce([{ id: input.id }]);
      
      const result = await caller.delete(input);
      
      expect(db.delete().where().returning).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ message: 'User deleted successfully', id: input.id });
    });

    it('should throw NOT_FOUND if user to delete does not exist', async () => {
      const input: UserIdInputType = { id: 99 };
      (db.delete().where().returning as jest.Mock).mockResolvedValueOnce([]); // No user returned
      
      await expect(caller.delete(input)).rejects.toThrowError(TRPCError);
      await expect(caller.delete(input)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
