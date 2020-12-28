import {
  Credentials} from "./types.js";
import {
  Disposable,
  TypedEventEmitter,
  AbortError,
  ErrorWithType,
  Listeners
} from "./helpers.js";

export class Auth {
  credentials: Credentials

  constructor(credentials: Credentials) {
    this.credentials = credentials
  }

  getAccessToken() {
    if (!this.credentials || !this.credentials.accessToken) {
      throw new Error("Credential are missed. Please refresh page or report a problem")
    }

    return this.credentials.accessToken
  }

  getRegion() {
    return this.credentials?.accessToken?.split(":")[0]
  }
}

interface RTMEvents {
  open(): void
  close(manual: boolean): void
  error(err: Error): void
  push(data: any): void
}

interface RTMAsyncRequests {
  [requestId: string]: {
    resolve(value: any): void
    reject(err: Error): void
    listeners: Listeners
  }
}

export class RTM extends TypedEventEmitter<RTMEvents> implements Disposable {
  static PING_PONG_INTERVAL = 15 * 1000
  static PONG_WAITING_INTERVAL = 5 * 1000
  static MANUAL_CLOSE = 4000
  static REQUEST_COUNTER = 1

  ws: WebSocket
  pingTimerId?: number
  pongTimerId?: number
  asyncRequests: RTMAsyncRequests

  constructor(url: string) {
    super()
    this.ws = new WebSocket(url)
    this.asyncRequests = {}
    this.ws.addEventListener("open", this.handleOpen)
    this.ws.addEventListener("close", this.handleClose)
    this.ws.addEventListener("error", this.handleError)
    this.ws.addEventListener("message", this.handleMessage)
  }

  dispose() {
    this.ws.removeEventListener("open", this.handleOpen)
    this.ws.removeEventListener("close", this.handleClose)
    this.ws.removeEventListener("error", this.handleError)
    this.ws.removeEventListener("message", this.handleMessage)
  }

  close() {
    this.ws.close(RTM.MANUAL_CLOSE)
  }

  handleOpen = () => {
    this.emit("open")
    this.pong()
  }

  handleClose = (event: CloseEvent) => {
    this.emit("close", event.code === RTM.MANUAL_CLOSE)

    // reject all pending requests
    Object.keys(this.asyncRequests).forEach(requestId => {
      this.rejectAsync(requestId, new Error("Request timeout"))
    })
  }

  handleError = () => {
    this.emit("error", new Error("websocket connection error"))
  }

  handleMessage = (event: MessageEvent) => {
    let data: any

    try {
      data = JSON.parse(event.data)
    }
    catch (err) {
      return this.emit("error", err)
    }

    // just handle pong
    if (data && data.action === "ping") {
      return this.pong()
    }

    if (data && data.type === "response") {
      const requestId = data.request_id

      if (!requestId) {
        return this.emit("error", new Error(`RTM does not support responses with missed request_id: ${event.data}`))
      }

      const asyncRequest = this.asyncRequests[requestId]

      if (!asyncRequest) {
        return this.emit("error", new Error(`Handler for incoming rtm response is missed: ${event.data}`))
      }

      if (Boolean(data.success)) {
        asyncRequest.resolve(data.payload || {})
      }
      else {
        const message = data?.payload?.error?.message || "Failed to parse response"
        const type = data.payload.error.type ?? "response_parse_error"

        asyncRequest.reject(new ErrorWithType(message, type))
      }

      asyncRequest.listeners.unbindAll()
      delete this.asyncRequests[requestId]
    }

    if (data?.type === "push") {
      this.emit("push", data || {})
    }
  }

  perform(action: string, payload?: any) {
    const requestId = `request_${++RTM.REQUEST_COUNTER}`

    return this.ws.send(JSON.stringify({ request_id: requestId, action: action, payload: payload })), requestId
  }

  performAsync<T = any>(action: string, payload?: any, abort?: AbortSignal): Promise<T> {
    return new Promise((resolve, reject) => {

      // request was already aborted
      if (abort?.aborted === true) {
        return reject(new AbortError("Request has aborted"))
      }

      // send the request to server
      const requestId = this.perform(action, payload)
      const listeners = new Listeners()

      // listen for abort signal
      if (abort) {
        const handleAbort = () => {
          this.rejectAsync(requestId, new AbortError("Request has aborted"))
        }

        abort.addEventListener("abort", handleAbort)

        listeners.register({
          unbind: () => abort.removeEventListener("abort", handleAbort)
        })
      }

      this.asyncRequests[requestId] = {
        resolve: resolve,
        reject: reject,
        listeners: listeners,
      }
    })
  }

  rejectAsync(requestId: string, err?: Error) {
    const asyncRequest = this.asyncRequests[requestId]

    if (!asyncRequest) {
      return
    }

    asyncRequest.reject(err ?? new Error("Request was rejected"))
    asyncRequest.listeners.unbindAll()
    delete this.asyncRequests[requestId]
  }

  ping() {
    this.perform("ping")

    clearTimeout(this.pingTimerId)
    clearTimeout(this.pongTimerId)

    // schedule next reconnect
    this.pongTimerId = setTimeout(() => this.ws.close, RTM.PONG_WAITING_INTERVAL)
  }

  pong() {
    clearTimeout(this.pingTimerId)
    clearTimeout(this.pongTimerId)
    this.pingTimerId = setTimeout(() => this.ping(), RTM.PING_PONG_INTERVAL);
  }
}
