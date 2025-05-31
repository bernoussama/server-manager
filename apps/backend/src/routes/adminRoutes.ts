import express from "express";
import { checkAdminSetup, setupAdmin } from "../controllers/adminController";

const router: express.Router = express.Router();

// Check if admin setup is required (public route)
router.get("/setup/check", checkAdminSetup);

// Create first admin user (public route, only works if no admin exists)
router.post("/setup", setupAdmin);

export default router; 