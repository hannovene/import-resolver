'use babel';

import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import _ from 'underscore-plus'
import { CompositeDisposable, File } from 'atom';
import { builtinModules } from 'module'

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

  getProjectPath(editor) {
    let ref = atom.project.getDirectories();
    let currentFile = path.dirname(editor.getPath());
    for (i = 0, len = ref.length; i < len; i++) {
      directory = ref[i];
      if (currentFile.indexOf(directory.path) > -1) {
          return directory.path;
      }
    }
    return '';
  },

  getPackageJson(editor) {
    if (editor = atom.workspace.getActiveTextEditor()) {
      let projectPath = this.getProjectPath(editor);
      if (fs.existsSync(projectPath + '/package.json')) {
        if(parsed = JSON.parse(fs.readFileSync(projectPath + '/package.json', 'utf8'))) {
          return parsed;
        }
      }
    }
  },

  getLineText(editor) {
    return editor.lineTextForBufferRow(editor.getLastCursor().getBufferRow());
  },

  isCorrectLine(editor) {
    let line = this.getLineText(editor);
    let head = line.split(" from ");
    return head && head[0] && /^(\s|\/)*import [A-z0-9_]+\s*/.test(head[0]);
  },

  bypass(command) {
    if (editor = atom.workspace.getActiveTextEditor()) {
      atom.commands.dispatch(atom.views.getView(editor), command);
    }
  },

  completeLine() {
    if (editor = atom.workspace.getActiveTextEditor()) {
      if (this.isCorrectLine(editor)) {
        let lineText = this.getLineText(editor);
        let lineTokens = lineText.split(' from ');
        editor.setText(lineTokens[0]);
        let resolved = this.resolve();
        let result = lineTokens[0]+" from '" + resolved + "'";
        console.log(result == lineText);
        if (result == lineText) {
          result = result.replace('.js', '.vue');
        }
        editor.setText(result);
      } else {
        this.bypass('fuzzy-finder:toggle-file-finder');
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
  _resolveInternal(wordUnderCursor) {
    const internals = [ 'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode', 'querystring', 'readline', 'stream', 'string_decoder', 'tls', 'tty', 'url', 'util', 'v8', 'vm',   'zlib' ];
    return internals.indexOf(wordUnderCursor) != -1;
  },
  _resolveModule(wordUnderCursor) {
    const editor = atom.workspace.getActiveTextEditor();
    if (fs.existsSync(this.getProjectPath(editor) + '/node_modules/' + wordUnderCursor)) {
      return wordUnderCursor;
    }
  },
  _resolveAlias(wordUnderCursor) {
    const editor = atom.workspace.getActiveTextEditor();
    const packageJSON = this.getPackageJson(editor);
    const aliases = packageJSON['import-resolver'];
    if (aliases) {
      return aliases[wordUnderCursor];
    }
  },
  resolve(create) {
    let editor, extensions = ['.vue', '.js'], ext;
    let wordUnderCursor, tokens, last, location, dirname, alias;
    if (editor = atom.workspace.getActiveTextEditor()) {
      wordUnderCursor = _.uncamelcase(editor.getWordUnderCursor()).toLowerCase().replace(/\s+/g, '-');
      if (alias = this._resolveAlias(editor.getWordUnderCursor())) {
        return alias;
      } else if (this._resolveInternal(wordUnderCursor) || this._resolveModule(wordUnderCursor)) {
        return wordUnderCursor;
      }
      tokens = wordUnderCursor.split('-');
      last = tokens.pop();
      location = ['..', tokens.join('-'), wordUnderCursor].join('/').replace(/[/]+/g, '/');
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
