import express from "express";
import { usersController } from "../controllers/usersController";

const router = express.Router();

// Get all users
router.get("/", usersController.getAllUsers);

// Get user by ID
router.get("/:id", usersController.getUserById);

// Create new user
router.post("/", usersController.createUser);

// Update user
router.patch("/:id", usersController.updateUser);

// Delete user
router.delete("/:id", usersController.deleteUser);

export default router;

