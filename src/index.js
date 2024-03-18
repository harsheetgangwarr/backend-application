import dotenv from 'dotenv'
import connectDB from "./DB/index.js";

dotenv.config({
    path: './env' //where is our env file
})

connectDB() //since it reutrn a promise(async way?) 
.then(()=>{
    //since mongodb is connnected but app not listening
    app.listen(process.env.PORT|| 8000,()=>{
        console.log(`listening on ${process.env.PORT}`)
    } )
})
.catch((error)=>{
    console.log("Mongo DB Connection failed : ",error)
})


       













// const app = express()
// //iffy calling a function just after
// ;(async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     //if express cant able to listen
//     app.on("error", (error) => {
//       console.log("Error: ", error);
//       throw error;
//     });

//     app.listen(process.env.PORT, () => {
//       console.log(`Server is running on port ${process.env.PORT}`);
//     });
//   } catch (error) {
//     console.log("Error: ", error);
//   }
// })();
