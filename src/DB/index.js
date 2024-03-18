import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    
    console.log(`\n MongoDB conneted !! DB HOST: ${connectionInstance.connection.host}`);

  } catch (error) {
    console.log("Error is : ", error);
    //to exit if error comes
    process.exit(1);
  }
};

export default connectDB;
