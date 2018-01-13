var snake = require('../src/common/snake-scene').instance({
    mode: 'server',
    test: true,
    onProgress: record => {
        console.log('progress!!', record)
    }
})

var features = [
    snake.inputs.FEATURE_HEAD_COORDINATES,
    snake.inputs.FEATURE_CLOSEST_FOOD_DICRECTION,
    snake.inputs.FEATURE_VISION_CLOSE_RANGE
]

var handler = false
var counter = 0
var cmd = {
    spec: {
        alpha: 0.02,
        epsilon: 0.5,
        learning_steps_per_iteration: 40,
        experience_size: 10000,
        gamma: 0.75,
        rivals: 0,
        size: 7
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

snake.initScene()

snake.scene.modelName = 'TEST8x8'
snake.scene.spec = cmd.spec
snake.scene.spec.size = 7
snake.scene.params = cmd.params
snake.scene.agent.epsilon = cmd.spec.epsilon
snake.scene.agent.alpha = cmd.spec.alpha
snake.scene.agent.gamma = cmd.spec.gamma
snake.scene.maxX = cmd.maxX
snake.scene.maxY = cmd.maxY
snake.resizeTo(snake.scene.spec.size, snake.scene.spec.size)
snake.scene.spec.rivals = 0
snake.loadLevel(cmd.params.homelevel || 'empty8x8')

var run = function() {
    counter++
    snake.nextStep()
    handler = setImmediate(run)
    const epoch = snake.scene.result.epoch
    if (epoch % 100 === 0) {
        snake.scene.agent.epsilon = Math.max(0.005, 0.5 - 0.5 * epoch / 1000)
    }
}

if (cmd.start) {
    console.log('Learning Started - ' + snake.scene.agent.epsilon)
    run()
}
