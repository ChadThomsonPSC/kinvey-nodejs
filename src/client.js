import Rack, { CacheRack, NetworkRack } from './rack';
import { KinveyError } from './errors';
import { Device } from './utils';
import url from 'url';
import assign from 'lodash/assign';
import isString from 'lodash/isString';
let sharedInstance = null;

/**
 * The Client class stores information about your application on the Kinvey platform. You can create mutiple clients
 * to send requests to different environments on the Kinvey platform.
 */
export class Client {
  /**
   * Creates a new instance of the Client class.
   *
   * @param {Object}    options                                            Options
   * @param {string}    [options.apiHostname='https://baas.kinvey.com']    Host name used for Kinvey API requests
   * @param {string}    [options.micHostname='https://auth.kinvey.com']    Host name used for Kinvey MIC requests
   * @param {string}    [options.appKey]                                   App Key
   * @param {string}    [options.appSecret]                                App Secret
   * @param {string}    [options.masterSecret]                             App Master Secret
   * @param {string}    [options.encryptionKey]                            App Encryption Key
   * @param {string}    [options.appVersion]                               App Version
   * @param {Rack}      [options.cacheRack]                                Cache Rack
   * @param {Rack}      [options.networkRack]                              Network Rack
   * @param {Device}    [options.deviceClass]                              Device Class
   * @param {Device}    [options.popupClass]                               Popup Class
   * @return {Client}                                                      An instance of the Client class.
   *
   * @example
   * var client = new Kinvey.Client({
   *   appKey: '<appKey>',
   *   appSecret: '<appSecret>'
   * });
   */
  constructor(options = {}) {
    options = assign({
      apiHostname: 'https://baas.kinvey.com',
      micHostname: 'https://auth.kinvey.com',
      liveServiceHostname: 'https://kls.kinvey.com'
    }, options);

    if (options.apiHostname && isString(options.apiHostname)) {
      const apiHostnameParsed = url.parse(options.apiHostname);
      options.apiProtocol = apiHostnameParsed.protocol || 'https:';
      options.apiHost = apiHostnameParsed.host;
    }

    if (options.micHostname && isString(options.micHostname)) {
      const micHostnameParsed = url.parse(options.micHostname);
      options.micProtocol = micHostnameParsed.protocol || 'https:';
      options.micHost = micHostnameParsed.host;
    }

    if (options.liveServiceHostname && isString(options.liveServiceHostname)) {
      const liveServiceHostnameParsed = url.parse(options.liveServiceHostname);
      options.liveServiceProtocol = liveServiceHostnameParsed.protocol || 'https:';
      options.liveServiceHost = liveServiceHostnameParsed.host;
    }

    /**
     * @type {string}
     */
    this.apiProtocol = options.apiProtocol;

    /**
     * @type {string}
     */
    this.apiHost = options.apiHost;

    /**
     * @type {string}
     */
    this.micProtocol = options.micProtocol;

    /**
     * @type {string}
     */
    this.micHost = options.micHost;

    /**
     * @type {string}
     */
    this.liveServiceProtocol = options.liveServiceProtocol;

    /**
     * @type {string}
     */
    this.liveServiceHost = options.liveServiceHost;

    /**
     * @type {?string}
     */
    this.appKey = options.appKey;

    /**
     * @type {?string}
     */
    this.appSecret = options.appSecret;

    /**
     * @type {?string}
     */
    this.masterSecret = options.masterSecret;

    /**
     * @type {?string}
     */
    this.encryptionKey = options.encryptionKey;

    /**
     * @type {?string}
     */
    this.appVersion = options.appVersion;

    /**
     * @type {Rack}
     */
    this.cacheRack = options.cacheRack || new CacheRack();

    /**
     * @type {Rack}
     */
    this.networkRack = options.networkRack || new NetworkRack();

    /**
     * @type {Device}
     */
    this.deviceClass = options.deviceClass || Device;

    /**
     * @type {Popup}
     */
    this.popupClass = options.popupClass;
  }

  /**
   * API host name used for Kinvey API requests.
   */
  get apiHostname() {
    return url.format({
      protocol: this.apiProtocol,
      host: this.apiHost
    });
  }

  /**
   * @deprecated Use apiHostname instead of this.
   */
  get baseUrl() {
    return this.apiHostname;
  }

