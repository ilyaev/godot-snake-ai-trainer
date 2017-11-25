const arenaCreator = require('./arena')

const colorText = (color, text) => {
    const tpl = '\x1b[%COLOR%m\x1b[1m' + text + '\x1b[0m'

    const map = {
        red: '31',
        yellow: '33',
        green: '32'
    }

    return tpl.replace('%COLOR%', map[color] ? map[color] : map.red)
}

const sendCommand = (socket, code, json) => {
    const data = JSON.stringify(Object.assign({}, { code: code.toUpperCase() }, json))
    console.log(colorText('green', code.toUpperCase()), data.substr(0, 100))
    socket.emit('response', data)
}

const connection = (io, socket) => {
    var id
    const arena = arenaCreator(io, socket, sendCommand)

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

                console.log(colorText('yellow', code), ' for #' + cmd.connectionId)

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
