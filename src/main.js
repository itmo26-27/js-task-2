function cloneGraph(value, seen = []) {
    if (value === null) return value;

    const type = typeof value;
    if (type !== 'object') return value;  // примитивы и функции просто возвращаем

    for (const pair of seen) {
        if (pair.from === value) return pair.to;
    }

    const proto = Object.getPrototypeOf(value);
    const isArray = value instanceof Array;

    const copy = isArray ? [] : Object.create(proto);

    seen.push({ from: value, to: copy });

    if (isArray && Object.getPrototypeOf(copy) !== proto) {  // если у массива свой прототип
        Object.setPrototypeOf(copy, proto);
    }

    let lengthDescriptor;

    for (const key of Reflect.ownKeys(value)) {
        if (isArray && key === 'length') {
            lengthDescriptor = Object.getOwnPropertyDescriptor(value, key);
            continue;
        }

        const descriptor = Object.getOwnPropertyDescriptor(value, key);

        if ('value' in descriptor) {  // data-свойств, для него делаем копию
            descriptor.value = cloneGraph(descriptor.value, seen);
        }

        Object.defineProperty(copy, key, descriptor);
    }

    if (lengthDescriptor) {
        Object.defineProperty(copy, 'length', lengthDescriptor);
    }

    if (!Object.isExtensible(value)) {
        Object.preventExtensions(copy);
    }

  return copy;
}

const assert = require('node:assert/strict')

// готовим нужный граф
const sym = Symbol('secret');
const proto = { inherited: 'proto' };
const shared = { n: 1 };

const original = Object.create(proto);
original.self = original;  // цикл
original.first = shared;  // две ссылки на один объект
original.second = shared;

original.arr = [10, , 30];  // массив с дыркой
original.arr.extra = 'extra';  // доп. свойство массива

original[sym] = { ok: true };  // символьное свойство

// неперечисляемое неизменяемое свойство
Object.defineProperty(original, 'hidden', {
    value: { deep: 1 },
    writable: false, enumerable: false, configurable: false,
});

// геттер, который бросает ошибку
Object.defineProperty(original, 'boom', {
    get() { throw new Error('boom'); },
    enumerable: true, configurable: true,
});

// геттер, возвращающий this
Object.defineProperty(original, 'selfGetter', {
    get() { return this; },
    enumerable: true, configurable: true,
});

// клонируем
let copy;

assert.doesNotThrow(() => { copy = cloneGraph(original); });  // геттер с ошибкой не вызвадся

assert.notStrictEqual(copy, original);  // объект новый
assert.strictEqual(Object.getPrototypeOf(copy), proto);  // прототип тот же, по ссылке

assert.strictEqual(copy.self, copy);  // цикл ок
assert.strictEqual(copy.first, copy.second);  // общая ссылка сохранена
assert.notStrictEqual(copy.first, shared);  // копия, не оригинал

copy.first.n = 2;
assert.strictEqual(shared.n, 1);  // копия независимая

// массив
assert.strictEqual(copy.arr.length, 3);
assert.strictEqual(1 in copy.arr, false);
assert.strictEqual(copy.arr.extra, 'extra');

// символ
assert.notStrictEqual(copy[sym], original[sym]);
assert.strictEqual(copy[sym].ok, true);

// ограничения сохраняются
const hd = Object.getOwnPropertyDescriptor(copy, 'hidden');
assert.strictEqual(hd.writable, false);
assert.strictEqual(hd.enumerable, false);
assert.strictEqual(hd.configurable, false);
assert.notStrictEqual(hd.value,Object.getOwnPropertyDescriptor(original, 'hidden').value);

// геттер
assert.strictEqual(copy.selfGetter, copy);
assert.throws(() => copy.boom, /boom/);

// Унаследованные свойства не становятся собственными.
assert.strictEqual(Object.hasOwn(copy, 'inherited'), false);
proto.inherited = 'changed';
assert.strictEqual(copy.inherited, 'changed');  // копия видит изменение
assert.strictEqual(original.inherited, 'changed');  // оригинал не испорчен

console.log('Проверки прошли');