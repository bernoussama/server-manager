import { Request, Response } from "express";
import { db } from "../lib/db";
import { usersTable } from "../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Validation schema for user input
const userSchema = z.object({
  name: z.string().min(2).max(50),
  age: z.number().min(0).max(150),
  email: z.string().email(),
});

export const usersController = {
  // Get all users
  async getAllUsers(req: Request, res: Response) {
    try {
      const users = await db.select().from(usersTable);
      return res.status(200).json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  // Get user by ID
  async getUserById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id));

      if (!user.length) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json(user[0]);
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  // Create new user
  async createUser(req: Request, res: Response) {
    try {
      const validation = userSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors
        });
      }

      const { name, age, email } = validation.data;

      const newUser = await db
        .insert(usersTable)
        .values({ name, age, email })
        .returning();

      return res.status(201).json(newUser[0]);
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: "Email already exists" });
      }
      console.error("Error creating user:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  // Update user
  async updateUser(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const validation = userSchema.partial().safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors
        });
      }

      const updateData = validation.data;

      const updatedUser = await db
        .update(usersTable)
        .set(updateData)
        .where(eq(usersTable.id, id))
        .returning();

      if (!updatedUser.length) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json(updatedUser[0]);
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: "Email already exists" });
      }
      console.error("Error updating user:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  // Delete user
  async deleteUser(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const deletedUser = await db
        .delete(usersTable)
        .where(eq(usersTable.id, id))
        .returning();

      if (!deletedUser.length) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
};

