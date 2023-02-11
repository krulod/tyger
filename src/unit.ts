import {Formula} from './formula'
import {Cursor} from './cursor'
import {isException, isPromise} from './is'
import {Disposable} from './disposable'
import {noop} from './noop'
import {batchStart, batchEnd} from './batch'

export type UnitCache<F extends Formula> =
	ReturnType<F> | Error | Promise<ReturnType<F> | Error>

const promises = new WeakSet<Promise<any>>()

export class Unit<F extends Formula = Formula> {
	private static queue: Unit[] = []
	static current: Unit | null = null
	static reaping = new Set<Unit>()

	data: unknown[]
	pubAt: number
	subAt: number
	cursor = Cursor.stale

	cache!: UnitCache<F>

	constructor(
		public id: string,
		public formula: F,
		public host?: ThisParameterType<F>,
		args?: any[],
	) {
		this.data = args?.slice() ?? []
		this.pubAt = this.subAt = this.data.length
	}

	get tracking() {
		return this.cursor >= 0
	}

	get final() {
		return this.cursor === Cursor.final
	}


	get pubLimit() {
		return this.tracking ? this.cursor : this.subAt
	}

	get subEmpty() {
		return this.data.length === this.subAt
	}

	get last() {
		return this.data.length - 2
	}

	get args() {
		return this.data.slice(0, this.pubAt)
	}

	get pubs() {
		return this.slice(this.pubAt, this.pubLimit)
	}

	get subs() {
		return this.slice(this.subAt, this.data.length)
	}

	private slice(min: number, max: number) {
		const result: Unit[] = []

		for (let i = min; i < max; i += 2) {
			const peer = this.data[i] as Unit | undefined
			if (peer) result.push(peer)
		}

		return result
	}

	private pop2() {
		this.data.pop()
		this.data.pop()
	}

	private move(from: number, to: number) {
		const peer = this.data[from] as Unit
		const selfAt = this.data[from + 1] as number

		this.data[to] = peer
		this.data[to + 1] = selfAt

		peer.data[selfAt + 1] = to
	}

	track(pub: Unit) {
		const i = this.cursor

		if (i < this.subAt) {
			const last = this.data[i] as Unit

			if (pub === last) {
				this.cursor += 2
				return
			}

			if (last) {
				this.depart()
				this.move(i, this.subAt)
				this.subAt += 2
			}
		} else {
			this.depart()
			this.subAt += 2
		}

		this.data[i] = pub
		this.data[i + 1] = pub.data.push(this, i) - 2
		this.cursor += 2
	}

	private depart() {
		if (this.subAt < this.data.length) {
			this.move(this.subAt, this.data.length)
		}
	}

	mark() {
		if (!this.tryQueue(Cursor.stale)) {
			return
		}

		let unit: Unit | undefined

		while (unit = Unit.queue.pop()) {
			unit.tryQueue(Cursor.doubt)
		}
	}

	tryQueue(quant: Cursor) {
		if (this.cursor >= quant) return false

		this.cursor = quant

		for (let i = this.subAt; i < this.data.length; i += 2) {
			Unit.queue.push(this.data[i] as Unit)
		}

		return true
	}

	complete() {}

	cut() {
		let tail = 0

		for (let i = this.cursor; i < this.subAt; i += 2) {
			const pub = this.data[i] as Unit | undefined

			if (pub !== undefined) {
				const pos = pub.data[i + 1] as number
				const end = pub.data.length - 2

				if (pos !== end) {
					pub.move(end, pos)
				}
				pub.pop2()

				if (pub.subEmpty) Unit.reaping.add(pub)
			}

			if (this.subAt < this.data.length) {
				this.move(this.last, i)
				this.pop2()
			} else {
				tail++
			}

			while (tail--) {
				this.pop2()
			}

			this.subAt = this.cursor
		}
	}

	dispose() {
		for (let i = this.last; i >= this.subAt; i -= 2) {
			const sub = this.data[i] as Unit
			const pos = this.data[i + 1] as number

			sub.data[pos] = undefined
			sub.data[pos + 1] = undefined

			this.pop2()
		}

		this.cursor = this.pubAt
		this.cut()

		this.cursor = Cursor.final // 🕯️
	}

	pull() {
		if (this.tracking) {
			this.cache = new Error('Circular subscription')
		} else {
			Unit.current?.track(this)

			this.refresh()
		}

		if (isException(this.cache)) throw this.cache

		return this.cache as ReturnType<F>
	}

	refresh() {
		type Cache = UnitCache<F>

		if (this.cursor <= Cursor.fresh) return

		check: if (this.cursor === Cursor.doubt) {
			for (let i = this.pubAt; i < this.subAt; i += 2) {
				(this.data[i] as Unit | undefined)?.refresh()

				if (this.cursor !== Cursor.doubt) break check
			}

			this.cursor = Cursor.fresh
			return
		}

		const prev = Unit.current
		Unit.current = this
		this.cursor = this.pubAt

		let next: Cache

		batchStart()

		try {
			if (this.pubAt === 0) {
				next = this.formula.call(this.host)
			} else if (this.pubAt === 1) {
				next = this.formula.call(this.host, this.data[0])
			} else if (this.pubAt === 2) {
				next = this.formula.call(this.host, this.data[0], this.data[1])
			} else {
				next = this.formula.apply(this.host, this.args)
			}

			if (isPromise(next)) {
				const resume = (result: Cache) => {
					if (this.cache === next) this.set(result)
				}

				next = promiseHandle(next, next.then(resume, resume))
			}
		} catch (caught) {
			if (isException(caught)) {
				next = caught
			} else {
				next = new Error(String(caught), {cause: caught})
			}

			if (isPromise(next) && !promises.has(next)) {
				next = promiseHandle(next, next.finally(() => {
					if (this.cache === next) this.mark()
				}))
			}
		}

		if (!isPromise(next)) {
			this.cut()
		}

		Unit.current = prev

		for (let i = this.pubAt; i < this.cursor; i += 2) {
			(this.data[i] as Unit).refresh()
		}

		this.cursor = Cursor.fresh

		this.set(next)

		batchEnd()
	}

	set(next: UnitCache<F>) {}
}

function promiseHandle(original: Promise<any>, next: Promise<any>) {
	promises.add(next)

	return Object.assign(next, {
		dispose: (original as any as Disposable).dispose ?? noop
	})
}
