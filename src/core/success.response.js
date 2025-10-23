
const StatusCode = {
   OK: 200,
   CREATED: 201,
}

const ReasonStatusCode = {
    OK: "OK",
    CREATED: "Created"
}

class SuccessResponse{

    constructor({message, status = StatusCode.OK, reasonStatusCode = ReasonStatusCode.OK, metadata = {}}){
        this.message = !message ? reasonStatusCode : message
        this.status = status
        this.metadata = metadata
    }

    send(res, headers={}){
        return res.status(this.status).json(this)
    }
}

class OK extends SuccessResponse{
    constructor({message, metadata}){
        super({message, metadata})

    }
}
class CREATED extends SuccessResponse{
    constructor({options = {},message, status = StatusCode.CREATED, reasonStatusCode = ReasonStatusCode.CREATED, metadata}){
        super({message, status, reasonStatusCode, metadata})
        this.options = options
    }
}

module.exports = {
    OK,
    CREATED,
    SuccessResponse
}