import { Client } from '../../client';
import { Acl } from './acl';
import { Metadata } from './metadata';
import { AuthType, RequestMethod, KinveyRequest, CacheRequest } from '../../request';
import { KinveyError, NotFoundError, ActiveUserError } from '../../errors';
import { DataStore, UserStore } from '../../datastore';
import { Facebook, Google, LinkedIn, MobileIdentityConnect } from '../../social';
import { Log } from '../../utils';
import Promise from 'es6-promise';
import localStorage from 'local-storage';
import url from 'url';
import assign from 'lodash/assign';
import result from 'lodash/result';
import isString from 'lodash/isString';
import isObject from 'lodash/isObject';
import isEmpty from 'lodash/isEmpty';
const usersNamespace = process.env.KINVEY_USERS_NAMESPACE || 'user';
const rpcNamespace = process.env.KINVEY_RPC_NAMESPACE || 'rpc';
const idAttribute = process.env.KINVEY_ID_ATTRIBUTE || '_id';
const kmdAttribute = process.env.KINVEY_KMD_ATTRIBUTE || '_kmd';
const socialIdentityAttribute = process.env.KINVEY_SOCIAL_IDENTITY_ATTRIBUTE || '_socialIdentity';
const usernameAttribute = process.env.KINVEY_USERNAME_ATTRIBUTE || 'username';
const emailAttribute = process.env.KINVEY_EMAIL_ATTRIBUTE || 'email';
const activeUserCollectionName = process.env.KINVEY_USER_ACTIVE_COLLECTION_NAME || 'kinvey_active_user';

function getActiveUser(client) {
  const request = new CacheRequest({
    method: RequestMethod.GET,
    url: url.format({
      protocol: client.protocol,
      host: client.host,
      pathname: `/${usersNamespace}/${client.appKey}/${activeUserCollectionName}`
    })
  });
  return request.execute()
    .then(response => response.data)
    .then((users) => {
      if (users.length > 0) {
        return users[0];
      }

      // Try local storage (legacy)
      return localStorage.get(`${client.appKey}kinvey_user`);
    })
    .catch(() => null);
}

function setActiveUser(client, user) {
  // Remove from local storage (legacy)
  localStorage.remove(`${client.appKey}kinvey_user`);

  const request = new CacheRequest({
    method: RequestMethod.DELETE,
    url: url.format({
      protocol: client.protocol,
      host: client.host,
      pathname: `/${usersNamespace}/${client.appKey}/${activeUserCollectionName}`
    })
  });

  return request.execute()
    .then(response => response.data)
    .then((prevActiveUser) => {
      if (user) {
        const request = new CacheRequest({
          method: RequestMethod.PUT,
          url: url.format({
            protocol: client.protocol,
            host: client.host,
            pathname: `/${usersNamespace}/${client.appKey}/${activeUserCollectionName}`
          }),
          body: user
        });
        return request.execute()
          .then(response => response.data);
      }

      return prevActiveUser;
    });
}

/**
 * The User class is used to represent a single user on the Kinvey platform.
 * Use the user class to manage the active user lifecycle and perform user operations.
 */
export class User {
  /**
   * Create a new instance of a User.
   *
   * @param {Object} [data={}] Data for the user.
   * @param {Object} [options={}] Options.
   * @return {User} User
   */
  constructor(data = {}, options = {}) {
    /**
     * The users data.
     *
     * @type {Object}
     */
    this.data = data;

    /**
     * @private
     * The client used by this user.
     *
     * @type {Client}
     */
    this.client = options.client || Client.sharedInstance();
  }

  /**
   * The _id for the user.
   *
   * @return {?string} _id
   */
  get _id() {
    return this.data[idAttribute];
  }

  /**
   * The _acl for the user.
   *
   * @return {Acl} _acl
   */
  get _acl() {
    return new Acl(this.data);
  }

  /**
   * The metadata for the user.
   *
   * @return {Metadata} metadata
   */
  get metadata() {
    return new Metadata(this.data);
  }

  /**
   * Set the metadata for the user.
   *
   * @param {Metadata|Object} metadata The metadata.
   */
  set metadata(metadata) {
    this.data[kmdAttribute] = result(metadata, 'toPlainObjecta', metadata);
  }

