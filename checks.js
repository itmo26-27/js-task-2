const assert = require("node:assert/strict");
const { cloneGraph } = require("./solution.js");

const symbol = Symbol("key");
const method = function () {
  return this.name;
};

for (const value of [null, undefined, true, 12, NaN, -0, 12n, "text", symbol, method]) {
  assert.equal(cloneGraph(value), value);
}

const prototype = { category: "users" };
const shared = { name: "Artem" };
const original = Object.create(prototype);
original.first = shared;
original.second = shared;
original.self = original;
original.method = method;
original.items = new Array(5);
original.items[1] = shared;
original.items[3] = undefined;
original.items.extra = shared;
original.items.owner = original;
original[symbol] = shared;

Object.defineProperty(original, "hidden", {
  value: shared,
  writable: false,
  enumerable: false,
  configurable: false,
});

let getterCalls = 0;
Object.defineProperty(original, "broken", {
  get: function () {
    getterCalls += 1;
    throw new Error("Cannot read property");
  },
});
Object.defineProperty(original, "name", {
  get: function () {
    return this.first.name;
  },
  set: function (value) {
    this.first.name = value;
  },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(original.items, "length", { writable: false });

const copy = cloneGraph(original);
assert.equal(getterCalls, 0);
assert.notEqual(copy, original);
assert.notEqual(copy.first, shared);
assert.equal(copy.first, copy.second);
assert.equal(copy.self, copy);
assert.equal(copy[symbol], copy.first);
assert.equal(copy.hidden, copy.first);
assert.equal(copy.method, method);
assert.equal(Object.getPrototypeOf(copy), prototype);
assert.equal(Object.hasOwn(copy, "category"), false);
prototype.category = "people";
assert.equal(original.category, "people");
assert.equal(copy.category, "people");

assert.equal(Array.isArray(copy.items), true);
assert.notEqual(copy.items, original.items);
assert.equal(Object.getPrototypeOf(copy.items), Array.prototype);
assert.equal(copy.items.length, 5);
assert.equal(0 in copy.items, false);
assert.equal(2 in copy.items, false);
assert.equal(3 in copy.items, true);
assert.equal(copy.items[3], undefined);
assert.equal(4 in copy.items, false);
assert.equal(copy.items[1], copy.first);
assert.equal(copy.items.extra, copy.first);
assert.equal(copy.items.owner, copy);
assert.equal(Object.getOwnPropertyDescriptor(copy.items, "length").writable, false);
assert.deepEqual(Reflect.ownKeys(copy), Reflect.ownKeys(original));
assert.deepEqual(Object.getOwnPropertyDescriptor(copy, "hidden"), {
  value: copy.first,
  writable: false,
  enumerable: false,
  configurable: false,
});
for (const key of ["name", "broken"]) {
  assert.deepEqual(
    Object.getOwnPropertyDescriptor(copy, key),
    Object.getOwnPropertyDescriptor(original, key)
  );
}
assert.equal(Reflect.set(copy, "hidden", {}), false);
assert.equal(Reflect.deleteProperty(copy, "hidden"), false);
assert.equal(copy.name, "Artem");
copy.name = "Andrew";
assert.equal(copy.first.name, "Andrew");
assert.equal(original.first.name, "Artem");
assert.equal(copy.method(), "Andrew");
assert.throws(function () {
  return copy.broken;
}, /Cannot read property/);
assert.equal(getterCalls, 1);
assert.equal(original.self, original);
assert.equal(original.items.owner, original);
assert.equal(original.items[1], shared);
assert.notEqual(cloneGraph(original).first, copy.first);

const dictionary = Object.create(null);
dictionary.entry = { count: 1 };
const dictionaryCopy = cloneGraph(dictionary);
assert.equal(Object.getPrototypeOf(dictionaryCopy), null);
assert.notEqual(dictionaryCopy.entry, dictionary.entry);
assert.equal(dictionaryCopy.entry.count, 1);

let constructorCalls = 0;
function User() {
  constructorCalls += 1;
  this.details = { age: 20 };
}
const user = new User();
const userCopy = cloneGraph(user);
assert.equal(constructorCalls, 1);
assert.equal(Object.getPrototypeOf(userCopy), User.prototype);
assert.equal(userCopy instanceof User, true);
assert.notEqual(userCopy.details, user.details);
assert.equal(userCopy.details.age, 20);

const arrayPrototype = Object.create(Array.prototype);
const array = [shared];
Object.setPrototypeOf(array, arrayPrototype);
const arrayCopy = cloneGraph(array);
assert.equal(Array.isArray(arrayCopy), true);
assert.equal(Object.getPrototypeOf(arrayCopy), arrayPrototype);
assert.notEqual(arrayCopy[0], shared);
assert.equal(Object.getPrototypeOf(array), arrayPrototype);
