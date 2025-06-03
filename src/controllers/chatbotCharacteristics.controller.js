import { pool } from "../../index.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Add a new characteristic to a chatbot
export const addChatbotCharacteristic = asyncHandler(async (req, res) => {
  const { chatbot_id, content } = req.body;

  if ([chatbot_id, content].some((field) => field.trim() === "")) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "All fields are required"));
  }

  // Check if the characteristic already exists for this chatbot
  const existedCharacteristic = await pool.query(
    `SELECT * FROM chatbot_characteristics WHERE chatbot_id = $1 AND content = $2`,
    [chatbot_id, content]
  );

  if (existedCharacteristic.rows.length != 0) {
    return res
      .status(409)
      .json(new ApiResponse(409, null, "Characteristic already exists"));
  }

  // Insert the new characteristic
  const result = await pool.query(
    `INSERT INTO chatbot_characteristics (chatbot_id, content)
     VALUES ($1, $2) RETURNING *`,
    [chatbot_id, content]
  );

  const characteristicData = result.rows[0];

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        characteristicData,
        "Characteristic added successfully"
      )
    );
});

// Get all characteristics of a chatbot by its ID
export const getChatbotCharacteristicsById = asyncHandler(async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Chatbot ID is required"));
  }

  const query = `SELECT cc.id, cc.content
                 FROM chatbot_characteristics cc
                 WHERE cc.chatbot_id = $1`;

  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    return res
      .status(404)
      .json(
        new ApiResponse(404, null, "No characteristics found for this chatbot")
      );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result.rows,
        "Chatbot characteristics retrieved successfully"
      )
    );
});

// Delete a characteristic by its ID
export const deleteChatbotCharacteristicById = asyncHandler(
  async (req, res) => {
    const { id } = req.query;

    if (!id) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Characteristic ID is required"));
    }

    const result = await pool.query(
      `DELETE FROM chatbot_characteristics WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Characteristic not found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          result.rows[0],
          "Characteristic deleted successfully"
        )
      );
  }
);
