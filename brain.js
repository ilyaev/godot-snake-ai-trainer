const DQNAgent = require('./src/common/agent').DQNAgent
const R = require('./src/common/agent').R
var jsonfile = require('jsonfile')

agent = new DQNAgent(
    {
        getNumStates: () => 8,
        getMaxNumActions: () => 4
    },
    {}
)

var state = [0.962963, 0.894737, -0.62963, -0.473684, 0, 0, 1, 1]
var actions = [0.125282, 0.166465, -0.692341, -0.911725] //- 1

jsonfile.readFile('./src/models/first.json', (err, json) => {
    console.log(err)
    if (!err) {
        agent.fromJSON(json.brain)
        var a = agent.act(state)
        console.log('action - ', a)
    }
})
