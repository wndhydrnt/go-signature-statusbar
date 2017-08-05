'use babel'
/* eslint-env jasmine */

// Use the command `window:run-package-specs` (cmd-alt-ctrl-p) to run specs.
//
// To run a specific `it` or `describe` block add an `f` to the front (e.g. `fit`
// or `fdescribe`). Remove the `f` to unfocus the block.

describe('GoSignatureStatusbar', () => {
  let goSignatureStatusbarMain
  let workspaceElement
  let goPlusPromise
  let activationPromise

  beforeEach(() => {
    runs(() => {
      atom.packages.triggerActivationHook('language-go:grammar-used')
      atom.packages.triggerActivationHook('core:loaded-shell-environment')
      workspaceElement = atom.views.getView(atom.workspace)
      jasmine.attachToDOM(workspaceElement)
      // make _.debounce work in atom < 1.19
      if (!window.Date.now.isSpy) {
        spyOn(window.Date, 'now').andCallFake(() => window.now)
      }
    })

    waitsForPromise(() => {
      return atom.packages.activatePackage('language-go')
    })

    waitsForPromise(() => {
      return atom.packages.activatePackage('status-bar')
    })

    runs(() => {
      goPlusPromise = atom.packages.activatePackage('go-plus')
      const pack = atom.packages.loadPackage('go-plus')
      atom.packages.triggerActivationHook('core:loaded-shell-environment')
      pack.activateNow()
    })

    waitsForPromise(() => {
      return goPlusPromise
    })

    runs(() => {
      activationPromise = atom.packages.activatePackage('go-signature-statusbar')
      const pack = atom.packages.loadPackage('go-signature-statusbar')
      atom.packages.triggerActivationHook('core:loaded-shell-environment')
      pack.activateNow()
    })

    waitsForPromise(() => {
      return activationPromise.then((pack) => {
        goSignatureStatusbarMain = pack.mainModule
      })
    })

    waitsFor(() => {
      return goSignatureStatusbarMain.initDone
    })

    runs(() => {
      spyOn(goSignatureStatusbarMain.goSignatureStatusbarView, 'textContent').andCallThrough()
      goSignatureStatusbarMain.addStatusBarTile()
    })
  })

  describe('when the package is activated', () => {
    it('creates a new status bar tile', () => {
      expect(workspaceElement.querySelectorAll('div.go-signature-statusbar').length).toBe(1)
      expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe('')
    })
  })

  describe('when navigating to a function call in a Go file', () => {
    let [editor, goSignatureStatusbarView] = []
    beforeEach(() => {
      waitsForPromise(() =>
        atom.workspace.open('main.go').then((e) => {
          editor = e
        })
      )

      goSignatureStatusbarView = goSignatureStatusbarMain.goSignatureStatusbarView
    })

    it('displays the signature of a function in the status bar', () => {
      runs(() => {
        editor.setCursorScreenPosition([9, 9])
        advanceClock(301)
      })

      waitsFor(() =>
        // First call issued on activating the package, second call issued when
        // opening the file, third call issued when navigating to the position
        goSignatureStatusbarView.textContent.calls.length === 2
      )
      runs(() => expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe('Println(a ...interface{}) (n int, err error)'))
    })

    it('displays the signature of a function wrapped by another function in the status bar', () => {
      runs(() => {
        editor.setCursorScreenPosition([9, 23])
        advanceClock(301)
      })

      waitsFor(() => goSignatureStatusbarView.textContent.calls.length === 2)
      runs(() => expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe('Sprintf(format string, a ...interface{}) string'))
    })

    describe('and the cursor is placed behind the closing bracket of a function', () =>
      it('displays the signature in the status bar', () => {
        runs(() => {
          editor.setCursorScreenPosition([9, 34])
          advanceClock(301)
        })
        waitsFor(() => goSignatureStatusbarView.textContent.calls.length === 2)
        runs(() => expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe('Sprintf(format string, a ...interface{}) string'))
        runs(() => {
          editor.setCursorScreenPosition([9, 35])
          advanceClock(301)
        })
        waitsFor(() => goSignatureStatusbarView.textContent.calls.length === 3)
        runs(() => expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe('Println(a ...interface{}) (n int, err error)'))
      })
    )

    describe('and the cursor is placed on a function that contains line-breaks', () =>
      it('displays the signature in the status bar', () => {
        runs(() => {
          editor.setCursorScreenPosition([11, 12])
          advanceClock(301)
        })
        waitsFor(() => goSignatureStatusbarView.textContent.calls.length === 2)
        runs(() => expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe('Print(a ...interface{}) (n int, err error)'))
      })
    )

    describe('and the cursor is moved from above a call to a function to somewhere else', () =>
      it('clears the signature in the status bar', () => {
        runs(() => {
          editor.setCursorScreenPosition([9, 10])
          advanceClock(301)
        })
        waitsFor(() => goSignatureStatusbarView.textContent.calls.length === 2)
        runs(() => expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe('Println(a ...interface{}) (n int, err error)'))
        runs(() => {
          editor.setCursorScreenPosition([4, 7])
          advanceClock(301)
        })
        waitsFor(() => goSignatureStatusbarView.textContent.calls.length === 3)
        runs(() => expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe(''))
      })
    )

    describe('and the format is changed', () =>
      it('formats the output', () => {
        runs(() => {
          atom.config.set('go-signature-statusbar.format', '%R %F%A')
          editor.setCursorScreenPosition([9, 10])
          advanceClock(301)
        })
        waitsFor(() => goSignatureStatusbarView.textContent.calls.length === 2)
        runs(() => expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe('(n int, err error) Println(a ...interface{})'))
      })
    )

    describe('and the function has no return value', () =>
      it('formats the output', () => {
        runs(() => {
          editor.setCursorScreenPosition([15, 9])
          advanceClock(301)
        })
        waitsFor(() => goSignatureStatusbarView.textContent.calls.length === 2)
        runs(() => expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe('Print(v ...interface{})'))
      })
    )
  })

  describe('https://github.com/wndhydrnt/go-signature-statusbar/issues/1', () => {
    let [editor, goSignatureStatusbarView] = []
    beforeEach(() => {
      waitsForPromise(() =>
        atom.workspace.open('issue-1.go').then((e) => {
          editor = e
        })
      )

      goSignatureStatusbarView = goSignatureStatusbarMain.goSignatureStatusbarView
    })

    describe('when the function spans multiple lines and "(" is not the last character of the first line', () =>
      it('displays the signature of a function in the status bar', () => {
        runs(() => {
          editor.setCursorScreenPosition([11, 9])
          advanceClock(301)
        })
        waitsFor(() => goSignatureStatusbarView.textContent.calls.length === 2)
        runs(() => expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe('Println(a ...interface{}) (n int, err error)'))
      })
    )
  })

  describe('https://github.com/wndhydrnt/go-signature-statusbar/issues/2', () => {
    let [editor, goSignatureStatusbarView] = []

    beforeEach(() => {
      waitsForPromise(() =>
        atom.workspace.open('issue-2.go').then((e) => {
          editor = e
        })
      )

      goSignatureStatusbarView = goSignatureStatusbarMain.goSignatureStatusbarView
    })

    describe('when function calls are chained together on the same line', () => {
      it('displays the signature of the first function in the chain', () => {
        runs(() => {
          editor.setCursorScreenPosition([12, 12])
          advanceClock(301)
        })
        waitsFor(() => goSignatureStatusbarView.textContent.calls.length === 2)
        runs(() => expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe('NewDecoder(r io.Reader) *json.Decoder'))
      })

      it('displays the signature of a function passed as an argument to the first function in the chain', () => {
        runs(() => {
          editor.setCursorScreenPosition([12, 30])
          advanceClock(301)
        })
        waitsFor(() => goSignatureStatusbarView.textContent.calls.length === 2)
        runs(() => expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe('NewReader(s string) *strings.Reader'))
      })

      it('displays the signature of the second function in the chain', () => {
        runs(() => {
          editor.setCursorScreenPosition([12, 63])
          advanceClock(301)
        })
        waitsFor(() => goSignatureStatusbarView.textContent.calls.length === 2)
        runs(() => expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe('Decode(v interface{}) error'))
      })

      it('ignores the "." of a chained call', () => {
        runs(() => {
          editor.setCursorScreenPosition([12, 57])
          advanceClock(301)
        })
        waitsFor(() => goSignatureStatusbarView.textContent.calls.length === 2)
        runs(() => expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe('NewDecoder(r io.Reader) *json.Decoder'))
      })
    })
  })

  describe('https://github.com/wndhydrnt/go-signature-statusbar/issues/5', () => {
    let [editor, goSignatureStatusbarView] = []

    beforeEach(() => {
      waitsForPromise(() =>
        atom.workspace.open('issue-5.go').then((e) => {
          editor = e
        })
      )

      goSignatureStatusbarView = goSignatureStatusbarMain.goSignatureStatusbarView
    })

    describe('when the function does not return anything', () =>
      it('does not add extra closing bracket to the end of the function', () => {
        runs(() => {
          editor.setCursorScreenPosition([5, 9])
          advanceClock(301)
        })
        waitsFor(() => goSignatureStatusbarView.textContent.calls.length === 2)
        runs(() => {
          expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).not.toBe('Print(v ...interface{}))')
          expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe('Print(v ...interface{})')
        })
      })
    )
  })

  describe('https://github.com/wndhydrnt/go-signature-statusbar/pull/20', () => {
    let [editor, goSignatureStatusbarView] = []

    beforeEach(() => {
      waitsForPromise(() =>
        atom.workspace.open('issue-20.go').then((e) => {
          editor = e
        })
      )

      goSignatureStatusbarView = goSignatureStatusbarMain.goSignatureStatusbarView
    })

    describe('when the cursor is above a comment', () =>
      it('displays nothing in the status bar', () => {
        runs(() => {
          editor.setCursorScreenPosition([3, 10])
          advanceClock(301)
        })
        waitsFor(() => goSignatureStatusbarView.textContent.calls.length === 2)
        runs(() => {
          expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe('')
        })
      })
    )
  })
})
