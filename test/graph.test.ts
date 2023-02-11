import {test, assert} from '@krulod/sorcerer'

import {Unit} from '../src/unit'

function make(id: string, formula = () => {}) {
	return [
		new Unit(id, () => formula()),
		(next: typeof formula) => formula = next,
	] as const
}

test('graph', {
	'collect publishers': () => {
		const [sub, setSub] = make('sub')
		const [pub1] = make('pub1')
		const [pub2] = make('pub2')

		setSub(() => {
			pub1.pull()
			pub2.pull()
			pub2.pull()
		})

		sub.pull()

		assert.equal(sub.pubs, [pub1, pub2, pub2])

		setSub(() => {})

		sub.mark()
		sub.pull()

		assert.equal(sub.pubs, [])

		setSub(() => {
			pub2.pull()
			pub1.pull()
			pub1.pull()
		})

		sub.mark()
		sub.pull()

		assert.equal(sub.pubs, [pub2, pub1, pub1])
	},

	'circular subscriptions': () => {
		const [a] = make('a', () => b.pull())
		const [b] = make('b', () => a.pull())

		assert.throws(() => {
			a.pull()
		}, /Circular subscription/)
	},

	'marking': () => {
		const [u1] = make('u1')
		const [u2] = make('u3', () => u1.pull())
		const [u3] = make('u3', () => u2.pull())
		const [u4] = make('u4', () => u3.pull())

		u4.pull()

		const cursors = () => [u1, u2, u3, u4].map(u => u.cursor)

		assert.equal(cursors(), [-3, -3, -3, -3])

		u1.mark()

		assert.equal(cursors(), [-1, -2, -2, -2])

		u3.mark()

		assert.equal(cursors(), [-1, -2, -1, -2])

		u2.pull()

		assert.equal(cursors(), [-3, -3, -1, -2])
	},
})
