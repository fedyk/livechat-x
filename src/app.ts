namespace app {
  import Credentials = app.types.Credentials
  import __DEV__ = app.config.__DEV__
  import getAccountsUrl = app.config.getAccountsUrl
  import Auth = app.services.Auth
  import ChatRouter = app.services.ChatRouter
  import Storage = app.services.Storage
  import $API = app.services.$API
  import $CharRouteManager = app.services.$CharRouteManager
  import CharRouteManager = app.services.CharRouteManager
  import API = app.services.API
  import $Store = app.store.$Store
  import State = app.store.State
  import Store = app.store.Store
  import parseQueryParams = app.parsers.parseQueryParams
  import parseAccountsCredentials = app.parsers.parseAccountsCredentials
  import IDisposable = app.helpers.IDisposable
  import ErrorWithType = app.helpers.ErrorWithType
  import Listeners = app.helpers.Listeners
  import GridView = app.views.GridView
  import $LazyConnect = app.services.$LazyConnect
  import LazyConnect = app.services.LazyConnect
  import dom = app.dom

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
}
