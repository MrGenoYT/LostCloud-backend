
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
