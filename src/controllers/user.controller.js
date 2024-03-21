//here we have to use asyncHandler
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "./../utils/apiError.js";
import { User } from "./../models/user.models.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import apiResponse from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

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

//basic activities while creating user
export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // if(! (isPasswordCorrect ===confirmPassword)){
  //   throw new apiError(401, "Passwords do not match");
  // }
  //in databse opration, 'User' is used
  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new apiError(401, "Invalid old password ");
  }

  user.password = newPassword;

  //since databse is in other continent
  await user.save({ validateBeforeSave: false });

  //Now return user tht password is saved succesfully
  return res
    .status(200)
    .json(new apiResponse(200, {}, "Password changed successfully"));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        { user: req.user },
        " Current User fetched successfully"
      )
    );
});

//now you can choose what details are you want a user can edit

export const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!(fullname && email)) {
    throw new apiError(401, "All fields are required (usr controler)");
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new apiError(401, "User not found");
  }

  user.fullname = fullname;
  user.email = email;
  await user
    .save({ validateBeforeSave: false })
    .select("-password -refreshToken");

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        { user: user },
        "Account details updated successfully"
      )
    );
});

//now if you want to update files
export const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  //we can directly save to the DB

  if (!avatarLocalPath) {
    throw new apiError(401, "Avatar path is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  //this avatar is whole object , but we eant just url

  if (!avatar.url) {
    throw new apiError(401, "Error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new apiResponse(200, { user: user }, "Avatar updated successfully"));
});

export const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  //we can directly save to the DB

  if (!coverImageLocalPath) {
    throw new apiError(401, "Cover Image path is missing");
  }

  const coverimage = await uploadOnCloudinary(coverImageLocalPath);

  //this avatar is whole object , but we eant just url

  if (!coverimage.url) {
    throw new apiError(401, "Error while uploading Cover Image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverimage: coverimage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(
      new apiResponse(200, { user: user }, "Cover Image updated successfully")
    );
});

//get channel info (name and all ) and apply aggregate pipleline
export const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new apiError(
      401,
      "Username is missing(usercontroller getusercahnnelprofile"
    );
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(), //basically channel ajaega
      },
    },
    {
      //finding subscribers
      $lookup: {
        from: "subscriptions", //jo data base me store hoti (Subscriber)
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    //finding the following ki hamne kitne kare hai
    {
      //subscribed to ki pipeline
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    //now we get subscribers and subscriberTi field and now add them up
    {
      $addFields: {
        //to get subscriber count
        subscribersCount: { $size: "$subscribers" },
        //to get subscribed to count
        channelsSubscribedToCount: { $size: "$subscribedTo" },
        //whether a subscriber is subscribed or not (user agr us particular)
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, " $subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    //now users have two more info about 1. Subscriber count 2. Subscriber to count
    //KON KON SI VALUE DENI HAI WO PASS KRDO AS 1 VALUE
    {
      $project: {
        username: 1,
        fullname: 1,
        email: 1,
        avatar: 1,
        coverimage: 1,
        isSubscribed: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
      },
    },
  ]);

  //we got channel mostly as a array
  if (!channel?.length) {
    throw new apiError(401, "Channel does not exist");
  }

  return res
    .status(200)
    .json(new apiResponse(200, channel[0], "Channel fetched successfully")); //we have to return 0 th index of the channel
});

//get watch histroy 
export const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id), //because we got _id as a string ans mongoose handles all
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchhistory",
        foreignField: "_id",
        as: "watchhistory",
        pipeline: [
          //nested pipelining because videos k andar bhi to owner hai
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [   //but we dont want to send whole user data but only few data
                {
                  $project: {
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                  },
                },
              ], 
            },
          },
          //now to make front end person work easier , we can send only one object instead of array of multiple object
          {
            $addFields: {
              owner: {
                $first: "$owner", //to send him just owner object
              },
            },
          },
        ],
      },
    },
  ]);

  return res
  .status(200)
  .json(
    new apiResponse(200, user[0].watchhistory, "Watch History fetched successfully")
  )
});

export default registerUser;
