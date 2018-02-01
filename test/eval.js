var getCollection = require('../export').getCollection
const colorText = require('../src/server/debug').colorText

var modelName = process.argv[2] || 'GO'
var brain = false
var snake = false
var eSize = process.argv[3] || 10
var curLevel = ''
var curHistory = []
var history = []

const levels = require('../src/common/levels')
    .levels.reverse()
    .map(one => one.name)

const round = val => Math.round(val * 1000) / 1000

const rateResultColor = result => {
    var color = 'red'
    if (result > 30) {
        color = 'green'
    } else if (result > 20) {
        color = 'yellow'
    }
    return color
}

getCollection().then(collection => {
    collection
        .find({ name: modelName }, {})
        .toArray()
        .then(data => {
            data.map(record => {
                const model = JSON.parse(record.model)
                runModel(model)
            })
            collection.db.close()
        })
})

const runModel = model => {
    console.log(
        'Evaluate model: ' +
            colorText('navy', model.name + ' v' + model.version + ' age: ' + model.result.epoch + ' maxAvg: ' + model.maxAvg || 0) +
            ' ; batch size: ' +
            colorText('navy', eSize)
    )
    console.log('------------- ' + (model.stable ? '(stable)' : ''))
    brain = model.stable || model.brain
    nextLevel(levels.pop())
}

const nextLevel = level => {
    curLevel = level
    curHistory = []
    snake = require('./factory').buildSnake(level, brain, (epoch, replay, stat) => {
        if (stat.epoch > 0) {
            curHistory.push(stat.size)
        }
    })
    run()
}

var run = function() {
    snake.nextStep()
    const epoch = snake.scene.result.epoch
    if (epoch > eSize) {
        var result = round(curHistory.reduce((res, next) => res + next, 0) / eSize)
        var rMax = curHistory.reduce((res, next) => (next > res ? next : res), 0)
        history.push(result)
        console.log(curLevel + ': ' + colorText(rateResultColor(result), result) + ' / max ' + rMax)
        if (levels.length) {
            nextLevel(levels.pop())
        } else {
            console.log('----------')
            var overall = round(history.reduce((res, next) => res + next, 0) / history.length)
            console.log('Overall: ' + colorText(rateResultColor(overall), overall))
        }
    } else {
        handler = setImmediate(run)
    }
}

// run()
