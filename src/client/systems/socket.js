import ioClient from 'socket.io-client'
import scene, { calculateQvalue } from '../scene'

const socket = function(scene) {
    var io = ioClient('http://localhost:8090')
    var started = 0
    var fromLastWin = 0
    var wins = 0
    var lastClear = 0

    var startCommand = () => {
        console.log('-------start new experiment---------')
        started = performance.now()
        fromLastWin = started
        lastClear = started
        io.emit(
            'command',
            JSON.stringify({
                cmd: 'START',
                maxX: scene.maxX,
                maxY: scene.maxY,
                target: scene.target,
                spec: scene.spec
            })
        )
    }

    io.on('response', response => {
        var cmd = {}
        try {
            cmd = JSON.parse(response)
            if (cmd.code === 'STATUS') {
                console.log('Step: ', cmd.result.step, ' / WINS: ', cmd.result.wins, ' brain: ', JSON.stringify(cmd.brain).length, ' F: ', cmd.target)
                scene.agent = new RL.DQNAgent(scene.env, scene.spec)
                scene.agent.fromJSON(cmd.brain)
                scene.agent.epsilon = 0.1
                calculateQvalue()

                if (wins != cmd.result.wins) {
                    fromLastWin = performance.now()
                }

                if (performance.now() - started > 10000 && cmd.result.wins === 0) {
                    console.error('Experiment failed from begin')
                    startCommand()
                } else if (performance.now() - fromLastWin > 10000 + cmd.result.wins / 5 * 5000 && cmd.result.step < 500000) {
                    console.error('Experiment failed')
                    startCommand()
                }
                wins = cmd.result.wins
                if (performance.now() - lastClear > 60000) {
                    console.clear()
                    lastClear = performance.now()
                }
            }
        } catch (e) {
            console.error('Invalid socket response', e)
        }
    })

    return () => {
        return {
            command: data => {
                io.emit('command', data)
            },
            start: () => {
                startCommand()
            },
            getStatus: () => {
                io.emit(
                    'command',
                    JSON.stringify({
                        cmd: 'STATUS'
                    })
                )
            }
        }
    }
}

export default socket
