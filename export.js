#!/usr/bin/env node
var dotenv = require('dotenv')
var jsonfile = require('jsonfile')
var fs = require('fs')
var exec = require('child_process').exec

dotenv.load()

const pathToModels = process.env.PATH_TO_GODOT_SNAKE

const getCollection = () => {
    return new Promise((resolve, reject) => {
        MongoClient = require('mongodb').MongoClient
        const mUrl = process.env.MGDB_URL
        MongoClient.connect(mUrl)
            .then(mgdb => {
                db = mgdb
                collection = db.collection(process.env.MGDB_COLLECTION || 'model')
                collection.db = db
                process.on('SIGTERM', () => {
                    console.log('Disconnect from mongoDB')
                    db.close()
                })
                resolve(collection)
            })
            .catch(e => {
                console.log('DB ERROR: ', e)
                reject(e)
            })
    })
}

const getIndex = () => {
    const indexFile = pathToModels + 'index.json'
    var index = {}

    try {
        index = jsonfile.readFileSync(indexFile)
    } catch (e) {
        index = {
            models: []
        }
    }

    return {
        set: (name, params = {}) => {
            index.models = index.models
                .filter(one => one.name !== name)
                .concat([
                    Object.assign(
                        {},
                        {
                            file: name
                        },
                        params
                    )
                ])
                .sort((a, b) => (a.name > b.name ? 1 : -1))
        },
        save: () => {
            jsonfile.writeFileSync(indexFile, index, { spaces: 1 })
        }
    }
}

var program = require('commander')

program.version('0.1.0')

program
    .command('list')
    .description('List of models')
    .action(options => {
        getCollection().then(collection => {
            collection
                .find({}, {})
                .toArray()
                .then(data => {
                    data.map(record => {
                        const model = JSON.parse(record.model)
                        console.log(' - ' + model.name)
                    })
                    collection.db.close()
                    process.exit()
                })
        })
    })

program
    .command('model [cmd]')
    .description('Export model(s) to godot-snake')
    .action((cmd, options) => {
        getCollection().then(collection => {
            const index = getIndex()
            exec(cmd ? 'ls -ls' : 'rm -rf ' + pathToModels + '/*', (error, out, err) => {
                collection
                    .find(cmd ? { name: cmd } : {})
                    .toArray()
                    .then(data => {
                        data.forEach(record => {
                            const model = JSON.parse(record.model)
                            delete model.result.history
                            jsonfile.writeFileSync(pathToModels + model.name, model, { spaces: 1 })
                            console.log('Model - ' + model.name + ': done')
                            index.set(model.name, {
                                features: model.params.features,
                                name: model.name,
                                description: model.description || '-',
                                brainSize: model.params.numStates
                            })
                        })
                        collection.db.close()
                        index.save()
                    })
            })
        })
    })

program.parse(process.argv)

module.exports = {
    getCollection
}
