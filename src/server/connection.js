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

    var deleteModel = name => {
        io.storage.unlink(name)
    }

    var createModel = (rawName, params) => {
        var name = rawName
            .replace(/[^a-z0-9]/gi, '')
            .substring(0, 15)
            .trim()
        if (io.storage.get(name)) {
            sendCommand(socket, 'ERROR', {
                error: 'Model [' + name + '] already exist'
            })
        } else {
            arena.createModel(name, params)
        }
    }

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
            connections: Object.keys(io.sockets.sockets).length,
            models: io.storage.list().map(one => {
                const worker = io.workers.get(one)
                const res = {
                    name: one,
                    worker: false
                }
                if (worker && worker.isActive()) {
                    res.worker = {
                        params: io.storage.get(one).params,
                        status: worker.getStatus(),
                        active: worker.isActive()
                    }
                } else {
                    const obj = io.storage.get(one)
                    res.worker = {
                        active: false,
                        spec: obj.spec,
                        params: obj.params,
                        status: {
                            result: obj.result,
                            spec: obj.spec,
                            counter: -1
                        }
                    }
                }
                return res
            }),
            workers: [],
            clients: Object.keys(io.sockets.sockets).reduce((result, key) => {
                const cur = io.sockets.sockets[key]
                const one = {
                    key: key,
                    id: cur.connectionId,
                    arena: cur.arena
                        ? {
                              ai: cur.arena.getAiName(),
                              status: cur.arena.getStatus(),
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
                    case 'LOAD_MODEL':
                        const model = io.storage.get(cmd.model)
                        if (!model) {
                            sendCommand(socket, 'ERROR', { error: 'Model not found: ' + cmd.model })
                            sendCommand(socket, 'LOAD_MODEL', { success: false, error: 'NOT_FOUND' })
                        } else {
                            sendCommand(socket, 'LOAD_MODEL', { success: true, model: model })
                        }
                        break
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
                    case 'UPDATE_MODEL':
                        if (cmd.name) {
                            if (cmd.name !== arena.getScene().modelName) {
                                console.log('Offlien update model: ', cmd.name, cmd.form)
                                const model = io.storage.get(cmd.name)
                                if (model) {
                                    model.spec = Object.assign({}, model.spec, cmd.form)
                                    io.storage.set(cmd.name, model)
                                    io.storage.flush(cmd.name)
                                }
                            } else {
                                console.log('Online updat emodel: ', cmd.name)
                                arena.updateModel(cmd.form)
                                io.storage.flush(cmd.name)
                            }
                        }
                        break
                    case 'LEARNING_SPEC':
                        arena.updateLearningSpec(cmd)
                        break
                    case 'DOWNLOAD_MODEL':
                        sendModel(cmd.name)
                        break
                    case 'DELETE_MODEL':
                        if (cmd.name) {
                            io.stopWorker(cmd.name)
                            deleteModel(cmd.name)
                        }
                        break
                    case 'CREATE_MODEL':
                        if (io.storage.list().length >= 10) {
                            sendCommand(socket, 'ERROR', { error: 'Maximum models count reached. Delete some' })
                        } else {
                            if (cmd.name && cmd.features.length > 0) {
                                createModel(cmd.name, cmd)
                            } else {
                                sendCommand(socket, 'ERROR', { error: "Model name or features is empty. I can't" })
                            }
                        }
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
                        break
                    default:
                        throw new Error('Unknown Command: ' + JSON.stringify(cmd))
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
