const gridArenaCreator = require('./arena/grid')
const snakeArenaCreator = require('./arena/snake')
const colorText = require('./debug').colorText
const os = require('os')

const sendCommand = (socket, code, json) => {
    const data = JSON.stringify(Object.assign({}, { code: code.toUpperCase() }, json))
    console.log(colorText('green', '▲' + code.toUpperCase()), ' for #' + socket.connectionId) //data.substr(0, 100))
    socket.emit('response', data)
}

const logLoadAverage = (get = false) => {
    const max = os.cpus().length
    const la = os.loadavg()[0]
    const per = la / max
    var color = 'green'
    if (per > 30) {
        color = 'yellow'
    } else if (per > 70) {
        color = 'red'
    }

    const result = colorText('magenta', 'LA: ') + colorText(color, Math.round(la * 1000) / 1000)
    if (!get) {
        console.log(result)
    }
    return result
}

const connection = (io, socket) => {
    var id
    var arena

    return {
        init: () => {
            id = Math.round(Math.random() * 10000000)
            socket.sendCommand = sendCommand
            return id
        },
        execCommand: data => {
            var cmd = {}
            try {
                cmd = JSON.parse(data)
                const code = cmd.cmd

                if (cmd.connectionId != id) {
                    return
                }
                console.log(colorText('yellow', '▼' + code), ' for #' + cmd.connectionId + '@' + cmd.arena) // + ' / ' + logLoadAverage(true))

                if (!arena) {
                    switch (cmd.arena) {
                        case 'SNAKE':
                            arena = snakeArenaCreator(io, socket, sendCommand)
                            break
                        default:
                            arena = gridArenaCreator(io, socket, sendCommand)
                    }
                    console.log(colorText('magenta', 'Initialize Arena: ' + cmd.arena))
                }

                switch (code) {
                    case 'START':
                        arena.initGame(cmd)
                        break
                    case 'STATUS':
                        arena.sendStatus()
                        break
                    case 'LOAD_AI':
                        arena.loadAI(cmd)
                        break
                    case 'SAVE_MODEL':
                        arena.saveModel(cmd)
                        break
                    case 'LEARNING_SCALE':
                        arena.updateLearningScale(cmd)
                        break
                    case 'LEARNING_SPEC':
                        arena.updateLearningSpec(cmd)
                        break
                }
            } catch (e) {
                console.log(e)
                socket.emit('server_error', 'Invalid command', e)
            }
        },
        handshake: () => {
            sendCommand(socket, 'handshake', {
                connectionId: id,
                serverInstanceId: io.instanceId
            })
        }
    }
}

module.exports = {
    connection,
    sendCommand
}
