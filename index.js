function cloneGraph(root) {
  const knownCopies = new WeakMap();

  function copyValue(value) {
    if (value === null || typeof value !== "object") {
      return value;
    }

    if (knownCopies.has(value)) {
      return knownCopies.get(value);
    }

    const prototype = Object.getPrototypeOf(value);
    const result = Array.isArray(value) ? [] : Object.create(prototype);

    if (Array.isArray(value)) {
      Object.setPrototypeOf(result, prototype);
    }

    knownCopies.set(value, result);

    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);

      if (Object.hasOwn(descriptor, "value")) {
        descriptor.value = copyValue(descriptor.value);
      }

      Object.defineProperty(result, key, descriptor);
    }

    if (!Object.isExtensible(value)) {
      Object.preventExtensions(result);
    }

    return result;
  }

  return copyValue(root);
}

function expect(label, condition) {
  if (!condition) {
    throw new Error(`Проверка не пройдена: ${label}`);
  }

  console.log(`✓ ${label}`);
}

const action = () => "готово";

expect(
  "примитивы и функции",
  cloneGraph(42) === 42 &&
    cloneGraph(null) === null &&
    cloneGraph(action) === action,
);

const symbolKey = Symbol("access");
const settingsPrototype = { inherited: "из прототипа" };
const sharedSettings = Object.create(settingsPrototype);
sharedSettings.theme = "dark";

const sparseList = ["начало", , sharedSettings];
sparseList[3] = undefined;
sparseList.note = "дополнительное свойство";

const source = {
  first: sharedSettings,
  second: sharedSettings,
  list: sparseList,
  action,
  number: 1,
  [symbolKey]: { role: "student" },
};

source.self = source;

Object.defineProperty(source, "fixed", {
  value: { answer: 42 },
  enumerable: false,
  writable: false,
  configurable: false,
});

Object.defineProperty(source, "dangerous", {
  enumerable: true,
  get() {
    throw new Error("getter called");
  },
});

Object.defineProperty(source, "value", {
  get() {
    return this.number;
  },
  set(newValue) {
    this.number = newValue;
  },
});

Object.preventExtensions(source);

const copy = cloneGraph(source);

copy.first.theme = "light";
expect(
  "объекты копируются независимо",
  copy !== source &&
    copy.first !== sharedSettings &&
    sharedSettings.theme === "dark",
);

expect(
  "циклы и общие ссылки",
  copy.self === copy &&
    copy.first === copy.second &&
    copy.list[2] === copy.first,
);

settingsPrototype.addedLater = true;
const prototypeIsCorrect =
  Object.getPrototypeOf(copy.first) === settingsPrototype &&
  !Object.hasOwn(copy.first, "inherited") &&
  copy.first.addedLater === true &&
  source.first.addedLater === true;
delete settingsPrototype.addedLater;

expect("прототип сохранён по ссылке", prototypeIsCorrect);

expect(
  "разреженный массив сохранён",
  Array.isArray(copy.list) &&
    copy.list.length === 4 &&
    !(1 in copy.list) &&
    3 in copy.list &&
    copy.list[3] === undefined &&
    copy.list.note === "дополнительное свойство",
);

const fixedDescriptor = Object.getOwnPropertyDescriptor(copy, "fixed");
expect(
  "символы и ограничения свойств",
  copy[symbolKey] !== source[symbolKey] &&
    copy[symbolKey].role === "student" &&
    fixedDescriptor.enumerable === false &&
    fixedDescriptor.writable === false &&
    fixedDescriptor.configurable === false &&
    fixedDescriptor.value !== source.fixed,
);

let getterThrew = false;

try {
  copy.dangerous;
} catch (error) {
  getterThrew = error.message === "getter called";
}

copy.value = 10;
const sourceAccessors = Object.getOwnPropertyDescriptor(source, "value");
const copyAccessors = Object.getOwnPropertyDescriptor(copy, "value");

expect(
  "геттеры и сеттеры перенесены без вызова",
  getterThrew &&
    sourceAccessors.get === copyAccessors.get &&
    sourceAccessors.set === copyAccessors.set &&
    copy.value === 10 &&
    source.value === 1,
);

let constructorCalls = 0;

function Student(name) {
  constructorCalls += 1;
  this.name = name;
}

const studentCopy = cloneGraph(new Student("Анна"));
const objectWithoutPrototype = Object.create(null);
objectWithoutPrototype.answer = 42;
const bareCopy = cloneGraph(objectWithoutPrototype);

expect(
  "конструкторы и особые прототипы",
  constructorCalls === 1 &&
    Object.getPrototypeOf(studentCopy) === Student.prototype &&
    Object.getPrototypeOf(bareCopy) === null &&
    bareCopy.answer === 42 &&
    !Object.isExtensible(copy),
);

console.log("Все проверки успешно завершены.");
