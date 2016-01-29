'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _request = require('./request');

var _request2 = _interopRequireDefault(_request);

var _networkRack = require('../rack/networkRack');

var _networkRack2 = _interopRequireDefault(_networkRack);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var NetworkRequest = function (_Request) {
  _inherits(NetworkRequest, _Request);

  function NetworkRequest() {
    _classCallCheck(this, NetworkRequest);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(NetworkRequest).apply(this, arguments));
  }

  _createClass(NetworkRequest, [{
    key: 'execute',
    value: function execute() {
      var _this2 = this;

      var promise = _get(Object.getPrototypeOf(NetworkRequest.prototype), 'execute', this).call(this).then(function () {
        var networkRack = _networkRack2.default.sharedInstance();
        return networkRack.execute(_this2);
      });

      return promise;
    }
  }, {
    key: 'cancel',
    value: function cancel() {
      var networkRack = _networkRack2.default.sharedInstance();
      networkRack.cancel();
    }
  }]);

  return NetworkRequest;
}(_request2.default);

exports.default = NetworkRequest;