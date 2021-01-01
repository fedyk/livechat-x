import { Credentials } from "./types"
import { __DEV__, getAccountsUrl } from "./config.js"
import { Auth, ChatRouter, Storage, WebAPI } from "./services.js"
import { $API, API } from "./api.js"
import { $Store, Store } from "./store.js"
import { $CharRouteManager, CharRouteManager } from "./chat-route-manager.js"
import { parseQueryParams } from "./parsers.js"
import { parseAccountsCredentials } from "./parsers.js"
import { ErrorWithType } from "./helpers.js"
import { GridView } from "./views.js"
import * as demo from "./demo.js"

export function bootstrap() {
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

  const store = new Store(demo.initialState)
  $Store.setInstance(store)

  const storedMyProfile = Storage.getMyProfile()

  if (storedMyProfile) {
    console.warn("todo: uncomment")
    // store.setMyProfile(storedMyProfile)
  }

  // Fake incoming messages
  // demo.fakeIncomingMessages()

  const auth = new Auth(credentials)
  const chatRouter = new ChatRouter()

  const chatRouteManager = new CharRouteManager(store, chatRouter)

  $CharRouteManager.setInstance(chatRouteManager)

  const web= new WebAPI(auth)
  const api = new API(auth, store, chatRouter, chatRouteManager, web)

  $API.setInstance(api)

  const gridView = new GridView()

  document.getElementById("app")?.append(gridView.el)

  api.addListener("loginError", handleLoginError)

  api.connect()

  // debug code
  if (__DEV__) {
    document.addEventListener("dblclick", () => console.log(store.getState()))
  }
}

function handleLoginError(err: Error | ErrorWithType) {
  if (err instanceof ErrorWithType && err.type === "authentication") {
    return window.location.href = getAccountsUrl()
  }

  console.warn(err)
}