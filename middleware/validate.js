const { validationResult } = require('express-validator');

// Middleware to check validation results from express-validator
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0].msg;
    return res.status(400).json({
      error: firstError,
      errors: errors.array().map(err => ({ field: err.path || err.param, message: err.msg }))
    });
  }
  next();
}

module.exports = { validate };
