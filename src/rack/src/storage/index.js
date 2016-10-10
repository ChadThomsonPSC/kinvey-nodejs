import { NotFoundError } from './src/errors';
import Memory from './src/memory';
import Promise from 'es6-promise';
import Queue from 'promise-queue';
import isString from 'lodash/isString';
import isArray from 'lodash/isArray';
Queue.configure(Promise);
const queue = new Queue(1, Infinity);

/**
 * Enum for Storage Adapters.
 */
const StorageAdapter = {
  Memory: 'Memory'
};
Object.freeze(StorageAdapter);

export default class Storage {
  constructor(name) {
    if (!name) {
      throw new Error('Unable to create a Storage instance without a name.');
    }

    if (!isString(name)) {
      throw new Error('The name is not a string. A name must be a string to create a Storage instance.');
    }

    this.name = name;
  }

  get adapter() {
    if (Memory.isSupported()) {
      return new Memory(this.name);
    }

    throw new Error('No storage adapter is available.');
  }

  generateObjectId(length = 24) {
    const chars = 'abcdef0123456789';
    let objectId = '';

    for (let i = 0, j = chars.length; i < length; i += 1) {
      const pos = Math.floor(Math.random() * j);
      objectId += chars.substring(pos, pos + 1);
    }

    return objectId;
  }

  find(collection) {
    return this.adapter.find(collection)
      .catch((error) => {
        if (error instanceof NotFoundError || error.code === 404) {
          return [];
        }

        throw error;
      })
      .then((entities = []) => entities);
  }

  findById(collection, id) {
    if (!isString(id)) {
      return Promise.reject(new Error('id must be a string', id));
    }

    return this.adapter.findById(collection, id);
  }

  // async group(collection, aggregation) {
  //   const entities = await this.find(collection);

  //   if (!(aggregation instanceof Aggregation)) {
  //     aggregation = new Aggregation(result(aggregation, 'toJSON', aggregation));
  //   }

  //   if (entities.length > 0 && aggregation) {
  //     return aggregation.process(entities);
  //   }

  //   return null;
  // }

  save(collection, entities = []) {
    return queue.add(() => {
      let singular = false;

      if (!entities) {
        return Promise.resolve(null);
      }

      if (!isArray(entities)) {
        singular = true;
        entities = [entities];
      }

      entities = entities.map((entity) => {
        let id = entity._id;
        const kmd = entity._kmd || {};

        if (!id) {
          id = this.generateObjectId();
          kmd.local = true;
        }

        entity._id = id;
        entity._kmd = kmd;
        return entity;
      });

      return this.adapter.save(collection, entities)
        .then((entities) => {
          if (singular && entities.length > 0) {
            return entities[0];
          }

          return entities;
        });
    });
  }

  remove(collection, entities = []) {
    return Promise.all(entities.map((entity) => {
      if (typeof entity._id === 'undefined') {
        return Promise.reject('Unable to remove an entity because it does not have _id.');
      }

      return this.removeById(collection, entity._id);
    }))
      .then((responses) => {
        return responses.reduce((entities, entity) => {
          entities.push(entity);
          return entities;
        }, []);
      });
  }

  removeById(collection, id) {
    return queue.add(() => {
      if (!isString(id)) {
        return Promise.reject(new Error('id must be a string', id));
      }

      return this.adapter.removeById(collection, id);
    });
  }

  clear() {
    return queue.add(() => this.adapter.clear());
  }
}
