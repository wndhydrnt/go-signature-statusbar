'use babel'

import {CompositeDisposable} from 'atom'
import {GoSignatureStatusbarView} from './go-signature-statusbar-view'

export default {
  dependenciesInstalled: null,
  goconfig: null,
  goget: null,
  goSignatureStatusbarView: null,
  initDone: null,
  statusBar: null,
  statusBarTile: null,
  statusBarTileTest: null,
  subscriptions: null,
  toolCheckComplete: null,

  activate() {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable()
    require('atom-package-deps').install('go-signature-statusbar').then(() => {
      this.dependenciesInstalled = true
    }).catch((e) => {
      console.log(e)
    })
  },

  addStatusBarTile() {
    if (!this.initDone && this.toolCheckComplete && this.statusBar) {
      this.goSignatureStatusbarView = new GoSignatureStatusbarView(this.goconfig)
      this.subscriptions.add(atom.workspace.onDidChangeActivePaneItem((activeItem) => {
        this.goSignatureStatusbarView.activate()
      }))

      this.goSignatureStatusbarView.activate()
      this.statusBarTile = this.statusBar.addLeftTile({item: this.goSignatureStatusbarView.getElement(), priority: 50})
      this.initDone = true
    }
  },

  checkForGocode() {
    if (!this.toolCheckComplete && this.goconfig && this.goget) {
      this.goconfig.locator.findTool('gocode').then((cmd) => {
        if (cmd) {
          this.toolCheckComplete = true
          this.addStatusBarTile()
        } else {
          this.goget.get({
            name: 'go-signature-statusbar',
            packageName: 'gocode',
            packagePath: 'github.com/nsf/gocode',
            type: 'missing'
          }).then((r) => {
            if (r.success) {
              this.toolCheckComplete = true
              this.addStatusBarTile()
            } else {
              console.log('gocode is not available and could not be installed via "go get -u github.com/nsf/gocode"; please manually install it to enable autocomplete behavior.')
            }
          }).catch((e) => {
            console.log(e)
          })
        }
      })
    }
  },

  consumeGoconfig(service) {
    this.goconfig = service
    this.checkForGocode()
  },

  consumeGoget(service) {
    this.goget = service
    this.checkForGocode()
  },

  consumeStatusBar(statusBar) {
    this.statusBar = statusBar
    this.addStatusBarTile()
  },

  deactivate() {
    this.dependenciesInstalled = null
    this.goconfig = null
    this.goget = null
    this.initDone = null
    this.statusBar = null
    this.subscriptions.dispose()
    this.toolCheckComplete = null

    if (this.goSignatureStatusbarView) {
      this.goSignatureStatusbarView.destroy()
    }

    if (this.statusBarTile) {
      this.statusBarTile.destroy()
    }
  }
}