  /**
   * The _kmd for the user.
   *
   * @return {Metadata} _kmd
   */
  get _kmd() {
    return this.metadata;
  }

  /**
   * Set the _kmd for the user.
   *
   * @param {Metadata|Object} metadata The metadata.
   */
  set _kmd(kmd) {
    this.metadata = kmd;
  }

  /**
   * The _socialIdentity for the user.
   *
   * @return {Object} _socialIdentity
   */
  get _socialIdentity() {
    return this.data[socialIdentityAttribute];
  }

  /**
   * The auth token for the user.
   *
   * @return {?string} Auth token
   */
  get authtoken() {
    return this.metadata.authtoken;
  }

  /**
   * Set the auth token for the user.
   *
   * @param  {?string} authtoken Auth token
   */
  set authtoken(authtoken) {
    const metadata = this.metadata;
    metadata.authtoken = authtoken;
    this.metadata = metadata;
  }

  /**
   * The username for the user.
   *
   * @return {?string} Username
   */
  get username() {
    return this.data[usernameAttribute];
  }

  /**
   * The email for the user.
   *
   * @return {?string} Email
   */
  get email() {
    return this.data[emailAttribute];
  }

  /**
   * @private
   */
  get pathname() {
    return `/${usersNamespace}/${this.client.appKey}`;
  }

  /**
   * Checks if the user is the active user.
   *
   * @return {boolean} True the user is the active user otherwise false.
   */
  isActive() {
    return User.getActiveUser(this.client)
      .then((activeUser) => {
        if (activeUser && activeUser[idAttribute] === this[idAttribute]) {
          return true;
        }

        return false;
      });
  }

  /**
   * Checks if the users email is verfified.
   *
   * @return {boolean} True if the users email is verified otherwise false.
   */
  isEmailVerified() {
    const status = this.metadata.emailVerification;
    return status === 'confirmed';
  }

  /**
   * Gets the active user. You can optionally provide a client
   * to use to lookup the active user.
   *
   * @param {Client} [client=Client.sharedInstance()] Client to use to lookup active user.
   * @return {?User} The active user.
   */
  static getActiveUser(client = Client.sharedInstance()) {
    return getActiveUser(client)
      .then((data) => {
        if (data) {
          return new this(data, { client: client });
        }

        return null;
      });
  }

  /**
   * Login using a username or password.
   *
   * @param {string|Object} username Username or an object with username and password as properties.
   * @param {string} [password] Password
   * @param {Object} [options={}] Options
   * @return {Promise<User>} The user.
   */
  login(username, password, options = {}) {
    let credentials = username;

    if (isObject(credentials)) {
      options = password || {};
    } else {
      credentials = {
        username: username,
        password: password
      };
    }

    return this.isActive()
      .then((isActive) => {
        if (isActive) {
          throw new ActiveUserError('This user is already the active user.');
        }

        return User.getActiveUser(this.client);
      })
      .then((activeUser) => {
        if (activeUser) {
          throw new ActiveUserError('An active user already exists. Please logout the active user before you login.');
        }

        if (!credentials[socialIdentityAttribute]) {
          if (credentials.username) {
            credentials.username = String(credentials.username).trim();
          }

          if (credentials.password) {
            credentials.password = String(credentials.password).trim();
          }
        }

        if ((!credentials.username
            || credentials.username === ''
            || !credentials.password
            || credentials.password === ''
          ) && !credentials[socialIdentityAttribute]) {
          throw new KinveyError(
            'Username and/or password missing. Please provide both a username and password to login.'
          );
        }

        const request = new KinveyRequest({
          method: RequestMethod.POST,
          authType: AuthType.App,
          url: url.format({
            protocol: this.client.apiProtocol,
            host: this.client.apiHost,
            pathname: `${this.pathname}/login`
          }),
          body: credentials,
          properties: options.properties,
          timeout: options.timeout,
          client: this.client
        });
        return request.execute();
      })
      .then(response => response.data)
      .then((data) => {
        if (credentials[socialIdentityAttribute]) {
          data[socialIdentityAttribute] = credentials[socialIdentityAttribute];
        }

        this.data = data;
        return setActiveUser(this.client, this.data);
      })
      .then(() => this);
  }

