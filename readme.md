# Tyger

Next generation reactivity.

## Usage

```ts
import {box, cell} from 'tyger'

const name = box('')
const greet = cell(() => console.log(`Welcome, ${name()}!`))
```
```ts
name('World')

greet() // Hello, World!
greet() // *silent*
```

## License

GNU Affero General Public License v3.0 or later