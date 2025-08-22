
const {insertPredictHealth, findAllCheckResults, deleteDataByDeviceId} = require('../models/repositories/healthcheck.repo')

class HealthCheckService {
    static async insertPredictHealth(payload){
        return await insertPredictHealth(payload)
    }

    static async findAllResults({limit = 5, page = 1, sort = 'ctime', from = null, to = null, deviceId}){
        return await findAllCheckResults({limit,page,sort,from,to,deviceId})
    }
    static async deleteDataById({deviceId}){
        return await deleteDataByDeviceId({deviceId})
    }

}

module.exports = HealthCheckService