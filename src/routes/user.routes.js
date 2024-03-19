import { Router } from "express";
import registerUser from "../controllers/user.controller.js";
import { upload } from "../midlewares/multer.middleware.js";

const router = Router();

//to upload files also,we use middlewares
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    }, //two objects for images and avatar in 1 file
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

export default router;
