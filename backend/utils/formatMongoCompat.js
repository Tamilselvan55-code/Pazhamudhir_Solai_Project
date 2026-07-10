/**
 * formatMongoCompat
 * Wraps Prisma query results so they are 100% compatible with existing frontend and controller code
 * expecting Mongoose documents (e.g. `item._id`, `doc.toObject()`, `doc.toJSON()`).
 */
export const formatMongoCompat = (data) => {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => formatMongoCompat(item));
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    // Clone object to avoid mutating Prisma read-only instances if any
    const formatted = { ...data };

    // Attach _id alias for id if present
    if (formatted.id && !formatted._id) {
      formatted._id = formatted.id;
    }

    // Recursively process nested objects and arrays
    for (const key of Object.keys(formatted)) {
      if (typeof formatted[key] === 'object' && formatted[key] !== null && !(formatted[key] instanceof Date)) {
        formatted[key] = formatMongoCompat(formatted[key]);
      }
    }

    // Attach Mongoose document compatibility helper methods
    if (typeof formatted.toObject !== 'function') {
      Object.defineProperty(formatted, 'toObject', {
        value: function () {
          const copy = { ...this };
          delete copy.toObject;
          delete copy.toJSON;
          return copy;
        },
        enumerable: false,
        writable: true,
        configurable: true
      });
    }

    if (typeof formatted.toJSON !== 'function') {
      Object.defineProperty(formatted, 'toJSON', {
        value: function () {
          const copy = { ...this };
          delete copy.toObject;
          delete copy.toJSON;
          return copy;
        },
        enumerable: false,
        writable: true,
        configurable: true
      });
    }

    return formatted;
  }

  return data;
};

export const formatMongoCompatArray = (data) => formatMongoCompat(data);

