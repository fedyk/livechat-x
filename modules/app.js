import { __DEV__, getAccountsUrl } from "./config.js";
import { Auth, ChatRouter, Storage } from "./services.js";
import { $API, API } from "./api.js";
import { $Store, Store } from "./store.js";
import { $CharRouteManager, CharRouteManager } from "./chat-route-manager.js";
import { parseQueryParams } from "./parsers.js";
import { parseAccountsCredentials } from "./parsers.js";
import { ErrorWithType, Listeners } from "./helpers.js";
import { GridView } from "./views.js";
import * as dom from "./dom.js";
export class App {
    constructor(initialState) {
        $Store.setInstance(this.store = new Store(initialState));
        this.auth = new Auth();
        this.chatRouter = new ChatRouter();
        $CharRouteManager.setInstance(this.chatRouteManager = new CharRouteManager(this.store, this.chatRouter));
        $API.setInstance(this.api = new API(this.auth, this.store, this.chatRouter, this.chatRouteManager));
        this.listeners = new Listeners();
        this.listeners.register(this.api.addListener("loginError", err => this.handleLoginError(err)));
        // debug code
        if (__DEV__) {
            this.listeners.register(dom.addListener(document, "dblclick", () => {
                console.log(this.store.getState());
            }));
        }
    }
    dispose() {
        this.api.dispose();
        this.chatRouteManager.dispose();
        this.chatRouter.dispose();
    }
    bootstrap() {
        const locationHash = String(window.location.hash ?? "").replace(/^\#/, "");
        let credentials = void 0;
        if (locationHash.length > 0) {
            const params = parseQueryParams(locationHash);
            const data = parseAccountsCredentials(params);
            Storage.setCredentials(credentials = {
                accessToken: data.accessToken,
                expiredAt: data.expiredAt,
                scopes: data.scopes
            });
            // remove hash params from URL
            history.replaceState("", document.title, window.location.pathname + window.location.search);
        }
        else {
            credentials = Storage.getCredentials();
        }
        if (!credentials) {
            return window.location.href = getAccountsUrl();
        }
        else {
            this.auth.setCredentials(credentials);
        }
        const myProfile = Storage.getMyProfile();
        if (myProfile) {
            this.store.setMyProfile(myProfile);
        }
        const gridView = new GridView();
        const container = document.getElementById("app");
        if (!container) {
            throw new Error("`container` is empty");
        }
        container.append(gridView.el);
        this.api.connect();
    }
    handleLoginError(err) {
        if (err instanceof ErrorWithType && err.type === "authentication") {
            return window.location.href = getAccountsUrl();
        }
        console.error(err);
    }
}
