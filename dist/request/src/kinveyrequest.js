'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Properties = exports.AuthType = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _set = function set(object, property, value, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent !== null) { set(parent, property, value, receiver); } } else if ("value" in desc && desc.writable) { desc.value = value; } else { var setter = desc.set; if (setter !== undefined) { setter.call(receiver, value); } } return value; };

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _request2 = require('./request');

var _cacherequest = require('./cacherequest');

var _cacherequest2 = _interopRequireDefault(_cacherequest);

var _headers = require('./headers');

var _headers2 = _interopRequireDefault(_headers);

var _networkrequest = require('./networkrequest');

var _networkrequest2 = _interopRequireDefault(_networkrequest);

var _kinveyresponse = require('./kinveyresponse');

var _kinveyresponse2 = _interopRequireDefault(_kinveyresponse);

var _errors = require('../../errors');

var _social = require('../../social');

var _es6Promise = require('es6-promise');

var _es6Promise2 = _interopRequireDefault(_es6Promise);

var _localStorage = require('local-storage');

var _localStorage2 = _interopRequireDefault(_localStorage);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _qs = require('qs');

var _qs2 = _interopRequireDefault(_qs);

var _appendQuery = require('append-query');

var _appendQuery2 = _interopRequireDefault(_appendQuery);

var _assign = require('lodash/assign');

var _assign2 = _interopRequireDefault(_assign);

var _defaults = require('lodash/defaults');

var _defaults2 = _interopRequireDefault(_defaults);

var _isNumber = require('lodash/isNumber');

var _isNumber2 = _interopRequireDefault(_isNumber);

var _isEmpty = require('lodash/isEmpty');

var _isEmpty2 = _interopRequireDefault(_isEmpty);

var _isFunction = require('lodash/isFunction');

var _isFunction2 = _interopRequireDefault(_isFunction);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var socialIdentityAttribute = process && process.env && process.env.KINVEY_SOCIAL_IDENTITY_ATTRIBUTE || undefined || '_socialIdentity';
var tokenPathname = process && process.env && process.env.KINVEY_MIC_TOKEN_PATHNAME || undefined || '/oauth/token';
var usersNamespace = process && process.env && process.env.KINVEY_USERS_NAMESPACE || undefined || 'user';
var kmdAttribute = process && process.env && process.env.KINVEY_KMD_ATTRIBUTE || undefined || '_kmd';
var defaultApiVersion = process && process.env && process.env.KINVEY_DEFAULT_API_VERSION || undefined || 4;
var customPropertiesMaxBytesAllowed = process && process.env && process.env.KINVEY_MAX_HEADER_BYTES || undefined || 2000;
var activeUserCollectionName = process && process.env && process.env.KINVEY_USER_ACTIVE_COLLECTION_NAME || undefined || 'kinvey_active_user';

