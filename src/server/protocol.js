var DQNAgent = require('reinforcenode').DQNAgent
const connectionCreator = require('./connection').connection
const getNow = require('./connection').getNow
const storageCreator = require('./storage').storageCreator

const connections = {}

const setupConnection = (io, socket) => {
    var connection = connectionCreator(io, socket)
    var connectionId = connection.init()
    socket.connectionId = connectionId
    socket.connection = connection
    return connection
}

const protocol = io => {
    return {
        initialize: () => {
            io.instanceId = Math.round(Math.random() * 1000000)
            io.learningCycles = 0
            io.started = getNow()
            io.storage = storageCreator()
            io.workers = storageCreator()
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
