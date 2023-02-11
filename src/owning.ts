import {Disposable} from './disposable'
import {isDisposable} from './is'

export const owning = new WeakMap<Disposable, object>()

export function owningCheck(owner: object, value: any): value is Disposable {
	return isDisposable(value) && owning.get(value) === owner
}
