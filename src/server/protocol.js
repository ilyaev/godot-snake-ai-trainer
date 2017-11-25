var DQNAgent = require('reinforcenode').DQNAgent
const connectionCreator = require('./connection').connection

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
            io.sockets.on('connection', function(socket) {
                var connection = setupConnection(io, socket)
                connection.handshake()
                socket.on('command', function(data) {
                    connection.execCommand(data)
                })
            })
        }
    }
}

module.exports = protocol
