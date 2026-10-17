const { TestEnvironment } = require('jest-environment-node')
const { JSDOM } = require('jsdom')

// Load jsdom outside Jest's module VM so its ESM dependencies use Node's loader.
module.exports = class DOMEnvironment extends TestEnvironment {
    async setup() {
        await super.setup()
        this.dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' })
        this.global.window = this.dom.window
        this.global.document = this.dom.window.document
        this.global.navigator = this.dom.window.navigator
        for (const name of ['HTMLElement', 'HTMLInputElement', 'Event', 'MouseEvent', 'Node']) {
            this.global[name] = this.dom.window[name]
        }
        this.global.IS_REACT_ACT_ENVIRONMENT = true
    }

    async teardown() {
        this.dom.window.close()
        await super.teardown()
    }
}
