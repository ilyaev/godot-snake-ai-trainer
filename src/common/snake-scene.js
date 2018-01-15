const DQNAgent = require('./agent').DQNAgent
const R = require('./agent').R

const clone = obj => JSON.parse(JSON.stringify(obj))
const generateID = () => Math.round(Math.random() * 100000)
const randNum = num => Math.floor(Math.random() * num)

const FEATURE_HEAD_COORDINATES = 1
const FEATURE_CLOSEST_FOOD_DICRECTION = 2
const FEATURE_TAIL_DIRECTION = 3
const FEATURE_VISION_CLOSE_RANGE = 4
const FEATURE_VISION_FAR_RANGE = 5
const FEATURE_VISION_MID_RANGE = 6
const FEATURE_TAIL_SIZE = 7
const FEATURE_HUNGER = 8
const FEATURE_FULL_MAP_4 = 9
const FEATURE_FULL_MAP_6 = 10
const FEATURE_CLOSEST_FOOD_ANGLE = 11
const academy = require('./levels')

const binmap = [1, 2, 4, 8, 16, 32, 64, 128]

const featureMap = {
    [FEATURE_HEAD_COORDINATES]: {
        inputs: 2
    },
    [FEATURE_CLOSEST_FOOD_DICRECTION]: {
        inputs: 2
    },
    [FEATURE_CLOSEST_FOOD_ANGLE]: {
        inputs: 1
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
    },
    [FEATURE_TAIL_SIZE]: {
        inputs: 1
    },
    [FEATURE_HUNGER]: {
        inputs: 1
    },
    [FEATURE_FULL_MAP_4]: {
        inputs: 16
    },
    [FEATURE_FULL_MAP_6]: {
        inputs: 36
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
        homelevel: '',
        features: [FEATURE_HEAD_COORDINATES, FEATURE_CLOSEST_FOOD_DICRECTION, FEATURE_VISION_CLOSE_RANGE]
    },
    spec: { alpha: 0.02, epsilon: 0.5, learning_steps_per_iteration: 100, experience_size: 40000, gamma: 0.75, rivals: 0, size: 7 },
    actor: {
        x: 3,
        y: 3,
        averageSteps: 0,
        withoutFood: 0,
        step: 0,
        tail: [
            {
                x: 2,
                y: 3
            }
        ]
    },
    food: [],
    maxFood: 1,
    level: false,
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
        ],
        tail: {
            size: 0,
            epoch: 0
        }
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
                debug: true,
                test: false,
                onProgress: false
            },
            instanceProps
        )

        const scene = clone(config)
        scene.id = generateID()

        var walls = {}
        var foods = {}

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
                    foods[x] = {}
                }
                for (var y = 0; y <= scene.maxY; y++) {
                    scene.qvalues[x][y] = 0
                    walls[x][y] = false
                    foods[x][y] = false
                }
            }

            scene.result.wins = 0
            scene.result.step = 0
            scene.result.epoch = 0
            restartActor(-1, 'init')
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

        const restartActor = (reward, reason) => {
            if (instanceProps.test) {
                scene.actor.tail.length > 2 &&
                    console.log('RS:', reward, reason, scene.result.epoch, scene.actor.step, scene.actor.tail.length, scene.agent.epsilon)
            }
            const historyRecord = {
                size: scene.actor.tail.length,
                step: scene.actor.step,
                epoch: scene.result.epoch
            }

            if (!scene.result.tail) {
                scene.result.tail = {
                    size: 0
                }
            }

            if (historyRecord.size > scene.result.tail.size) {
                scene.result.tail = historyRecord
                if (instanceProps.onProgress) {
                    var cb = instanceProps.onProgress
                    cb(Object.assign({}, historyRecord, { e: scene.agent.epsilon }))
                }
            }

            scene.history.push(historyRecord)
            scene.history = scene.history.splice(-1000)
            scene.actor = clone(scene.defaultActor)
            var place = getNextRivalPlace()
            const x = place.cX
            const y = place.cY
            scene.actor.x = x
            scene.actor.y = y
            scene.actor.tail[0].x = x - 1
            scene.actor.tail[0].y = y - 1
            initRivals()
            if (!scene.result.epoch) {
                scene.result.epoch = 0
            }
            ;[10, 100, 1000].forEach(period => (scene.result.epoch % period === 0 ? calculateAverage(period) : null))
            scene.result.epoch += 1
            scene.actor.step = 0
            scene.food = []
            respawnFood(scene.actor, true)
            scene.actor.target = clone(scene.food[0])
            scene.target = clone(scene.food[0])
        }

        const getNextFood = () => {
            var wall = true
            var x, y
            while (wall == true) {
                x = Math.round(Math.random() * scene.maxX)
                y = Math.round(Math.random() * scene.maxY)
                wall = isWall(x, y)
                if (!wall) {
                    wall = isFood(x, y)
                }
            }
            return { x, y }
        }

        const removeFood = food => {
            scene.food = scene.food.filter(one => one.x !== food.x || one.y !== food.y)
            while (scene.food.length < scene.maxFood) {
                respawnFood(false)
            }
        }

        const respawnFood = (actor, pure = false) => {
            var food = getNextFood()
            if (actor && !pure) {
                if (actor.student) {
                    removeFood(scene.target, actor)
                    scene.target.x = food.x
                    scene.target.y = food.y
                    actor.target = scene.target
                    //console.log('---eaten by player')
                } else {
                    removeFood(actor.target, actor)
                    //console.log('---eaten by rivals')
                    actor.target.x = food.x
                    actor.target.y = food.y
                }
            }
            const newFood = { x: food.x, y: food.y }
            food.actor = actor ? actor : false
            scene.food.push(food)
        }

        const shrinkSnake = actor => {
            if (actor.tail.length > 1) {
                actor.tail = actor.tail.slice(0, -1)
                actor.withoutFood = 0
                return true
            } else {
                return false
            }
        }

        const growSnake = actor => {
            const last = actor.tail[actor.tail.length - 1]
            actor.tail.push({
                x: last.x,
                y: last.y,
                wait: 1
            })
            const target = scene.food[randNum(scene.food.length)]
            actor.target = {
                x: target.x,
                y: target.y
            }
        }

        const isWall = (x, y) => {
            if (typeof walls[x] === 'undefined' || typeof walls[x][y] === 'undefined') {
                return true
            }
            return walls[x][y]
        }

        const isFood = (x, y) => {
            if (typeof foods[x] === 'undefined' || typeof foods[x][y] === 'undefined') {
                return false
            }
            return foods[x][y]
        }

        const isFutureWall = (action, actor) => {
            const d = actions[action]
            return isWall(actor.x + d.dx, actor.y + d.dy) ? 1 : 0
        }

        const buildWalls = () => {
            for (var x = 0; x <= scene.maxX; x++) {
                for (var y = 0; y <= scene.maxY; y++) {
                    walls[x][y] = false
                    foods[x][y] = false
                }
            }
            if (scene.level) {
                scene.level.walls.forEach(wall => (walls[wall.x][wall.y] = true))
            }
            scene.food.forEach(food => (foods[food.x][food.y] = true))
            getActiveActors().forEach(actor => {
                walls[actor.x][actor.y] = true
                actor.tail.forEach(one => (walls[one.x][one.y] = true))
            })
        }

        const buildFullMap = (actor, fullRange) => {
            const rows = []
            const range = Math.round(fullRange / 2)
            for (var dx = -range; dx < range; dx++) {
                for (var dy = -range; dy < range; dy++) {
                    let value = 0
                    if (isWall(actor.x + dx, actor.y + dy)) {
                        value = -1
                    }
                    if (isFood(actor.x + dx, actor.y + dy)) {
                        value = 1
                    }
                    rows.push(value)
                }
            }
            return rows
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
                    case FEATURE_CLOSEST_FOOD_ANGLE:
                        if (!actor.target) {
                            actor.target = scene.target
                        }
                        const hip = Math.sqrt(Math.pow(actor.target.x - actor.x, 2) + Math.pow(actor.target.y - actor.y, 2))
                        result.push((actor.target.x - actor.x) / hip)
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
                    case FEATURE_FULL_MAP_4:
                        result = result.concat(buildFullMap(actor, 4))
                        break
                    case FEATURE_FULL_MAP_6:
                        result = result.concat(buildFullMap(actor, 6))
                        break
                    case FEATURE_TAIL_SIZE:
                        result.push(actor.tail.length / scene.maxX * (scene.maxY / 3) - 0.5)
                        break
                    case FEATURE_HUNGER:
                        result.push(actor.withoutFood ? actor.withoutFood / scene.maxX * (scene.maxX / 2) - 0.5 : 0)
                        break
                    default:
                        break
                }
            })
            return result
        }

        const teachAgent = reward => {
            if (instanceProps.mode === 'server') {
                scene.agent.learn(reward)
            }
        }

        const nextStep = () => {
            scene.result.step++
            scene.actor.step += 1

            var footer = ''

            getActiveActors().forEach(actor => {
                buildWalls()

                var toRespawn = false
                const stepState = buildState(actor)
                //console.log(scene.params.features, calculateMaxNumInputs(scene.params.features))
                //console.log(stepState.map(one => Math.round(one * 100) / 100))

                var action = actor.student ? scene.agent.act(stepState) : scene.rivalAgent.act(stepState)
                var act = actions[action]

                var prev = {
                    x: actor.x,
                    y: actor.y
                }

                actor.x += act.dx
                actor.y += act.dy

                if (!actor.target) {
                    actor.target = scene.target
                }
                if (actor.student) {
                    actor.withoutFood++
                }

                if (isFood(actor.x, actor.y)) {
                    const ownFood = actor.x === actor.target.x && actor.y === actor.target.y
                    removeFood({ x: actor.x, y: actor.y })
                    growSnake(actor)
                    if (actor.student) {
                        actor.withoutFood = 0
                        scene.result.wins++
                    }
                    toRespawn = true
                    if (actor.student) {
                        teachAgent(1) //000) //actor.withoutFood * 2)
                        // const availActions = actions.reduce((result, next) => {
                        //     return isWall(scene.actor.x + next.dx, scene.actor.y + next.dy) ? result : result + 1
                        // }, 0)
                        // if (availActions > 0) {
                        //     teachAgent(ownFood ? 1 : 1)
                        // } else {
                        //     teachAgent(-10)
                        //     restartActor(-1, 'corner')
                        //     return
                        // }
                    }
                } else if (isWall(actor.x, actor.y)) {
                    if (actor.student) {
                        footer = 'WALL'
                        teachAgent(-1)
                        restartActor(-1, 'wall')
                    } else {
                        actor.active = false
                    }
                } else {
                    if (actor.student) {
                        const maxWithoutFood = Math.max(100, scene.maxX * scene.maxY / 3) + actor.tail.length * 2
                        const toFood = Math.sqrt(
                            Math.pow(scene.actor.target.x - scene.actor.x, 2) + Math.pow(scene.actor.target.y - scene.actor.y, 2)
                        )
                        //-1 * toFood) //(-0.1) // * toFood) // * actor.withoutFood)
                        if (actor.withoutFood > maxWithoutFood) {
                            restartActor(-1, 'starve')
                            teachAgent(-1)
                            if (instanceProps.test) {
                                console.log('STARVE')
                            }
                        } else {
                            teachAgent(0)
                        }
                    }
                }
                actor.tail = actor.tail.map(one => {
                    if (one.wait > 0) {
                        one.wait--
                        return one
                    } else {
                        const next = {
                            x: one.x,
                            y: one.y
                        }
                        one.x = prev.x
                        one.y = prev.y
                        prev = next
                    }
                    return one
                })
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
            if (scene.level) {
                scene.maxX = scene.level.maxX - 1
                scene.maxY = scene.level.maxY - 1
            } else {
                scene.maxX = maxX
                scene.maxY = maxY
            }
            scene.params.maxX = maxX
            scene.params.maxY = maxY
            for (var x = 0; x <= scene.maxX; x++) {
                if (!walls[x]) {
                    walls[x] = {}
                    foods[x] = {}
                }
                for (var y = 0; y <= scene.maxY; y++) {
                    walls[x][y] = false
                    foods[x][y] = false
                }
            }
            buildWalls()
        }

        const printField = () => {
            if (instanceProps.mode === 'client') {
                return
            }
            console.log('F: ' + scene.food.length + ', H: ', scene.actor.x, ',', scene.actor.y, ' T: ', scene.actor.tail.length) //, scene.actor, scene.actor.tail)
            var row = ''
            console.log('-------- ' + scene.maxX + 'x' + scene.maxY + ' -------')
            for (var y = 0; y <= scene.maxY; y++) {
                row = ''
                for (var x = 0; x <= scene.maxX; x++) {
                    var c = '.'

                    if (isWall(x, y)) {
                        c = 'w'
                    }

                    if (isFood(x, y)) {
                        //x == scene.target.x && y == scene.target.y) {
                        c = 'F'
                    }

                    if (x == scene.actor.x && y == scene.actor.y) {
                        c = '#'
                    }

                    row += c
                }
                console.log(row)
            }
        }

        const loadLevel = levelName => {
            scene.spec.rivals = 0
            var level = false
            if (levelName === 'random') {
                level = academy.levels[randNum(academy.levels.length)]
            } else {
                level = academy.levels.filter(one => one.name === levelName)[0]
            }
            scene.level = level
            scene.maxFood = level.maxFood || 1
            resizeTo(level.maxX - 1, level.maxY - 1)
            scene.food = []
            respawnFood(scene.actor, true)
            scene.actor.target = clone(scene.food[0])
            scene.target = clone(scene.food[0])
        }

        return {
            scene,
            calculateMaxNumInputs,
            initScene,
            initRivals,
            restartActor,
            growSnake,
            shrinkSnake,
            isWall,
            clone,
            nextStep,
            generateID,
            printField,
            resizeTo,
            loadLevel,
            walls,
            foods,
            initAgents,
            implantBrain,
            inputs: {
                FEATURE_HEAD_COORDINATES,
                FEATURE_CLOSEST_FOOD_DICRECTION,
                FEATURE_TAIL_DIRECTION,
                FEATURE_VISION_CLOSE_RANGE,
                FEATURE_VISION_FAR_RANGE,
                FEATURE_VISION_MID_RANGE,
                FEATURE_TAIL_SIZE,
                FEATURE_HUNGER,
                FEATURE_FULL_MAP_4,
                FEATURE_FULL_MAP_6,
                FEATURE_CLOSEST_FOOD_ANGLE
            }
        }
    }
}
