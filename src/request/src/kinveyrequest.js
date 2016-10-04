import { RequestMethod } from './request';
import CacheRequest from './cacherequest';
import Headers from './headers';
import NetworkRequest from './networkrequest';
import KinveyResponse from './kinveyresponse';
import { InvalidCredentialsError, NoActiveUserError } from '../../errors';
import { SocialIdentity } from '../../identity';
import Promise from 'es6-promise';
import url from 'url';
import qs from 'qs';
import appendQuery from 'append-query';
import assign from 'lodash/assign';
import defaults from 'lodash/defaults';
import isEmpty from 'lodash/isEmpty';
import isFunction from 'lodash/isFunction';
const tokenPathname = process.env.KINVEY_MIC_TOKEN_PATHNAME || '/oauth/token';
const usersNamespace = process.env.KINVEY_USERS_NAMESPACE || 'user';
const defaultApiVersion = process.env.KINVEY_DEFAULT_API_VERSION || 4;
const customPropertiesMaxBytesAllowed = process.env.KINVEY_MAX_HEADER_BYTES || 2000;

/**
 * @private
 * Enum for Auth types.
 */
const AuthType = {
  All: 'All',
  App: 'App',
  Basic: 'Basic',
  Default: 'Default',
  Master: 'Master',
  None: 'None',
  Session: 'Session'
};
Object.freeze(AuthType);
export { AuthType };

const Auth = {
  /**
   * Authenticate through (1) user credentials, (2) Master Secret, or (3) App
   * Secret.
   *
   * @returns {Object}
   */
  all(client) {
    return Auth.session(client)
      .catch(() => Auth.basic(client));
  },

  /**
   * Authenticate through App Secret.
   *
   * @returns {Object}
   */
  app(client) {
    if (!client.appKey || !client.appSecret) {
      return Promise.reject(
        new Error('Missing client appKey and/or appSecret.'
          + ' Use Kinvey.init() to set the appKey and appSecret for the client.')
      );
    }

    return Promise.resolve({
      scheme: 'Basic',
      username: client.appKey,
      password: client.appSecret
    });
  },

  /**
   * Authenticate through (1) Master Secret, or (2) App Secret.
   *
   * @returns {Object}
   */
  basic(client) {
    return Auth.master(client)
      .catch(() => Auth.app(client));
  },

  /**
   * Authenticate through Master Secret.
   *
   * @returns {Object}
   */
  master(client) {
    if (!client.appKey || !client.masterSecret) {
      return Promise.reject(
        new Error('Missing client appKey and/or appSecret.'
          + ' Use Kinvey.init() to set the appKey and appSecret for the client.')
      );
    }

    return Promise.resolve({
      scheme: 'Basic',
      username: client.appKey,
      password: client.masterSecret
    });
  },

  /**
   * Do not authenticate.
   *
   * @returns {Null}
   */
  none() {
    return Promise.resolve(null);
  },

  /**
   * Authenticate through user credentials.
   *
   * @returns {Object}
   */
  session(client) {
    return CacheRequest.getActiveUser(client)
      .then((activeUser) => {
        if (!activeUser) {
          throw new NoActiveUserError('There is not an active user. Please login a user and retry the request.');
        }

        return {
          scheme: 'Kinvey',
          credentials: activeUser._kmd.authtoken
        };
      });
  }
};

/**
 * @private
 */
function byteCount(str) {
  if (str) {
    let count = 0;
    const stringLength = str.length;
    str = String(str || '');

    for (let i = 0; i < stringLength; i += 1) {
      const partCount = encodeURI(str[i]).split('%').length;
      count += partCount === 1 ? 1 : partCount - 1;
    }

    return count;
  }

  return 0;
}

/**
 * @private
 */
export class Properties extends Headers {}

export default class KinveyRequest extends NetworkRequest {
  constructor(options = {}) {
    super(options);

    options = assign({
      skipBL: false,
      trace: false
    }, options);

    this.authType = options.authType || AuthType.None;
    this.query = options.query;
    this.properties = options.properties || new Properties();
    this.skipBL = options.skipBL === true;
    this.trace = options.trace === true;
  }

  get appVersion() {
    return this.client.appVersion;
  }

  get headers() {
    const headers = super.headers;

    // Add the Accept header
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json; charset=utf-8');
    }

