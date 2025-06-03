import { Router } from "express";
import {
  addChatbotCharacteristic,
  deleteChatbotCharacteristicById,
  getChatbotCharacteristicsById,
} from "../controllers/ChatbotCharacteristics.controller.js";

const router = Router();

router.route("/addChatbotCharacteristic").post(addChatbotCharacteristic);
router
  .route("/getChatbotCharacteristicsById")
  .get(getChatbotCharacteristicsById);
router
  .route("/deleteChatbotCharacteristicsById")
  .get(deleteChatbotCharacteristicById);

export default router;
