var DQNAgent = require('reinforcenode').DQNAgent
const connectionCreator = require('./connection').connection
const getNow = require('./connection').getNow
const storageCreator = require('./storage').storageCreator
var jsonfile = require('jsonfile')

const connections = {}

const maxWorkers = 1
const autoFlushMins = 30

const setupConnection = (io, socket) => {
    var connection = connectionCreator(io, socket)
    var connectionId = connection.init()
    socket.connectionId = connectionId
    socket.connection = connection
    return connection
}

const restoreStorage = io => {
    const models = ['second', 'third', 'fourth', 'fifth']
    models.forEach(one => {
        const fileName = __dirname.replace('server', 'models/' + one + '.json')
        jsonfile.readFile(fileName, (err, json) => {
            if (!err) {
                io.storage.set(one, json)
            }
        })
    })
}

const stopWorker = io => name => {
    const worker = io.workers.get(name)
    if (!worker) {
        return
    }
    worker.command({
        cmd: 'finish'
    })
}

const capWorkers = io => name => {
    let counter = 0
    io.workers
        .list()
        .filter(one => one != name)
        .filter(one => io.workers.get(one).isActive())
        .reduce((result, next) => {
            counter++
            return counter > maxWorkers - 1 ? result.concat(next) : result
        }, [])
        .forEach(one => io.workers.get(one).stop())
}

const protocol = io => {
    return {
        initialize: () => {
            io.instanceId = Math.round(Math.random() * 1000000)
            io.learningCycles = 0
            io.started = getNow()

            io.storage = storageCreator({
                persistent: true,
                onConnected: () => {
                    io.storage.restore()
                }
            })

            io.workers = storageCreator()

            //restoreStorage(io)

            io.stopWorker = stopWorker(io)
            io.capWorkers = capWorkers(io)

            setInterval(() => {
                console.log('---AutoFlush All Active Models----')
                io.storage
                    .list()
                    .filter(name => io.workers.get(name) && io.workers.get(name).isActive())
                    .forEach(io.storage.flush)
            }, autoFlushMins * 1000 * 60)

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
