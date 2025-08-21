
const {insertPredictHealth, findAllCheckResult} = require('../models/repositories/healthcheck.repo')

class HealthCheckService {
    static async insertPredictHealth(payload){
        return await insertPredictHealth(payload)
    }

    static async findAllResults({limit = 5, page = 1, sort = 'ctime'}){
        return await findAllCheckResult({limit,page,sort})
    }
}

module.exports = HealthCheckService