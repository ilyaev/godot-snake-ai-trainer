import config from './config'

const scene = {
    io: null,
    timeScale: 1,
    config,
    canvas: null,
    active: true,
    maxX: 7,
    maxY: 7,
    env: {
        getNumStates: function() {
            return 4
        },
        getMaxNumActions: function() {
            return 4
        }
    },
    spec: { alpha: 0.03, epsilon: 0.4, learning_steps_per_iteration: 40, experience_size: 10000, gamma: 0.75 },
    actor: {
        x: 0,
        y: 0,
        averageSteps: 0,
        step: 0
    },
    target: {
        x: 6,
        y: 6
    },
    qvalues: {},
    agent: null
}

export const calculateQvalue = () => {
    for (var x = 0; x <= scene.maxX; x++) {
        for (var y = 0; y <= scene.maxY; y++) {
            var s = new R.Mat(scene.agent.ns, 1)
            s.setFrom([x / scene.maxX, y / scene.maxY, (scene.target.x - x) / scene.maxX, (scene.target.y - y) / scene.maxY])
            var amat = scene.agent.forwardQ(scene.agent.net, s, false)
            var a = R.maxi(amat.w) // returns index of argmax action
            //console.log(x, y, amat.w.map(one => Math.round(one * 1000) / 1000).join(','), a)
            scene.qvalues[x][y] = amat.w.map(one => Math.round(one * 1000) / 1000)
        }
    }
}

const initScene = () => {
    scene.agent = new RL.DQNAgent(scene.env, scene.spec)
    for (var x = 0; x <= scene.maxX; x++) {
        if (!scene.qvalues[x]) {
            scene.qvalues[x] = []
        }
        for (var y = 0; y <= scene.maxY; y++) {
            scene.qvalues[x][y] = 0
        }
    }
    calculateQvalue()
}

initScene()

export const restartActor = reward => {
    if (reward > 0) {
        console.log('RESTART! ', scene.actor.step)
        scene.target.x = Math.round(Math.random() * scene.maxX)
        scene.target.y = Math.round(Math.random() * scene.maxY)
    }
    scene.actor.x = 0
    scene.actor.y = 0
    scene.actor.step = 0
    calculateQvalue()
}

export default scene
