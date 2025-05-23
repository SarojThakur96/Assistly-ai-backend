import { pool } from "../db/index.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const addChatbot = asyncHandler(async (req, res) => {
  const { clerk_user_id, name } = req.body;

  if ([clerk_user_id, name].some((field) => field.trim() === "")) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "All fields are required"));
  }
  // check if boat already exist with this name
  const existedChatboat = await pool.query(
    `SELECT * FROM chatbots WHERE name = $1 AND clerk_user_id = $2`,
    [name, clerk_user_id]
  );
  if (existedChatboat.rows.length != 0) {
    return res
      .status(409)
      .json(new ApiResponse(409, null, "Chatbot already exist"));
  }

  // now create chatboat with clerk_user_id and name

  const result = await pool.query(
    `INSERT INTO chatbots (clerk_user_id, name)
        VALUES ($1, $2) RETURNING *`,
    [clerk_user_id, name]
  );
  const chatboatData = result.rows[0];

  return res
    .status(201)
    .json(new ApiResponse(200, chatboatData, "Chatbot added successfully"));
});
