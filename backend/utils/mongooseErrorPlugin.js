const mongooseErrorPlugin = (schema) => {
  // Handle duplicate key errors (MongoServerError 11000)
  schema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      
      // Provide more user-friendly error messages
      const fieldMessages = {
        email: 'Email address is already registered',
        [field]: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      };
      
      const message = fieldMessages[field] || `${field} already exists`;
      next(new Error(message));
    } else if (error.name === 'ValidationError') {
      // Handle Mongoose validation errors
      const errors = Object.values(error.errors).map(err => err.message);
      next(new Error(errors.join(', ')));
    } else if (error.name === 'CastError') {
      // Handle invalid ObjectId casting
      next(new Error(`Invalid ${error.path}: ${error.value}`));
    } else {
      next(error);
    }
  });

  // Handle duplicate key errors for update operations
  schema.post(['updateOne', 'updateMany', 'findOneAndUpdate'], function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      
      const fieldMessages = {
        email: 'Email address is already registered',
        [field]: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      };
      
      const message = fieldMessages[field] || `${field} already exists`;
      next(new Error(message));
    } else if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      next(new Error(errors.join(', ')));
    } else if (error.name === 'CastError') {
      next(new Error(`Invalid ${error.path}: ${error.value}`));
    } else {
      next(error);
    }
  });

  // Pre-save hook for additional validation
  schema.pre('save', function(next) {
    // Check for required fields that might be missed
    const requiredFields = this.schema.requiredPaths();
    const missingFields = requiredFields.filter(field => {
      const value = this.get(field);
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(field => {
        const schemaField = this.schema.path(field);
        return schemaField.options.displayName || field;
      });
      return next(new Error(`Missing required fields: ${fieldNames.join(', ')}`));
    }

    next();
  });
};

module.exports = mongooseErrorPlugin;
