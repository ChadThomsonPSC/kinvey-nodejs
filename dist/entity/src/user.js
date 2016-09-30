'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.User = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _client = require('../../client');

var _acl = require('./acl');

var _metadata = require('./metadata');

var _request2 = require('../../request');

var _errors = require('../../errors');

var _datastore = require('../../datastore');

var _social = require('../../social');

var _utils = require('../../utils');

var _es6Promise = require('es6-promise');

var _es6Promise2 = _interopRequireDefault(_es6Promise);

var _localStorage = require('local-storage');

var _localStorage2 = _interopRequireDefault(_localStorage);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _assign = require('lodash/assign');

var _assign2 = _interopRequireDefault(_assign);

var _result = require('lodash/result');

var _result2 = _interopRequireDefault(_result);

var _isString = require('lodash/isString');

var _isString2 = _interopRequireDefault(_isString);

var _isObject = require('lodash/isObject');

var _isObject2 = _interopRequireDefault(_isObject);

var _isEmpty = require('lodash/isEmpty');

var _isEmpty2 = _interopRequireDefault(_isEmpty);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var usersNamespace = process && process.env && process.env.KINVEY_USERS_NAMESPACE || undefined || 'user';
var rpcNamespace = process && process.env && process.env.KINVEY_RPC_NAMESPACE || undefined || 'rpc';
var idAttribute = process && process.env && process.env.KINVEY_ID_ATTRIBUTE || undefined || '_id';
var kmdAttribute = process && process.env && process.env.KINVEY_KMD_ATTRIBUTE || undefined || '_kmd';
var socialIdentityAttribute = process && process.env && process.env.KINVEY_SOCIAL_IDENTITY_ATTRIBUTE || undefined || '_socialIdentity';
var usernameAttribute = process && process.env && process.env.KINVEY_USERNAME_ATTRIBUTE || undefined || 'username';
var emailAttribute = process && process.env && process.env.KINVEY_EMAIL_ATTRIBUTE || undefined || 'email';
var activeUserCollectionName = process && process.env && process.env.KINVEY_USER_ACTIVE_COLLECTION_NAME || undefined || 'kinvey_active_user';

function _getActiveUser(client) {
  var request = new _request2.CacheRequest({
    method: _request2.RequestMethod.GET,
    url: _url2.default.format({
      protocol: client.protocol,
      host: client.host,
      pathname: '/' + usersNamespace + '/' + client.appKey + '/' + activeUserCollectionName
    })
  });
  return request.execute().then(function (response) {
    return response.data;
  }).then(function (users) {
    if (users.length > 0) {
      return users[0];
    }

    return _localStorage2.default.get(client.appKey + 'kinvey_user');
  }).catch(function () {
    return null;
  });
}

function setActiveUser(client, user) {
  _localStorage2.default.remove(client.appKey + 'kinvey_user');

  var request = new _request2.CacheRequest({
    method: _request2.RequestMethod.DELETE,
    url: _url2.default.format({
      protocol: client.protocol,
      host: client.host,
      pathname: '/' + usersNamespace + '/' + client.appKey + '/' + activeUserCollectionName
    })
  });

  return request.execute().then(function (response) {
    return response.data;
  }).then(function (prevActiveUser) {
    if (user) {
      var _request = new _request2.CacheRequest({
        method: _request2.RequestMethod.PUT,
        url: _url2.default.format({
          protocol: client.protocol,
          host: client.host,
          pathname: '/' + usersNamespace + '/' + client.appKey + '/' + activeUserCollectionName
        }),
        body: user
      });
      return _request.execute().then(function (response) {
        return response.data;
      });
    }

    return prevActiveUser;
  });
}

