# Use the command `window:run-package-specs` (cmd-alt-ctrl-p) to run specs.
#
# To run a specific `it` or `describe` block add an `f` to the front (e.g. `fit`
# or `fdescribe`). Remove the `f` to unfocus the block.

describe "GoSignatureStatusbar", ->
  [goSignatureStatusbarMain, workspaceElement] = []

  beforeEach ->
    waitsForPromise ->
      atom.packages.activatePackage('language-go').then (pack) ->
        atom.packages.activatePackage('go-config').then (pack) ->
          atom.packages.activatePackage('go-get').then (pack) ->
            atom.packages.activatePackage('status-bar').then (pack) ->
              atom.packages.activatePackage('go-signature-statusbar').then (pack) ->
                goSignatureStatusbarMain = pack.mainModule

    waitsFor ->
      goSignatureStatusbarMain.initDone

    runs ->
      spyOn(goSignatureStatusbarMain.goSignatureStatusbarView, 'textContent').andCallThrough()

    workspaceElement = atom.views.getView(atom.workspace)

  describe 'when the package is activated', ->
    it 'creates a new status bar tile', ->
      expect(workspaceElement.querySelectorAll('div.go-signature-statusbar').length).toBe 1

    it 'displays no text in the status bar', ->
      expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe ''

  describe 'when navigating to a function call in a Go file', ->
    [editor, goSignatureStatusbarView] = []
    beforeEach ->
      waitsForPromise ->
        atom.workspace.open('main.go').then (e) ->
          editor = e

      goSignatureStatusbarView = goSignatureStatusbarMain.goSignatureStatusbarView

    it 'displays the signature of a function in the status bar', ->
      runs ->
        editor.setCursorScreenPosition([9, 9])
      waitsFor ->
        # First call issued on activating the package, second call issued when
        # opening the file, third call issued when navigating to the position
        goSignatureStatusbarView.textContent.calls.length is 3
      runs ->
        expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe 'Println(a ...interface{}) (n int, err error)'

    it 'displays the signature of a function wrapped by another function in the status bar', ->
      runs ->
        editor.setCursorScreenPosition([9, 23])
      waitsFor ->
        goSignatureStatusbarView.textContent.calls.length is 3
      runs ->
        expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe 'Sprintf(format string, a ...interface{}) string'

    it 'sets the width of the element in the status bar to the default width', ->
      runs ->
        editor.setCursorScreenPosition([9, 23])
      waitsFor ->
        goSignatureStatusbarView.textContent.calls.length is 3
      runs ->
        expect(workspaceElement.querySelector('div.go-signature-statusbar').style.maxWidth).toBe '20vw'

    describe 'and the cursor is placed behind the closing bracket of a function', ->
      it 'displays the signature in the status bar', ->
        runs ->
          editor.setCursorScreenPosition([9, 34])
        waitsFor ->
          goSignatureStatusbarView.textContent.calls.length is 3
        runs ->
          expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe 'Sprintf(format string, a ...interface{}) string'
        runs ->
          editor.setCursorScreenPosition([9, 35])
        waitsFor ->
          goSignatureStatusbarView.textContent.calls.length is 4
        runs ->
          expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe 'Println(a ...interface{}) (n int, err error)'

    describe 'and the cursor is placed on a function that contains line-breaks', ->
      it 'displays the signature in the status bar', ->
        runs ->
          editor.setCursorScreenPosition([11, 12])
        waitsFor ->
          goSignatureStatusbarView.textContent.calls.length is 3
        runs ->
          expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe 'Print(a ...interface{}) (n int, err error)'

    describe 'and the cursor is moved from above a call to a function to somewhere else', ->
      it 'clears the signature in the status bar', ->
        runs ->
          editor.setCursorScreenPosition([9, 10])
        waitsFor ->
          goSignatureStatusbarView.textContent.calls.length is 3
        runs ->
          expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe 'Println(a ...interface{}) (n int, err error)'
        runs ->
          editor.setCursorScreenPosition([4, 7])
        waitsFor ->
          goSignatureStatusbarView.textContent.calls.length is 4
        runs ->
          expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe ''

    describe 'and the format is changed', ->
      it 'formats the output', ->
        runs ->
          atom.config.set('go-signature-statusbar.format', '%R %F%A')
          editor.setCursorScreenPosition([9, 10])
        waitsFor ->
          goSignatureStatusbarView.textContent.calls.length is 3
        runs ->
          expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe '(n int, err error) Println(a ...interface{})'

    describe 'and the function has no return value', ->
      it 'formats the output', ->
        runs ->
          editor.setCursorScreenPosition([15, 9])
        waitsFor ->
          goSignatureStatusbarView.textContent.calls.length is 3
        runs ->
          expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe 'Print(v ...interface{})'

    describe 'and the width of the element in the status bar is changed', ->
      it 'sets the width of the element in the status bar', ->
        runs ->
          atom.config.set('go-signature-statusbar.width', '40vw')
          editor.setCursorScreenPosition([15, 9])
        waitsFor ->
          goSignatureStatusbarView.textContent.calls.length is 3
        runs ->
          expect(workspaceElement.querySelector('div.go-signature-statusbar').style.maxWidth).toBe '40vw'

  describe 'https://github.com/wndhydrnt/go-signature-statusbar/issues/1', ->
    [editor, goSignatureStatusbarView] = []
    beforeEach ->
      waitsForPromise ->
        atom.workspace.open('issue-1.go').then (e) ->
          editor = e

      goSignatureStatusbarView = goSignatureStatusbarMain.goSignatureStatusbarView

    describe 'when the function spans multiple lines and "(" is not the last character of the first line', ->
      it 'displays the signature of a function in the status bar', ->
        runs ->
          editor.setCursorScreenPosition([11, 9])
        waitsFor ->
          goSignatureStatusbarView.textContent.calls.length is 3
        runs ->
          expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe 'Println(a ...interface{}) (n int, err error)'

  describe 'https://github.com/wndhydrnt/go-signature-statusbar/issues/2', ->
    [editor, goSignatureStatusbarView] = []

    beforeEach ->
      waitsForPromise ->
        atom.workspace.open('issue-2.go').then (e) ->
          editor = e

      goSignatureStatusbarView = goSignatureStatusbarMain.goSignatureStatusbarView

    describe 'when function calls are chained together on the same line', ->
      it 'displays the signature of the first function in the chain', ->
        runs ->
          editor.setCursorScreenPosition([12, 12])
        waitsFor ->
          goSignatureStatusbarView.textContent.calls.length is 3
        runs ->
          expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe 'NewDecoder(r io.Reader) *json.Decoder'

      it 'displays the signature of a function passed as an argument to the first function in the chain', ->
        runs ->
          editor.setCursorScreenPosition([12, 30])
        waitsFor ->
          goSignatureStatusbarView.textContent.calls.length is 3
        runs ->
          expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe 'NewReader(s string) *strings.Reader'

      it 'displays the signature of the second function in the chain', ->
        runs ->
          editor.setCursorScreenPosition([12, 63])
        waitsFor ->
          goSignatureStatusbarView.textContent.calls.length is 3
        runs ->
          expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe 'Decode(v interface{}) error'

      it 'ignores the "." of a chained call', ->
        runs ->
          editor.setCursorScreenPosition([12, 57])
        waitsFor ->
          goSignatureStatusbarView.textContent.calls.length is 3
        runs ->
          expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe 'NewDecoder(r io.Reader) *json.Decoder'

  describe 'https://github.com/wndhydrnt/go-signature-statusbar/issues/5', ->
    [editor, goSignatureStatusbarView] = []

    beforeEach ->
      waitsForPromise ->
        atom.workspace.open('issue-5.go').then (e) ->
          editor = e

      goSignatureStatusbarView = goSignatureStatusbarMain.goSignatureStatusbarView

    describe 'when the function does not return anything', ->
      it 'does not add extra closing bracket to the end of the function', ->
        runs ->
          editor.setCursorScreenPosition([5, 9])
        waitsFor ->
          goSignatureStatusbarView.textContent.calls.length is 3
        runs ->
          expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).not.toBe 'Print(v ...interface{}))'
          expect(workspaceElement.querySelector('div.go-signature-statusbar').textContent).toBe 'Print(v ...interface{})'
