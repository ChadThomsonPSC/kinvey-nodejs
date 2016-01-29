'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _errors = require('../errors');

var _model = require('./model');

var _model2 = _interopRequireDefault(_model);

var _client = require('../client');

var _client2 = _interopRequireDefault(_client);

var _networkRequest = require('../requests/networkRequest');

var _networkRequest2 = _interopRequireDefault(_networkRequest);

var _enums = require('../enums');

var _query = require('../query');

var _query2 = _interopRequireDefault(_query);

var _auth = require('../auth');

var _auth2 = _interopRequireDefault(_auth);

var _user = require('../utils/user');

var _user2 = _interopRequireDefault(_user);

var _mic = require('../mic');

var _mic2 = _interopRequireDefault(_mic);

var _hellojs = require('hellojs');

var _hellojs2 = _interopRequireDefault(_hellojs);

var _isObject = require('lodash/lang/isObject');

var _isObject2 = _interopRequireDefault(_isObject);

var _result = require('lodash/object/result');

var _result2 = _interopRequireDefault(_result);

var _assign = require('lodash/object/assign');

var _assign2 = _interopRequireDefault(_assign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var appdataNamespace = process.env.KINVEY_DATASTORE_NAMESPACE || 'appdata';
var usersNamespace = process.env.KINVEY_USERS_NAMESPACE || 'user';
var rpcNamespace = process.env.KINVEY_RPC_NAMESPACE || 'rpc';
var micAuthProvider = process.env.KINVEY_MIC_AUTH_PROVIDER || 'kinveyAuth';

var User = function (_Model) {
  _inherits(User, _Model);

  function User() {
    _classCallCheck(this, User);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(User).apply(this, arguments));
  }

  _createClass(User, [{
    key: 'getPathname',
    value: function getPathname(client) {
      client = client || this.client;
      return '/' + usersNamespace + '/' + client.appKey;
    }
  }, {
    key: 'getRpcPathname',
    value: function getRpcPathname(client) {
      client = client || this.client;
      return '/' + rpcNamespace + '/' + client.appKey;
    }
  }, {
    key: 'isActive',
    value: function isActive() {
      var _this2 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return User.getActive(options).then(function (user) {
        if (user) {
          return _this2.id === user.id;
        }

        return false;
      });
    }
  }, {
    key: 'login',
    value: function login() {
      var _this3 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      options = (0, _assign2.default)({
        client: this.client
      }, options);

      var promise = User.getActive(options).then(function (activeUser) {
        if (activeUser) {
          throw new _errors.ActiveUserError('A user is already logged in.');
        }

        var username = _this3.get('username');
        var password = _this3.get('password');
        var _socialIdentity = _this3.get('_socialIdentity');
        if ((!username || username === '' || !password || password === '') && !_socialIdentity) {
          throw new _errors.KinveyError('Username and/or password missing. Please provide both a username and password to login.');
        }

        var request = new _networkRequest2.default({
          method: _enums.HttpMethod.POST,
          pathname: _this3.getPathname(_this3.client) + '/login',
          data: _this3.toJSON(),
          auth: _auth2.default.app,
          client: options.client
        });
        return request.execute();
      }).then(function (response) {
        if (response && response.isSuccess()) {
          _this3.set(response.data, options);
          _this3.unset('password');
          return User.setActive(_this3, options);
        }

        return response;
      });

      return promise;
    }
  }, {
    key: 'loginWithMIC',
    value: function loginWithMIC(redirectUri, authorizationGrant) {
      var _this4 = this;

      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      var mic = new _mic2.default();
      var promise = mic.login(redirectUri, authorizationGrant, options).then(function (token) {
        return _this4.connect(token.access_token, token.expires_in, micAuthProvider, options);
      });

      return promise;
    }
  }, {
    key: 'connectWithFacebook',
    value: function connectWithFacebook() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return this.connectWithSocial(_enums.SocialIdentity.Facebook, options);
    }
  }, {
    key: 'connectWithGoogle',
    value: function connectWithGoogle() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return this.connectWithSocial(_enums.SocialIdentity.Google, options);
    }
  }, {
    key: 'connectWithLinkedIn',
    value: function connectWithLinkedIn() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return this.connectWithSocial(_enums.SocialIdentity.LinkedIn, options);
    }
  }, {
    key: 'connectWithSocial',
    value: function connectWithSocial(identity) {
      var _this5 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      options = (0, _assign2.default)({
        client: _client2.default.sharedInstance(),
        auth: _auth2.default.default,
        collectionName: 'SocialIdentities',
        handler: function handler() {}
      }, options);

      var promise = Promise.resolve().then(function () {
        var query = new _query2.default();
        query.equalTo('identity', identity);
        var request = new _networkRequest2.default({
          method: _enums.HttpMethod.GET,
          client: options.client,
          properties: options.properties,
          auth: options.auth,
          pathname: '/' + appdataNamespace + '/' + options.client.appKey + '/' + options.collectionName,
          query: query,
          timeout: options.timeout
        });
        return request.execute();
      }).then(function (response) {
        if (response.isSuccess()) {
          if (response.data.length === 1) {
            var helloSettings = {};
            helloSettings[identity] = response.data[0].key || response.data[0].appId || response.data[0].clientId;
            _hellojs2.default.init(helloSettings);
            return (0, _hellojs2.default)(identity).login();
          }

          throw new Error('Unsupported social identity');
        }

        throw response.error;
      }).then(function () {
        var authResponse = (0, _hellojs2.default)(identity).getAuthResponse();
        return _this5.connect(authResponse.access_token, authResponse.expires_in, identity, options);
      });

      return promise;
    }
  }, {
    key: 'connect',
    value: function connect(accessToken, expiresIn, identity) {
      var _this6 = this;

      var options = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

      var socialIdentity = {};
      socialIdentity[identity] = {
        access_token: accessToken,
        expires_in: expiresIn
      };
      this.set('_socialIdentity', socialIdentity);

      var promise = this.isActive().then(function (active) {
        if (active) {
          return _this6.update(options);
        }

        return _this6.login(options);
      }).catch(function (err) {
        if (err instanceof _errors.NotFoundError) {
          return _this6.signup(options).then(function () {
            return _this6.connect(accessToken, expiresIn, identity, options);
          });
        }

        throw err;
      });

      return promise;
    }
  }, {
    key: 'logout',
    value: function logout() {
      var _this7 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      options = (0, _assign2.default)({
        client: this.client,
        properties: null,
        timeout: undefined,
        handler: function handler() {}
      }, options);

      var promise = this.isActive(options).then(function (active) {
        if (!active) {
          return null;
        }

        var request = new _networkRequest2.default({
          method: _enums.HttpMethod.POST,
          client: options.client,
          properties: options.properties,
          auth: _auth2.default.session,
          pathname: _this7.getPathname(options.client) + '/_logout',
          timeout: options.timeout
        });
        return request.execute();
      }).then(function () {
        return User.setActive(null, options.client);
      });

      return promise;
    }
  }, {
    key: 'signup',
    value: function signup() {
      var _this8 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      options = (0, _assign2.default)({
        client: this.client,
        properties: null,
        timeout: undefined,
        handler: function handler() {}
      }, options);

      var request = new _networkRequest2.default({
        method: _enums.HttpMethod.POST,
        client: options.client,
        properties: options.properties,
        auth: _auth2.default.app,
        pathname: this.getPathname(this.client),
        data: this.toJSON(),
        timeout: options.timeout
      });
      var promise = request.execute().then(function (response) {
        if (response.isSuccess()) {
          _this8.set(response.data);
          return _this8;
        }

        throw response.error;
      });

      return promise;
    }
  }, {
    key: 'update',
    value: function update() {
      var _this9 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      options = (0, _assign2.default)({
        client: this.client,
        properties: null,
        timeout: undefined,
        handler: function handler() {}
      }, options);

      var request = new _networkRequest2.default({
        method: _enums.HttpMethod.PUT,
        client: options.client,
        properties: options.properties,
        auth: _auth2.default.session,
        pathname: this.getPathname(this.client) + '/' + this.id,
        data: this.toJSON(),
        timeout: options.timeout
      });
      var promise = request.execute().then(function (response) {
        if (response.isSuccess()) {
          return _this9.isActive();
        }

        throw response.error;
      }).then(function (active) {
        if (active) {
          return User.setActive(_this9, options);
        }

        return _this9;
      });

      return promise;
    }
  }, {
    key: 'me',
    value: function me() {
      var _this10 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      options = (0, _assign2.default)({
        client: this.client
      }, options);

      var promise = this.isActive(options).then(function (active) {
        if (!active) {
          throw new _errors.KinveyError('User is not active. Please login first.');
        }

        var request = new _networkRequest2.default({
          method: _enums.HttpMethod.GET,
          pathname: _this10.getPathname(options.client) + '/_me',
          dataPolicy: _enums.ReadPolicy.NetworkOnly,
          auth: _auth2.default.session,
          client: options.client
        });
        return request.execute();
      }).then(function (response) {
        var user = new User(response.data);

        if (!user.kmd.authtoken) {
          return User.getActive().then(function (activeUser) {
            var kmd = user.kmd;
            kmd.authtoken = activeUser.kmd.authtoken;
            user.kmd = kmd;
            return user;
          });
        }

        return user;
      }).then(function (user) {
        return User.setActive(user, options.client);
      });

      return promise;
    }
  }, {
    key: 'verifyEmail',
    value: function verifyEmail() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      options = (0, _assign2.default)({
        client: this.client
      }, options);

      var request = new _networkRequest2.default({
        method: _enums.HttpMethod.POST,
        pathname: this.getRpcPathname(options.client) + '/' + this.get('username') + '/user-email-verification-initiate',
        writePolicy: _enums.WritePolicy.Network,
        auth: _auth2.default.app,
        client: options.client
      });
      var promise = request.execute();
      return promise;
    }
  }, {
    key: 'forgotUsername',
    value: function forgotUsername() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      options = (0, _assign2.default)({
        client: this.client
      }, options);

      var request = new _networkRequest2.default({
        method: _enums.HttpMethod.POST,
        pathname: this.getRpcPathname(options.client) + '/user-forgot-username',
        writePolicy: _enums.WritePolicy.Network,
        auth: _auth2.default.app,
        client: options.client,
        data: { email: this.get('email') }
      });
      var promise = request.execute();
      return promise;
    }
  }, {
    key: 'resetPassword',
    value: function resetPassword() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      options = (0, _assign2.default)({
        client: this.client
      }, options);

      var request = new _networkRequest2.default({
        method: _enums.HttpMethod.POST,
        pathname: this.getRpcPathname(options.client) + '/' + this.get('username') + '/user-password-reset-initiate',
        writePolicy: _enums.WritePolicy.Network,
        auth: _auth2.default.app,
        client: options.client
      });
      var promise = request.execute();
      return promise;
    }
  }, {
    key: 'authtoken',
    get: function get() {
      return this.metadata.authtoken;
    }
  }], [{
    key: 'getActive',
    value: function getActive() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var promise = _user2.default.getActive(options).then(function (data) {
        if (data) {
          return new User(data);
        }

        return null;
      });

      return promise;
    }
  }, {
    key: 'setActive',
    value: function setActive(user) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      if (user && !(user instanceof User)) {
        user = new User((0, _result2.default)(user, 'toJSON', user));
      }

      var promise = _user2.default.setActive(user, options).then(function (data) {
        if (data) {
          return new User(data);
        }

        return null;
      });

      return promise;
    }
  }, {
    key: 'login',
    value: function login(usernameOrData, password) {
      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      if (!(0, _isObject2.default)(usernameOrData)) {
        usernameOrData = {
          username: usernameOrData,
          password: password
        };
      }

      var user = new User(usernameOrData);
      return user.login(options);
    }
  }, {
    key: 'loginWithMIC',
    value: function loginWithMIC(redirectUri, authorizationGrant) {
      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      var user = new User();
      return user.loginWithMIC(redirectUri, authorizationGrant, options);
    }
  }, {
    key: 'connectWithFacebook',
    value: function connectWithFacebook() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var user = new User();
      return user.connectWithFacebook(options);
    }
  }, {
    key: 'connectWithGoogle',
    value: function connectWithGoogle() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var user = new User();
      return user.connectWithGoogle(options);
    }
  }, {
    key: 'connectWithLinkedIn',
    value: function connectWithLinkedIn() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var user = new User();
      return user.connectWithLinkedIn(options);
    }
  }, {
    key: 'connectWithSocial',
    value: function connectWithSocial(identity) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var user = new User();
      return user.connectWithSocial(identity, options);
    }
  }, {
    key: 'connect',
    value: function connect() {
      var user = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
      var accessToken = arguments[1];
      var expiresIn = arguments[2];
      var identity = arguments[3];
      var options = arguments.length <= 4 || arguments[4] === undefined ? {} : arguments[4];

      if (user && !(user instanceof User)) {
        user = new User((0, _result2.default)(user, 'toJSON', user));
      }
      return user.connect(accessToken, expiresIn, identity, options);
    }
  }, {
    key: 'signup',
    value: function signup(user) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      if (!user) {
        return Promise.reject(new Error('User is required.'));
      }

      if (!(user instanceof User)) {
        user = new User((0, _result2.default)(user, 'toJSON', user));
      }

      return user.signup(options);
    }
  }]);

  return User;
}(_model2.default);

exports.default = User;