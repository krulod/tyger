// import {assert, test} from '@krulod/sorcerer'

// import {batch} from '../src/batch'
// import {hot} from '../src/hot'
// import {noop} from '../src/noop'
// import {Unit} from '../src/unit'

// const pub1 = new Unit('pub1', noop)
// const pub2 = new Unit('pub2', noop)

// test('hot', {
// 	'reacts synchronously': () => {
// 		let ran = 0

// 		hot(() => {
// 			ran++
// 			pub1.pull()
// 		})

// 		assert.is(ran, 1)

// 		pub1.mark()

// 		assert.is(ran, 2)
// 	},

// 	'manual batching': () => {
// 		let ran = 0

// 		hot(() => {
// 			ran++
// 			pub1.pull()
// 			pub2.pull()
// 		})

// 		batch(() => {
// 			pub1.mark()
// 			pub2.mark()
// 		})

// 		assert.is(ran, 2)
// 	},

// 	'automatic batching': () => {
// 		let ran = 0

// 		const sub = new Unit('sub', () => {
// 			pub1.pull()
// 			pub2.pull()
// 		})

// 		hot(() => {
// 			ran++
// 			sub.pull()
// 		})

// 		sub.mark()

// 		assert.is(ran, 2)
// 	},

// 	'logs errors 😢': () => {
// 		let errors = 0

// 		console.error = () => errors++

// 		hot(() => {
// 			throw new Error()
// 		})

// 		assert.is(errors, 1)
// 	},
// })
