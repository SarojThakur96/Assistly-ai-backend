import { pool } from "../db/index.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import OpenAI from "openai";
import axios from "axios";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const startNewChat = asyncHandler(async (req, res) => {
  const { name, email, chatbotId } = req.body;

  if (!name || !email || !chatbotId) {
    return res
      .status(400)
      .json(
        new ApiResponse(400, null, "Name, email, and chatbotId are required.")
      );
  }

  const client = await pool.connect();
  try {
    // Always insert guest, allow duplicates
    const insertGuest = await client.query(
      "INSERT INTO guests (name, email) VALUES ($1, $2) RETURNING id",
      [name, email]
    );
    const guestId = insertGuest.rows[0].id;

    // Create chat session
    const chatSessionRes = await client.query(
      "INSERT INTO chat_sessions (chatbot_id, guest_id) VALUES ($1, $2) RETURNING id",
      [chatbotId, guestId]
    );
    const chatSessionId = chatSessionRes.rows[0].id;

    // Insert initial message
    const welcomeMessage = `Welcome ${name}!\nHow can I assist you today?`;
    await client.query(
      "INSERT INTO messages (chat_session_id, sender, content) VALUES ($1, $2, $3)",
      [chatSessionId, "ai", welcomeMessage]
    );

    await client.query("COMMIT");
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { chatSessionId, guestId },
          "New chat session started successfully"
        )
      );
  } catch (error) {
    await client.query("ROLLBACK");
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to start new chat session."));
  } finally {
    client.release();
  }
});

export const getMessagesBySession = asyncHandler(async (req, res) => {
  const { chat_session_id } = req.query;

  if (!chat_session_id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "chat_session_id is required."));
  }

  try {
    const result = await pool.query(
      "SELECT * FROM messages WHERE chat_session_id = $1 ORDER BY created_at ASC",
      [chat_session_id]
    );
    return res
      .status(200)
      .json(new ApiResponse(200, result.rows, "Messages fetched successfully"));
  } catch (err) {
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to fetch messages."));
  }
});

export const openAiChatCompletion = asyncHandler(async (req, res) => {
  const { chat_session_id, chatbot_id, content, name } = req.body;

  if (!chat_session_id || !chatbot_id || !content || !name) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          "Bad Request please provide all mandatory field "
        )
      );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    // step 1 : fetch chatbot characteristics by chatbot_id

    const { rows: chatbot_characteristics } = await client.query(
      "SELECT * FROM chatbot_characteristics WHERE chatbot_id = $1",
      [chatbot_id]
    );

    // if (chatbot_characteristics.length === 0) {
    //   return res
    //     .status(404)
    //     .json(
    //       new ApiResponse(
    //         404,
    //         null,
    //         "chatbot characteristics not found with this chatbot_id"
    //       )
    //     );
    // }

    // step 2 : fetch previous messages by chat_session_id

    const { rows: chat_messages } = await client.query(
      "SELECT * FROM messages WHERE chat_session_id = $1 ",
      [chat_session_id]
    );
    if (chat_messages.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            null,
            "chatbot messages not found with this chatbot_session_id"
          )
        );
    }

    const formattedPreviousMessages = chat_messages.map((message) => ({
      role: message.sender === "ai" ? "system" : "user",
      name: message.sender === "ai" ? "system" : name,
      content: message.content,
    }));

    // combine characteristics into a system prompt

    const systemPrompt = chatbot_characteristics
      .map((c) => c.content)
      .join(" + ");

    // If a generic question is asked which is not
    // relevant or in the same scope or domain as the points mentioned in the key information section, kindly
    // inform the user they're only allowed to search for the specified content.

    const messages = [
      {
        role: "system",
        name: "system",
        content: `You are a helpful assistant talking to ${name}.
             Use Emoji's where possible. Here
            is some key information that you need to be aware of, these are elements you may be asked about: ${systemPrompt}`,
      },
      ...formattedPreviousMessages,
      {
        role: "user",
        name: name,
        content: content,
      },
    ];

    // step: 3 send the message to OpenAI's completions API

    const openaiResponse = await openai.chat.completions.create({
      messages: messages,
      model: "gpt-3.5-turbo",
    });

    const aiResponse = openaiResponse?.choices?.[0]?.message?.content?.trim();

    if (!aiResponse) {
      return res
        .status(500)
        .json(new ApiResponse(500, null, "Failed to generate AI response "));
    }

    // step 4: save the user's message in the database with chat_session_id,content and sender("user")

    await client.query(
      "INSERT INTO messages (chat_session_id,sender,content) VALUES ($1,$2,$3) RETURNING *",
      [chat_session_id, "user", content]
    );

    // step 5: save the AI's message in the database with chat_session_id,content and sender("ai")

    const { rows: aiMessageResult } = await client.query(
      "INSERT INTO messages (chat_session_id,sender,content) VALUES ($1,$2,$3) RETURNING *",
      [chat_session_id, "ai", aiResponse]
    );

    // step 6: return the AI's response to the client

    await client.query("COMMIT");

    return res.status(200).json({
      id: aiMessageResult[0].id,
      content: aiResponse,
    });
  } catch (error) {
    console.log(error);
    await client.query("ROLLBACK");
    return res
      .status(500)
      .json(new ApiResponse(500, error, "Failed to connect with ai."));
  } finally {
    client.release();
  }
});

