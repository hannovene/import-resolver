'use babel';

import fs from 'fs'
import mkdirp from 'mkdirp'
import _ from 'underscore-plus'
import { CompositeDisposable, File } from 'atom';
//import ImportResolver from '../import/import-resolver.js'
//import ImportManage from '../import/import-manage.js'
//import ImportManage from '../import/import-manage.js'
//import ImportProps from '../import/import-props.js'
//import ImportEdit
//import ImportList
//import PaperBrandEdit from '../paper-brand/paper-brand-edit.vue'
// sdadsad
//import JobService from '../job/job-service'

export default {

  subscriptions: null,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposabler
    this.subscriptions = new CompositeDisposable();
    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'import-resolver:complete': () => this.completeLine(),
      'import-resolver:open': () => this.open()
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
    console.log(line);
    return line && line.indexOf(" from ") === -1 && /^(\s|\/)*import [A-z]+$/.test(line);
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
    console.log('open');
    if (editor = atom.workspace.getActiveTextEditor()) {
      line = this.getLineText(editor);
      matches = line.match(/'(.*)'/);
      dirname = (new File(editor.getPath())).getParent().getPath() + '/';
      if (path = matches[1]) {
        atom.workspace.open(dirname + path);
      }
    }
    return;
    dirname = 1;
      mkdirp(dirname, () => {
        fs.closeSync(fs.openSync(dirname + location + ext, 'w'));
        editor.insertText(" from '" + location + ext + "'");
        atom.workspace.open(dirname + location + ext);
      });
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
