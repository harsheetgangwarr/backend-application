//verify that a user is there or not

import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

//next means my work is done and now pass to the next
export const verifyJWT = asyncHandler(async (req, _, next) => {
  //req hv cookies access from app.use(cookieparsor)
  //we are trying to get the access token from cookie or from the header method we get from ther use ("Authorization": "Bearer ")
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");


    if (!token) {
      throw new apiError(410, "Unauthorised User (auth)");
    }

    //if token is correct and verify , we get decoded informaton
    const decodedToken =  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new apiError(410, "Invalid access token  (auth.middleware");
    }

    //send this user
    req.user = user;
    next();
  } catch (error) {
    throw new apiError(401,error?.mesage || "Invalid access token verify JWT")
  }
});
