import express from "express";
import  usersController  from "../controllers/usersController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router: express.Router = express.Router();

// Get all users
router.get("/", authMiddleware, usersController.getAllUsers);

// Get user by ID
router.get("/:id", authMiddleware, usersController.getUserById);

// Create new user
router.post("/", authMiddleware, usersController.createUser);

// Update user
router.patch("/:id", authMiddleware, usersController.updateUser);

// Delete user
router.delete("/:id", authMiddleware, usersController.deleteUser);

export default router;

