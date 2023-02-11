import {compare} from './compare'
import {Cursor} from './cursor'
import {Formula} from './formula'
import {isDisposable, isPromise} from './is'
import {owning, owningCheck} from './owning'
import {Unit, UnitCache} from './unit'

export class Atom<F extends Formula> extends Unit<F> {
	set(next: UnitCache<F>) {
		const prev = this.cache

		if (!compare(prev, next)) {
			if (owningCheck(this, prev)) {
				prev.dispose()
			}

			if (
				isDisposable(next) &&
				!owning.has(next)
			) {
				owning.set(next, this)

				if (this.id) {
					try {
						(next as any)[Symbol.toStringTag] = this.id
					}  catch {
						Object.defineProperty(
							next,
							Symbol.toStringTag,
							{value: this.id}
						)
					}
				}
			}

			if (!this.subEmpty) {
				this.mark()
			}
		}

		this.cache = next
		this.cursor = Cursor.fresh

		if (!isPromise(next)) {
			for (let i = this.pubAt; i < this.pubLimit; i += 2) {
				(this.data[i] as Unit).complete()
			}
		}
	}

	dispose() {
		super.dispose()

		const prev = this.cache
		if (owningCheck(this, prev)) {
			prev.dispose()
		}

		// if (!this.pubAt) {
		// 	storeSet(this.host, this.formula, null)
		// } else {
		// 	storeGet(this.host, this.formula)?.delete(this.id)
		// }
	}
}
