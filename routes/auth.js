// routes/auth.js
import express from "express";
import { googleLogin, googleCallback } from "../controllers/auth.js";

const router = express.Router();

router.get("/google", googleLogin);        // /auth/google?type=student or admin
router.get("/google/callback", googleCallback);

export default router;
