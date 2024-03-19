import multer from "multer";

//we use diskSTorage instead of memoryStorage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); //we getting the filename
  },
});

export const upload = multer({
  storage, //from es6
});
