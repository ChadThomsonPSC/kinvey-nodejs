import Request from './request';
import { Client } from '../../client';
import KinveyResponse from './kinveyresponse';
import UrlPattern from 'url-pattern';
import url from 'url';
import localStorage from 'local-storage';
import { KinveyError } from '../../errors';
import Query from '../../query';
import Aggregation from '../../aggregation';
import { isDefined } from '../../utils';
// const usersNamespace = process.env.KINVEY_USERS_NAMESPACE || 'user';
// const activeUserCollectionName = process.env.KINVEY_USER_ACTIVE_COLLECTION_NAME || 'kinvey_active_user';

/**
 * @private
 */
export default class CacheRequest extends Request {
  constructor(options = {}) {
    super(options);
    this.aggregation = options.aggregation;
    this.query = options.query;
    this.rack = this.client.cacheRack;
  }

  get query() {
    return this._query;
  }

  set query(query) {
    if (isDefined(query) && !(query instanceof Query)) {
      throw new KinveyError('Invalid query. It must be an instance of the Query class.');
    }

    this._query = query;
  }

  get aggregation() {
    return this._aggregation;
  }

  set aggregation(aggregation) {
    if (isDefined(aggregation) && !(aggregation instanceof Aggregation)) {
      throw new KinveyError('Invalid aggregation. It must be an instance of the Aggregation class.');
    }

    this._aggregation = aggregation;
  }

  get url() {
    return super.url;
  }

  set url(urlString) {
    super.url = urlString;
    const pathname = global.escape(url.parse(urlString).pathname);
    const pattern = new UrlPattern('(/:namespace)(/)(:appKey)(/)(:collection)(/)(:entityId)(/)');
    const { appKey, collection, entityId } = pattern.match(pathname) || {};
    this.appKey = appKey;
    this.collection = collection;
    this.entityId = entityId;
  }

  execute() {
    return super.execute()
      .then((response) => {
        if (!(response instanceof KinveyResponse)) {
          response = new KinveyResponse({
            statusCode: response.statusCode,
            headers: response.headers,
            data: response.data
          });
        }

        // Throw the response error if we did not receive
        // a successfull response
        if (!response.isSuccess()) {
          throw response.error;
        }

        // If a query was provided then process the data with the query
        if (isDefined(this.query)) {
          response.data = this.query.process(response.data);
        }

        // If an aggregation was provided then process the data with the aggregation
        if (isDefined(this.aggregation)) {
          response.data = this.aggregation.process(response.data);
        }

        // Just return the response
        return response;
      });
  }

  toPlainObject() {
    const obj = super.toPlainObject();
    obj.appKey = this.appKey;
    obj.collection = this.collection;
    obj.entityId = this.entityId;
    obj.encryptionKey = this.client ? this.client.encryptionKey : undefined;
    return obj;
  }

  static getActiveUser(client = Client.sharedInstance()) {
    return Promise.resolve(CacheRequest.getActiveUserLegacy(client));

    // const request = new CacheRequest({
    //   method: RequestMethod.GET,
    //   url: url.format({
    //     protocol: client.protocol,
    //     host: client.host,
    //     pathname: `/${usersNamespace}/${client.appKey}/${activeUserCollectionName}`
    //   })
    // });
    // return request.execute()
    //   .then(response => response.data)
    //   .then((users) => {
    //     if (users.length > 0) {
    //       return users[0];
    //     }

    //     // Try local storage (legacy)
    //     return localStorage.get(`${client.appKey}kinvey_user`);
    //   })
    //   .catch(() => null);
  }

  static getActiveUserLegacy(client) {
    try {
      return localStorage.get(`${client.appKey}kinvey_user`);
    } catch (error) {
      return null;
    }
  }

  static setActiveUser(client = Client.sharedInstance(), user) {
    return Promise.resolve(CacheRequest.setActiveUserLegacy(client, user));
    // // Remove from local storage (legacy)
    // localStorage.remove(`${client.appKey}kinvey_user`);

    // const request = new CacheRequest({
    //   method: RequestMethod.DELETE,
    //   url: url.format({
    //     protocol: client.protocol,
    //     host: client.host,
    //     pathname: `/${usersNamespace}/${client.appKey}/${activeUserCollectionName}`
    //   })
    // });

    // return request.execute()
    //   .then(response => response.data)
    //   .then((prevActiveUser) => {
    //     if (user) {
    //       const request = new CacheRequest({
    //         method: RequestMethod.PUT,
    //         url: url.format({
    //           protocol: client.protocol,
    //           host: client.host,
    //           pathname: `/${usersNamespace}/${client.appKey}/${activeUserCollectionName}`
    //         }),
    //         body: user
    //       });
    //       return request.execute()
    //         .then(response => response.data);
    //     }

    //     return prevActiveUser;
    //   });
  }

  static setActiveUserLegacy(client, user) {
    try {
      localStorage.remove(`${client.appKey}kinvey_user`);
      return localStorage.set(`${client.appKey}kinvey_user`, user);
    } catch (error) {
      return false;
    }
  }
}
