import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { pool } from "../db/index.js";

const registerUser = asyncHandler(async (req, res) => {
  const {
    first_name,
    middle_name,
    last_name,
    mobile_number,
    designation,
    email,
    role,
    password,
  } = req.body;
  if ([email, password].some((field) => field.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await pool.query(
    `select email from user_master where email = $1`,
    [email]
  );

  if (existedUser.rows.length != 0) {
    throw new ApiError(409, "User already exist with this username");
  }

  // const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverLocalPath = req.files?.cover[0]?.path;

  // let coverLocalPath;

  // if (
  //   req.files &&
  //   Array.isArray(req.files.cover) &&
  //   req.files.cover.length > 0
  // ) {
  //   coverLocalPath = req.files?.cover[0]?.path;
  // }

  // if (!avatarLocalPath) {
  //   throw new ApiError(400, "avatar file is required");
  // }

  // const avatar = await uploadOnCloudinary(avatarLocalPath);
  // const coverImage = await uploadOnCloudinary(coverLocalPath);

  // if (!avatar) {
  //   throw new ApiError(400, "avatar file is required");
  // }

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO user_master (first_name, middle_name, last_name, mobile_number, designation, email, role, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING user_id, email, role`,
    [
      first_name,
      middle_name,
      last_name,
      mobile_number,
      designation,
      email,
      role,
      hashedPassword,
    ]
  );

  if (!result.rows[0]) {
    throw new ApiError(500, "Something wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, result?.rows[0], "User Register Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    // throw new ApiError(400, "username or email is required");
    return res
      .status(400)
      .json(new ApiResponse(400, null, "username or email is required"));
  }

  const query = `SELECT * FROM user_master WHERE email = $1`;
  const { rows } = await pool.query(query, [email]);

  if (rows.length === 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "User does not exist"));
  }

  const user = rows[0];
  // Compare password
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "Invalid User Credentials"));
  }

  const accessToken = jwt.sign(
    { user_id: user.user_id, email: user.email },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "7d" }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  delete user.password_hash;
  delete user.created_at;

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: user,
          accessToken,
        },
        "User Logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // await User.findByIdAndUpdate(
  //   req.user._id,
  //   {
  //     $set: {
  //       refreshToken: undefined,
  //     },
  //   },
  //   {
  //     new: true,
  //   }
  // );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return (
    res
      .status(200)
      .clearCookie("accessToken", options)
      // .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User Logged Out"))
  );
});

export { registerUser, loginUser, logoutUser };
