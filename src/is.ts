import {Disposable} from './disposable'

export function isPromise(value: any): value is Promise<any> {
	return value instanceof Promise
}

export function isException(value: any): value is Promise<any> | Error {
	return isPromise(value) || value instanceof Error
}

export function isDisposable(value: any): value is Disposable {
	return (
		typeof value === 'object' &&
		value &&
		typeof value.dispose === 'function'
	)
}
