import { pool } from "../../db/index.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJwt = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json(new ApiResponse(401, null, "unauthorized request"));
    }

    const decodeToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
    console.log(decodeToken);

    const query = `SELECT * FROM user_master WHERE user_id = $1`;
    const { rows } = await pool.query(query, [decodeToken.user_id]);

    if (rows.length === 0) {
      return res
        .status(401)
        .json(new ApiResponse(401, null, "Invalid Access Token"));
    }

    const user = rows[0];
    req.user = user;
    next();
  } catch (error) {
    return res
      .status(401)
      .json(
        new ApiResponse(
          401,
          null,
          "Something went wrong while token verification"
        )
      );
  }
});