  /**
   * Login using a username or password.
   *
   * @param {string|Object} username Username or an object with username and password as properties.
   * @param {string} [password] Password
   * @param {Object} [options={}] Options
   * @return {Promise<User>} The user.
   */
  static login(username, password, options) {
    const user = new this({}, options);
    return user.login(username, password, options);
  }

  /**
   * Login using Mobile Identity Connect.
   *
   * @param {string} redirectUri The redirect uri.
   * @param {AuthorizationGrant} [authorizationGrant=AuthoizationGrant.AuthorizationCodeLoginPage] MIC authorization grant to use.
   * @param {Object} [options] Options
   * @return {Promise<User>} The user.
   */
  loginWithMIC(redirectUri, authorizationGrant, options = {}) {
    return this.isActive()
      .then((isActive) => {
        if (isActive) {
          throw new ActiveUserError('This user is already the active user.');
        }

        return User.getActiveUser(this.client);
      })
      .then((activeUser) => {
        if (activeUser) {
          throw new ActiveUserError('An active user already exists. Please logout the active user before you login.');
        }

        const mic = new MobileIdentityConnect({ client: this.client });
        return mic.login(redirectUri, authorizationGrant, options);
      })
      .then(session => this.connectIdentity(MobileIdentityConnect.identity, session, options));
  }

  /**
   * Login using Mobile Identity Connect.
   *
   * @param {string} redirectUri The redirect uri.
   * @param {AuthorizationGrant} [authorizationGrant=AuthoizationGrant.AuthorizationCodeLoginPage] MIC authorization grant to use.
   * @param {Object} [options] Options
   * @return {Promise<User>} The user.
   */
  static loginWithMIC(redirectUri, authorizationGrant, options = {}) {
    const user = new this({}, options);
    return user.loginWithMIC(redirectUri, authorizationGrant, options);
  }

  /**
   * Connect a social identity.
   *
   * @param {string} identity Social identity.
   * @param {Object} session Social identity session.
   * @param {Object} [options] Options
   * @return {Promise<User>} The user.
   */
  connectIdentity(identity, session, options) {
    return this.isActive()
      .then((isActive) => {
        const data = {};
        const socialIdentity = data[socialIdentityAttribute] || {};
        socialIdentity[identity] = session;
        data[socialIdentityAttribute] = socialIdentity;

        if (isActive) {
          return this.update(data, options);
        }

        return this.login(data, options)
          .catch((error) => {
            if (error instanceof NotFoundError) {
              return this.signup(data, options).then(() => this.connectIdentity(identity, session, options));
            }

            throw error;
          });
      });
  }

  /**
   * Connect a social identity.
   *
   * @param {string} identity Social identity.
   * @param {Object} session Social identity session.
   * @param {Object} [options] Options
   * @return {Promise<User>} The user.
   */
  static connectIdentity(identity, session, options) {
    const user = new this({}, options);
    return user.connectIdentity(identity, session, options);
  }

  /**
   * Connect an social identity.
   *
   * @deprecated Use connectIdentity().
   *
   * @param {string} identity Social identity.
   * @param {Object} session Social identity session.
   * @param {Object} [options] Options
   * @return {Promise<User>} The user.
   */
  connectWithIdentity(identity, session, options) {
    return this.connectIdentity(identity, session, options);
  }

  /**
   * Connect a Facebook identity.
   *
   * @param  {Object}         [options]     Options
   * @return {Promise<User>}                The user.
   */
  connectFacebook(clientId, options) {
    const facebook = new Facebook({ client: this.client });
    return facebook.login(clientId, options)
      .then(session => this.connectIdentity(Facebook.identity, session, options));
  }

  /**
   * Connect a Facebook identity.
   *
   * @param  {Object}         [options]     Options
   * @return {Promise<User>}                The user.
   */
  static connectFacebook(clientId, options) {
    const user = new this({}, options);
    return user.connectFacebook(clientId, options);
  }

  /**
   * Diconnect a Facebook identity.
   *
   * @param  {Object}         [options]     Options
   * @return {Promise<User>}                The user.
   */
  disconnectFacebook(options) {
    return this.disconnectIdentity(Facebook.identity, options);
  }

