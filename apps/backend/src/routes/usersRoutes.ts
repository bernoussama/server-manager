import express from "express";
import  usersController  from "../controllers/usersController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { adminMiddleware } from "../middlewares/adminMiddleware";

const router: express.Router = express.Router();

// Get all users (admin only)
router.get("/", authMiddleware, adminMiddleware, usersController.getAllUsers);

// Get user by ID (admin only)
router.get("/:id", authMiddleware, adminMiddleware, usersController.getUserById);

// Create new user (admin only)
router.post("/", authMiddleware, adminMiddleware, usersController.createUser);

// Update user (admin only)
router.patch("/:id", authMiddleware, adminMiddleware, usersController.updateUser);

// Delete user (admin only)
router.delete("/:id", authMiddleware, adminMiddleware, usersController.deleteUser);

export default router;

