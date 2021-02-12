"use strict";
var app;
(function (app) {
    var services;
    (function (services) {
        var createInjector = app.helpers.createInjector;
        var getChatRoute = app.helpers.getChatRoute;
        var unique = app.helpers.unique;
        services.$CharRouteManager = createInjector();
        class CharRouteManager {
            constructor(store, chatRouter) {
                this.store = store;
                this.chatRouter = chatRouter;
                this.routeChangeSubscribers = new Map();
                this.routeChangeListener = this.chatRouter.addListener("routeChange", transition => {
                    this.handleRouteChange(transition);
                });
            }
            dispose() {
                this.routeChangeSubscribers.clear();
                this.routeChangeListener.unbind();
            }
            getCurrentChatRoute(chatId) {
                const transition = this.chatRouter.transitions.get(chatId);
                if (transition) {
                    return transition.initialChatRoute;
                }
                return this.getChatRoute(chatId);
            }
            beginChatTransition(chatId) {
                const prevChatRoute = this.getChatRoute(chatId);
                const commitChatTransition = (requesterId) => {
                    const nextChatRoute = this.getChatRoute(chatId);
                    if (!nextChatRoute) {
                        return;
                    }
                    this.chatRouter.setChatRoute(chatId, prevChatRoute, nextChatRoute, requesterId);
                };
                return {
                    commitChatTransition
                };
            }
            subscribe(chatId, subscriber) {
                const subscribers = this.routeChangeSubscribers.get(chatId);
                const chatRoute = this.getChatRoute(chatId);
                if (!subscribers) {
                    this.routeChangeSubscribers.set(chatId, [subscriber]);
                }
                else {
                    subscribers.push(subscriber);
                }
                // initial call
                if (chatRoute) {
                    subscriber(chatRoute);
                }
                return {
                    unbind: () => this.unsubscribe(chatId, subscriber)
                };
            }
            unsubscribe(chatId, subscriber) {
                const subscribers = this.routeChangeSubscribers.get(chatId);
                if (!subscribers) {
                    return;
                }
                this.routeChangeSubscribers.set(chatId, subscribers.filter(v => v !== subscriber));
            }
            handleRouteChange(t) {
                const state = this.store.getState();
                let chatIds = state.chatIds;
                this.emitSubscribers(t);
                if (t.finalChatRoute === "my") {
                    chatIds = unique([t.chatId], chatIds);
                }
                if (t.finalChatRoute === "queued") {
                    chatIds = unique([t.chatId], chatIds);
                }
                if (t.finalChatRoute === "unassigned") {
                    chatIds = unique([t.chatId], chatIds);
                }
                if (t.finalChatRoute === "supervised") {
                    chatIds = unique([t.chatId], chatIds);
                }
                this.store.setChatIds(chatIds);
            }
            emitSubscribers(t) {
                const subscribers = this.routeChangeSubscribers.get(t.chatId);
                if (!subscribers) {
                    return;
                }
                for (let i = 0; i < subscribers.length; i++) {
                    subscribers[i](t.finalChatRoute);
                }
            }
            getChatRoute(chatId) {
                const state = this.store.getState();
                const myProfileId = state.myProfile?.id;
                const chat = state.chatsByIds[chatId];
                if (!myProfileId) {
                    return;
                }
                if (!chat) {
                    return;
                }
                return getChatRoute(chat, myProfileId);
            }
        }
        services.CharRouteManager = CharRouteManager;
    })(services = app.services || (app.services = {}));
})(app || (app = {}));
