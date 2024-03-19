class apiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = "" //error stack
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false; //success msz will go but status code will be fasle
    this.errors = errors;
    
    //handle api erros
    if(stack != null){
        this.stack = stack;
    }else{
        Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default apiError;