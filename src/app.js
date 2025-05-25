import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

import userRouter from "./routes/user.routes.js";
import chatbotRouter from "./routes/chatbot.routes.js";
import chatbotCharacteristicsRouter from "./routes/chatbotCharacteristics.routes.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/chatbot", chatbotRouter);
app.use("/api/v1/chatbotCharacteristics", chatbotCharacteristicsRouter);

export { app };
