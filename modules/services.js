"use strict";
var app;
(function (app) {
    var services;
    (function (services) {
        var TypedEventEmitter = app.helpers.TypedEventEmitter;
        var AbortError = app.helpers.AbortError;
        var ErrorWithType = app.helpers.ErrorWithType;
        var Listeners = app.helpers.Listeners;
        var parseScopes = app.parsers.parseScopes;
        /**
         * Auth and related staff
         */
        class Auth {
            constructor(credentials) {
                this.credentials = credentials;
            }
            setCredentials(credentials) {
                this.credentials = credentials;
            }
            getAccessToken() {
                if (!this.credentials || !this.credentials.accessToken) {
                    throw new Error("Credential are missed. Please refresh page or report a problem");
                }
                return this.credentials.accessToken;
            }
            getRegion() {
                return this.credentials?.accessToken?.split(":")[0] ?? "dal";
            }
        }
        services.Auth = Auth;
        class RTM extends TypedEventEmitter {
            constructor(url) {
                super();
                this.handleOpen = () => {
                    this.emit("open");
                    this.pong();
                };
                this.handleClose = (event) => {
                    this.emit("close", event.code === RTM.MANUAL_CLOSE);
                    // reject all pending requests
                    Object.keys(this.asyncRequests).forEach(requestId => {
                        this.rejectAsync(requestId, new Error("Request timeout"));
                    });
                };
                this.handleError = () => {
                    this.emit("error", new Error("websocket connection error"));
                };
                this.handleMessage = (event) => {
                    let data;
                    try {
                        data = JSON.parse(event.data);
                    }
                    catch (err) {
                        return this.emit("error", err);
                    }
                    // just handle pong
                    if (data && data.action === "ping") {
                        return this.pong();
                    }
                    if (data && data.type === "response") {
                        const requestId = data.request_id;
                        if (!requestId) {
                            return this.emit("error", new Error(`RTM does not support responses with missed request_id: ${event.data}`));
                        }
                        const asyncRequest = this.asyncRequests[requestId];
                        if (!asyncRequest) {
                            return this.emit("error", new Error(`Handler for incoming rtm response is missed: ${event.data}`));
                        }
                        if (Boolean(data.success)) {
                            asyncRequest.resolve(data.payload || {});
                        }
                        else {
                            const message = data?.payload?.error?.message || "Failed to parse response";
                            const type = data.payload.error.type ?? "response_parse_error";
                            asyncRequest.reject(new ErrorWithType(message, type));
                        }
                        asyncRequest.listeners.unbindAll();
                        delete this.asyncRequests[requestId];
                    }
                    if (data?.type === "push") {
                        this.emit("push", data || {});
                    }
                };
                this.ws = new WebSocket(url);
                this.asyncRequests = {};
                this.ws.addEventListener("open", this.handleOpen);
                this.ws.addEventListener("close", this.handleClose);
                this.ws.addEventListener("error", this.handleError);
                this.ws.addEventListener("message", this.handleMessage);
            }
            dispose() {
                this.ws.removeEventListener("open", this.handleOpen);
                this.ws.removeEventListener("close", this.handleClose);
                this.ws.removeEventListener("error", this.handleError);
                this.ws.removeEventListener("message", this.handleMessage);
            }
            close() {
                this.ws.close(RTM.MANUAL_CLOSE);
            }
            perform(action, payload) {
                const requestId = `request_${++RTM.REQUEST_COUNTER}`;
                return this.ws.send(JSON.stringify({ request_id: requestId, action: action, payload: payload })), requestId;
            }
            performAsync(action, payload, abort) {
                return new Promise((resolve, reject) => {
                    // request was already aborted
                    if (abort?.aborted === true) {
                        return reject(new AbortError("Request has aborted"));
                    }
                    // send the request to server
                    const requestId = this.perform(action, payload);
                    const listeners = new Listeners();
                    // listen for abort signal
                    if (abort) {
                        const handleAbort = () => {
                            this.rejectAsync(requestId, new AbortError("Request has aborted"));
                        };
                        abort.addEventListener("abort", handleAbort);
                        listeners.register({
                            unbind: () => abort.removeEventListener("abort", handleAbort)
                        });
                    }
                    this.asyncRequests[requestId] = {
                        resolve: resolve,
                        reject: reject,
                        listeners: listeners,
                    };
                });
            }
            rejectAsync(requestId, err) {
                const asyncRequest = this.asyncRequests[requestId];
                if (!asyncRequest) {
                    return;
                }
                asyncRequest.reject(err ?? new Error("Request was rejected"));
                asyncRequest.listeners.unbindAll();
                delete this.asyncRequests[requestId];
            }
            ping() {
                this.perform("ping");
                clearTimeout(this.pingTimerId);
                clearTimeout(this.pongTimerId);
                // schedule next reconnect
                this.pongTimerId = setTimeout(() => this.ws.close, RTM.PONG_WAITING_INTERVAL);
            }
            pong() {
                clearTimeout(this.pingTimerId);
                clearTimeout(this.pongTimerId);
                this.pingTimerId = setTimeout(() => this.ping(), RTM.PING_PONG_INTERVAL);
            }
        }
        RTM.PING_PONG_INTERVAL = 15 * 1000;
        RTM.PONG_WAITING_INTERVAL = 5 * 1000;
        RTM.MANUAL_CLOSE = 4000;
        RTM.REQUEST_COUNTER = 1;
        services.RTM = RTM;
        /**
         * Simple client to perform Web API calls to agent-api
         */
        class WebAPI {
            constructor(auth) {
                this.auth = auth;
            }
            performAsync(action, payload, options) {
                const url = "https://api.livechatinc.com/v3.3/agent/action/send_event" + action;
                const accessToken = this.auth.getAccessToken();
                const region = this.auth.getRegion();
                const init = {
                    ...options,
                    body: JSON.stringify(payload),
                    method: "POST",
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                        "X-Region": region
                    },
                };
                return fetch(url, init).then((response) => this.parseResponse(response));
            }
            parseResponse(response) {
                if (response.ok === false) {
                    return response.json().then(function (json) {
                        const error = json?.error?.message ?? `Server responded with ${response.status} code`;
                        const errorType = json?.error?.type;
                        throw new ErrorWithType(error, errorType);
                    });
                }
                else {
                    return response.json();
                }
            }
        }
        services.WebAPI = WebAPI;
        class ChatRouter extends TypedEventEmitter {
            constructor() {
                super();
                this.counter = 0;
                this.transitions = new Map();
                this.digest();
            }
            dispose() {
                this.transitions.clear();
                clearTimeout(this.timerId);
            }
            setChatRoute(chatId, prevChatRoute, nextChatRoute, requesterId) {
                let transition = this.transitions.get(chatId);
                if (!transition) {
                    this.transitions.set(chatId, transition = {
                        counter: this.counter,
                        chatId: chatId,
                        history: [
                            [prevChatRoute, nextChatRoute]
                        ],
                        requesterId: requesterId,
                        finalChatRoute: nextChatRoute,
                        initialChatRoute: prevChatRoute,
                        lastUpdatedAt: Date.now()
                    });
                    this.emit("transitionStart", transition);
                }
                else {
                    transition.finalChatRoute = nextChatRoute;
                    transition.requesterId = requesterId || transition.requesterId;
                    transition.history.push([prevChatRoute, nextChatRoute]);
                    transition.lastUpdatedAt = Date.now();
                }
            }
            digest() {
                this.check();
                this.timerId = setTimeout(() => this.digest(), 200);
            }
            tick() {
                this.counter++;
                this.check();
            }
            check() {
                const now = Date.now();
                this.transitions.forEach((transition, chatId) => {
                    if (this.counter - transition.counter > 10) {
                        return this.finiteTransition(chatId);
                    }
                    if (now - transition.lastUpdatedAt >= 1000) {
                        return this.finiteTransition(chatId);
                    }
                });
            }
            finiteTransition(chatId) {
                const transition = this.transitions.get(chatId);
                if (!transition) {
                    return;
                }
                this.transitions.delete(chatId);
                if (transition.initialChatRoute !== transition.finalChatRoute) {
                    this.emit("routeChange", transition);
                }
                this.emit("transitionEnd", transition);
            }
            cancelTransition(chatId) {
                const transition = this.transitions.get(chatId);
                if (!transition) {
                    return;
                }
                this.transitions.delete(chatId);
                this.emit("transitionEnd", transition);
            }
            reset() {
                this.transitions.forEach((transition, chatId) => this.cancelTransition(chatId));
                this.transitions.clear();
                this.counter = 0;
            }
        }
        services.ChatRouter = ChatRouter;
        let Storage;
        (function (Storage) {
            function getItem(key) {
                const value = localStorage.getItem(key);
                if (value) {
                    try {
                        return JSON.parse(value);
                    }
                    catch (err) {
                        return console.error(err);
                    }
                }
            }
            Storage.getItem = getItem;
            function setItem(key, value) {
                return localStorage.setItem(key, JSON.stringify(value));
            }
            Storage.setItem = setItem;
            function getCredentials() {
                const json = getItem("credentials");
                if (!json) {
                    return;
                }
                const accessToken = String(json.accessToken ?? "");
                const expiredAt = Number(json.expiredAt ?? "");
                const scopes = parseScopes(json.scopes);
                // invalid credentials
                if (Number.isNaN(expiredAt)) {
                    return;
                }
                // credentials are expired, do not use them
                if (expiredAt <= Date.now()) {
                    return;
                }
                return {
                    accessToken,
                    expiredAt,
                    scopes,
                };
            }
            Storage.getCredentials = getCredentials;
            function setCredentials(credentials) {
                return setItem("credentials", credentials);
            }
            Storage.setCredentials = setCredentials;
            function getMyProfile() {
                const data = getItem("my_profile");
                if (!data) {
                    return;
                }
                const id = String(data.id ?? "");
                const name = String(data.name ?? "");
                const email = String(data.email ?? "");
                const avatar = String(data.avatar ?? "");
                return {
                    id, name, email, avatar
                };
            }
            Storage.getMyProfile = getMyProfile;
            function setMyProfile(myProfile) {
                return setItem("my_profile", myProfile);
            }
            Storage.setMyProfile = setMyProfile;
        })(Storage = services.Storage || (services.Storage = {}));
    })(services = app.services || (app.services = {}));
})(app || (app = {}));
