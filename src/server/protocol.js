var DQNAgent = require('reinforcenode').DQNAgent
const connectionCreator = require('./connection').connection
const getNow = require('./connection').getNow
const storageCreator = require('./storage').storageCreator
var jsonfile = require('jsonfile')

const connections = {}

const setupConnection = (io, socket) => {
    var connection = connectionCreator(io, socket)
    var connectionId = connection.init()
    socket.connectionId = connectionId
    socket.connection = connection
    return connection
}

const restoreStorage = io => {
    const models = ['second']
    models.forEach(one => {
        const fileName = __dirname.replace('server', 'models/' + one + '.json')
        jsonfile.readFile(fileName, (err, json) => {
            if (!err) {
                io.storage.set(one, json)
            }
        })
    })
}

const protocol = io => {
    return {
        initialize: () => {
            io.instanceId = Math.round(Math.random() * 1000000)
            io.learningCycles = 0
            io.started = getNow()
            io.storage = storageCreator()
            io.workers = storageCreator()
            restoreStorage(io)
            io.sockets.on('connection', function(socket) {
                var connection = setupConnection(io, socket)
                connection.handshake()
                socket.on('command', function(data) {
                    connection.execCommand(data)
                })
                socket.on('disconnect', function(data) {
                    connection.disconnect()
                })
            })
        }
    }
}

module.exports = protocol
