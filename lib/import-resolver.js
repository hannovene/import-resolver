'use babel';

import fs from 'fs'
import mkdirp from 'mkdirp'
import _ from 'underscore-plus'
import { CompositeDisposable, File } from 'atom';

export default {

  subscriptions: null,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposabler
    this.subscriptions = new CompositeDisposable();
    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'import-resolver:open': () => this.open(),
      'import-resolver:complete': () => this.completeLine(),
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  serialize() {
    return {

    };
  },

  getLineText(editor) {
    return editor.lineTextForBufferRow(editor.getLastCursor().getBufferRow());
  },

  isCorrectLine(editor) {
    let line = this.getLineText(editor);
    return line && line.indexOf(" from ") === -1 && /^(\s|\/)*import [A-z]+\s*$/.test(line);
  },

  bypass(command) {
    if (editor = atom.workspace.getActiveTextEditor()) {
      atom.commands.dispatch(atom.views.getView(editor), command);
    }
  },

  completeLine() {
    if (editor = atom.workspace.getActiveTextEditor()) {
      if (this.isCorrectLine(editor)) {
        let resolved = this.resolve();
        editor.insertText(" from '" + resolved + "'");
      } else {
        this.bypass('editor:indent');
      }
    }
  },

  open() {
    let editor, line, matches, path, dirname;
    if (editor = atom.workspace.getActiveTextEditor()) {
      line = this.getLineText(editor);
      matches = line.match(/'(.*)'/);
      dirname = (new File(editor.getPath())).getParent().getPath() + '/';
      if (matches && (path = matches[1])) {
        atom.workspace.open(dirname + path);
      }
    }
  },

  resolve(create) {
    let editor, extensions = ['.vue', '.js'], ext;
    let wordUnderCursor, tokens, last, location, dirname
    if (editor = atom.workspace.getActiveTextEditor()) {
      wordUnderCursor = _.uncamelcase(editor.getWordUnderCursor()).toLowerCase().replace(/\s+/g, '-');
      tokens = wordUnderCursor.split('-');
      last = tokens.pop();
      location = ['..', tokens.join('-'), wordUnderCursor].join('/');

      dirname = (new File(editor.getPath())).getParent().getPath() + '/';
      for (ext of extensions) {
        if (fs.existsSync(dirname + location + ext)) {
            location += ext;
            return location;
        }
      }
      return location + ext;
    }
  }

};
