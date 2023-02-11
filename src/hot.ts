// import {batchCommits} from './batch'
// import {Cursor} from './cursor'
// import {Unit} from './unit'

// type Listener<T> = (value: T) => void

// export function hot<T>(work: () => T) {
// 	const unit = new HotUnit('unnamed', work)
// 	unit.pull()
// 	return unit
// }

// export class HotUnit<T> extends Unit<() => T> {
// 	listeners = new Set<Listener<T>>()

// 	subscribe(l: Listener<T>) {
// 		this.listeners.add(l)
// 		this.mark()
// 	}

// 	mark() {
// 		if (this.cursor === Cursor.stale) {
// 			return
// 		}

// 		super.mark()

// 		batchCommits.add(() => {
// 			const next = this.pull()
// 			console.log({next})

// 			this.listeners.forEach(l => l(next))
// 		})
// 	}

// 	dispose() {
// 		super.dispose()
// 	}
// }
