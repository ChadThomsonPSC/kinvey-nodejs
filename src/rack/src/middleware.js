import AsciiTree from './asciitree';
import Promise from 'es6-promise';

export default class Middleware {
  constructor(name = 'Middleware') {
    this.name = name;
  }

  handle() {
    return Promise.reject(new Error('A subclass middleware must override the handle function.'));
  }

  generateTree(level = 0) {
    const root = {
      value: this.name,
      level: level,
      nodes: []
    };
    return root;
  }

  toString() {
    const root = this.generateTree();
    return AsciiTree.generate(root);
  }
}
