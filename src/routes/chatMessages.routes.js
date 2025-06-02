import { Router } from "express";
import {
  getMessagesBySession,
  openAiChatCompletion,
  startNewChat,
} from "../controllers/chatMessages.controller.js";

const router = Router();

router.route("/startNewChat").post(startNewChat);
router.route("/getMessagesBySession").get(getMessagesBySession);
router.route("/sendMessages").post(openAiChatCompletion);

export default router;