function getActiveUser(client) {
  var request = new _cacherequest2.default({
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

  var request = new _cacherequest2.default({
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
      var _request = new _cacherequest2.default({
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

var AuthType = {
  All: 'All',
  App: 'App',
  Basic: 'Basic',
  Default: 'Default',
  Master: 'Master',
  None: 'None',
  Session: 'Session'
};
Object.freeze(AuthType);
exports.AuthType = AuthType;


var Auth = {
  all: function all(client) {
    return Auth.session(client).catch(function () {
      return Auth.basic(client);
    });
  },
  app: function app(client) {
    if (!client.appKey || !client.appSecret) {
      return _es6Promise2.default.reject(new Error('Missing client appKey and/or appSecret.' + ' Use Kinvey.init() to set the appKey and appSecret for the client.'));
    }

    return _es6Promise2.default.resolve({
      scheme: 'Basic',
      username: client.appKey,
      password: client.appSecret
    });
  },
  basic: function basic(client) {
    return Auth.master(client).catch(function () {
      return Auth.app(client);
    });
  },
  master: function master(client) {
    if (!client.appKey || !client.masterSecret) {
      return _es6Promise2.default.reject(new Error('Missing client appKey and/or appSecret.' + ' Use Kinvey.init() to set the appKey and appSecret for the client.'));
    }

    return _es6Promise2.default.resolve({
      scheme: 'Basic',
      username: client.appKey,
      password: client.masterSecret
    });
  },
  none: function none() {
    return _es6Promise2.default.resolve(null);
  },
  session: function session(client) {
    return getActiveUser(client).then(function (activeUser) {
      if (!activeUser) {
        throw new _errors.NoActiveUserError('There is not an active user. Please login a user and retry the request.');
      }

      return {
        scheme: 'Kinvey',
        credentials: activeUser[kmdAttribute].authtoken
      };
    });
  }
};

function byteCount(str) {
  if (str) {
    var count = 0;
    var stringLength = str.length;
    str = String(str || '');

    for (var i = 0; i < stringLength; i += 1) {
      var partCount = encodeURI(str[i]).split('%').length;
      count += partCount === 1 ? 1 : partCount - 1;
    }

    return count;
  }

  return 0;
}

var Properties = exports.Properties = function (_Headers) {
  _inherits(Properties, _Headers);

  function Properties() {
    _classCallCheck(this, Properties);

    return _possibleConstructorReturn(this, (Properties.__proto__ || Object.getPrototypeOf(Properties)).apply(this, arguments));
  }

  return Properties;
}(_headers2.default);

var KinveyRequest = function (_NetworkRequest) {
  _inherits(KinveyRequest, _NetworkRequest);

  function KinveyRequest() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, KinveyRequest);

    var _this2 = _possibleConstructorReturn(this, (KinveyRequest.__proto__ || Object.getPrototypeOf(KinveyRequest)).call(this, options));

    options = (0, _assign2.default)({
      skipBL: false,
      trace: false
    }, options);

    _this2.authType = options.authType || AuthType.None;
    _this2.query = options.query;
    _this2.apiVersion = defaultApiVersion;
    _this2.properties = options.properties || new Properties();
    _this2.skipBL = options.skipBL === true;
    _this2.trace = options.trace === true;
    return _this2;
  }

  _createClass(KinveyRequest, [{
    key: 'execute',
    value: function execute() {
      var _this3 = this;

      var rawResponse = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

      var promise = _es6Promise2.default.resolve();

      if (this.authType) {
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
            promise = Auth.session(this.client).catch(function (error) {
              return Auth.master(_this3.client).catch(function () {
                throw error;
              });
            });
        }
      } else {
        this.headers.remove('Authorization');
      }

      return promise.then(function (authInfo) {
        if (authInfo) {
          var credentials = authInfo.credentials;

          if (authInfo.username) {
            credentials = new Buffer(authInfo.username + ':' + authInfo.password).toString('base64');
          }

          _this3.headers.set('Authorization', authInfo.scheme + ' ' + credentials);
        }
      }).then(function () {
        return _get(KinveyRequest.prototype.__proto__ || Object.getPrototypeOf(KinveyRequest.prototype), 'execute', _this3).call(_this3);
      }).then(function (response) {
        if (!(response instanceof _kinveyresponse2.default)) {
          response = new _kinveyresponse2.default({
            statusCode: response.statusCode,
            headers: response.headers,
            data: response.data
          });
        }

        if (rawResponse === false && response.isSuccess() === false) {
          throw response.error;
        }

        return response;
      }).catch(function (error) {
        if (error instanceof _errors.InvalidCredentialsError) {
          return getActiveUser(_this3.client).then(function (user) {
            if (!user) {
              throw error;
            }

            var socialIdentities = user[socialIdentityAttribute];
            var sessionKey = Object.keys(socialIdentities).find(function (sessionKey) {
              return typeof socialIdentities[sessionKey].refresh_token !== 'undefined';
            });
            var session = socialIdentities[sessionKey];

            if (session) {
              if (session.identity === _social.SocialIdentity.MobileIdentityConnect) {
                var refreshMICRequest = new KinveyRequest({
                  method: _request2.RequestMethod.POST,
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                  },
                  authType: AuthType.App,
                  url: _url2.default.format({
                    protocol: session.protocol || _this3.client.micProtocol,
                    host: session.host || _this3.client.micHost,
                    pathname: tokenPathname
                  }),
                  body: {
                    grant_type: 'refresh_token',
                    client_id: session.client_id,
                    redirect_uri: session.redirect_uri,
                    refresh_token: session.refresh_token
                  },
                  timeout: _this3.timeout,
                  properties: _this3.properties
                });

                return refreshMICRequest.execute().then(function (response) {
                  return response.data;
                }).then(function (newSession) {
                  var data = {};
                  data[socialIdentityAttribute] = {};
                  data[socialIdentityAttribute][_social.SocialIdentity.MobileIdentityConnect] = newSession;

                  var loginRequest = new KinveyRequest({
                    method: _request2.RequestMethod.POST,
                    authType: AuthType.App,
                    url: _url2.default.format({
                      protocol: _this3.client.protocol,
                      host: _this3.client.host,
                      pathname: '/' + usersNamespace + '/' + _this3.client.appKey + '/login'
                    }),
                    properties: _this3.properties,
                    body: data,
                    timeout: _this3.timeout,
                    client: _this3.client
                  });
                  return loginRequest.execute().then(function (response) {
                    return response.data;
                  });
                }).then(function (user) {
                  user[socialIdentityAttribute][session.identity] = (0, _defaults2.default)(user[socialIdentityAttribute][session.identity], session);
                  return setActiveUser(_this3.client, user);
                }).then(function () {
                  return _this3.execute(rawResponse);
                });
              }
            }

            throw error;
          });
        }

        throw error;
      });
    }
  }, {
    key: 'appVersion',
    get: function get() {
      return this.client.appVersion;
    }
  }, {
    key: 'headers',
    get: function get() {
      var headers = _get(KinveyRequest.prototype.__proto__ || Object.getPrototypeOf(KinveyRequest.prototype), 'headers', this);

      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json; charset=utf-8');
      }

      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json; charset=utf-8');
      }

      if (!headers.has('X-Kinvey-Api-Version')) {
        headers.set('X-Kinvey-Api-Version', this.apiVersion);
      }

      if (this.skipBL === true) {
        headers.set('X-Kinvey-Skip-Business-Logic', true);
      } else {
        headers.remove('X-Kinvey-Skip-Business-Logic');
      }

      if (this.trace === true) {
        headers.set('X-Kinvey-Include-Headers-In-Response', 'X-Kinvey-Request-Id');
        headers.set('X-Kinvey-ResponseWrapper', true);
      } else {
        headers.remove('X-Kinvey-Include-Headers-In-Response');
        headers.remove('X-Kinvey-ResponseWrapper');
      }

      if (this.appVersion) {
        headers.set('X-Kinvey-Client-App-Version', this.appVersion);
      } else {
        headers.remove('X-Kinvey-Client-App-Version');
      }

      if (this.properties) {
        var customPropertiesHeader = this.properties.toString();

        if (!(0, _isEmpty2.default)(customPropertiesHeader)) {
          var customPropertiesByteCount = byteCount(customPropertiesHeader);

          if (customPropertiesByteCount >= customPropertiesMaxBytesAllowed) {
            throw new Error('The custom properties are ' + customPropertiesByteCount + ' bytes.' + ('It must be less then ' + customPropertiesMaxBytesAllowed + ' bytes.'), 'Please remove some custom properties.');
          }

          headers.set('X-Kinvey-Custom-Request-Properties', customPropertiesHeader);
        } else {
          headers.remove('X-Kinvey-Custom-Request-Properties');
        }
      } else {
        headers.remove('X-Kinvey-Custom-Request-Properties');
      }

      if (this.client.device && (0, _isFunction2.default)(this.client.device, 'toString')) {
        headers.set('X-Kinvey-Device-Information', this.client.device.toString());
      } else {
        headers.remove('X-Kinvey-Device-Information');
      }

      return headers;
    },
    set: function set(headers) {
      _set(KinveyRequest.prototype.__proto__ || Object.getPrototypeOf(KinveyRequest.prototype), 'headers', headers, this);
    }
  }, {
    key: 'url',
    get: function get() {
      var urlString = _get(KinveyRequest.prototype.__proto__ || Object.getPrototypeOf(KinveyRequest.prototype), 'url', this);
      var queryString = this.query ? this.query.toQueryString() : {};

      if ((0, _isEmpty2.default)(queryString)) {
        return urlString;
      }

      return (0, _appendQuery2.default)(urlString, _qs2.default.stringify(queryString));
    },
    set: function set(urlString) {
      _set(KinveyRequest.prototype.__proto__ || Object.getPrototypeOf(KinveyRequest.prototype), 'url', urlString, this);
    }
  }, {
    key: 'apiVersion',
    get: function get() {
      return this._apiVersion;
    },
    set: function set(apiVersion) {
      this._apiVersion = (0, _isNumber2.default)(apiVersion) ? apiVersion : defaultApiVersion;
    }
  }, {
    key: 'properties',
    get: function get() {
      return this._properties;
    },
    set: function set(properties) {
      if (properties && !(properties instanceof Properties)) {
        properties = new Properties(properties);
      }

      this._properties = properties;
    }
  }]);

  return KinveyRequest;
}(_networkrequest2.default);

exports.default = KinveyRequest;