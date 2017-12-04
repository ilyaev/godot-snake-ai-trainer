const DQNAgent = require('./agent').DQNAgent
const R = require('./agent').R

const clone = obj => JSON.parse(JSON.stringify(obj))
const generateID = () => Math.round(Math.random() * 100000)

const FEATURE_HEAD_COORDINATES = 1
const FEATURE_CLOSEST_FOOD_DICRECTION = 2
const FEATURE_TAIL_DIRECTION = 3
const FEATURE_VISION_CLOSE_RANGE = 4

const featureMap = {
    [FEATURE_HEAD_COORDINATES]: {
        inputs: 2
    },
    [FEATURE_CLOSEST_FOOD_DICRECTION]: {
        inputs: 2
    },
    [FEATURE_TAIL_DIRECTION]: {
        inputs: 2
    },
    [FEATURE_VISION_CLOSE_RANGE]: {
        inputs: 4
    }
}

const config = {
    id: 0,
    maxX: 7,
    maxY: 7,
    modelName: '',
    params: {
        numStates: 8,
        numActions: 4,
        maxX: 7,
        maxY: 7,
        features: [FEATURE_HEAD_COORDINATES, FEATURE_CLOSEST_FOOD_DICRECTION, FEATURE_VISION_CLOSE_RANGE]
    },
    spec: { alpha: 0.02, epsilon: 0.5, learning_steps_per_iteration: 40, experience_size: 10000, gamma: 0.75 },
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
        wins: 0,
        epoch: 0,
        history: [
            {
                e: 0,
                p: 0,
                t: 0,
                s: 0
            }
        ]
    },
    qvalues: {},
    history: [],
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

const calculateMaxNumInputs = features => {
    return features.reduce((result, next) => {
        return result + featureMap[next].inputs
    }, 0)
}

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

        var walls = {}

        const initScene = () => {
            scene.params.numStates = calculateMaxNumInputs(scene.params.features || [])
            scene.env = {
                getNumStates: function() {
                    console.log('params - ', scene.params)
                    return scene.params.numStates
                },
                getMaxNumActions: function() {
                    return scene.params.numActions
                }
            }
            scene.agent = new DQNAgent(scene.env, scene.spec)
            scene.defaultActor = clone(scene.actor)
            scene.defaultResult = clone(scene.result)

            for (var x = 0; x <= scene.maxX; x++) {
                if (!scene.qvalues[x]) {
                    scene.qvalues[x] = []
                }
                if (!walls[x]) {
                    walls[x] = {}
                }
                for (var y = 0; y <= scene.maxY; y++) {
                    scene.qvalues[x][y] = 0
                    walls[x][y] = false
                }
            }

            scene.result.wins = 0
            scene.result.step = 0
            scene.result.epoch = 0
        }

        const calculateAverage = period => {
            const res = scene.history.slice(-period).reduce(
                (result, next) => {
                    result.sumTail += next.size
                    result.sumSteps += next.step
                    result.epoch = next.epoch
                    result.maxTail = next.size > result.maxTail ? next.size : result.maxTail
                    result.maxSteps = Math.max(next.maxSteps, result.maxSteps)
                    return result
                },
                {
                    sumTail: 0,
                    sumSteps: 0,
                    maxTail: 0,
                    maxSteps: 0,
                    epoch: 0
                }
            )

            if (!scene.result.history) {
                scene.result.history = {}
            }
            if (!scene.result.history[period]) {
                scene.result.history[period] = []
            }
            scene.result.history[period].push({
                e: res.epoch,
                p: period,
                t: res.maxTail,
                s: res.maxSteps
            })
            scene.result.history[period] = scene.result.history[period].splice(-100)
        }

        const restartActor = reward => {
            if (reward > 0) {
                respawnFood()
            }
            scene.history.push({
                size: scene.actor.tail.length,
                step: scene.actor.step,
                epoch: scene.result.epoch
            })
            scene.history = scene.history.splice(-1000)
            scene.actor = clone(scene.defaultActor)
            if (!scene.result.epoch) {
                scene.result.epoch = 0
            }
            ;[10, 100, 1000].forEach(period => (scene.result.epoch % period === 0 ? calculateAverage(period) : null))
            scene.result.epoch += 1
            scene.actor.step = 0
        }

        const respawnFood = () => {
            var wall = true
            var x, y
            while (wall == true) {
                x = Math.round(Math.random() * scene.maxX)
                y = Math.round(Math.random() * scene.maxY)
                wall = isWall(x, y)
            }
            scene.target.x = x
            scene.target.y = y
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
            if (typeof walls[x] === 'undefined' || typeof walls[x][y] === 'undefined') {
                return true
            }
            return walls[x][y]
        }

        const isFutureWall = action => {
            const d = actions[action]
            return isWall(scene.actor.x + d.dx, scene.actor.y + d.dy) ? 1 : 0
        }

        const buildWalls = () => {
            for (var x = 0; x <= scene.maxX; x++) {
                for (var y = 0; y <= scene.maxY; y++) {
                    walls[x][y] = false
                }
            }

            walls[scene.actor.x][scene.actor.y] = true
            scene.actor.tail.forEach(one => (walls[one.x][one.y] = true))
        }

        const buildState = () => {
            const result = []
            scene.params.features.map(one => parseInt(one)).forEach(feature => {
                switch (feature) {
                    case FEATURE_HEAD_COORDINATES:
                        result.push(scene.actor.x / scene.maxX)
                        result.push(scene.actor.y / scene.maxY)
                        break
                    case FEATURE_CLOSEST_FOOD_DICRECTION:
                        result.push((scene.target.x - scene.actor.x) / scene.maxX)
                        result.push((scene.target.y - scene.actor.y) / scene.maxY)
                        break
                    case FEATURE_VISION_CLOSE_RANGE:
                        ;[0, 1, 2, 3].forEach(direction => result.push(isFutureWall(direction)))
                        break
                    case FEATURE_TAIL_DIRECTION:
                        result.push((scene.actor.tail[scene.actor.tail.length - 1].x - scene.actor.x) / scene.maxX)
                        result.push((scene.actor.tail[scene.actor.tail.length - 1].y - scene.actor.y) / scene.maxY)
                        break
                    default:
                        break
                }
            })
            return result
        }

        const nextStep = () => {
            buildWalls()

            scene.result.step++
            scene.actor.step += 1

            var footer = ''
            var prev = clone({
                x: scene.actor.x,
                y: scene.actor.y
            })

            // var stepState = [
            //     scene.actor.x / scene.maxX,
            //     scene.actor.y / scene.maxY,
            //     (scene.target.x - scene.actor.x) / scene.maxX,
            //     (scene.target.y - scene.actor.y) / scene.maxY,
            //     isFutureWall(0),
            //     isFutureWall(1),
            //     isFutureWall(2),
            //     isFutureWall(3)
            // ]

            const stepState = buildState()

            var action = scene.agent.act(stepState)
            var act = actions[action]

            scene.actor.x = scene.actor.x + act.dx
            scene.actor.y = scene.actor.y + act.dy

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
            calculateMaxNumInputs,
            initScene,
            restartActor,
            growSnake,
            isWall,
            clone,
            nextStep,
            generateID,
            printField
        }
    }
}
