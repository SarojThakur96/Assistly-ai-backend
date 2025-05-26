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

// get chatbot by id
export const getChatbotById = asyncHandler(async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Chatbot ID is required"));
  }

  const query = `SELECT c.id, c.name,
        coalesce(json_agg(json_build_object(
        'id', cc.id,
        'content', cc.content
        ) ) FILTER (WHERE cc.id IS NOT NULL), '[]') AS chatbot_characteristics

      FROM chatbots c LEFT JOIN chatbot_characteristics cc 
      ON c.id = cc.chatbot_id 
      WHERE c.id = $1 
      GROUP BY c.id, c.name`;

  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Chatbot not found"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, result.rows[0], "Chatbot retrieved successfully")
    );
});

//delete chatbot by id
export const deleteChatbotById = asyncHandler(async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Chatbot ID is required"));
  }

  const result = await pool.query(
    `DELETE FROM chatbots WHERE id = $1 RETURNING *`,
    [id]
  );

  if (result.rows.length === 0) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Chatbot not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, result.rows[0], "Chatbot deleted successfully"));
});

//update chatbot name by id
export const updateChatbotNameById = asyncHandler(async (req, res) => {
  const { id, name } = req.body;

  if (!id || !name) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Chatbot ID and name are required"));
  }

  const result = await pool.query(
    `UPDATE chatbots SET name = $1 WHERE id = $2 RETURNING *`,
    [name, id]
  );

  if (result.rows.length === 0) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Chatbot not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, result.rows[0], "Chatbot updated successfully"));
});
