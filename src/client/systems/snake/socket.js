import ioClient from 'socket.io-client'
import { DQNAgent } from 'reinforcenode'

const socket = function(state) {
    const scene = state.scene

    var io = ioClient('http://localhost:8080')
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

    io.on('response', response => {
        var cmd = {}
        try {
            cmd = JSON.parse(response)
            if (cmd.code === 'HANDSHAKE') {
                connectionId = cmd.connectionId
                serverInstanceId = cmd.serverInstanceId
            }
            if (cmd.code === 'STATUS') {
                console.log('Step: ', cmd.result.step, ' / WINS: ', cmd.result.wins, ' brain: ', JSON.stringify(cmd.brain).length, ' F: ', cmd.target)
                scene.agent = new DQNAgent(scene.env, scene.spec)
                scene.agent.fromJSON(cmd.brain)
                scene.agent.epsilon = 0.1
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

            if (typeof events[cmd.code] !== 'undefined') {
                events[cmd.code](cmd)
            }
        } catch (e) {
            console.error('Invalid socket response', e)
        }
    })

    return () => {
        return {
            command: data => {
                sendCommand(data)
            },
            start: () => {
                startNewExperiment()
            },
            getStatus: () => {
                sendCommand({ cmd: 'STATUS' })
            },
            saveModel: name => {
                sendCommand({
                    cmd: 'SAVE_MODEL',
                    name,
                    spec: scene.spec
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
