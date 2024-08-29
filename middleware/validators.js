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

//support-validate
const contactSchema = Joi.object({
  firstName: Joi.string().min(2).max(30).allow('').messages({
    "string.base": "First name should be a type of text",
    "string.min": "First name should have a minimum length of 2",
  }),
  lastName: Joi.string().min(1).max(30).required().messages({
    "string.base": "Last name should be a type of text",
    "string.empty": "Last name cannot be empty",
    "string.min": "Last name should have a minimum length of 2",
    "any.required": "Last name is required",
  }),
  companyName: Joi.string().min(2).max(100).required().messages({
    "string.base": "Company name should be a type of text",
    "string.empty": "Company name cannot be empty",
    "string.min": "Company name should have a minimum length of 2",
    "any.required": "Company name is required",
  }),
  email: Joi.string().email().allow('').messages({
    "string.email": "Email must be a valid email address",
  }),
  phoneNumber: Joi.string().pattern(/^[0-9]+$/).allow('').messages({
    "string.pattern.base": "Phone number must be a valid number",
  }),
  message: Joi.string().min(5).required().messages({
    "string.base": "Message should be a type of text",
    "string.empty": "Message cannot be empty",
    "string.min": "Message should have a minimum length of 10",
    "any.required": "Message is required",
  }),
});

export const validateUser = (req, res, next) => {
  const { error } = userSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  next();
};


export const validateContact = (req, res, next) => {
  const { privacyChecked, ...rest } = req.body;
  const { error } = contactSchema.validate(rest);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  next();
};