  /**
   * @deprecated Use apiProtocol instead of this.
   */
  get protocol() {
    return this.apiProtocol;
  }

  /**
   * @deprecated Use apiHost instead of this.
   */
  get host() {
    return this.apiHost;
  }

  /**
   * Mobile Identity Connect host name used for MIC requests.
   */
  get micHostname() {
    return url.format({
      protocol: this.micProtocol,
      host: this.micHost
    });
  }


  /**
   * Live Service host name used for streaming data.
   */
  get liveServiceHostname() {
    return url.format({
      protocol: this.liveServiceProtocol,
      host: this.liveServiceHost
    });
  }

  /**
   * The version of your app. It will sent with Kinvey API requests
   * using the X-Kinvey-Api-Version header.
   */
  get appVersion() {
    return this._appVersion;
  }

  /**
   * Set the version of your app. It will sent with Kinvey API requests
   * using the X-Kinvey-Api-Version header.
   *
   * @param  {String} appVersion  App version.
   */
  set appVersion(appVersion) {
    if (appVersion && !isString(appVersion)) {
      appVersion = String(appVersion);
    }

    this._appVersion = appVersion;
  }

  /**
   * Get the cache rack used by the client.
   */
  get cacheRack() {
    return this._cacheRack;
  }

  /**
   * Set the cache rack used by the client.
   *
   * @param  {Rack} rack  Cache rack.
   */
  set cacheRack(rack) {
    if (rack && !(rack instanceof Rack)) {
      throw new KinveyError('rack must be an instance of the Rack class.');
    }

    this._cacheRack = rack;
  }

  /**
   * Get the network rack used by the client.
   */
  get networkRack() {
    return this._networkRack;
  }

  /**
   * Set the network rack used by the client.
   *
   * @param  {Rack} rack  Network rack.
   */
  set networkRack(rack) {
    if (rack && !(rack instanceof Rack)) {
      throw new KinveyError('rack must be an instance of the Rack class.');
    }

    this._networkRack = rack;
  }

  /**
   * Returns an object containing all the information for this Client.
   *
   * @return {Object} Object
   */
  toPlainObject() {
    return {
      apiHostname: this.apiHostname,
      apiProtocol: this.apiProtocol,
      apiHost: this.apiHost,
      micHostname: this.micHostname,
      micProtocol: this.micProtocol,
      micHost: this.micHost,
      liveServiceHostname: this.liveServiceHostname,
      liveServiceHost: this.liveServiceHost,
      liveServiceProtocol: this.liveServiceProtocol,
      appKey: this.appKey,
      appSecret: this.appSecret,
      masterSecret: this.masterSecret,
      encryptionKey: this.encryptionKey,
      appVersion: this.appVersion
    };
  }

  /**
   * Initializes the Client class by creating a new instance of the
   * Client class and storing it as a shared instance.
   *
   * @param {Object}    options                                            Options
   * @param {string}    [options.apiHostname='https://baas.kinvey.com']    Host name used for Kinvey API requests
   * @param {string}    [options.micHostname='https://auth.kinvey.com']    Host name used for Kinvey MIC requests
   * @param {string}    [options.appKey]                                   App Key
   * @param {string}    [options.appSecret]                                App Secret
   * @param {string}    [options.masterSecret]                             App Master Secret
   * @param {string}    [options.encryptionKey]                            App Encryption Key
   * @param {string}    [options.appVersion]                               App Version
   * @return {Client}                                                      An instance of Client.
   *
   * @example
   * var client = Kinvey.Client.init({
   *   appKey: '<appKey>',
   *   appSecret: '<appSecret>'
   * });
   * Kinvey.Client.sharedInstance() === client; // true
   */
  static init(options) {
    const client = new Client(options);
    sharedInstance = client;
    return client;
  }

  /**
   * Returns the shared instance of the Client class used by the SDK.
   *
   * @throws {KinveyError} If a shared instance does not exist.
   *
   * @return {Client} The shared instance.
   *
   * @example
   * var client = Kinvey.Client.sharedInstance();
   */
  static sharedInstance() {
    if (!sharedInstance) {
      throw new KinveyError('You have not initialized the library. ' +
        'Please call Kinvey.init() to initialize the library.');
    }

    return sharedInstance;
  }
}
