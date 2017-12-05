var dateFormat = require('dateformat')

var storageCreator = (params = {}) => {
    var store = {}
    var MongoClient
    var db = false
    var collection = false

    params = Object.assign(
        {},
        {
            persistent: false,
            onConnected: false
        },
        params
    )
    if (params.persistent) {
        MongoClient = require('mongodb').MongoClient

        const mUrl = process.env.MGDB_URL

        MongoClient.connect(mUrl)
            .then(mgdb => {
                console.log('Connected to mongoDB')
                db = mgdb
                collection = db.collection(process.env.MGDB_COLLECTION || 'model')
                if (params.onConnected) {
                    params.onConnected()
                }
                process.on('SIGTERM', () => {
                    console.log('Disconnect from mongoDB')
                    db.close()
                })
            })
            .catch(e => {
                console.log('DB ERROR: ', e)
            })
    } else {
        MongoClient = {}
    }

    return {
        restore: () => {
            if (!collection) {
                return
            }
            return new Promise((resolve, reject) => {
                collection
                    .find()
                    .toArray()
                    .then(docs => {
                        docs.filter(doc => doc.name && doc._id && doc.model).forEach(doc => {
                            store[doc.name] = JSON.parse(doc.model)
                            store[doc.name].version = doc.version
                            store[doc.name].archive = doc.archive ? true : false
                            store[doc.name].id = doc._id
                        })
                        resolve(true)
                    })
                    .catch(e => reject(e))
            })
        },
        flush: (key = false) => {
            if (!params.persistent || !collection) {
                return
            }
            console.log('Flush to DB: - ', key)
            Object.keys(store)
                .filter(one => !key || one === key)
                .map(one => store[one])
                .filter(model => model.modelName && model.brain)
                .forEach(model => {
                    console.log('---', model.modelName)
                    model.version = model.version ? model.version + 1 : 1
                    collection.update(
                        { name: model.modelName },
                        (record = {
                            name: model.modelName,
                            version: model.version,
                            archive: model.archive ? true : false,
                            lastUpdated: dateFormat(new Date(), 'dddd, mmmm dS, yyyy, h:MM:ss TT'),
                            timestamp: Date.now(),
                            model: JSON.stringify(model)
                        }),
                        { upsert: true }
                    )
                })
        },
        list: () => {
            return Object.keys(store)
        },
        set: (key, value) => {
            store[key] = value
        },
        archive: (key, archive = true) => {
            if (store[key]) {
                store[key].archive = archive
                return true
            }
            return false
        },
        get: key => {
            return store[key] ? store[key] : false
        },
        del: key => {
            delete store[key]
        },
        unlink: key => {
            delete store[key]
            if (params.persistent) {
                console.log('MONGODB: Delete Model - ', key)
                collection.deleteMany({ name: key })
            }
        }
    }
}

module.exports = { storageCreator }
