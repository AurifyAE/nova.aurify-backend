import Joi from "joi";

const userSchema = Joi.object({
  userName: Joi.string().min(3).max(30).required().messages({
    "string.base": "Username should be a type of text",
    "string.empty": "Username cannot be empty",
    "string.min": "Username should have a minimum length of 3",
    "any.required": "Username is required",
  }),
  contact: Joi.string()
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      "string.pattern.base": "Contact must be a valid phone number",
      "any.required": "Contact is required",
    }),
  location: Joi.string().required().messages({
    "any.required": "Location is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Email must be a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password should have a minimum length of 6",
    "any.required": "Password is required",
  }),
});

export const validateUser = (req, res, next) => {
  const { error } = userSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  next();
};
