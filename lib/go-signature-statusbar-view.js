'use babel'

import path from 'path'
import debounce from 'lodash.debounce'

class GoSignatureStatusbarView {
  constructor (goconfig) {
    // Create root element
    this.element = document.createElement('div')
    this.element.classList.add('go-signature-statusbar')
    this.element.classList.add('inline-block')
    this.goconfig = goconfig
    this.formatString = atom.config.get('go-signature-statusbar.format')
    if (!this.formatString) {
      this.formatString = '%F%A %R'
    }
    this.debouncedDisplaySignature = debounce(this.displaySignature, 300)
  }

  activate () {
    this.textContent('')
    let editor = this.getActiveTextEditor()
    if (editor) {
      if (editor.getGrammar().name !== 'Go') {
        return
      }
      this.debouncedDisplaySignature(editor.getLastCursor())
    }

    this.subscribeToActiveTextEditor()
    this.subscribeToConfig()
  }

  destroy () {
    if (this.configFormatSubscription) {
      this.configFormatSubscription.dispose()
    }

    if (this.cursorSubscription) {
      this.cursorSubscription.dispose()
    }
    if (this.debouncedDisplaySignature) {
      this.debouncedDisplaySignature.cancel()
    }
    this.element.remove()
  }

  displaySignature (cursor) {
    let editor = this.getActiveTextEditor()
    if (!editor) {
      return
    }
    if (cursor !== editor.getLastCursor()) {
      return
    }
    let line = cursor.getCurrentBufferLine()
    if (!line) {
      return
    }
    let func = this.extractFunc(line, cursor.getBufferPosition().column)

    if (func === '') {
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
        if (r.stderr && r.stderr.trim() !== '') {
          console.log('autocomplete-go: (stderr) ' + r.stderr)
        }

        if (r.stdout && r.stdout.trim() !== '') {
          let j = JSON.parse(r.stdout)
          if (j.length && j[1][0].class === 'func') {
            let tokens = j[1][0].type.substring(4).split(') ')
            let args = tokens[1] ? tokens[0] + ')' : tokens[0]
            let ret = tokens[1] ? tokens[1] : ''
            let tc = this.formatString.replace('%F', j[1][0].name)
              .replace('%A', args)
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

  extractFunc (line, cursorPos) {
    let funcs = []

    let matches = line.match(/([\w\\.]+\()/g)

    if (matches === null || matches.length === 0) {
      return ''
    }

    for (let func of matches.reverse()) {
      if (line.indexOf('func ' + func) === -1) {
        let start = line.indexOf(func)
        if (func[0] === '.') {
          start += 1
        }

        funcs.push({name: func.slice(0, -1), start: start})
      }
    }

    if (funcs.length === 0) {
      return ''
    }

    if (line.endsWith(funcs[0].name + '(')) {
      return funcs[0].name
    }

    for (let index in funcs) {
      let f = funcs[index]
      // '+ 1' to account for the trailing '('
      let startSearchAt = f.start + f.name.length + 1

      let wrappedFuncs = 0
      for (let i = startSearchAt; i < line.length; i++) {
        if (line[i] === '(') {
          wrappedFuncs += 1
        }
        if (line[i] === ')') {
          if (wrappedFuncs === 0) {
            funcs[index].end = i + 1
            break
          } else {
            wrappedFuncs -= 1
          }
        }
      }
    }

    for (let f of funcs) {
      if (f.end) {
        if (cursorPos >= f.start && cursorPos <= f.end) {
          return f.name
        }
      } else {
        let bracketStart = f.start + f.name.length
        if (cursorPos >= f.start && cursorPos <= bracketStart) {
          return f.name
        }
      }
    }

    return ''
  }

  getActiveTextEditor () {
    return atom.workspace.getActiveTextEditor()
  }

  getElement () {
    return this.element
  }

  subscribeToActiveTextEditor () {
    if (this.cursorSubscription) {
      this.cursorSubscription.dispose()
    }
    let editor = this.getActiveTextEditor()
    if (editor) {
      this.cursorSubscription = editor.onDidChangeCursorPosition(({cursor}) => {
        this.debouncedDisplaySignature(cursor)
      })
    }
  }

  subscribeToConfig () {
    if (this.configFormatSubscription) {
      this.configFormatSubscription.dispose()
    }
    this.configFormatSubscription = atom.config.observe('go-signature-statusbar.format', (value) => {
      if (value) {
        this.formatString = value
      } else {
        this.formatString = '%F%A %R'
      }
    })
  }

  textContent (content) {
    this.element.textContent = content
  }
}

export {GoSignatureStatusbarView}