  /**
   * Connect a Google identity.
   *
   * @param  {Object}         [options]     Options
   * @return {Promise<User>}                The user.
   */
  connectGoogle(clientId, options) {
    const google = new Google({ client: this.client });
    return google.login(clientId, options)
      .then(session => this.connectIdentity(Google.identity, session, options));
  }

  /**
   * Connect a Google identity.
   *
   * @param  {Object}         [options]     Options
   * @return {Promise<User>}                The user.
   */
  static connectGoogle(clientId, options) {
    const user = new this({}, options);
    return user.connectGoogle(clientId, options);
  }

  /**
   * Diconnect a Google identity.
   *
   * @param  {Object}         [options]     Options
   * @return {Promise<User>}                The user.
   */
  disconnectGoogle(options) {
    return this.disconnectIdentity(Google.identity, options);
  }

  /**
   * Connect a LinkedIn identity.
   *
   * @param  {Object}         [options]     Options
   * @return {Promise<User>}                The user.
   */
  googleconnectLinkedIn(clientId, options) {
    const linkedIn = new LinkedIn({ client: this.client });
    return linkedIn.login(clientId, options)
      .then(session => this.connectIdentity(LinkedIn.identity, session, options));
  }

  /**
   * Connect a LinkedIn identity.
   *
   * @param  {Object}         [options]     Options
   * @return {Promise<User>}                The user.
   */
  static connectLinkedIn(clientId, options) {
    const user = new this({}, options);
    return user.connectLinkedIn(clientId, options);
  }

  /**
   * Diconnect a LinkedIn identity.
   *
   * @param  {Object}         [options]     Options
   * @return {Promise<User>}                The user.
   */
  disconnectLinkedIn(options) {
    return this.disconnectIdentity(LinkedIn.identity, options);
  }

  /**
   * @private
   * Disconnects the user from an identity.
   *
   * @param {SocialIdentity|string} identity Identity used to connect the user.
   * @param  {Object} [options] Options
   * @return {Promise<User>} The user.
   */
  disconnectIdentity(identity, options) {
    let promise = Promise.resolve();

    if (identity === Facebook.identity) {
      promise = Facebook.logout(this, options);
    } else if (identity === Google.identity) {
      promise = Google.logout(this, options);
    } else if (identity === LinkedIn.identity) {
      promise = LinkedIn.logout(this, options);
    } else if (identity === MobileIdentityConnect.identity) {
      promise = MobileIdentityConnect.logout(this, options);
    }

    return promise
      .catch((error) => {
        Log.error(error);
      })
      .then(() => {
        const data = this.data;
        const socialIdentity = data[socialIdentityAttribute] || {};
        delete socialIdentity[identity];
        data[socialIdentityAttribute] = socialIdentity;
        this.data = data;

        if (!this[idAttribute]) {
          return this;
        }

        return this.update(data, options);
      })
      .then(() => this);
  }

  /**
   * Logout the active user.
   *
   * @param {Object} [options={}] Options
   * @return {Promise<User>} The user.
   */
  logout(options = {}) {
    // Logout from Kinvey
    const request = new KinveyRequest({
      method: RequestMethod.POST,
      authType: AuthType.Session,
      url: url.format({
        protocol: this.client.apiProtocol,
        host: this.client.apiHost,
        pathname: `${this.pathname}/_logout`
      }),
      properties: options.properties,
      timeout: options.timeout,
      client: this.client
    });

    return request.execute()
      .catch((error) => {
        Log.error(error);
      })
      .then(() => {
        const identities = Object.keys(this._socialIdentity || {});
        const promises = identities.map(identity => this.disconnectIdentity(identity, options));
        return Promise.all(promises);
      })
      .catch((error) => {
        Log.error(error);
      })
      .then(() => {
        return setActiveUser(this.client, null);
      })
      .then(() => {
        return DataStore.clearCache({ client: this.client });
      })
      .catch((error) => {
        Log.error(error);
      })
      .then(() => this);
  }

  /**
   * Logout the active user.
   *
   * @param {Object} [options={}] Options
   * @return {Promise<User>} The user.
   */
  static logout(options = {}) {
    return this.getActiveUser(options.client)
      .then((user) => {
        if (user) {
          return user.logout(options);
        }

        return null;
      });
  }

