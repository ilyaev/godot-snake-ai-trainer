const DQNAgent = require('reinforcenode').DQNAgent

const actions = [
    {
        dx: 0,
        dy: 1
    },
    {
        dx: 0,
        dy: -1
    },
    {
        dx: 1,
        dy: 0
    },
    {
        dx: -1,
        dy: 0
    }
]

const restartActor = (scene, reward) => {
    if (reward > 0) {
        scene.target.x = Math.round(Math.random() * scene.maxX)
        scene.target.y = Math.round(Math.random() * scene.maxY)
    }
    scene.actor.x = 0
    scene.actor.y = 0
    scene.actor.step = 0
    return scene
}

var runLearning = scene => {
    return () => {
        for (var i = 0; i < scene.timeScale; i++) {
            var state = [
                scene.actor.x / scene.maxX,
                scene.actor.y / scene.maxY,
                (scene.target.x - scene.actor.x) / scene.maxX,
                (scene.target.y - scene.actor.y) / scene.maxY
            ]
            var action = scene.agent.act(state)
            var act = actions[action]

            scene.actor.x = scene.actor.x + act.dx
            scene.actor.y = scene.actor.y + act.dy
            scene.actor.step += 1

            if (scene.actor.x == scene.target.x && scene.actor.y == scene.target.y) {
                scene.agent.learn(1)
                scene = restartActor(scene, 1)
                scene.result.wins++
            } else if (scene.actor.x < 0 || scene.actor.y < 0 || scene.actor.x > scene.maxX || scene.actor.y > scene.maxY) {
                scene.agent.learn(-1)
                scene = restartActor(scene, -1)
            } else {
                scene.agent.learn(0)
            }
            scene.result.step++
        }
    }
}

const initGame = (scene, cmd) => {
    if (scene.interval) {
        clearInterval(scene.interval)
    }
    scene.agent = new DQNAgent(
        {
            getNumStates: function() {
                return 4
            },
            getMaxNumActions: function() {
                return 4
            }
        },
        cmd.spec
    )
    scene.result = {
        step: 0,
        wins: 0
    }
    scene.reward = 0
    scene.maxX = cmd.maxX
    scene.maxY = cmd.maxY
    scene.target = cmd.target
    scene.actor.x = 0
    scene.actor.y = 0
    scene.timeScale = 1
    scene.interval = setInterval(runLearning(scene), 10)
}

const sendStatus = (socket, scene) => {
    socket.sendCommand(socket, 'STATUS', {
        result: scene.result,
        actor: scene.actor,
        target: scene.target,
        brain: scene.agent.toJSON()
    })
}

const arena = (io, socket) => {
    var scene = {
        agent: false,
        timeScale: 1,
        maxX: 0,
        maxY: 0,
        target: {
            x: 0,
            y: 0
        },
        actor: {
            x: 0,
            y: 0
        },
        result: {
            step: 0,
            wins: 0
        },
        reward: 0,
        interval: false
    }

    return {
        initGame: cmd => {
            return initGame(scene, cmd)
        },
        sendStatus: () => {
            return sendStatus(socket, scene)
        }
    }
}

module.exports = arena
