//here we have to use asyncHandler
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "./../utils/apiError.js";
import { User } from "./../models/user.models.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import apiResponse from "../utils/apiResponse.js";
import { jwt } from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new apiError(
        404,
        "User not found while generating access and refresh tokens"
      );
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    //now put refresh token in the database so we havenot to ask user to add password again and again

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); //just simply update the refresh token and not check the password or other fields and save into the database

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    throw new apiError(
      500,
      "Something went wrong while generating access and refresh tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  /**
   * 1.Get details of the user`
   * 2.Validate the data by the user (not empty)
   * 3.Check if the user exists in the database:check by username and email
   * 4.Check for images, check avatar
   * 5.upload the image to cloudinary,and check the avatar again
   * 6.Create user object-create an extry in the database
   * 7.remove the password and referenceToken field from the response
   * 8.Check for user creation
   * 9.return the response(if user successfully created)
   */

  //1 step
  const { fullname, email, password, username } = req.body;
  //some advanced code

  //2 step
  if (
    //checks for all fields and trims it down . and eben after trimming it is empty then means empty value
    [username, fullname, email, password].some(
      (fields) => fields?.trim() === ""
    )
  ) {
    throw new apiError(404, "All fields are required");
  }

  //3 step
  const existedUSer = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUSer) {
    throw new apiError(404, "User already exists");
  }

  //4 step (req.files from multer gives us object and we can extract path from it)
  const avatarLocalPath = await req.files?.avatar[0]?.path;

  //if coverimage not present
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverimage) &&
    req.files.coverimage.length > 0
  ) {
    coverImageLocalPath = req.files.coverimage[0].path;
  }

  if (!avatarLocalPath) {
    throw new apiError(404, "Avatar not found");
  }

  //5 step
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverimage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new apiError(404, "Avatar in 61 line not found");
  }

  //6 step create user with given data
  const user = await User.create({
    fullname,
    email,
    password,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverimage: coverimage?.url || "", //since coveriamge can be availabel or not
  });

  //7 step
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" //initail all are select and - denotes to remove it
  );

  //8 step
  if (!createdUser) {
    throw new apiError(500, "Something went wrong while creating user");
  }

  //9 step return response in a good way
  return res
    .status(201)
    .json(new apiResponse(200, createdUser, "User created successfully"));
});

export const loginUser = asyncHandler(async (req, res) => {
  /**
   * req-body ->data
   * username / email
   * find the user
   * check the password
   * generate access and refresh token
   * send cookie
   */

  const { email, username, password } = req.body;

  //either one of them
  if (!(username || email)) {
    throw new apiError(404, "Username or email is required");
  }
  //mongoDB ka User
  const user = await User.findOne({
    $or: [{ username }, { email }], //to get user from different fields
  });
  //hamara user
  if (!user) {
    throw new apiError(404, "User not exist");
  }

  //check password
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new apiError(401, "Invalid user credentials");
  }

  //generate access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // we dont want to send refreshToken and password to be sent to the user hence
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //send cookies (there are certain options(an object) we need to be follow)
  const options = {
    httpOnly: true,
    secure: true,
  };

  return (
    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      //good practice to send this kind of user (after,200 operation)
      .json(
        new apiResponse(
          200,
          { user: loggedInUser, accessToken, refreshToken },
          "User logged in successfully"
        )
      )
  );
});

//remove cookie and reset refreshToken before logging out
//here we have to design our own middleware since we dont have access to user._id(login k wqty to email , username se login krlia tha logout k  wqt thodi na email dengey)
export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true, //to definitely get new refreshToken value
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged out successfully"));
});

//making an endpoint so that if user s access token got expired , he can hit an api end point and refresh its access token

export const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken; //might b from mobile so we use body

  if (!incomingRefreshToken) {
    throw new apiError(401, "Refresh token not received");
  }

  //wrap inside try catch as some error might come
  try {
    //verify incoming token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken.user._id);

    if (!user) {
      throw new apiError(401, "user not found after incoming refresh token");
    }

    //check incoming refresh token and user's refresh token
    if (incomingRefreshToken != user?.refreshToken) {
      throw new apiError(401, "Refresh token is expired or used");
    }

    //if matched then generate new token by generateaccessandrefreshtoken funtion
    //since i have send in cookies so options is required

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new apiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Refresh token refreshed successfully"
        )
      );
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid refresh Token");
  }
});

export default registerUser;
