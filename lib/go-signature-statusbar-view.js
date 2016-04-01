'use babel'

import {CompositeDisposable} from 'atom'
import path from 'path'

class GoSignatureStatusbarView {
  constructor(goconfig) {
    // Create root element
    this.element = document.createElement('div')
    this.element.classList.add('go-signature-statusbar')
    this.element.classList.add('inline-block')
    this.goconfig = goconfig
    this.formatString = atom.config.get('go-signature-statusbar.format')
    if (!this.formatString) {
      this.formatString = '%F%A %R'
    }
  }

  activate() {
    this.textContent('')
    let editor = this.getActiveTextEditor()
    if (editor) {
      if (editor.getGrammar().name != 'Go') {
        return
      }
      this.displaySignature(editor.getLastCursor())
    }

    this.subscribeToActiveTextEditor()
    this.subscribeToConfig()
  }

  destroy() {
    if (this.configSubscription) {
      this.configSubscription.dispose()
    }

    if (this.cursorSubscription) {
      this.cursorSubscription.dispose()
    }
    this.element.remove()
  }

  displaySignature(cursor) {
    let editor = this.getActiveTextEditor()
    if (cursor != editor.getLastCursor()) {
      return
    }
    let line = cursor.getCurrentBufferLine()
    let func = this.extractFunc(line, cursor.getBufferPosition().column)

    if (func == '') {
      this.textContent('')
      return
    }

    let position = {
      column: line.indexOf(func) + func.length,
      row: cursor.getBufferPosition().row
    }

    let buffer = editor.getBuffer()
    if (!buffer) {
      return
    }

    if (!cursor.getBufferPosition()) {
      return
    }

    let index = buffer.characterIndexForPosition(position)
    let text = editor.getText()

    let offset = Buffer.byteLength(text.substring(0, index), 'utf8')

    let locatorOptions = {
      file: editor.getPath(),
      directory: path.dirname(editor.getPath())
    }

    let args = ['-f=json', 'autocomplete', buffer.getPath(), offset]
    this.goconfig.locator.findTool('gocode', locatorOptions).then((cmd) => {
      if (!cmd) {
        return
      }

      let cwd = path.dirname(buffer.getPath())
      let env = this.goconfig.environment(locatorOptions)
      this.goconfig.executor.exec(cmd, args, {cwd: cwd, env: env, input: text}).then((r) => {
        if (r.stderr && r.stderr.trim() != '') {
          console.log('autocomplete-go: (stderr) ' + r.stderr)
        }

        if (r.stdout && r.stdout.trim() != '') {
          let j = JSON.parse(r.stdout)
          if (j.length) {
            let tokens = j[1][0].type.substring(4).split(') ')
            let ret = tokens[1] ? tokens[1] : '';
            let tc = this.formatString.replace('%F', j[1][0].name)
              .replace('%A', tokens[0] + ')')
              .replace('%R', ret)
            this.textContent(tc.trim())
          } else {
            this.textContent('')
          }
        }
      }).catch((e) => {
        this.textContent('')
        console.log(e)
      })
    })
  }

  extractFunc(line, cursorPos) {
    let funcs = []

    let matches = line.match(/([\w\.]+\()/g)

    if (matches == null || matches.length == 0) {
      return ''
    }

    for (let func of matches.reverse()) {
      if (line.indexOf('func ' + func) == -1) {
        funcs.push({name: func.slice(0, -1), start: line.indexOf(func)})
      }
    }

    if (funcs.length == 0) {
      return ''
    }

    if (line.endsWith(funcs[0].name + '(')) {
      return funcs[0].name
    }

    let pos = 0
    for (let i = 0; i < line.length; i++) {
      if (line[i] == ')' && funcs[pos]) {
        funcs[pos].end = i + 1
        pos += 1
      }
    }

    for (let f of funcs) {
      if (cursorPos >= f.start && cursorPos <= f.end) {
        return f.name
      }
    }

    return ''
  }

  getActiveTextEditor() {
    return atom.workspace.getActiveTextEditor()
  }

  getElement() {
    return this.element
  }

  subscribeToActiveTextEditor() {
    if (this.cursorSubscription) {
      this.cursorSubscription.dispose()
    }
    let editor = this.getActiveTextEditor()
    if (editor) {
      this.cursorSubscription = editor.onDidChangeCursorPosition(({cursor}) => {
        this.displaySignature(cursor)
      })
    }
  }

  subscribeToConfig() {
    if (this.configSubscription) {
      this.configSubscription.dispose()
    }
    this.configSubscription = atom.config.observe('go-signature-statusbar.format', (value) => {
      if (value) {
        this.formatString = value
      } else {
        this.formatString = '%F%A %R'
      }
    })
  }

  textContent(content) {
    this.element.textContent = content
  }
}

export {GoSignatureStatusbarView}
