import mongoose from "mongoose";
import jwt from "jsonwebtoken";
//for encryption (need help of some mongoose hooks)
//jwt is a bearer token means that who bears it , is correct (means jiske pass yahi hoga uske passwords bhej dega)
import bcrypt from "bcrypt"; //for encryption (need help of some mongoose hooks)

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true, //for seacrh in optimise way
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, //cloudinary url
      required: true,
    },
    coverimage: {
      type: String,
    },
    watchhistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String, //password can be leak so here we keep i the form of string
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

//when data is saving ,just before encrypt passowrd (takes a call back funtion)
userSchema.pre("save", async function (next) {
  //encrypt password when only password is saved
  if (this.isModified("password")) {
    this.password =await bcrypt.hash(this.password, 10);
    next();
  } else {
    return next();
  }
});

//to check entered password by the user macthes with the encrypted password
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password); //return true if password is correct
};

userSchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullname,
      avatar: this.avatar,
      coverimage: this.coverimage,
      watchhistory: this.watchhistory,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = async function () {
    return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
