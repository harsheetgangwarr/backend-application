//this is wrapper function used many where in the code

const asyncHandler = (requestHandler) => {
 return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((error) =>
      next(error)
    );
  };
}; //by promises

export default asyncHandler;

//this is try catch wala method

// const asyncHandler = (fn) => {
//   async (req,res,next) => {
//     try{
//          await fn(req,res,next);
//     }
//     catch(error){
//         res.status(error.status||500 .json({
//             success:false,
//             message:error.message
//         }))
//     }
//   };
// };

//async can be 1.Promises 2.Async await
