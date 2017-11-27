const DQNAgent = require('./agent').DQNAgent
const R = require('./agent').R

const clone = obj => JSON.parse(JSON.stringify(obj))
const generateID = () => Math.round(Math.random() * 100000)

const config = {
    id: 0,
    maxX: 7,
    maxY: 7,
    params: {
        numStates: 9,
        numActions: 4
    },
    spec: { alpha: 0.02, epsilon: 0.05, learning_steps_per_iteration: 40, experience_size: 10000, gamma: 0.75 },
    actor: {
        x: 3,
        y: 3,
        averageSteps: 0,
        step: 0,
        tail: [
            {
                x: 2,
                y: 3
            }
        ]
    },
    target: {
        x: 1,
        y: 1
    },
    result: {
        step: 0,
        wins: 0
    },
    qvalues: {},
    agent: null
}

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

module.exports = {
    instance: (instanceProps = {}) => {
        instanceProps = Object.assign(
            {
                mode: 'server',
                debug: true
            },
            instanceProps
        )

        const scene = clone(config)
        scene.id = generateID()
        const calculateQvalue = () => {
            if (instanceProps.mode !== 'client') {
                return false
            }
            for (var x = 0; x <= scene.maxX; x++) {
                for (var y = 0; y <= scene.maxY; y++) {
                    var s = new R.Mat(scene.agent.ns, 1)
                    s.setFrom([x / scene.maxX, y / scene.maxY, (scene.target.x - x) / scene.maxX, (scene.target.y - y) / scene.maxY])
                    var amat = scene.agent.forwardQ(scene.agent.net, s, false)
                    var a = R.maxi(amat.w) // returns index of argmax action
                    scene.qvalues[x][y] = amat.w.map(one => Math.round(one * 1000) / 1000)
                }
            }
        }

        const initScene = () => {
            scene.env = {
                getNumStates: function() {
                    return scene.params.numStates
                },
                getMaxNumActions: function() {
                    return scene.params.numActions
                }
            }
            scene.agent = new DQNAgent(scene.env, scene.spec)
            scene.defaultActor = clone(scene.actor)

            for (var x = 0; x <= scene.maxX; x++) {
                if (!scene.qvalues[x]) {
                    scene.qvalues[x] = []
                }
                for (var y = 0; y <= scene.maxY; y++) {
                    scene.qvalues[x][y] = 0
                }
            }

            scene.result.wins = 0
            scene.result.step = 0

            calculateQvalue()
        }

        const restartActor = reward => {
            if (reward > 0) {
                respawnFood()
            }
            scene.actor = clone(scene.defaultActor)
            scene.actor.step = 0
            calculateQvalue()
        }

        const respawnFood = () => {
            scene.target.x = Math.round(Math.random() * scene.maxX)
            scene.target.y = Math.round(Math.random() * scene.maxY)
        }

        const growSnake = () => {
            const last = scene.actor.tail[scene.actor.tail.length - 1]
            scene.actor.tail.push({
                x: last.x,
                y: last.y,
                wait: 1
            })
            scene.result.wins++
        }

        const isWall = (x, y) => {
            var result = false

            if (x < 0 || y < 0 || x > scene.maxX || y > scene.maxY) {
                result = true
            } else {
                result = scene.actor.tail.reduce((res, next) => {
                    return res || (next.x == x && next.y == y)
                }, false)
            }
            return result
        }

        const isFutureWall = action => {
            const d = actions[action]
            return isWall(scene.actor.x + d.dx, scene.actor.y + d.dy) ? 1 : 0
        }

        const nextStep = () => {
            scene.result.step++
            var footer = ''
            var prev = clone({
                x: scene.actor.x,
                y: scene.actor.y
            })

            var stepState = [
                scene.actor.tail.length / scene.maxX * 1.5,
                scene.actor.x / scene.maxX,
                scene.actor.y / scene.maxY,
                (scene.target.x - scene.actor.x) / scene.maxX,
                (scene.target.y - scene.actor.y) / scene.maxY,
                isFutureWall(0),
                isFutureWall(1),
                isFutureWall(2),
                isFutureWall(3)
            ]

            const alowed = []

            actions.forEach((direction, dirIndex) => {
                if (isFutureWall(dirIndex)) {
                    scene.agent.simulate(stepState, dirIndex, -1)
                } else {
                    alowed.push(dirIndex)
                }
            })

            var action = scene.agent.actLimited(stepState, alowed)

            if (action < 0) {
                printField()
                scene.agent.act(stepState)
                footer = 'WALL'
                restartActor(-1)
                if (instanceProps.mode === 'server') {
                    scene.agent.learn(-10)
                }
                return
            }

            var act = actions[action]

            scene.actor.x = scene.actor.x + act.dx
            scene.actor.y = scene.actor.y + act.dy
            scene.actor.step += 1

            if (scene.actor.x == scene.target.x && scene.actor.y == scene.target.y) {
                growSnake()
                respawnFood()
                if (instanceProps.mode === 'server') {
                    scene.agent.learn(1)
                }
            } else if (isWall(scene.actor.x, scene.actor.y)) {
                footer = 'WALL'
                restartActor(-1)
                if (instanceProps.mode === 'server') {
                    scene.agent.learn(-1)
                }
                return
            } else {
                if (instanceProps.mode === 'server') {
                    scene.agent.learn(0)
                }
            }

            scene.actor.tail = scene.actor.tail.map(one => {
                if (one.wait > 0) {
                    one.wait--
                    return one
                } else {
                    const next = clone({
                        x: one.x,
                        y: one.y
                    })
                    one.x = prev.x
                    one.y = prev.y
                    prev = clone(next)
                }
                return one
            })
        }

        const printField = () => {
            if (instanceProps.mode === 'client') {
                return
            }
            console.log('H: ', scene.actor.x, ',', scene.actor.y, ' T: ', scene.actor.tail.length) //, scene.actor, scene.actor.tail)
            var row = ''
            console.log('-------- ' + scene.maxX + 'x' + scene.maxY + ' -------')
            for (var x = 0; x <= scene.maxX; x++) {
                row = ''
                for (var y = 0; y <= scene.maxY; y++) {
                    var c = '.'

                    if (isWall(x, y)) {
                        c = 'w'
                    }

                    if (x == scene.target.x && y == scene.target.y) {
                        c = 'f'
                    }

                    if (x == scene.actor.x && y == scene.actor.y) {
                        c = '#'
                    }

                    row += c
                }
                console.log(row)
            }
        }

        return {
            scene,
            initScene,
            restartActor,
            growSnake,
            isWall,
            calculateQvalue,
            clone,
            nextStep,
            generateID,
            printField
        }
    }
}
