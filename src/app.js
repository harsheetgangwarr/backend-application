import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(cookieParser());

//limiting the length of request
app.use(
  express.json({
    limit: "24kb",
  })
);

//like spaces(" ") in the URL
app.use(
  express.urlencoded({
    extended: true,
    limit:"24kb"
  })
);

//to keep files like pdf ,favicon,image
app.use(express.static("public"));

export default app;
