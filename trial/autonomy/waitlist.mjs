function createWaitlist() {
  const slots = new Map();

  function validateId(id, name) {
    if (typeof id !== 'string' || !id.trim()) {
      throw new TypeError(`${name} must be a non-empty string`);
    }
  }

  function getQueue(slot) {
    if (!slots.has(slot)) {
      slots.set(slot, []);
    }
    return slots.get(slot);
  }

  return {
    join(slot, user) {
      validateId(slot, 'slot');
      validateId(user, 'user');

      const queue = getQueue(slot);
      if (!queue.includes(user)) {
        queue.push(user);
      }
    },

    cancel(slot, user) {
      validateId(slot, 'slot');
      validateId(user, 'user');

      const queue = slots.get(slot);
      if (queue) {
        const idx = queue.indexOf(user);
        if (idx !== -1) {
          queue.splice(idx, 1);
        }
      }
    },

    offer(slot) {
      validateId(slot, 'slot');

      const queue = slots.get(slot);
      if (queue && queue.length > 0) {
        return queue.shift();
      }
      return null;
    }
  };
}

export { createWaitlist };
