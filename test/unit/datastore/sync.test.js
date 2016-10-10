import SyncManager from '../../../src/datastore/src/sync';
import { SyncError } from '../../../src/errors';
import { randomString } from '../../../src/utils';
import regeneratorRuntime from 'regenerator-runtime'; // eslint-disable-line no-unused-vars
import nock from 'nock';
import expect from 'expect';
const collection = 'Books';

describe('Sync', function () {
  afterEach(function() {
    const sync = new SyncManager(collection);
    return sync.clear();
  });

  describe('count()', function() {
    beforeEach(function() {
      const sync = new SyncManager(collection);
      return sync.addUpdateOperation({
        _id: randomString()
      });
    });

    beforeEach(function() {
      const sync = new SyncManager(collection);
      return sync.addUpdateOperation({
        _id: randomString()
      });
    });

    it('should return the count for all entities that need to be synced', async function() {
      const sync = new SyncManager(collection);
      const count = await sync.count();
      expect(count).toEqual(2);
    });

    it('should return the count that matches the query');
  });

  describe('addCreateOperation()', function() {
    it('should reject the promise when an entity does not contain and _id', async function() {
      try {
        const sync = new SyncManager(collection);
        await sync.addCreateOperation(collection, {
          prop: randomString()
        });
      } catch (error) {
        expect(error).toBeA(SyncError);
      }
    });

    it('should accept a single entity', async function() {
      const entity = {
        _id: randomString()
      };
      const sync = new SyncManager(collection);
      const syncEntity = await sync.addCreateOperation(entity);
      expect(syncEntity).toEqual(entity);
    });

    it('should accept an array of entities', async function() {
      const entities = [{
        _id: randomString()
      }];
      const sync = new SyncManager(collection);
      const syncEntities = await sync.addCreateOperation(entities);
      expect(syncEntities).toEqual(entities);
    });

    it('should add entities to the sync table', async function() {
      const entities = [{
        _id: randomString()
      }];
      const sync = new SyncManager(collection);
      await sync.addCreateOperation(entities);
      const count = await sync.count();
      expect(count).toEqual(entities.length);
    });
  });

  describe('addUpdateOperation()', function() {
    it('should reject the promise when an entity does not contain and _id', async function() {
      try {
        const sync = new SyncManager(collection);
        await sync.addUpdateOperation(collection, {
          prop: randomString()
        });
      } catch (error) {
        expect(error).toBeA(SyncError);
      }
    });

    it('should accept a single entity', async function() {
      const entity = {
        _id: randomString()
      };
      const sync = new SyncManager(collection);
      const syncEntity = await sync.addUpdateOperation(entity);
      expect(syncEntity).toEqual(entity);
    });

    it('should accept an array of entities', async function() {
      const entities = [{
        _id: randomString()
      }];
      const sync = new SyncManager(collection);
      const syncEntities = await sync.addUpdateOperation(entities);
      expect(syncEntities).toEqual(entities);
    });

    it('should add entities to the sync table', async function() {
      const entities = [{
        _id: randomString()
      }];
      const sync = new SyncManager(collection);
      await sync.addUpdateOperation(entities);
      const count = await sync.count();
      expect(count).toEqual(entities.length);
    });
  });

  describe('addDeleteOperation', function() {
    it('should reject the promise when an entity does not contain and _id', async function() {
      try {
        const sync = new SyncManager(collection);
        await sync.addDeleteOperation(collection, {
          prop: randomString()
        });
      } catch (error) {
        expect(error).toBeA(SyncError);
      }
    });

    it('should accept a single entity', async function() {
      const entity = {
        _id: randomString()
      };
      const sync = new SyncManager(collection);
      const syncEntity = await sync.addDeleteOperation(entity);
      expect(syncEntity).toEqual(entity);
    });

    it('should accept an array of entities', async function() {
      const entities = [{
        _id: randomString()
      }];
      const sync = new SyncManager(collection);
      const syncEntities = await sync.addDeleteOperation(entities);
      expect(syncEntities).toEqual(entities);
    });

    it('should add entities to the sync table', async function() {
      const entities = [{
        _id: randomString()
      }];
      const sync = new SyncManager(collection);
      await sync.addDeleteOperation(entities);
      const count = await sync.count();
      expect(count).toEqual(entities.length);
    });
  });

  describe('pull()', function() {
    it('should return entities from the backend', async function() {
      const entity = {
        _id: randomString(),
        _kmd: {},
        prop: randomString()
      };
      const sync = new SyncManager(collection);

      // Kinvey API Response
      nock(this.client.baseUrl)
        .get(sync.backendPathname, () => true)
        .query(true)
        .reply(200, [entity], {
          'content-type': 'application/json'
        });

      const entities = await sync.pull();
      expect(entities).toBeA(Array);
      expect(entities.length).toEqual(1);
      expect(entities).toEqual([entity]);
    });
  });

  describe('push()', function() {
    it('should execute pending sync operations', async function() {
      const entity1 = {
        _id: randomString()
      };
      const sync = new SyncManager(collection);
      await sync.addDeleteOperation(entity1);

      // Kinvey API Response
      nock(sync.client.baseUrl)
        .delete(`${sync.backendPathname}/${entity1._id}`, () => true)
        .query(true)
        .reply(204);

      const result = await sync.push();
      expect(result).toEqual([{ _id: entity1._id }]);

      const count = await sync.count();
      expect(count).toEqual(0);
    });
  });
});
