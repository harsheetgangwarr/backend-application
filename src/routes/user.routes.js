import { Router } from "express";
import registerUser, {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
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
    },
    //two objects for images and avatar in 1 file
  ]),
  registerUser
);

router.route("/login").post(loginUser);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateAccountDetails); //here we use patch so that badme sab kuch update na hojae
router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

router
  .route("/cover-image")
  .patch(verifyJWT, upload.single("coverimage"), updateUserCoverImage);

router.route("/c/:username").get(verifyJWT, getUserChannelProfile); //for params we use different syntax
router.route("/history").get(verifyJWT, getWatchHistory);
export default router;
