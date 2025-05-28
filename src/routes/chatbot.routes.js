import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";

import {
  addChatbot,
  deleteChatbotById,
  getAllChatbotsForUser,
  getAllChatbotsWithMessages,
  getAllChatbotsWithSessionCount,
  updateChatbotNameById,
} from "../controllers/chatbot.controller.js";
import { getChatbotById } from "../controllers/chatbot.controller.js";

const router = Router();

router.route("/addChatbot").post(addChatbot);
router.route("/getChatbotById").get(getChatbotById);
router.route("/getChabotsByUserId").get(getAllChatbotsForUser);
router
  .route("/getAllChatbotsWithSessionCount")
  .get(getAllChatbotsWithSessionCount);
router.route("/deleteChatbotById").get(deleteChatbotById);
router.route("/updateChatbotNameById").post(updateChatbotNameById);
router.route("/getAllChatbotsWithMessages").get(getAllChatbotsWithMessages);

export default router;
