import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
//act as a plugin and is VERY IMPORTANT!!!

const videoSchema = new mongoose.Schema(
  {
    videoFile: {
      type: String, //from cloudinary url
      required: true,
    },
    thumbnail: {
      type: String, //from cloudinary url
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, //cloudinary sent time at which updated
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublishes: {
      type: Boolean,
      default: true,
    },
    videoowner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