  /**
   * Sign up a user with Kinvey.
   *
   * @param {?User|?Object} data Users data.
   * @param {Object} [options] Options
   * @param {boolean} [options.state=true] If set to true, the user will be set as the active user after successfully
   *                                       being signed up.
   * @return {Promise<User>} The user.
   */
  signup(data, options = {}) {
    options = assign({
      state: true
    }, options);

    return User.getActiveUser(this.client)
      .then((activeUser) => {
        if (options.state === true && activeUser) {
          throw new ActiveUserError('An active user already exists. Please logout the active user before you login.');
        }

        if (data instanceof User) {
          data = data.data;
        }

        const request = new KinveyRequest({
          method: RequestMethod.POST,
          authType: AuthType.App,
          url: url.format({
            protocol: this.client.protocol,
            host: this.client.host,
            pathname: this.pathname
          }),
          body: isEmpty(data) ? null : data,
          properties: options.properties,
          timeout: options.timeout,
          client: this.client
        });

        return request.execute();
      })
      .then(response => response.data)
      .then((data) => {
        this.data = data;

        if (options.state === true) {
          return setActiveUser(this.client, this.data);
        }

        return this;
      })
      .then(() => {
        return this;
      });
  }

  /**
   * Sign up a user with Kinvey.
   *
   * @param {User|Object} data Users data.
   * @param {Object} [options] Options
   * @param {boolean} [options.state=true] If set to true, the user will be set as the active user after successfully
   *                                       being signed up.
   * @return {Promise<User>} The user.
   */
  static signup(data, options) {
    const user = new this({}, options);
    return user.signup(data, options);
  }

  /**
   * Sign up a user with Kinvey using an identity.
   *
   * @param {SocialIdentity|string} identity The identity.
   * @param {Object} session Identity session
   * @param {Object} [options] Options
   * @param {boolean} [options.state=true] If set to true, the user will be set as the active user after successfully
   *                                       being signed up.
   * @return {Promise<User>} The user.
   */
  signupWithIdentity(identity, session, options) {
    const data = {};
    data[socialIdentityAttribute] = {};
    data[socialIdentityAttribute][identity] = session;
    return this.signup(data, options);
  }

  /**
   * Sign up a user with Kinvey using an identity.
   *
   * @param {SocialIdentity|string} identity The identity.
   * @param {Object} session Identity session
   * @param {Object} [options] Options
   * @param {boolean} [options.state=true] If set to true, the user will be set as the active user after successfully
   *                                       being signed up.
   * @return {Promise<User>} The user.
   */
  static signupWithIdentity(identity, session, options) {
    const user = new this({}, options);
    return user.signupWithIdentity(identity, session, options);
  }

  /**
   * Update the users data.
   *
   * @param {Object} data Data.
   * @param {Object} [options] Options
   * @return {Promise<User>} The user.
   */
  update(data, options) {
    data = assign(this.data, data);
    const userStore = new UserStore();
    return userStore.update(data, options)
      .then(() => {
        this.data = data;
        return this.isActive();
      })
      .then((isActive) => {
        if (isActive) {
          return setActiveUser(this.client, this.data);
        }

        return this;
      })
      .then(() => {
        return this;
      });
  }

  /**
   * Update the active user.
   *
   * @param {Object} data Data.
   * @param {Object} [options] Options
   * @return {Promise<User>} The user.
   */
  static update(data, options) {
    return User.getActiveUser(options.client)
      .then((user) => {
        if (user) {
          return user.update(data, options);
        }

        return null;
      });
  }

  /**
   * Retfresh the users data.
   *
   * @param {Object} [options={}] Options
   * @return {Promise<User>} The user.
   */
  me(options = {}) {
    const request = new KinveyRequest({
      method: RequestMethod.GET,
      authType: AuthType.Session,
      url: url.format({
        protocol: this.client.protocol,
        host: this.client.host,
        pathname: `${this.pathname}/_me`
      }),
      properties: options.properties,
      timeout: options.timeout
    });

    return request.execute()
      .then(response => response.data)
      .then((data) => {
        if (!data[kmdAttribute].authtoken) {
          return User.getActiveUser(this.client)
            .then((activeUser) => {
              if (activeUser) {
                data[kmdAttribute].authtoken = activeUser.authtoken;
              }

              return data;
            });
        }

        return data;
      })
      .then((data) => {
        return setActiveUser(this.client, data)
          .then(() => {
            this.data = data;
          });
      })
      .then(() => {
        return this;
      });
  }

