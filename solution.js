"use strict";

function cloneGraph(value, seen = new Map()) {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return seen.get(value);
  }

  const proto = Object.getPrototypeOf(value);
  const copy = Array.isArray(value) ? [] : Object.create(proto);
  seen.set(value, copy);

  if (Array.isArray(value)) {
    Object.setPrototypeOf(copy, proto);
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    const descriptor = descriptors[key];
    if (Object.hasOwn(descriptor, "value")) {
      descriptor.value = cloneGraph(descriptor.value, seen);
    }
  }

  Object.defineProperties(copy, descriptors);

  if (!Object.isExtensible(value)) {
    Object.preventExtensions(copy);
  }

  return copy;
}

function check(condition, label) {
  if (!condition) {
    throw new Error(`FAIL: ${label}`);
  }
  console.log(`OK: ${label}`);
}

const fn = () => 1;
check(cloneGraph(42) === 42, "примитив возвращается как есть");
check(cloneGraph(null) === null, "null возвращается как есть");
check(cloneGraph(fn) === fn, "функция сохраняется по ссылке");

const sym = Symbol("tag");
const proto = { inherited: "from prototype" };
const shared = Object.create(proto);
shared.value = 1;

const source = {
  first: shared,
  second: shared,
  sparse: [10, , 30],
  [sym]: "symbol value",
};
source.self = source;
source.sparse.extra = "extra";
source.sparse[3] = undefined;

Object.defineProperty(source, "fixed", {
  value: 42,
  enumerable: false,
  writable: false,
  configurable: false,
});
Object.defineProperty(source, "throws", {
  get() {
    throw new Error("getter called");
  },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(source, "receiver", {
  get() {
    return this;
  },
  enumerable: true,
  configurable: true,
});

const copy = cloneGraph(source);

check(copy !== source, "корневой объект скопирован");
check(copy.self === copy, "циклическая ссылка сохранена");
check(copy.first === copy.second, "общая ссылка указывает на одну копию");
check(
  copy.first !== shared && copy.first.value === 1,
  "вложенный объект скопирован",
);
check(
  Object.getPrototypeOf(copy.first) === proto,
  "прототип сохранён по ссылке",
);
check(
  !Object.hasOwn(copy.first, "inherited"),
  "унаследованное свойство не стало собственным",
);
check(copy[sym] === "symbol value", "символьное свойство скопировано");

check(Array.isArray(copy.sparse), "массив остался массивом");
check(copy.sparse.length === 4, "длина массива сохранена");
check(!(1 in copy.sparse), "пропуск в массиве сохранён");
check(
  3 in copy.sparse && copy.sparse[3] === undefined,
  "undefined остался собственным элементом",
);
check(
  copy.sparse.extra === "extra",
  "дополнительное свойство массива скопировано",
);

const fixed = Object.getOwnPropertyDescriptor(copy, "fixed");
check(
  fixed.value === 42 &&
    fixed.enumerable === false &&
    fixed.writable === false &&
    fixed.configurable === false,
  "неперечисляемое неизменяемое свойство и его ограничения сохранены",
);
check(
  Object.getOwnPropertyDescriptor(copy, "throws").get ===
    Object.getOwnPropertyDescriptor(source, "throws").get,
  "геттер перенесён без вызова",
);

let getterThrew = false;
try {
  void copy.throws;
} catch (error) {
  getterThrew = error.message === "getter called";
}
check(
  getterThrew,
  "геттер работает на копии и выбрасывает ошибку при обращении",
);
check(copy.receiver === copy, "в геттере копии this указывает на копию");

copy.first.value = 2;
check(
  shared.value === 1,
  "изменение вложенного объекта копии не меняет оригинал",
);
proto.added = "shared";
check(
  copy.first.added === "shared" && shared.added === "shared",
  "общий прототип виден и оригиналу, и копии",
);
delete proto.added;
check(
  source.first === shared && source.self === source,
  "оригинальный граф не изменён",
);

const bare = Object.create(null);
bare.x = 1;
const bareCopy = cloneGraph(bare);
check(
  Object.getPrototypeOf(bareCopy) === null && bareCopy.x === 1,
  "прототип null сохранён",
);

let created = 0;
class Example {
  constructor() {
    created += 1;
  }
}
const exampleCopy = cloneGraph(new Example());
check(created === 1, "конструктор не вызывается при клонировании");
check(
  Object.getPrototypeOf(exampleCopy) === Example.prototype,
  "прототип класса сохранён",
);

const frozenCopy = cloneGraph(Object.freeze({ answer: 42 }));
check(
  Object.isFrozen(frozenCopy) && frozenCopy.answer === 42,
  "замороженное состояние сохранено",
);

console.log("Все проверки пройдены.");
