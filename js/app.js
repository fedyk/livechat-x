"use strict";
var app;
(function (app) {
    var __DEV__ = app.config.__DEV__;
    var getAccountsUrl = app.config.getAccountsUrl;
    var Auth = app.services.Auth;
    var ChatRouter = app.services.ChatRouter;
    var Storage = app.services.Storage;
    var API = app.api.API;
    var $API = app.api.$API;
    var $CharRouteManager = app.services.$CharRouteManager;
    var CharRouteManager = app.services.CharRouteManager;
    var $Store = app.store.$Store;
    var Store = app.store.Store;
    var parseQueryParams = app.parsers.parseQueryParams;
    var parseAccountsCredentials = app.parsers.parseAccountsCredentials;
    var ErrorWithType = app.helpers.ErrorWithType;
    var Listeners = app.helpers.Listeners;
    var GridView = app.views.GridView;
    var $LazyConnect = app.services.$LazyConnect;
    var LazyConnect = app.services.LazyConnect;
    var dom = app.dom;
    class App {
        constructor(initialState) {
            $Store.setInstance(this.store = new Store(initialState));
            this.auth = new Auth();
            this.chatRouter = new ChatRouter();
            $CharRouteManager.setInstance(this.chatRouteManager = new CharRouteManager(this.store, this.chatRouter));
            $API.setInstance(this.api = new API(this.auth, this.store, this.chatRouter, this.chatRouteManager));
            $LazyConnect.setInstance(this.lazyConnect = new LazyConnect(this.store));
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
            this.store.dispose();
            this.lazyConnect.dispose();
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
    app.App = App;
})(app || (app = {}));
