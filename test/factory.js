var buildSnake = (level, brain = false, cb = () => {}) => {
    var snake = require('../src/common/snake-scene').instance({
        mode: 'client', //brain ? 'client' : 'server',
        onEpoch: cb
    })

    var features = [snake.inputs.FEATURE_CLOSEST_FOOD_DICRECTION, snake.inputs.FEATURE_FULL_MAP_6]

    var handler = false
    var counter = 0
    var cmd = {
        spec: {
            alpha: 0.01,
            epsilon: 0.0001,
            learningStepsPerIteration: 20,
            experienceSize: 10000,
            numHiddenUnits: Math.round(snake.calculateMaxNumInputs(features) * 1.2),
            gamma: 0.95,
            rivals: 0,
            size: 7,
            experienceAddEvery: 1
        },
        params: {
            numStates: snake.calculateMaxNumInputs(features),
            numActions: 4,
            maxX: 7,
            maxY: 7,
            homelevel: level,
            features: features
        },
        maxX: 7,
        maxY: 7,
        level: level,
        start: true,
        brain: null,
        actor: null
    }

    cmd.spec.learningStepsPerIteration = Math.floor(20 / (cmd.spec.numHiddenUnits / 50))

    snake.scene.spec = cmd.spec
    snake.scene.params = cmd.params
    snake.initScene()
    snake.scene.modelName = 'Evaluation'
    snake.scene.spec.size = 7
    snake.scene.agent.epsilon = cmd.spec.epsilon
    snake.scene.agent.alpha = cmd.spec.alpha
    snake.scene.agent.gamma = cmd.spec.gamma
    snake.scene.maxX = cmd.maxX
    snake.scene.maxY = cmd.maxY
    snake.scene.spec.rivals = 0
    if (brain) {
        snake.implantBrain(brain)
    }
    snake.resizeTo(snake.scene.spec.size, snake.scene.spec.size)
    snake.loadLevel(cmd.params.homelevel || 'empty8x8')
    return snake
}

module.exports = {
    buildSnake
}
