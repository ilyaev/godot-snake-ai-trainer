module.exports = {
    levels: [
        { walls: [], maxFood: 1, maxX: 8, maxY: 8, pits: [], name: 'empty8x8' },
        { walls: [], maxFood: 1, maxX: 15, maxY: 15, pits: [], name: 'empty16x16' },
        { walls: [], maxFood: 3, maxX: 32, maxY: 32, pits: [], name: 'empty32x32' },
        {
            walls: [
                { x: 5, y: 6 },
                { x: 6, y: 6 },
                { x: 7, y: 6 },
                { x: 8, y: 4 },
                { x: 8, y: 5 },
                { x: 8, y: 6 },
                { x: 8, y: 7 },
                { x: 8, y: 8 },
                { x: 8, y: 9 },
                { x: 8, y: 10 },
                { x: 8, y: 11 },
                { x: 8, y: 12 },
                { x: 8, y: 13 },
                { x: 9, y: 10 },
                { x: 10, y: 10 },
                { x: 11, y: 10 }
            ],
            maxFood: 5,
            maxX: 15,
            maxY: 15,
            pits: [],
            name: 'one'
        },
        {
            walls: [
                { x: 2, y: 6 },
                { x: 3, y: 6 },
                { x: 4, y: 2 },
                { x: 4, y: 3 },
                { x: 4, y: 4 },
                { x: 4, y: 6 },
                { x: 5, y: 6 },
                { x: 6, y: 6 },
                { x: 7, y: 6 },
                { x: 8, y: 6 },
                { x: 9, y: 6 },
                { x: 10, y: 6 },
                { x: 10, y: 8 },
                { x: 10, y: 9 },
                { x: 10, y: 10 },
                { x: 11, y: 6 },
                { x: 12, y: 6 }
            ],
            maxFood: 6,
            maxX: 15,
            maxY: 15,
            pits: [],
            name: 'two'
        },
        {
            walls: [
                { x: 3, y: 8 },
                { x: 3, y: 9 },
                { x: 3, y: 10 },
                { x: 3, y: 11 },
                { x: 3, y: 12 },
                { x: 3, y: 13 },
                { x: 4, y: 13 },
                { x: 5, y: 13 },
                { x: 6, y: 6 },
                { x: 6, y: 13 },
                { x: 7, y: 6 },
                { x: 7, y: 13 },
                { x: 8, y: 6 },
                { x: 9, y: 6 },
                { x: 10, y: 6 },
                { x: 10, y: 7 },
                { x: 10, y: 8 },
                { x: 10, y: 9 },
                { x: 10, y: 10 }
            ],
            maxFood: 7,
            maxX: 15,
            maxY: 15,
            pits: [],
            name: 'three'
        },
        {
            walls: [
                { x: 5, y: 16 },
                { x: 5, y: 17 },
                { x: 5, y: 18 },
                { x: 5, y: 19 },
                { x: 5, y: 20 },
                { x: 6, y: 6 },
                { x: 6, y: 7 },
                { x: 6, y: 8 },
                { x: 6, y: 9 },
                { x: 6, y: 10 },
                { x: 6, y: 29 },
                { x: 7, y: 29 },
                { x: 8, y: 29 },
                { x: 9, y: 2 },
                { x: 9, y: 16 },
                { x: 9, y: 29 },
                { x: 10, y: 2 },
                { x: 10, y: 16 },
                { x: 10, y: 29 },
                { x: 11, y: 2 },
                { x: 11, y: 16 },
                { x: 12, y: 2 },
                { x: 12, y: 16 },
                { x: 12, y: 24 },
                { x: 13, y: 2 },
                { x: 13, y: 16 },
                { x: 13, y: 24 },
                { x: 14, y: 24 },
                { x: 15, y: 24 },
                { x: 16, y: 8 },
                { x: 16, y: 9 },
                { x: 16, y: 10 },
                { x: 16, y: 11 },
                { x: 16, y: 12 },
                { x: 16, y: 13 },
                { x: 16, y: 14 },
                { x: 16, y: 15 },
                { x: 16, y: 24 },
                { x: 17, y: 24 },
                { x: 18, y: 24 },
                { x: 22, y: 5 },
                { x: 23, y: 5 },
                { x: 24, y: 5 },
                { x: 24, y: 25 },
                { x: 24, y: 26 },
                { x: 24, y: 27 },
                { x: 24, y: 28 },
                { x: 25, y: 5 },
                { x: 26, y: 5 },
                { x: 26, y: 16 },
                { x: 26, y: 17 },
                { x: 26, y: 18 },
                { x: 26, y: 19 },
                { x: 26, y: 20 },
                { x: 26, y: 21 },
                { x: 27, y: 5 }
            ],
            maxFood: 8,
            maxX: 32,
            maxY: 32,
            pits: [],
            name: 'four'
        },
        {
            walls: [
                { x: 2, y: 3 },
                { x: 3, y: 3 },
                { x: 4, y: 3 },
                { x: 5, y: 2 },
                { x: 5, y: 3 },
                { x: 5, y: 16 },
                { x: 5, y: 17 },
                { x: 5, y: 18 },
                { x: 5, y: 19 },
                { x: 5, y: 23 },
                { x: 6, y: 2 },
                { x: 6, y: 19 },
                { x: 6, y: 23 },
                { x: 6, y: 27 },
                { x: 7, y: 2 },
                { x: 7, y: 3 },
                { x: 7, y: 4 },
                { x: 7, y: 5 },
                { x: 7, y: 6 },
                { x: 7, y: 12 },
                { x: 7, y: 19 },
                { x: 7, y: 23 },
                { x: 7, y: 27 },
                { x: 8, y: 12 },
                { x: 8, y: 13 },
                { x: 8, y: 14 },
                { x: 8, y: 15 },
                { x: 8, y: 16 },
                { x: 8, y: 19 },
                { x: 8, y: 23 },
                { x: 8, y: 27 },
                { x: 9, y: 12 },
                { x: 9, y: 13 },
                { x: 9, y: 14 },
                { x: 9, y: 15 },
                { x: 9, y: 16 },
                { x: 9, y: 17 },
                { x: 9, y: 18 },
                { x: 9, y: 19 },
                { x: 9, y: 23 },
                { x: 9, y: 27 },
                { x: 10, y: 27 },
                { x: 11, y: 27 },
                { x: 12, y: 22 },
                { x: 12, y: 23 },
                { x: 12, y: 24 },
                { x: 12, y: 25 },
                { x: 12, y: 26 },
                { x: 12, y: 27 },
                { x: 12, y: 28 },
                { x: 12, y: 29 },
                { x: 12, y: 30 },
                { x: 14, y: 16 },
                { x: 15, y: 12 },
                { x: 16, y: 10 },
                { x: 16, y: 11 },
                { x: 16, y: 12 },
                { x: 17, y: 10 },
                { x: 17, y: 11 },
                { x: 17, y: 12 },
                { x: 18, y: 10 },
                { x: 18, y: 11 },
                { x: 18, y: 12 },
                { x: 19, y: 10 },
                { x: 19, y: 19 },
                { x: 19, y: 20 },
                { x: 19, y: 21 },
                { x: 19, y: 22 },
                { x: 19, y: 23 },
                { x: 19, y: 24 },
                { x: 20, y: 19 },
                { x: 20, y: 20 },
                { x: 20, y: 21 },
                { x: 20, y: 22 },
                { x: 20, y: 23 },
                { x: 20, y: 24 },
                { x: 23, y: 12 },
                { x: 24, y: 12 },
                { x: 25, y: 5 },
                { x: 25, y: 6 },
                { x: 25, y: 7 },
                { x: 25, y: 12 },
                { x: 26, y: 5 },
                { x: 26, y: 12 },
                { x: 26, y: 22 },
                { x: 26, y: 23 },
                { x: 26, y: 24 },
                { x: 26, y: 25 },
                { x: 27, y: 5 },
                { x: 27, y: 12 },
                { x: 28, y: 5 },
                { x: 28, y: 6 },
                { x: 28, y: 7 },
                { x: 28, y: 8 },
                { x: 28, y: 9 },
                { x: 28, y: 10 },
                { x: 28, y: 11 },
                { x: 28, y: 12 },
                { x: 28, y: 13 },
                { x: 28, y: 14 },
                { x: 28, y: 15 }
            ],
            maxFood: 9,
            maxX: 32,
            maxY: 32,
            pits: [],
            name: 'five'
        }
    ]
}
