let batchDepth = 0

type Listener = () => void

export const batchCommits = new Set<Listener>()

export function batchStart() {
	batchDepth++
}

export function batchEnd() {
	if (!--batchDepth && batchCommits.size) {
		batchCommits.forEach(l => {
			try {
				l()
			} catch (error) {
				console.error(error)
			}
		})
		batchCommits.clear()
	}
}

export function batch<T>(work: () => T) {
	batchStart()

	try {
		return work()
	} finally {
		batchEnd()
	}
}
