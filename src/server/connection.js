const gridArenaCreator = require('./arena/grid')
const snakeArenaCreator = require('./arena/snake')
const colorText = require('./debug').colorText
const os = require('os')
const forkProcess = require('child_process').fork

const createWorker = socket => {
    var fork = false
    var id = 0
    var name = ''

    var send = obj => {
        if (fork) {
            if (obj.cmd === 'learn') {
                name = obj.modelName
            }
            fork.send(JSON.stringify(obj))
        }
    }

    var listeners = {}

    var status = {}

    return {
        start: () => {
            if (!fork) {
                fork = forkProcess('src/server/worker.js')
                fork.on('message', msg => {
                    let cmd = {}
                    try {
                        cmd = JSON.parse(msg)
                    } catch (e) {
                        cmd = { cmd: 'null' }
                    }
                    if (cmd.cmd === 'status') {
                        status = cmd
                    }
                    Object.keys(listeners).forEach(key => {
                        listeners[key](msg)
                    })
                })
                fork.on('exit', signal => {
                    console.log('WORKER ' + id + ': Terminated with signal ', signal)
                    fork = false
                })
                send({
                    cmd: 'HANDSHAKE',
                    id: id
                })
            }
            return fork
        },
        stop: () => {
            send({ cmd: 'finish' })
        },
        addListener: (key, cb) => {
            if (!listeners[key]) {
                listeners[key] = cb
            }
        },
        removeListener: key => {
            if (listeners[key]) {
                delete listeners[key]
            }
        },
        command: cmd => {
            if (!fork) {
                return
            }
            send(cmd)
        },
        setId: _id => {
            id = _id
        },
        getName: () => name,
        getStatus: () => status,
        isActive: () => (fork ? true : false)
    }
}

const sendCommand = (socket, code, json) => {
    const data = JSON.stringify(Object.assign({}, { code: code.toUpperCase() }, json))
    if (['SERVER_STATUS'].indexOf(code) === -1) {
        console.log(colorText('green', '▲' + code.toUpperCase()), ' for #' + socket.connectionId) //data.substr(0, 100))
    }
    socket.emit('response', data)
}

const getTimeMSFloat = () => {
    var hrtime = process.hrtime()
    return (hrtime[0] * 1000000 + hrtime[1] / 1000) / 1000
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

    var sendModel = name => {
        const scene = Object.keys(io.sockets.sockets).reduce((result, key) => {
            const cur = io.sockets.sockets[key]
            if (!cur.arena) {
                return result
            }
            return cur.arena.getScene().modelName === name ? cur.arena.getScene() : result
        }, false)
        if (scene) {
            sendCommand(socket, 'DOWNLOAD_MODEL', {
                modelName: name,
                spec: scene.spec,
                params: Object.assign({}, { maxX: scene.maxX, maxY: scene.maxY }, scene.params),
                maxX: scene.maxX,
                maxY: scene.maxY,
                actor: scene.actor,
                target: scene.target,
                aiName: scene.aiName,
                result: scene.result,
                brain: scene.agent.toJSON()
            })
        }
    }

    var sendServerStatus = () => {
        sendCommand(socket, 'SERVER_STATUS', {
            status: 'OK',
            learningCycles: io.learningCycles,
            upTime: getTimeMSFloat() - io.started,
            timestamp: socket.lastPoll,
            models: io.storage.list().map(one => {
                const worker = io.workers.get(one)
                const res = {
                    name: one,
                    worker: false
                }
                if (worker) {
                    res.worker = {
                        status: worker.getStatus(),
                        active: worker.isActive()
                    }
                } else {
                    const obj = io.storage.get(one)
                    res.worker = {
                        active: false,
                        status: {
                            result: obj.result,
                            spec: obj.spec,
                            counter: -1
                        }
                    }
                }
                return res
            }),
            workers: io.workers.list().map(one => {
                const worker = io.workers.get(one)
                return {
                    model: one,
                    id: worker.id,
                    status: worker.getStatus(),
                    active: worker.isActive()
                }
            }),
            clients: Object.keys(io.sockets.sockets).reduce((result, key) => {
                const cur = io.sockets.sockets[key]
                const one = {
                    key: key,
                    id: cur.connectionId,
                    arena: cur.arena
                        ? {
                              ai: cur.arena.getAiName(),
                              status: cur.arena.getStatus(),
                              result: cur.arena.getScene().result,
                              spec: cur.arena.getScene().spec
                          }
                        : null
                }
                result.push(one)
                return result
            }, [])
        })

        socket.lastPoll = getTimeMSFloat()
    }

    const initWorker = name => {
        if (socket.worker) {
            socket.worker.removeListener(id)
        }
        if (io.workers.get(name)) {
            console.log(colorText('green', 'Catch'), 'worker for ', name)
            socket.worker = io.workers.get(name)
        } else {
            console.log(colorText('red', 'Create'), 'worker for ', name)
            socket.worker = createWorker(socket)
            io.workers.set(name, socket.worker)
        }
        socket.worker.setId(socket.connectionId)
        socket.worker.addListener(id, msg => {
            let cmd = {}
            try {
                cmd = JSON.parse(msg)
            } catch (e) {
                cmd = { cmd: 'null' }
            }
            arena.fromWorker(cmd)
        })
    }

    return {
        init: () => {
            id = Math.round(Math.random() * 10000000)
            socket.lastPoll = getTimeMSFloat()
            socket.sendCommand = sendCommand
            socket.connectionId = id
            socket.worker = false
            return id
        },
        disconnect: () => {
            if (!arena) {
                return
            }
            const scene = arena.getScene()
            if (socket.worker) {
                const worker = socket.worker
                worker.removeListener(socket.id)
            }
        },
        execCommand: data => {
            var cmd = {}
            try {
                cmd = JSON.parse(data)
                const code = cmd.cmd

                if (cmd.connectionId != id) {
                    return
                }

                if (['SERVER_STATUS'].indexOf(code) === -1) {
                    console.log(colorText('yellow', '▼' + code), ' for #' + cmd.connectionId + '@' + cmd.arena) // + ' / ' + logLoadAverage(true))
                }

                if (!arena) {
                    switch (cmd.arena) {
                        case 'SNAKE':
                            arena = snakeArenaCreator(io, socket, sendCommand)
                            break
                        default:
                            arena = gridArenaCreator(io, socket, sendCommand)
                    }
                    socket.arena = arena
                    console.log(colorText('magenta', 'Initialize Arena: ' + cmd.arena))
                }

                switch (code) {
                    case 'START':
                        arena.initGame(cmd)
                        break
                    case 'STATUS':
                        arena.sendStatus()
                        break
                    case 'SERVER_STATUS':
                        sendServerStatus()
                        break
                    case 'LOAD_AI':
                        initWorker(cmd.name)
                        arena.loadAI(cmd)
                        break
                    case 'STOP_GAME':
                        arena.stopGame(cmd)
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
                    case 'DOWNLOAD_MODEL':
                        socket.worker.command({ cmd: 'sync' })
                        setTimeout(() => {
                            sendModel(cmd.name)
                        }, 200)
                        break
                    case 'CHANGE_STATUS':
                        if (!cmd.status) {
                            io.stopWorker(cmd.name)
                        } else {
                            io.capWorkers(cmd.modelName)
                            setTimeout(() => {
                                initWorker(cmd.name)
                                const model = io.storage.get(cmd.name)
                                model.name = cmd.name
                                if (model) {
                                    arena.loadAI(cmd)
                                }
                            }, 200)
                        }
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
    sendCommand,
    getNow: getTimeMSFloat
}
