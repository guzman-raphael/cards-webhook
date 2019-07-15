const request = require('request')

async function restCall (options) {
    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
        if (error) return reject(error)

        return resolve({ body, response })
        })
    })
}

module.exports = {
    restCall
}