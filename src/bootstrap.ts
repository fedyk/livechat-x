import { Credentials } from "./types"
import { __DEV__, getAccountsUrl } from "./config.js"
import { Auth } from "./services.js"
import { API } from "./api.js"
import { Store } from "./store.js"
import { parseQueryParams } from "./parsers.js"
import { parseAccountsCredentials } from "./parsers.js"
import { ErrorWithType } from "./helpers.js"

export function bootstrap() {
  const locationHash = String(window.location.hash ?? "").replace(/^\#/, "")
  let credentials: Credentials | void = void 0;

  if (locationHash.length > 0) {
    const params = parseQueryParams(locationHash)
    const data = parseAccountsCredentials(params)

    saveCredentialsInStorage(credentials = {
      accessToken: data.accessToken,
      expiredAt: data.expiredAt,
      scopes: data.scopes
    })

    // remove hash params from URL
    history.replaceState("", document.title, window.location.pathname + window.location.search)
  }
  else {
    credentials = loadCredentialsFromStorage()
  }

  if (!credentials) {
    return window.location.href = getAccountsUrl()
  }

  const store = new Store()
  const auth = new Auth(credentials)
  const api = new API(auth, store)

  api.addListener("loginError", handleLoginError)

  api.connect()

  // debug code
  if (__DEV__) {
    document.addEventListener("dblclick", () => console.log(store.getState()))
  }
}

function loadCredentialsFromStorage(): Credentials | void {
  try {
    const data = localStorage.getItem("credentials")

    if (!data) {
      return
    }

    const json = JSON.parse(data)
    const accessToken = String(json.accessToken ?? "")
    const expiredAt = Number(json.expiredAt ?? "")
    const scopes = parseScopes(json.scopes)

    return {
      accessToken,
      expiredAt,
      scopes,
    }
  }
  catch (err) {
    return console.warn(err)
  }

  function parseScopes(scopes: any) {
    if (!Array.isArray(scopes)) {
      return []
    }

    return scopes.map(scope => String(scope))
  }
}

function saveCredentialsInStorage(credentials: Credentials) {
  return localStorage.setItem("credentials", JSON.stringify(credentials))
}


function handleLoginError(err: Error | ErrorWithType) {
  if (err instanceof ErrorWithType && err.type === "authentication") {
    return window.location.href = getAccountsUrl()
  }

  console.warn(err)
}