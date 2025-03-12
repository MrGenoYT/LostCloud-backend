
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Send different error responses based on environment
  if (process.env.NODE_ENV === 'production') {
    return res.status(statusCode).json({
      success: false,
      message: statusCode === 500 ? 'Server Error' : message
    });
  } else {
    return res.status(statusCode).json({
      success: false,
      message,
      stack: err.stack,
      error: err
    });
  }
};

module.exports = errorHandler;
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Check for Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ 
      message: 'Validation Error', 
      errors: messages 
    });
  }
  
  // Check for Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({ 
      message: 'Duplicate field value entered' 
    });
  }
  
  // Check for JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      message: 'Invalid token' 
    });
  }
  
  // Check for JWT expiration
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      message: 'Token expired' 
    });
  }
  
  // Default server error
  res.status(500).json({
    message: 'Server Error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
};

module.exports = errorHandler;
