const DQNAgent = require('./agent').DQNAgent
const R = require('./agent').R

const clone = obj => JSON.parse(JSON.stringify(obj))
const generateID = () => Math.round(Math.random() * 100000)

const FEATURE_HEAD_COORDINATES = 1
const FEATURE_CLOSEST_FOOD_DICRECTION = 2
const FEATURE_TAIL_DIRECTION = 3
const FEATURE_VISION_CLOSE_RANGE = 4
const FEATURE_VISION_FAR_RANGE = 5
const FEATURE_VISION_MID_RANGE = 6

const binmap = [1, 2, 4, 8, 16, 32, 64, 128]

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
    },
    [FEATURE_VISION_FAR_RANGE]: {
        inputs: 8
    },
    [FEATURE_VISION_MID_RANGE]: {
        inputs: 16
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
    spec: { alpha: 0.02, epsilon: 0.5, learning_steps_per_iteration: 40, experience_size: 10000, gamma: 0.75, rivals: 0, size: 7 },
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
    rivals: [],
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
    agent: null,
    rivalAgent: null
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

        const getActiveActors = () => {
            return [scene.actor].concat(scene.rivals).filter(one => typeof one.active === 'undefined' || one.active)
        }

        const getNextRivalPlace = () => {
            var cX = 1 + Math.round(Math.random() * (scene.maxX - 1))
            var cY = 1 + Math.round(Math.random() * (scene.maxY - 1))
            while (Math.abs(cX - scene.actor.x) > 3 && Math.abs(cY - scene.actor.Y) > 3) {
                cX = 1 + Math.round(Math.random() * (scene.maxX - 1))
                cY = 1 + Math.round(Math.random() * (scene.maxY - 1))
            }
            return { cX, cY }
        }

        const initRivals = () => {
            scene.actor.student = true
            scene.actor.active = true
            var shift = 0
            scene.rivals = []
            for (var i = 0; i < scene.spec.rivals || 0; i++) {
                var place = getNextRivalPlace()
                const x = place.cX
                const y = place.cY
                scene.rivals.push({
                    x,
                    y,
                    active: true,
                    student: false,
                    target: {
                        x: 3,
                        y: 3
                    },
                    step: 0,
                    tail: [
                        {
                            x: x - 1,
                            y: y
                        }
                    ]
                })
            }
        }

        const initScene = () => {
            scene.params.numStates = calculateMaxNumInputs(scene.params.features || [])
            scene.env = {
                getNumStates: function() {
                    return scene.params.numStates
                },
                getMaxNumActions: function() {
                    return scene.params.numActions
                }
            }
            // scene.agent = new DQNAgent(scene.env, scene.spec)
            // scene.rivalAgent = new DQNAgent(scene.env, scene.spec)
            initAgents(scene.env, scene.spec)
            scene.defaultActor = clone(scene.actor)
            scene.defaultActor.student = true
            scene.defaultActor.active = true
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
            initRivals()
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
                respawnFood(scene.actor)
            }
            scene.history.push({
                size: scene.actor.tail.length,
                step: scene.actor.step,
                epoch: scene.result.epoch
            })
            scene.history = scene.history.splice(-1000)
            scene.actor = clone(scene.defaultActor)
            initRivals()
            if (!scene.result.epoch) {
                scene.result.epoch = 0
            }
            ;[10, 100, 1000].forEach(period => (scene.result.epoch % period === 0 ? calculateAverage(period) : null))
            scene.result.epoch += 1
            scene.actor.step = 0
            if (isWall(scene.target.x, scene.target.y)) {
                respawnFood(scene.actor)
            }
        }

        const respawnFood = actor => {
            var wall = true
            var x, y
            while (wall == true) {
                x = Math.round(Math.random() * scene.maxX)
                y = Math.round(Math.random() * scene.maxY)
                wall = isWall(x, y)
            }
            if (actor.student) {
                scene.target.x = x
                scene.target.y = y
            } else {
                actor.target.x = x
                actor.target.y = y
            }
        }

        const growSnake = actor => {
            const last = actor.tail[actor.tail.length - 1]
            actor.tail.push({
                x: last.x,
                y: last.y,
                wait: 1
            })
            if (actor.student) {
                scene.result.wins++
            }
        }

        const isWall = (x, y) => {
            if (typeof walls[x] === 'undefined' || typeof walls[x][y] === 'undefined') {
                return true
            }
            return walls[x][y]
        }

        const isFutureWall = (action, actor) => {
            const d = actions[action]
            return isWall(actor.x + d.dx, actor.y + d.dy) ? 1 : 0
        }

        const buildWalls = () => {
            for (var x = 0; x <= scene.maxX; x++) {
                for (var y = 0; y <= scene.maxY; y++) {
                    walls[x][y] = false
                }
            }
            getActiveActors().forEach(actor => {
                walls[actor.x][actor.y] = true
                actor.tail.forEach(one => (walls[one.x][one.y] = true))
            })
        }

        const buildMidRangeVision = actor => {
            const rows = []
            for (var dx = -2; dx < 2; dx++) {
                for (var dy = -2; dy < 2; dy++) {
                    const value = isWall(actor.x + dx, actor.y + dy) ? 1 : 0
                    rows.push(value)
                }
            }
            return rows
        }

        const buildFarVision = actor => {
            const rows = []
            for (var dx = -4; dx < 4; dx++) {
                let row = []
                let sum = 0
                for (var dy = -4; dy < 4; dy++) {
                    const value = isWall(actor.x + dx, actor.y + dy) ? 1 : 0
                    row.push(value)
                    if (value) {
                        sum += binmap[row.length - 1]
                    }
                }
                rows.push(sum)
            }
            return rows.map(one => one / 256)
        }

        const buildState = actor => {
            let result = []
            scene.params.features.map(one => parseInt(one)).forEach(feature => {
                switch (feature) {
                    case FEATURE_HEAD_COORDINATES:
                        result.push(actor.x / scene.maxX)
                        result.push(actor.y / scene.maxY)
                        break
                    case FEATURE_CLOSEST_FOOD_DICRECTION:
                        if (actor.target) {
                            result.push((actor.target.x - actor.x) / scene.maxX)
                            result.push((actor.target.y - actor.y) / scene.maxY)
                        } else {
                            result.push((scene.target.x - actor.x) / scene.maxX)
                            result.push((scene.target.y - actor.y) / scene.maxY)
                        }
                        break
                    case FEATURE_VISION_CLOSE_RANGE:
                        ;[0, 1, 2, 3].forEach(direction => result.push(isFutureWall(direction, actor)))
                        break
                    case FEATURE_TAIL_DIRECTION:
                        result.push((actor.tail[actor.tail.length - 1].x - actor.x) / scene.maxX)
                        result.push((actor.tail[actor.tail.length - 1].y - actor.y) / scene.maxY)
                        break
                    case FEATURE_VISION_FAR_RANGE:
                        result = result.concat(buildFarVision(actor))
                        break
                    case FEATURE_VISION_MID_RANGE:
                        result = result.concat(buildMidRangeVision(actor))
                        break
                    default:
                        break
                }
            })
            return result
        }

        const nextStep = () => {
            scene.result.step++
            scene.actor.step += 1

            var footer = ''

            getActiveActors().forEach(actor => {
                buildWalls()

                var toRespawn = false
                const stepState = buildState(actor)

                var action = actor.student ? scene.agent.act(stepState) : scene.rivalAgent.act(stepState)
                var act = actions[action]

                var prev = clone({
                    x: actor.x,
                    y: actor.y
                })

                actor.x += act.dx
                actor.y += act.dy

                if (!actor.target) {
                    actor.target = scene.target
                }

                if (actor.x == actor.target.x && actor.y == actor.target.y) {
                    growSnake(actor)
                    toRespawn = true
                    if (instanceProps.mode === 'server' && actor.student) {
                        const availActions = actions.reduce((result, next) => {
                            return isWall(scene.actor.x + next.dx, scene.actor.y + next.dy) ? result : result + 1
                        }, 0)
                        if (availActions > 0) {
                            scene.agent.learn(1)
                        } else {
                            restartActor(-1)
                            scene.agent.learn(-2)
                            return
                        }
                    }
                } else if (isWall(actor.x, actor.y)) {
                    if (actor.student) {
                        footer = 'WALL'
                        restartActor(-1)

                        if (instanceProps.mode === 'server') {
                            scene.agent.learn(-1)
                        }
                    } else {
                        actor.active = false
                    }
                } else {
                    if (instanceProps.mode === 'server' && actor.student) {
                        scene.agent.learn(0)
                    }
                }

                actor.tail = actor.tail.map(one => {
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

                if (toRespawn) {
                    respawnFood(actor)
                }
            })
        }

        const initAgents = (params, spec) => {
            scene.agent = new DQNAgent(params, spec)
            scene.rivalAgent = new DQNAgent(params, spec)
        }

        const implantBrain = (agentBrain, rivalBrain = false) => {
            scene.agent.fromJSON(agentBrain)
            scene.rivalAgent.fromJSON(rivalBrain ? rivalBrain : agentBrain)
        }

        const resizeTo = (maxX, maxY) => {
            scene.maxX = maxX
            scene.maxY = maxY
            scene.params.maxX = maxX
            scene.params.maxY = maxY
            for (var x = 0; x <= scene.maxX; x++) {
                if (!walls[x]) {
                    walls[x] = {}
                }
                for (var y = 0; y <= scene.maxY; y++) {
                    walls[x][y] = false
                }
            }
            buildWalls()
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
            initRivals,
            restartActor,
            growSnake,
            isWall,
            clone,
            nextStep,
            generateID,
            printField,
            resizeTo,
            initAgents,
            implantBrain
        }
    }
}
