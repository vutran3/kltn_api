const {StatusCodes, ReasonPharases} = require('./httpStatusCode')

class ErrorResponse extends Error {
    constructor(message, status){
        super(message)
        this.status = status
    }
}

class ConflictRequestError extends ErrorResponse {
    constructor(
        message = ReasonPharases.CONFLICT,
        status = StatusCodes.CONFLICT
    ){
        super(message, status)
    }
}

class BadRequestError extends ErrorResponse {
    constructor(
        message = ReasonPharases.BAD_REQUEST,
        status = StatusCodes.BAD_REQUEST
    ) {
        super(message, status);
    }
}
class AuthFailureError extends ErrorResponse {
    constructor(
        message = ReasonPharases.UNAUTHORIZED,
        status = StatusCodes.UNAUTHORIZED
    ) {
        super(message, status);
    }
}

class NotFoundError extends ErrorResponse {
    constructor(
        message = ReasonPharases.NOT_FOUND,
        status = StatusCodes.NOT_FOUND
    ) {
        super(message, status);
    }
}
class ForbiddenError extends ErrorResponse {
    constructor(
        message = ReasonPharases.FORBIDDEN,
        status = StatusCodes.FORBIDDEN
    ) {
        super(message, status);
    }
}

class InternalServerError extends ErrorResponse {
    constructor(
        message = ReasonPharases.INTERNAL_SERVER_ERROR,
        status = StatusCodes.INTERNAL_SERVER_ERROR
    ) {
        super(message, status);
    }
}
module.exports = {
    ConflictRequestError,
    BadRequestError,
    AuthFailureError,
    NotFoundError,
    ForbiddenError,
    InternalServerError,
};