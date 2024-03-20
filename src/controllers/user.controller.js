//here we have to use asyncHandler

import asyncHandler from "../utils/asyncHandler.js";
import apiError from "./../utils/apiError.js";
import { User } from "./../models/user.models.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import apiResponse from "../utils/apiResponse.js";

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
   if(req.files && Array.isArray(req.files.coverimage) &&
   req.files.coverimage.length>0){
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

export default registerUser;
