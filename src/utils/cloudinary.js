import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
//fs is file system(read,write etc)
//we need path of file

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload file on cloud
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file has been uploaded successfully
    //unlink file
    fs.unlinkSync(localFilePath); //remove the locally saved temporary files as the upload operation got failed
    return response;
  } catch (error) {
    //now if files on server and not uploaded ,so remove from server
    fs.unlinkSync(localFilePath); //remove the locally saved temporary files as the upload operation got failed
    return null;
  }
};

cloudinary.uploader.upload(
  "https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
  { public_id: "olympic_flag" },
  function (error, result) {
    console.log(result);
  }
);

export default uploadOnCloudinary;
