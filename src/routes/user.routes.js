import { Router } from "express";
import registerUser, { loginUser, logoutUser, refreshAccessToken } from "../controllers/user.controller.js";
import { upload } from "../midlewares/multer.middleware.js";
import { verifyJWT } from "../midlewares/auth.middleware.js";

const router = Router();

//to upload files also,we use middlewares
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    }, 
    {
      name: "coverimage",
      maxCount: 1,
      }
      //two objects for images and avatar in 1 file
  ]),
  registerUser
);


router.route("/login").post( loginUser )

//secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken);

export default router;
