const successResponse = (res, data, message = 'Success') => {
  return res.json({
    success: true,
    message,
    data
  });
};

const errorResponse = (res, statusCode, message, details = null) => {
  const response = {
    success: false,
    error: message
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

const validationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    errors: errors
  });
};

const notFoundError = (res, resource = 'Resource') => {
  return res.status(404).json({
    success: false,
    error: `${resource} not found`
  });
};

const unauthorizedError = (res, message = 'Unauthorized access') => {
  return res.status(401).json({
    success: false,
    error: message
  });
};

const forbiddenError = (res, message = 'Access forbidden') => {
  return res.status(403).json({
    success: false,
    error: message
  });
};

const serverError = (res, error, message = 'Internal server error') => {
  console.error('Server error:', error);
  
  return res.status(500).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

module.exports = {
  successResponse,
  errorResponse,
  validationError,
  notFoundError,
  unauthorizedError,
  forbiddenError,
  serverError
};