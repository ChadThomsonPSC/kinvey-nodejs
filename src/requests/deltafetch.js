import Promise from 'babybird';
import { KinveyRequest } from './request';
import { LocalRequest } from './local';
import { NetworkRequest } from './network';
import { Response } from './response';
import { HttpMethod, StatusCode } from '../enums';
import { NotFoundError } from '../errors';
import { Query } from '../query';
import keyBy from 'lodash/keyBy';
import reduce from 'lodash/reduce';
import result from 'lodash/result';
import values from 'lodash/values';
import forEach from 'lodash/forEach';
import isArray from 'lodash/isArray';
const idAttribute = process.env.KINVEY_ID_ATTRIBUTE || '_id';
const kmdAttribute = process.env.KINVEY_KMD_ATTRIBUTE || '_kmd';
const maxIdsPerRequest = 200;

/**
 * @private
 */
export class DeltaFetchRequest extends KinveyRequest {
  execute() {
    const promise = super.execute().then(() => {
      if (this.method !== HttpMethod.GET) {
        throw new Error('Invalid http method. Http GET requests are only supported by DeltaFetchRequests.');
      }

      const localRequest = new LocalRequest({
        method: HttpMethod.GET,
        url: this.url,
        headers: this.headers,
        query: this.query,
        timeout: this.timeout,
        client: this.client
      });
      return localRequest.execute();
    }).catch(error => {
      if (error instanceof NotFoundError) {
        return new Response({
          statusCode: StatusCode.Ok,
          data: []
        });
      }

      throw error;
    }).then(cacheResponse => cacheResponse.data).then(cacheData => {
      if (isArray(cacheData) && cacheData.length > 0) {
        const cacheDocuments = keyBy(cacheData, idAttribute);
        const query = new Query(result(this.query, 'toJSON', this.query));
        query.fields = [idAttribute, kmdAttribute];
        const networkRequest = new NetworkRequest({
          method: HttpMethod.GET,
          url: this.url,
          headers: this.headers,
          auth: this.auth,
          query: query,
          timeout: this.timeout,
          client: this.client
        });

        return networkRequest.execute().then(networkResponse => {
          const networkDocuments = keyBy(networkResponse.data, idAttribute);
          const deltaSet = networkDocuments;
          const cacheDocumentIds = Object.keys(cacheDocuments);

          forEach(cacheDocumentIds, id => {
            const cacheDocument = cacheDocuments[id];
            const networkDocument = networkDocuments[id];

            if (networkDocument) {
              if (networkDocument[kmdAttribute] && cacheDocument[kmdAttribute]
                  && networkDocument[kmdAttribute].lmt === cacheDocument[kmdAttribute].lmt) {
                delete deltaSet[id];
              } else {
                delete cacheDocuments[id];
              }
            } else {
              delete cacheDocuments[id];
            }
          });

          const deltaSetIds = Object.keys(deltaSet);
          const promises = [];
          let i = 0;

          while (i < deltaSetIds.length) {
            const query = new Query(result(this.query, 'toJSON', this.query));
            const ids = deltaSetIds.slice(i, deltaSetIds.length > maxIdsPerRequest + i ?
                                             maxIdsPerRequest : deltaSetIds.length);
            query.contains(idAttribute, ids);
            const networkRequest = new NetworkRequest({
              method: HttpMethod.GET,
              url: this.url,
              headers: this.headers,
              auth: this.auth,
              query: query,
              timeout: this.timeout,
              client: this.client
            });

            const promise = networkRequest.execute();
            promises.push(promise);
            i += maxIdsPerRequest;
          }

          return Promise.all(promises).then(responses => {
            const initialResponse = new Response({
              statusCode: StatusCode.Ok,
              data: []
            });
            return reduce(responses, (result, response) => {
              if (response.isSuccess()) {
                result.addHeaders(response.headers);
                result.data = result.data.concat(response.data);
              }

              return result;
            }, initialResponse);
          }).then(response => {
            response.data = response.data.concat(values(cacheDocuments));

            if (this.query) {
              const query = new Query(result(this.query, 'toJSON', this.query));
              query.skip(0).limit(0);
              response.data = query._process(response.data);
            }

            return response;
          });
        });
      }

      const networkRequest = new NetworkRequest({
        method: HttpMethod.GET,
        url: this.url,
        headers: this.headers,
        auth: this.auth,
        query: this.query,
        timeout: this.timeout,
        client: this.client
      });
      return networkRequest.execute();
    });

    return promise;
  }
}
