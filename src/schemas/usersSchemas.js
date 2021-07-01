import joi from "joi";

const SignUpSchema=joi.object({
  name:joi.string().min(3).max(20).required().regex(/^[A-Za-z0-9 _]*[A-Za-z0-9][A-Za-z0-9 _]*$/),
  email: joi.string().min(3).email().required(),
  password: joi.string().min(6).required().regex(/^[a-zA-Z0-9]*$/)
});

const signInSchema=joi.object({ 
  email: joi.string().email().required(),
  password: joi.string().min(3).required().regex(/^[a-zA-Z0-9]*$/)
});

export{
  SignUpSchema,signInSchema
}