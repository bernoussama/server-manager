import { Request, Response } from 'express';
import { db } from '../lib/db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const userController = {
  // Get all users
  async getAllUsers(req: Request, res: Response) {
    try {
      const users = await db.select().from(usersTable);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },

  // Get a single user by ID
  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, parseInt(id)))
        .get();

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  },

  // Create a new user
  async createUser(req: Request, res: Response) {
    try {
      const { name, age, email } = req.body;

      if (!name || !age || !email) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const newUser = await db.insert(usersTable)
        .values({
          name,
          age,
          email
        })
        .returning()
        .get();

      res.status(201).json(newUser);
    } catch (error) {
      if ((error as Error).message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: "Email already exists" });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  },

  // Update a user
  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, age, email } = req.body;

      const existingUser = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, parseInt(id)))
        .get();

      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await db.update(usersTable)
        .set({
          ...(name && { name }),
          ...(age && { age }),
          ...(email && { email })
        })
        .where(eq(usersTable.id, parseInt(id)))
        .returning()
        .get();

      res.json(updatedUser);
    } catch (error) {
      if ((error as Error).message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: "Email already exists" });
      }
      res.status(500).json({ error: "Failed to update user" });
    }
  },

  // Delete a user
  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const existingUser = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, parseInt(id)))
        .get();

      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      await db.delete(usersTable)
        .where(eq(usersTable.id, parseInt(id)));

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
};