    // Add the Content-Type header
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json; charset=utf-8');
    }

    // Add the X-Kinvey-API-Version header
    if (!headers.has('X-Kinvey-Api-Version')) {
      headers.set('X-Kinvey-Api-Version', defaultApiVersion);
    }

    // Add or remove the X-Kinvey-Skip-Business-Logic header
    if (this.skipBL === true) {
      headers.set('X-Kinvey-Skip-Business-Logic', true);
    } else {
      headers.remove('X-Kinvey-Skip-Business-Logic');
    }

    // Add or remove the X-Kinvey-Include-Headers-In-Response and X-Kinvey-ResponseWrapper headers
    if (this.trace === true) {
      headers.set('X-Kinvey-Include-Headers-In-Response', 'X-Kinvey-Request-Id');
      headers.set('X-Kinvey-ResponseWrapper', true);
    } else {
      headers.remove('X-Kinvey-Include-Headers-In-Response');
      headers.remove('X-Kinvey-ResponseWrapper');
    }

    // Add or remove the X-Kinvey-Client-App-Version header
    if (this.appVersion) {
      headers.set('X-Kinvey-Client-App-Version', this.appVersion);
    } else {
      headers.remove('X-Kinvey-Client-App-Version');
    }

    // Add or remove X-Kinvey-Custom-Request-Properties header
    if (this.properties) {
      const customPropertiesHeader = this.properties.toString();

      if (!isEmpty(customPropertiesHeader)) {
        const customPropertiesByteCount = byteCount(customPropertiesHeader);

        if (customPropertiesByteCount >= customPropertiesMaxBytesAllowed) {
          throw new Error(
            `The custom properties are ${customPropertiesByteCount} bytes.` +
            `It must be less then ${customPropertiesMaxBytesAllowed} bytes.`,
            'Please remove some custom properties.');
        }

        headers.set('X-Kinvey-Custom-Request-Properties', customPropertiesHeader);
      } else {
        headers.remove('X-Kinvey-Custom-Request-Properties');
      }
    } else {
      headers.remove('X-Kinvey-Custom-Request-Properties');
    }

    // Add the X-Kinvey-Device-Information header
    if (this.client.device && isFunction(this.client.device, 'toString')) {
      headers.set('X-Kinvey-Device-Information', this.client.device.toString());
    } else {
      headers.remove('X-Kinvey-Device-Information');
    }

    // Return the headers
    return headers;
  }

  set headers(headers) {
    super.headers = headers;
  }

  get url() {
    const urlString = super.url;
    const queryString = this.query ? this.query.toQueryString() : {};

    if (isEmpty(queryString)) {
      return urlString;
    }

    return appendQuery(urlString, qs.stringify(queryString));
  }

  set url(urlString) {
    super.url = urlString;
  }

  get properties() {
    return this._properties;
  }

  set properties(properties) {
    if (properties && !(properties instanceof Properties)) {
      properties = new Properties(properties);
    }

    this._properties = properties;
  }

  getAuthorizationHeader() {
    let promise = Promise.resolve(undefined);

    // Add or remove the Authorization header
    if (this.authType) {
      // Get the auth info based on the set AuthType
      switch (this.authType) {
        case AuthType.All:
          promise = Auth.all(this.client);
          break;
        case AuthType.App:
          promise = Auth.app(this.client);
          break;
        case AuthType.Basic:
          promise = Auth.basic(this.client);
          break;
        case AuthType.Master:
          promise = Auth.master(this.client);
          break;
        case AuthType.None:
          promise = Auth.none(this.client);
          break;
        case AuthType.Session:
          promise = Auth.session(this.client);
          break;
        default:
          promise = Auth.session(this.client)
            .catch((error) => {
              return Auth.master(this.client)
                .catch(() => {
                  throw error;
                });
            });
      }
    }

    return promise
      .then((authInfo) => {
        // Add the auth info to the Authorization header
        if (authInfo) {
          let credentials = authInfo.credentials;

          if (authInfo.username) {
            credentials = new Buffer(`${authInfo.username}:${authInfo.password}`).toString('base64');
          }

          return `${authInfo.scheme} ${credentials}`;
        }

        return undefined;
      });
  }

  execute(rawResponse = false) {
    return this.getAuthorizationHeader()
      .then((authorizationHeader) => {
        if (authorizationHeader) {
          this.headers.set('Authorization', authorizationHeader);
        } else {
          this.headers.remove('Authorization');
        }
      })
      .then(() => {
        return super.execute();
      })
      .then((response) => {
        if (!(response instanceof KinveyResponse)) {
          response = new KinveyResponse({
            statusCode: response.statusCode,
            headers: response.headers,
            data: response.data
          });
        }

        if (rawResponse === false && response.isSuccess() === false) {
          throw response.error;
        }

        return response;
      })
      .catch((error) => {
        if (error instanceof InvalidCredentialsError) {
          return CacheRequest.getActiveUser(this.client)
            .then((user) => {
              if (!user) {
                throw error;
              }

              const socialIdentities = user._socialIdentity;
              const sessionKey = Object.keys(socialIdentities).find((sessionKey) => {
                return socialIdentities[sessionKey].identity === SocialIdentity.MobileIdentityConnect;
              });
              const session = socialIdentities[sessionKey];

              if (session) {
                // Refresh MIC Token
                if (session.identity === SocialIdentity.MobileIdentityConnect) {
                  const refreshMICRequest = new KinveyRequest({
                    method: RequestMethod.POST,
                    headers: {
                      'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    authType: AuthType.App,
                    url: url.format({
                      protocol: session.protocol || this.client.micProtocol,
                      host: session.host || this.client.micHost,
                      pathname: tokenPathname
                    }),
                    body: {
                      grant_type: 'refresh_token',
                      client_id: session.client_id,
                      redirect_uri: session.redirect_uri,
                      refresh_token: session.refresh_token
                    },
                    timeout: this.timeout,
                    properties: this.properties
                  });

                  return refreshMICRequest.execute()
                    .then(response => response.data)
                    .then((newSession) => {
                      // Login the user with the new mic session
                      const data = {};
                      data._socialIdentity = {};
                      data._socialIdentity[session.identity] = newSession;

                      // Login the user
                      const loginRequest = new KinveyRequest({
                        method: RequestMethod.POST,
                        authType: AuthType.App,
                        url: url.format({
                          protocol: this.client.protocol,
                          host: this.client.host,
                          pathname: `/${usersNamespace}/${this.client.appKey}/login`
                        }),
                        properties: this.properties,
                        body: data,
                        timeout: this.timeout,
                        client: this.client
                      });
                      return loginRequest.execute()
                        .then(response => response.data);
                    })
                    .then((user) => {
                      user._socialIdentity[session.identity] = defaults(user._socialIdentity[session.identity], session);
                      return CacheRequest.setActiveUser(this.client, user);
                    })
                    .then(() => {
                      return this.execute(rawResponse);
                    });
                }
              }

              throw error;
            });
        }

        throw error;
      });
  }
}
