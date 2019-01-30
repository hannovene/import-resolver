'use babel';

import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import _ from 'underscore-plus'
import { CompositeDisposable, File } from 'atom';
import { builtinModules } from 'module'

export default {

  subscriptions: null,

  lastResolvedVariable: null,

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
    return {};
  },

  getEditor() {
    return atom.workspace.getActiveTextEditor();
  },

  getProjectPath() {
    let ref = atom.project.getDirectories();
    let currentFile = path.dirname(this.getEditor().getPath());
    for (i = 0, len = ref.length; i < len; i++) {
      directory = ref[i];
      if (currentFile.indexOf(directory.path) > -1) {
          return directory.path;
      }
    }
    return '';
  },

  getPackageJson() {
    if (this.getEditor()) {
      let projectPath = this.getProjectPath();
      if (fs.existsSync(projectPath + '/package.json')) {
        if(parsed = JSON.parse(fs.readFileSync(projectPath + '/package.json', 'utf8'))) {
          return parsed;
        }
      }
    }
  },

  getLineText() {
    let editor = this.getEditor();
    return editor.lineTextForBufferRow(editor.getLastCursor().getBufferRow());
  },

  isCorrectLine() {
    let line = this.getLineText();
    let head = line.split(" from ");
    return head && head[0] && /^(\s|\/)*import [A-z0-9_]+\s*/.test(head[0]);
  },

  bypass(command) {
    if (editor = atom.workspace.getActiveTextEditor()) {
      atom.commands.dispatch(atom.views.getView(editor), command);
    }
  },

  completeLine() {
    let editor;
    if (editor = this.getEditor()) {
      if (this.isCorrectLine()) {
        let lineText = this.getLineText();
        let lineTokens = lineText.split(' from ');
        let importTokens = lineTokens[0].match(/import ([A-z0-9_]+).*/)

        let resolved = this.resolve(importTokens[1]);
        let result = lineTokens[0]+" from '" + resolved + "'";

        if (result == lineText) {
          result = result.replace('.js', '.vue');
        }

        editor.deleteToBeginningOfLine();
        if (!editor.getLastCursor().isAtEndOfLine()) {
          editor.deleteToEndOfLine();
        }
        this.lastResolvedVariable = importTokens[1];
        editor.insertText(result);
      } else {
        this.bypass('fuzzy-finder:toggle-file-finder');
      }
    }
  },

  open() {
    let editor, line, matches, path, dirname;
    if (editor = atom.workspace.getActiveTextEditor()) {
      line = this.getLineText(editor);
      matches = line.match(/from '(.*)'/);
      if (matches && (path = matches[1])) {
        dirname = (new File(editor.getPath())).getParent().getPath() + '/';
        atom.workspace.open(dirname + path);
      } else if (this.lastResolvedVariable) {
        editor.insertText(this.lastResolvedVariable);
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
  resolve(word) {
    let editor, extensions = ['.vue', '.js'], ext;
    let wordUnderCursor, tokens, last, location, dirname, alias;
    if (editor = atom.workspace.getActiveTextEditor()) {
      wordUnderCursor = _.uncamelcase(word).toLowerCase().replace(/\s+/g, '-');
      if (alias = this._resolveAlias(word)) {
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