  /**
   * Refresh the active user.
   *
   * @param {Object} [options={}] Options
   * @return {Promise<User>} The user.
   */
  static me(options) {
    return User.getActiveUser(options.client)
      .then((user) => {
        if (user) {
          return user.me(options);
        }

        return null;
      });
  }

  /**
   * Request an email to be sent to verify the users email.
   *
   * @param {string} username Username
   * @param {Object} [options={}] Options
   * @return {Promise<Object>} The response.
   */
  static verifyEmail(username, options = {}) {
    if (!username) {
      return Promise.reject(
        new KinveyError('A username was not provided.',
          'Please provide a username for the user that you would like to verify their email.')
      );
    }

    if (!isString(username)) {
      return Promise.reject(new KinveyError('The provided username is not a string.'));
    }

    const client = options.client || Client.sharedInstance();
    const request = new KinveyRequest({
      method: RequestMethod.POST,
      authType: AuthType.App,
      url: url.format({
        protocol: client.protocol,
        host: client.host,
        pathname: `/${rpcNamespace}/${client.appKey}/${username}/user-email-verification-initiate`
      }),
      properties: options.properties,
      timeout: options.timeout,
      client: client
    });
    return request.execute()
      .then(response => response.data);
  }

  /**
   * Request an email to be sent to recover a forgot username.
   *
   * @param {string} email Email
   * @param {Object} [options={}] Options
   * @return {Promise<Object>} The response.
   */
  static forgotUsername(email, options = {}) {
    if (!email) {
      return Promise.reject(
        new KinveyError('An email was not provided.',
          'Please provide an email for the user that you would like to retrieve their username.')
      );
    }

    if (!isString(email)) {
      return Promise.reject(new KinveyError('The provided email is not a string.'));
    }

    const client = options.client || Client.sharedInstance();
    const request = new KinveyRequest({
      method: RequestMethod.POST,
      authType: AuthType.App,
      url: url.format({
        protocol: client.protocol,
        host: client.host,
        pathname: `/${rpcNamespace}/${client.appKey}/user-forgot-username`
      }),
      properties: options.properties,
      data: { email: email },
      timeout: options.timeout,
      client: client
    });
    return request.execute()
      .then(response => response.data);
  }

  /**
   * Request an email to be sent to reset a users password.
   *
   * @param {string} username Username
   * @param {Object} [options={}] Options
   * @return {Promise<Object>} The response.
   */
  static resetPassword(username, options = {}) {
    if (!username) {
      return Promise.reject(
        new KinveyError('A username was not provided.',
          'Please provide a username for the user that you would like to verify their email.')
      );
    }

    if (!isString(username)) {
      return Promise.reject(new KinveyError('The provided username is not a string.'));
    }

    const client = options.client || Client.sharedInstance();
    const request = new KinveyRequest({
      method: RequestMethod.POST,
      authType: AuthType.App,
      url: url.format({
        protocol: client.protocol,
        host: client.host,
        pathname: `/${rpcNamespace}/${client.appKey}/${username}/user-password-reset-initiate`
      }),
      properties: options.properties,
      timeout: options.timeout,
      client: client
    });
    return request.execute()
      .then(response => response.data);
  }

  /**
   * Check if a username already exists.
   *
   * @param {string} username Username
   * @param {Object} [options] Options
   * @return {boolean} True if the username already exists otherwise false.
   */
  static exists(username, options) {
    const store = new UserStore(options);
    return store.exists(username, options);
  }

  /**
   * Restore a user that has been suspended.
   *
   * @param {string} id Id of the user to restore.
   * @param {Object} [options] Options
   * @return {Promise<Object>} The response.
   */
  static restore(id, options) {
    const store = new UserStore(options);
    return store.restore(id, options);
  }
}
