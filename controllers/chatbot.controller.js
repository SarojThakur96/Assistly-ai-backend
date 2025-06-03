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

// get all chatbots for a user
export const getAllChatbotsForUser = asyncHandler(async (req, res) => {
  const { clerk_user_id } = req.query;

  if (!clerk_user_id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Clerk user ID is required"));
  }

  const query = `SELECT c.id, c.name,c.created_at,
        coalesce(json_agg(json_build_object(
        'id', cc.id,
        'content', cc.content
        ) ) FILTER (WHERE cc.id IS NOT NULL), '[]') AS chatbot_characteristics

      FROM chatbots c LEFT JOIN chatbot_characteristics cc 
      ON c.id = cc.chatbot_id 
      WHERE c.clerk_user_id = $1 
      GROUP BY c.id, c.name order by c.created_at DESC`;

  const result = await pool.query(query, [clerk_user_id]);

  return res
    .status(200)
    .json(new ApiResponse(200, result.rows, "Chatbots retrieved successfully"));
});

// get all chatbot by clerk_user_id, chatbot session count and guest info in json format

export const getAllChatbotsWithSessionCount = asyncHandler(async (req, res) => {
  const { clerk_user_id } = req.query;

  if (!clerk_user_id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Clerk user ID is required"));
  }

  const query = `
    SELECT 
      c.id, 
      c.name, 
      c.created_at,
      COUNT(cs.id) AS session_count,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', g.id,
            'name', g.name,
            'email', g.email,
            'created_at', g.created_at
          )
        ) FILTER (WHERE g.id IS NOT NULL), '[]'
      ) AS guests
    FROM chatbots c
    LEFT JOIN chat_sessions cs ON c.id = cs.chatbot_id
    LEFT JOIN guests g ON cs.guest_id = g.id
    WHERE c.clerk_user_id = $1
    GROUP BY c.id, c.name, c.created_at
    ORDER BY c.created_at DESC
  `;

  const result = await pool.query(query, [clerk_user_id]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result.rows,
        "Chatbots with session count retrieved successfully"
      )
    );
});

// get chatbot by id, guest info and messages info in json format

export const getAllChatbotsWithMessages = asyncHandler(async (req, res) => {
  const { guest_id } = req.query;

  if (!guest_id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Guest ID is required"));
  }

  const query = `
    SELECT 
      g.id, 
      g.name, 
      g.email,
      c.name as chatbot_name,
      g.created_at,
       COALESCE(json_agg(
         json_build_object(
           'id', m.id,
          'chat_session_id',m.chat_session_id,
          'content',m.content,
          'sender', m.sender,
          'created_at',m.created_at
         )
       ) FILTER (WHERE m.id IS NOT NULL),'[]') AS messages
    FROM guests g
    LEFT JOIN chat_sessions cs ON cs.guest_id = g.id
    LEFT JOIN messages m ON m.chat_session_id = cs.id
    LEFT JOIN chatbots c ON cs.chatbot_id = c.id
    WHERE g.id = $1
    GROUP BY g.id, g.name,g.email, g.created_at,c.name
  `;

  const result = await pool.query(query, [guest_id]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result.rows[0],
        "Chatbots with messages retrieved successfully"
      )
    );
});

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