var User = exports.User = function () {
  function User() {
    var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, User);

    this.data = data;

    this.client = options.client || _client.Client.sharedInstance();
  }

  _createClass(User, [{
    key: 'isActive',
    value: function isActive() {
      var _this = this;

      return User.getActiveUser(this.client).then(function (activeUser) {
        if (activeUser && activeUser[idAttribute] === _this[idAttribute]) {
          return true;
        }

        return false;
      });
    }
  }, {
    key: 'isEmailVerified',
    value: function isEmailVerified() {
      var status = this.metadata.emailVerification;
      return status === 'confirmed';
    }
  }, {
    key: 'login',
    value: function login(username, password) {
      var _this2 = this;

      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var credentials = username;

      if ((0, _isObject2.default)(credentials)) {
        options = password || {};
      } else {
        credentials = {
          username: username,
          password: password
        };
      }

      return this.isActive().then(function (isActive) {
        if (isActive) {
          throw new _errors.ActiveUserError('This user is already the active user.');
        }

        return User.getActiveUser(_this2.client);
      }).then(function (activeUser) {
        if (activeUser) {
          throw new _errors.ActiveUserError('An active user already exists. Please logout the active user before you login.');
        }

        if (!credentials[socialIdentityAttribute]) {
          if (credentials.username) {
            credentials.username = String(credentials.username).trim();
          }

          if (credentials.password) {
            credentials.password = String(credentials.password).trim();
          }
        }

        if ((!credentials.username || credentials.username === '' || !credentials.password || credentials.password === '') && !credentials[socialIdentityAttribute]) {
          throw new _errors.KinveyError('Username and/or password missing. Please provide both a username and password to login.');
        }

        var request = new _request2.KinveyRequest({
          method: _request2.RequestMethod.POST,
          authType: _request2.AuthType.App,
          url: _url2.default.format({
            protocol: _this2.client.apiProtocol,
            host: _this2.client.apiHost,
            pathname: _this2.pathname + '/login'
          }),
          body: credentials,
          properties: options.properties,
          timeout: options.timeout,
          client: _this2.client
        });
        return request.execute();
      }).then(function (response) {
        return response.data;
      }).then(function (data) {
        if (credentials[socialIdentityAttribute]) {
          data[socialIdentityAttribute] = credentials[socialIdentityAttribute];
        }

        _this2.data = data;
        return setActiveUser(_this2.client, _this2.data);
      }).then(function () {
        return _this2;
      });
    }
  }, {
    key: 'loginWithMIC',
    value: function loginWithMIC(redirectUri, authorizationGrant) {
      var _this3 = this;

      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      return this.isActive().then(function (isActive) {
        if (isActive) {
          throw new _errors.ActiveUserError('This user is already the active user.');
        }

        return User.getActiveUser(_this3.client);
      }).then(function (activeUser) {
        if (activeUser) {
          throw new _errors.ActiveUserError('An active user already exists. Please logout the active user before you login.');
        }

        var mic = new _social.MobileIdentityConnect({ client: _this3.client });
        return mic.login(redirectUri, authorizationGrant, options);
      }).then(function (session) {
        return _this3.connectIdentity(_social.MobileIdentityConnect.identity, session, options);
      });
    }
  }, {
    key: 'connectIdentity',
    value: function connectIdentity(identity, session, options) {
      var _this4 = this;

      return this.isActive().then(function (isActive) {
        var data = {};
        var socialIdentity = data[socialIdentityAttribute] || {};
        socialIdentity[identity] = session;
        data[socialIdentityAttribute] = socialIdentity;

        if (isActive) {
          return _this4.update(data, options);
        }

        return _this4.login(data, options).catch(function (error) {
          if (error instanceof _errors.NotFoundError) {
            return _this4.signup(data, options).then(function () {
              return _this4.connectIdentity(identity, session, options);
            });
          }

          throw error;
        });
      });
    }
  }, {
    key: 'connectWithIdentity',
    value: function connectWithIdentity(identity, session, options) {
      return this.connectIdentity(identity, session, options);
    }
  }, {
    key: 'connectFacebook',
    value: function connectFacebook(clientId, options) {
      var _this5 = this;

      var facebook = new _social.Facebook({ client: this.client });
      return facebook.login(clientId, options).then(function (session) {
        return _this5.connectIdentity(_social.Facebook.identity, session, options);
      });
    }
  }, {
    key: 'disconnectFacebook',
    value: function disconnectFacebook(options) {
      return this.disconnectIdentity(_social.Facebook.identity, options);
    }
  }, {
    key: 'connectGoogle',
    value: function connectGoogle(clientId, options) {
      var _this6 = this;

      var google = new _social.Google({ client: this.client });
      return google.login(clientId, options).then(function (session) {
        return _this6.connectIdentity(_social.Google.identity, session, options);
      });
    }
  }, {
    key: 'disconnectGoogle',
    value: function disconnectGoogle(options) {
      return this.disconnectIdentity(_social.Google.identity, options);
    }
  }, {
    key: 'googleconnectLinkedIn',
    value: function googleconnectLinkedIn(clientId, options) {
      var _this7 = this;

      var linkedIn = new _social.LinkedIn({ client: this.client });
      return linkedIn.login(clientId, options).then(function (session) {
        return _this7.connectIdentity(_social.LinkedIn.identity, session, options);
      });
    }
  }, {
    key: 'disconnectLinkedIn',
    value: function disconnectLinkedIn(options) {
      return this.disconnectIdentity(_social.LinkedIn.identity, options);
    }
  }, {
    key: 'disconnectIdentity',
    value: function disconnectIdentity(identity, options) {
      var _this8 = this;

      var promise = _es6Promise2.default.resolve();

      if (identity === _social.Facebook.identity) {
        promise = _social.Facebook.logout(this, options);
      } else if (identity === _social.Google.identity) {
        promise = _social.Google.logout(this, options);
      } else if (identity === _social.LinkedIn.identity) {
        promise = _social.LinkedIn.logout(this, options);
      } else if (identity === _social.MobileIdentityConnect.identity) {
        promise = _social.MobileIdentityConnect.logout(this, options);
      }

      return promise.catch(function (error) {
        _utils.Log.error(error);
      }).then(function () {
        var data = _this8.data;
        var socialIdentity = data[socialIdentityAttribute] || {};
        delete socialIdentity[identity];
        data[socialIdentityAttribute] = socialIdentity;
        _this8.data = data;

        if (!_this8[idAttribute]) {
          return _this8;
        }

        return _this8.update(data, options);
      }).then(function () {
        return _this8;
      });
    }
  }, {
    key: 'logout',
    value: function logout() {
      var _this9 = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var request = new _request2.KinveyRequest({
        method: _request2.RequestMethod.POST,
        authType: _request2.AuthType.Session,
        url: _url2.default.format({
          protocol: this.client.apiProtocol,
          host: this.client.apiHost,
          pathname: this.pathname + '/_logout'
        }),
        properties: options.properties,
        timeout: options.timeout,
        client: this.client
      });

      return request.execute().catch(function (error) {
        _utils.Log.error(error);
      }).then(function () {
        var identities = Object.keys(_this9._socialIdentity || {});
        var promises = identities.map(function (identity) {
          return _this9.disconnectIdentity(identity, options);
        });
        return _es6Promise2.default.all(promises);
      }).catch(function (error) {
        _utils.Log.error(error);
      }).then(function () {
        return setActiveUser(_this9.client, null);
      }).then(function () {
        return _datastore.DataStore.clearCache({ client: _this9.client });
      }).catch(function (error) {
        _utils.Log.error(error);
      }).then(function () {
        return _this9;
      });
    }
  }, {
    key: 'signup',
    value: function signup(data) {
      var _this10 = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      options = (0, _assign2.default)({
        state: true
      }, options);

      return User.getActiveUser(this.client).then(function (activeUser) {
        if (options.state === true && activeUser) {
          throw new _errors.ActiveUserError('An active user already exists. Please logout the active user before you login.');
        }

        if (data instanceof User) {
          data = data.data;
        }

        var request = new _request2.KinveyRequest({
          method: _request2.RequestMethod.POST,
          authType: _request2.AuthType.App,
          url: _url2.default.format({
            protocol: _this10.client.protocol,
            host: _this10.client.host,
            pathname: _this10.pathname
          }),
          body: (0, _isEmpty2.default)(data) ? null : data,
          properties: options.properties,
          timeout: options.timeout,
          client: _this10.client
        });

        return request.execute();
      }).then(function (response) {
        return response.data;
      }).then(function (data) {
        _this10.data = data;

        if (options.state === true) {
          return setActiveUser(_this10.client, _this10.data);
        }

        return _this10;
      }).then(function () {
        return _this10;
      });
    }
  }, {
    key: 'signupWithIdentity',
    value: function signupWithIdentity(identity, session, options) {
      var data = {};
      data[socialIdentityAttribute] = {};
      data[socialIdentityAttribute][identity] = session;
      return this.signup(data, options);
    }
  }, {
    key: 'update',
    value: function update(data, options) {
      var _this11 = this;

      data = (0, _assign2.default)(this.data, data);
      var userStore = new _datastore.UserStore();
      return userStore.update(data, options).then(function () {
        _this11.data = data;
        return _this11.isActive();
      }).then(function (isActive) {
        if (isActive) {
          return setActiveUser(_this11.client, _this11.data);
        }

        return _this11;
      }).then(function () {
        return _this11;
      });
    }
  }, {
    key: 'me',
    value: function me() {
      var _this12 = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var request = new _request2.KinveyRequest({
        method: _request2.RequestMethod.GET,
        authType: _request2.AuthType.Session,
        url: _url2.default.format({
          protocol: this.client.protocol,
          host: this.client.host,
          pathname: this.pathname + '/_me'
        }),
        properties: options.properties,
        timeout: options.timeout
      });

      return request.execute().then(function (response) {
        return response.data;
      }).then(function (data) {
        if (!data[kmdAttribute].authtoken) {
          return User.getActiveUser(_this12.client).then(function (activeUser) {
            if (activeUser) {
              data[kmdAttribute].authtoken = activeUser.authtoken;
            }

            return data;
          });
        }

        return data;
      }).then(function (data) {
        return setActiveUser(_this12.client, data).then(function () {
          _this12.data = data;
        });
      }).then(function () {
        return _this12;
      });
    }
  }, {
    key: '_id',
    get: function get() {
      return this.data[idAttribute];
    }
  }, {
    key: '_acl',
    get: function get() {
      return new _acl.Acl(this.data);
    }
  }, {
    key: 'metadata',
    get: function get() {
      return new _metadata.Metadata(this.data);
    },
    set: function set(metadata) {
      this.data[kmdAttribute] = (0, _result2.default)(metadata, 'toPlainObjecta', metadata);
    }
  }, {
    key: '_kmd',
    get: function get() {
      return this.metadata;
    },
    set: function set(kmd) {
      this.metadata = kmd;
    }
  }, {
    key: '_socialIdentity',
    get: function get() {
      return this.data[socialIdentityAttribute];
    }
  }, {
    key: 'authtoken',
    get: function get() {
      return this.metadata.authtoken;
    },
    set: function set(authtoken) {
      var metadata = this.metadata;
      metadata.authtoken = authtoken;
      this.metadata = metadata;
    }
  }, {
    key: 'username',
    get: function get() {
      return this.data[usernameAttribute];
    }
  }, {
    key: 'email',
    get: function get() {
      return this.data[emailAttribute];
    }
  }, {
    key: 'pathname',
    get: function get() {
      return '/' + usersNamespace + '/' + this.client.appKey;
    }
  }], [{
    key: 'getActiveUser',
    value: function getActiveUser() {
      var _this13 = this;

      var client = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _client.Client.sharedInstance();

      return _getActiveUser(client).then(function (data) {
        if (data) {
          return new _this13(data, { client: client });
        }

        return null;
      });
    }
  }, {
    key: 'login',
    value: function login(username, password, options) {
      var user = new this({}, options);
      return user.login(username, password, options);
    }
  }, {
    key: 'loginWithMIC',
    value: function loginWithMIC(redirectUri, authorizationGrant) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var user = new this({}, options);
      return user.loginWithMIC(redirectUri, authorizationGrant, options);
    }
  }, {
    key: 'connectIdentity',
    value: function connectIdentity(identity, session, options) {
      var user = new this({}, options);
      return user.connectIdentity(identity, session, options);
    }
  }, {
    key: 'connectFacebook',
    value: function connectFacebook(clientId, options) {
      var user = new this({}, options);
      return user.connectFacebook(clientId, options);
    }
  }, {
    key: 'connectGoogle',
    value: function connectGoogle(clientId, options) {
      var user = new this({}, options);
      return user.connectGoogle(clientId, options);
    }
  }, {
    key: 'connectLinkedIn',
    value: function connectLinkedIn(clientId, options) {
      var user = new this({}, options);
      return user.connectLinkedIn(clientId, options);
    }
  }, {
    key: 'logout',
    value: function logout() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      return this.getActiveUser(options.client).then(function (user) {
        if (user) {
          return user.logout(options);
        }

        return null;
      });
    }
  }, {
    key: 'signup',
    value: function signup(data, options) {
      var user = new this({}, options);
      return user.signup(data, options);
    }
  }, {
    key: 'signupWithIdentity',
    value: function signupWithIdentity(identity, session, options) {
      var user = new this({}, options);
      return user.signupWithIdentity(identity, session, options);
    }
  }, {
    key: 'update',
    value: function update(data, options) {
      return User.getActiveUser(options.client).then(function (user) {
        if (user) {
          return user.update(data, options);
        }

        return null;
      });
    }
  }, {
    key: 'me',
    value: function me(options) {
      return User.getActiveUser(options.client).then(function (user) {
        if (user) {
          return user.me(options);
        }

        return null;
      });
    }
  }, {
    key: 'verifyEmail',
    value: function verifyEmail(username) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (!username) {
        return _es6Promise2.default.reject(new _errors.KinveyError('A username was not provided.', 'Please provide a username for the user that you would like to verify their email.'));
      }

      if (!(0, _isString2.default)(username)) {
        return _es6Promise2.default.reject(new _errors.KinveyError('The provided username is not a string.'));
      }

      var client = options.client || _client.Client.sharedInstance();
      var request = new _request2.KinveyRequest({
        method: _request2.RequestMethod.POST,
        authType: _request2.AuthType.App,
        url: _url2.default.format({
          protocol: client.protocol,
          host: client.host,
          pathname: '/' + rpcNamespace + '/' + client.appKey + '/' + username + '/user-email-verification-initiate'
        }),
        properties: options.properties,
        timeout: options.timeout,
        client: client
      });
      return request.execute().then(function (response) {
        return response.data;
      });
    }
  }, {
    key: 'forgotUsername',
    value: function forgotUsername(email) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (!email) {
        return _es6Promise2.default.reject(new _errors.KinveyError('An email was not provided.', 'Please provide an email for the user that you would like to retrieve their username.'));
      }

      if (!(0, _isString2.default)(email)) {
        return _es6Promise2.default.reject(new _errors.KinveyError('The provided email is not a string.'));
      }

      var client = options.client || _client.Client.sharedInstance();
      var request = new _request2.KinveyRequest({
        method: _request2.RequestMethod.POST,
        authType: _request2.AuthType.App,
        url: _url2.default.format({
          protocol: client.protocol,
          host: client.host,
          pathname: '/' + rpcNamespace + '/' + client.appKey + '/user-forgot-username'
        }),
        properties: options.properties,
        data: { email: email },
        timeout: options.timeout,
        client: client
      });
      return request.execute().then(function (response) {
        return response.data;
      });
    }
  }, {
    key: 'resetPassword',
    value: function resetPassword(username) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (!username) {
        return _es6Promise2.default.reject(new _errors.KinveyError('A username was not provided.', 'Please provide a username for the user that you would like to verify their email.'));
      }

      if (!(0, _isString2.default)(username)) {
        return _es6Promise2.default.reject(new _errors.KinveyError('The provided username is not a string.'));
      }

      var client = options.client || _client.Client.sharedInstance();
      var request = new _request2.KinveyRequest({
        method: _request2.RequestMethod.POST,
        authType: _request2.AuthType.App,
        url: _url2.default.format({
          protocol: client.protocol,
          host: client.host,
          pathname: '/' + rpcNamespace + '/' + client.appKey + '/' + username + '/user-password-reset-initiate'
        }),
        properties: options.properties,
        timeout: options.timeout,
        client: client
      });
      return request.execute().then(function (response) {
        return response.data;
      });
    }
  }, {
    key: 'exists',
    value: function exists(username, options) {
      var store = new _datastore.UserStore(options);
      return store.exists(username, options);
    }
  }, {
    key: 'restore',
    value: function restore(id, options) {
      var store = new _datastore.UserStore(options);
      return store.restore(id, options);
    }
  }]);

  return User;
}();