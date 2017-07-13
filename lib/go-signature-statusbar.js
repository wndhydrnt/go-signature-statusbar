'use babel'

import {CompositeDisposable} from 'atom'
import {GoSignatureStatusbarView} from './go-signature-statusbar-view'

export default {
  dependenciesInstalled: null,
  goconfig: null,
  goSignatureStatusbarView: null,
  initDone: null,
  statusBar: null,
  statusBarTile: null,
  statusBarTileTest: null,
  subscriptions: null,

  activate () {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable()
    require('atom-package-deps').install('go-signature-statusbar').then(() => {
      this.dependenciesInstalled = true
    }).catch((e) => {
      console.log(e)
    })
  },

  addStatusBarTile () {
    if (!this.initDone && this.statusBar && this.goconfig) {
      this.goSignatureStatusbarView = new GoSignatureStatusbarView(this.goconfig)
      this.subscriptions.add(atom.workspace.onDidChangeActivePaneItem((activeItem) => {
        this.goSignatureStatusbarView.activate()
      }))

      this.goSignatureStatusbarView.activate()
      this.statusBarTile = this.statusBar.addLeftTile({item: this.goSignatureStatusbarView.getElement(), priority: 50})
      this.initDone = true
    }
  },

  consumeGoconfig (service) {
    this.goconfig = service
    this.addStatusBarTile()
  },

  consumeStatusBar (statusBar) {
    this.statusBar = statusBar
    this.addStatusBarTile()
  },

  deactivate () {
    this.dependenciesInstalled = null
    this.goconfig = null
    this.initDone = null
    this.statusBar = null
    this.subscriptions.dispose()

    if (this.goSignatureStatusbarView) {
      this.goSignatureStatusbarView.destroy()
    }

    if (this.statusBarTile) {
      this.statusBarTile.destroy()
    }
  }
}
