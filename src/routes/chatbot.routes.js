import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";

import {
  addChatbot,
  deleteChatbotById,
} from "../controllers/chatbot.controller.js";
import { getChatbotById } from "../controllers/chatbot.controller.js";

const router = Router();

router.route("/addChatbot").post(addChatbot);
router.route("/getChatbotById").get(getChatbotById);
router.route("/deleteChatbotById").get(deleteChatbotById);

export default router;
