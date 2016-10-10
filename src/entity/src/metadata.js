import { KinveyError } from '../../errors';
import clone from 'lodash/clone';
import isPlainObject from 'lodash/isPlainObject';
const kmdAttribute = process.env.KINVEY_KMD_ATTRIBUTE || '_kmd';

/**
 * The Metadata class is used to as a wrapper for accessing the `_kmd` properties of an entity.
 */
export default class Metadata {
  constructor(entity = {}) {
    if (!isPlainObject(entity)) {
      throw new KinveyError('entity argument must be an object');
    }

    /**
     * The kmd properties.
     *
     * @private
     * @type {Object}
     */
    this.kmd = clone(entity[kmdAttribute] || {});
  }

  get createdAt() {
    if (this.kmd.ect) {
      return Date.parse(this.kmd.ect);
    }

    return undefined;
  }

  get ect() {
    return this.createdAt;
  }

  get emailVerification() {
    return this.kmd.emailVerification.status;
  }

  get lastModified() {
    if (this.kmd.lmt) {
      return Date.parse(this.kmd.lmt);
    }

    return undefined;
  }

  get lmt() {
    return this.lastModified;
  }

  get authtoken() {
    return this.kmd.authtoken;
  }

  set authtoken(authtoken) {
    this.kmd.authtoken = authtoken;
  }

  isLocal() {
    return !!this.kmd.local;
  }

  toPlainObject() {
    return this.kmd;
  }

  toJSON() {
    return this.toPlainObject();
  }
}
