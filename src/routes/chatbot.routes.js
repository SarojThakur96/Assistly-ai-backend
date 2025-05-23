import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";

import { addChatbot } from "../controllers/chatbot.controller.js";

const router = Router();

router.route("/addChatbot").post(addChatbot);

export default router;
