var snake = require('../src/common/snake-scene').instance({
    mode: 'server',
    test: true,
    onProgress: record => {
        console.log('progress!!', record)
        snake.printField()
    }
})

var features = [snake.inputs.FEATURE_CLOSEST_FOOD_DICRECTION, snake.inputs.FEATURE_FULL_MAP_6]

var handler = false
var counter = 0
var cmd = {
    spec: {
        alpha: 0.015,
        epsilon: 0.33,
        learningStepsPerIteration: 20,
        experienceSize: 10000,
        gamma: 0.75,
        rivals: 0,
        size: 7,
        experienceAddEvery: 1
    },
    params: {
        numStates: snake.calculateMaxNumInputs(features),
        numActions: 4,
        maxX: 7,
        maxY: 7,
        homelevel: 'empty8x8',
        features: features
    },
    maxX: 7,
    maxY: 7,
    level: 'empty8x8',
    start: true,
    brain: null,
    actor: null
}

setLevel = level => {
    cmd.params.homelevel = level
    cmd.level = level
}

setLevel('empty8x8')

snake.scene.spec = cmd.spec
snake.scene.params = cmd.params
snake.initScene()
snake.scene.modelName = 'TEST8x8'
snake.scene.spec.size = 7
snake.scene.agent.epsilon = cmd.spec.epsilon
snake.scene.agent.alpha = cmd.spec.alpha
snake.scene.agent.gamma = cmd.spec.gamma
snake.scene.maxX = cmd.maxX
snake.scene.maxY = cmd.maxY
snake.scene.spec.rivals = 0

snake.resizeTo(snake.scene.spec.size, snake.scene.spec.size)
snake.loadLevel(cmd.params.homelevel || 'empty8x8')

var run = function() {
    counter++
    snake.nextStep()
    handler = setImmediate(run)
    const epoch = snake.scene.result.epoch
    if (epoch % 100 === 0) {
        snake.scene.agent.epsilon = Math.max(0.01, cmd.spec.epsilon - cmd.spec.epsilon * epoch / 500)
    }
}

if (cmd.start) {
    console.log('Learning Started - ' + snake.scene.agent.epsilon)
    run()
}
