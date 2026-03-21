class ApiResponse {
  constructor(statusCode, data = null, message = "Success") {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    this.errors = null;
  }

  static success(data, message = "Success", statusCode = 200) {
    return new ApiResponse(statusCode, data, message);
  }

  static created(data, message = "Created successfully") {
    return new ApiResponse(201, data, message);
  }

  static badRequest(message = "Bad request", errors = null) {
    const response = new ApiResponse(400, null, message);
    response.errors = errors;
    return response;
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiResponse(401, null, message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiResponse(403, null, message);
  }

  static notFound(message = "Not found") {
    return new ApiResponse(404, null, message);
  }

  static conflict(message = "Conflict") {
    return new ApiResponse(409, null, message);
  }

  static internal(message = "Internal server error") {
    return new ApiResponse(500, null, message);
  }

  static validation(errors, message = "Validation failed") {
    return this.badRequest(message, errors);
  }

  static paginated(data, pagination, message = "Success") {
    return new ApiResponse(200, {
      items: data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit),
        hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrev: pagination.page > 1
      }
    }, message);
  }
}

module.exports = ApiResponse;
