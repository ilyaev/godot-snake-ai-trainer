var storageCreator = () => {
    var store = {}

    return {
        list: () => {
            return Object.keys(store)
        },
        set: (key, value) => {
            store[key] = value
        },
        get: key => {
            return store[key] ? store[key] : false
        },
        del: key => {
            delete store[key]
        }
    }
}

module.exports = { storageCreator }
