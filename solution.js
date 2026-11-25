function cloneGraph(value) {
  const copies = new WeakMap();

  function clone(current) {
    if (current === null || typeof current !== "object") {
      return current;
    }

    if (copies.has(current)) {
      return copies.get(current);
    }

    const copy = Array.isArray(current)
      ? []
      : Object.create(Object.getPrototypeOf(current));

    if (Array.isArray(current)) {
      Object.setPrototypeOf(copy, Object.getPrototypeOf(current));
    }

    copies.set(current, copy);

    for (const key of Reflect.ownKeys(current)) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);

      if ("value" in descriptor) {
        descriptor.value = clone(descriptor.value);
      }

      Object.defineProperty(copy, key, descriptor);
    }

    return copy;
  }

  return clone(value);
}

module.exports = { cloneGraph };
