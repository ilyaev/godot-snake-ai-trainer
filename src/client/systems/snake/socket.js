import ioClient from 'socket.io-client'
import { DQNAgent } from 'reinforcenode'

const socket = function(state) {
    const scene = state.scene

    var io =
        document.location.href.indexOf('localhost') !== -1
            ? ioClient('http://localhost:8080')
            : ioClient('http://godot-snake-ai-trainer.herokuapp.com')
    var started = 0
    var fromLastWin = 0
    var wins = 0
    var lastClear = 0
    var connectionId = 0
    var serverInstanceId = 0
    const events = {}

    const sendCommand = data => {
        io.emit('command', JSON.stringify(Object.assign({}, { connectionId, serverInstanceId, arena: 'SNAKE' }, data)))
    }

    var consol
    var dashboard

    var startNewExperiment = () => {
        started = performance.now()
        fromLastWin = started
        lastClear = started
        sendCommand({
            cmd: 'START',
            maxX: scene.maxX,
            maxY: scene.maxY,
            target: scene.target,
            spec: scene.spec,
            actor: scene.defaultActor,
            name: scene.modelName
        })
    }

    var updateStatusDashboard = cmd => {
        let rows = []
        let my
        const other = []

        rows.push('---Server: ' + cmd.status + ', UT: ' + Math.floor(cmd.upTime / 1000) + 's' + ', LS: ' + cmd.learningCycles)
        rows.push(
            '---Models: ' + cmd.models.map(one => '<a style="color:#e1822d" href="#' + one + '" target="_blank">' + one + '</a>').join(', ')
        )
        rows.push('---Silent workers: ' + cmd.workers.map(one => one.model).join(', '))
        cmd.clients.forEach(one => {
            if (one.id == connectionId) {
                my = one
            }
            let row = []
            row.push(one.id)
            if (one.arena) {
                row.push(one.arena.ai)
                row.push(one.arena.status)
                row.push('Steps: ' + one.arena.result.step)
                row.push('Goals: ' + one.arena.result.wins)
                row.push('E: ' + Math.round(one.arena.spec.epsilon * 1000) / 1000)
            }
            other.push(row.join(', '))
        })

        rows.push('---My Connection ' + my.id)
        rows.push('---All Clients: ' + cmd.clients.length)

        dashboard.set(rows.concat(other).join('<br>'))
    }

    io.on('response', response => {
        var cmd = {}
        try {
            cmd = JSON.parse(response)
            if (cmd.code === 'HANDSHAKE') {
                connectionId = cmd.connectionId
                serverInstanceId = cmd.serverInstanceId
            }
            if (cmd.code === 'STATUS') {
                console.log(
                    'Step: ',
                    cmd.result.step,
                    ' / WINS: ',
                    cmd.result.wins,
                    ' brain: ',
                    JSON.stringify(cmd.brain).length,
                    ' F: ',
                    cmd.target
                )
                scene.agent = new DQNAgent(scene.env, scene.spec)
                scene.agent.fromJSON(cmd.brain)
                scene.agent.epsilon = 0.01
                state.snake.calculateQvalue()

                if (wins != cmd.result.wins) {
                    fromLastWin = performance.now()
                }
                wins = cmd.result.wins
                if (performance.now() - lastClear > 60000) {
                    console.clear()
                    lastClear = performance.now()
                }
            }
            if (cmd.code === 'SERVER_STATUS') {
                updateStatusDashboard(cmd)
            }

            if (cmd.code === 'DOWNLOAD_MODEL') {
                var w = window.open('_blank')
                w.document.write(JSON.stringify(cmd))
                w.focus()
            }

            if (typeof events[cmd.code] !== 'undefined') {
                events[cmd.code](cmd)
            }
        } catch (e) {
            console.error('Invalid socket response', e)
        }
    })

    return () => {
        return {
            setConsole: obj => {
                consol = obj
                dashboard = obj
                consol.log('---Consol initialized---', 'green')
            },
            command: data => {
                sendCommand(data)
            },
            start: () => {
                startNewExperiment()
            },
            getStatus: () => {
                sendCommand({ cmd: 'STATUS' })
            },
            getServerStatus: () => {
                sendCommand({ cmd: 'SERVER_STATUS' })
            },
            saveModel: name => {
                sendCommand({
                    cmd: 'SAVE_MODEL',
                    name,
                    spec: scene.spec
                })
            },
            downloadModel: name => {
                sendCommand({
                    cmd: 'DOWNLOAD_MODEL',
                    name
                })
            },
            stopGame: name => {
                sendCommand({
                    cmd: 'STOP_GAME',
                    name
                })
            },
            loadAi: name => {
                sendCommand({
                    cmd: 'LOAD_AI',
                    name,
                    maxX: scene.maxX,
                    maxY: scene.maxY,
                    target: scene.target,
                    actor: scene.defaultActor,
                    spec: scene.spec
                })
            },
            updateLearningScale: scale => {
                sendCommand({
                    cmd: 'LEARNING_SCALE',
                    value: scale
                })
            },
            updateLearningSpec: spec => {
                sendCommand({
                    cmd: 'LEARNING_SPEC',
                    value: spec
                })
            },
            on: (event, callback) => {
                events[event] = callback
            }
        }
    }
}

export default socket