// export const openAiChatCompletion = asyncHandler(async (req, res) => {
//   const { chat_session_id, chatbot_id, content, name } = req.body;

//   if (!chat_session_id || !chatbot_id || !content || !name) {
//     return res
//       .status(400)
//       .json(
//         new ApiResponse(
//           400,
//           null,
//           "Bad Request please provide all mandatory fields"
//         )
//       );
//   }

//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");

//     // Step 1: Fetch chatbot characteristics
//     const { rows: chatbot_characteristics } = await client.query(
//       "SELECT * FROM chatbot_characteristics WHERE chatbot_id = $1",
//       [chatbot_id]
//     );

//     if (chatbot_characteristics.length === 0) {
//       return res
//         .status(404)
//         .json(
//           new ApiResponse(
//             404,
//             null,
//             "Chatbot characteristics not found with this chatbot_id"
//           )
//         );
//     }

//     // Step 2: Fetch previous messages
//     const { rows: chat_messages } = await client.query(
//       "SELECT * FROM messages WHERE chat_session_id = $1",
//       [chat_session_id]
//     );

//     if (chat_messages.length === 0) {
//       return res
//         .status(404)
//         .json(
//           new ApiResponse(
//             404,
//             null,
//             "Chatbot messages not found with this chat_session_id"
//           )
//         );
//     }

//     const formattedPreviousMessages = chat_messages.map((message) => ({
//       role: message.sender === "ai" ? "assistant" : "user",
//       content: message.content,
//     }));

//     // Step 3: Build system prompt
//     const systemPrompt = chatbot_characteristics
//       .map((c) => c.content)
//       .join(" + ");

//     const messages = [
//       {
//         role: "system",
//         content: `You are a helpful assistant talking to ${name}.
//           Use emoji's where possible. Here is some key information that you need to be aware of, these are elements you may be asked about: ${systemPrompt}`,
//       },
//       ...formattedPreviousMessages,
//       {
//         role: "user",
//         content: content,
//       },
//     ];

//     // Step 4: Send to Ollama
//     const ollamaResponse = await axios.post("http://localhost:11434/api/chat", {
//       model: "llama3.2",
//       messages: messages,
//       stream: false,
//     });

//     const aiResponse = ollamaResponse?.data?.message?.content?.trim();

//     if (!aiResponse) {
//       return res
//         .status(500)
//         .json(new ApiResponse(500, null, "Failed to generate AI response"));
//     }

//     // Step 5: Save user message
//     await client.query(
//       "INSERT INTO messages (chat_session_id, sender, content) VALUES ($1, $2, $3)",
//       [chat_session_id, "user", content]
//     );

//     // Step 6: Save AI message
//     const { rows: aiMessageResult } = await client.query(
//       "INSERT INTO messages (chat_session_id, sender, content) VALUES ($1, $2, $3) RETURNING *",
//       [chat_session_id, "ai", aiResponse]
//     );

//     await client.query("COMMIT");

//     return res.status(200).json({
//       id: aiMessageResult[0].id,
//       content: aiResponse,
//     });
//   } catch (error) {
//     console.error("Ollama Chat Error:", error.message);
//     await client.query("ROLLBACK");
//     return res
//       .status(500)
//       .json(new ApiResponse(500, error, "Failed to connect with AI."));
//   } finally {
//     client.release();
//   }
// });
