import { Credentials } from "./types"
import { __DEV__, getAccountsUrl } from "./config.js"
import { Auth, ChatRouter, Storage } from "./services.js"
import { $API, API } from "./api.js"
import { $Store, State, Store } from "./store.js"
import { $CharRouteManager, CharRouteManager } from "./chat-route-manager.js"
import { parseQueryParams } from "./parsers.js"
import { parseAccountsCredentials } from "./parsers.js"
import { IDisposable, ErrorWithType, Listeners } from "./helpers.js"
import { GridView } from "./views.js"
import { $LazyConnect, LazyConnect } from "./lazy-connect.js"
import * as dom from "./dom.js"

export class App implements IDisposable {
  auth: Auth
  chatRouter: ChatRouter
  chatRouteManager: CharRouteManager
  store: Store
  lazyConnect: LazyConnect
  api: API
  listeners: Listeners

  constructor(initialState: State) {
    $Store.setInstance(
      this.store = new Store(initialState)
    )

    this.auth = new Auth()
    this.chatRouter = new ChatRouter()

    $CharRouteManager.setInstance(
      this.chatRouteManager = new CharRouteManager(this.store, this.chatRouter)
    )

    $API.setInstance(
      this.api = new API(this.auth, this.store, this.chatRouter, this.chatRouteManager)
    )

    $LazyConnect.setInstance(
      this.lazyConnect = new LazyConnect(this.store)
    )

    this.listeners = new Listeners()

    this.listeners.register(this.api.addListener("loginError", err => this.handleLoginError(err)))

    // debug code
    if (__DEV__) {
      this.listeners.register(dom.addListener(document, "dblclick", () => {
        console.log(this.store.getState())
      }))
    }
  }

  dispose() {
    this.api.dispose()
    this.chatRouteManager.dispose()
    this.chatRouter.dispose()
    this.store.dispose()
    this.lazyConnect.dispose()
  }

  bootstrap() {
    const locationHash = String(window.location.hash ?? "").replace(/^\#/, "")
    let credentials: Credentials | void = void 0;

    if (locationHash.length > 0) {
      const params = parseQueryParams(locationHash)
      const data = parseAccountsCredentials(params)

      Storage.setCredentials(credentials = {
        accessToken: data.accessToken,
        expiredAt: data.expiredAt,
        scopes: data.scopes
      })

      // remove hash params from URL
      history.replaceState("", document.title, window.location.pathname + window.location.search)
    }
    else {
      credentials = Storage.getCredentials()
    }

    if (!credentials) {
      return window.location.href = getAccountsUrl()
    }
    else {
      this.auth.setCredentials(credentials)
    }

    const myProfile = Storage.getMyProfile()

    if (myProfile) {
      this.store.setMyProfile(myProfile)
    }

    const gridView = new GridView()
    const container = document.getElementById("app")

    if (!container) {
      throw new Error("`container` is empty")
    }

    container.append(gridView.el)

    this.api.connect()
  }

  protected handleLoginError(err: Error | ErrorWithType) {
    if (err instanceof ErrorWithType && err.type === "authentication") {
      return window.location.href = getAccountsUrl()
    }

    console.error(err)
  }
}
