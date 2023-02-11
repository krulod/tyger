const cache = new WeakMap<any, WeakMap<any, boolean>>()

export function compare<T>(a: T, b: T): boolean {
	if (Object.is(a, b)) return true

	if (
		a === null ||
		b === null ||
		typeof a !== 'object' ||
		typeof b !== 'object'
	) return false

	const ap = Reflect.getPrototypeOf(a)
	const bp = Reflect.getPrototypeOf(b)

	if (ap !== bp) return false

	if (a instanceof Date) {
		return a.valueOf() === b.valueOf()
	}
	if (a instanceof RegExp) {
		return a.source === (b as any).source && a.flags === (b as any).flags
	}
	if (a instanceof Error) {
		return a.message === (b as any).message && a.stack === (b as any).stack
	}

	let ac = cache.get(a)
	if (ac) {
		const bc = ac.get(b)
		if (typeof bc === 'boolean') return bc
	} else {
		cache.set(
			a,
			(ac = new WeakMap().set(b, true))
		)
	}

	let result: boolean

	try {
		if (ap && !Reflect.getPrototypeOf(ap)) {
			const aKeys = Object.getOwnPropertyNames(a)
			const bKeys = Object.getOwnPropertyNames(b)

			result = aKeys.length === bKeys.length

			if (result) {
				for (let i = 0; i < aKeys.length; i++) {
					const key = aKeys[i]

					result = compare((a as any)[key], (b as any)[key])

					if (!result) {
						break
					}
				}
			}
		}

		else if (Array.isArray(a)) {
			result = a.length === (b as any).length

			if (result) {
				for (let i = 0; i < a.length; i++) {
					result = compare(a[i], (b as any)[i])

					if (!result) {
						break
					}
				}
			}
		}

		else if (a instanceof Set) {
			result =
				a.size === (b as any).size &&
				compareIter(a.values(), (b as any).values())
		}

		else if (a instanceof Map) {
			result =
				a.size === (b as any).size &&
				compareIter(a.keys(), (b as any).keys()) &&
				compareIter(a.values(), (b as any).values())
		}

		else if (ArrayBuffer.isView(a)) {
			result = a.byteLength === (b as any).byteLength

			if (result) {
				for (let i = 0; i < a.byteLength; i++) {
					result = (a as any)[i] === (b as any)[i]
					if (!result) {
						break
					}
				}
			}
		}

		else if (Symbol.toPrimitive in a) {
			result =
				(a as any)[Symbol.toPrimitive]('default') ===
				(b as any)[Symbol.toPrimitive]('default')
		}

		else result = false
	} finally {
		ac.set(b, result!)
	}

	return result
}

function compareIter<T>(a: Iterator<T>, b: Iterator<T>) {
	for (;;) {
		const an = a.next()
		const bn = b.next()

		if (an.done) {
			return !!bn.done
		}

		if (!compare(an.value, bn.value)) return false
	}
}
