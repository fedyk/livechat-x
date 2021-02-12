"use strict";
var app;
(function (app) {
    var services;
    (function (services) {
        var createInjector = app.helpers.createInjector;
        var shallowEqual = app.helpers.shallowEqual;
        services.$LazyConnect = createInjector();
        class LazyConnect {
            constructor(store) {
                this.store = store;
                this.lazyListeners = [];
                this.isDisposed = false;
                this.digest();
            }
            dispose() {
                this.lazyListeners = [];
                if (this.animationFrameId) {
                    cancelAnimationFrame(this.animationFrameId);
                }
                this.isDisposed = true;
            }
            /**
             * @example
             * const connection = lazyConnect.connect(
             *   state => ({ user: state.users[userId] }),
             *   data => this.userName = data.user.name
             * )
             *
             * // cleanup
             * connection.unbind()
             */
            connect(mapStateToProps, connectListener) {
                if (this.isDisposed === true) {
                    throw new Error("Can't connect to disposed instance of LazyConnect");
                }
                let lastMappedData = void 0;
                const unbind = () => {
                    this.lazyListeners = this.lazyListeners.filter(v => v !== lazyListener);
                };
                function lazyListener(state) {
                    const nextMappedData = mapStateToProps(state);
                    if (!shallowEqual(lastMappedData, nextMappedData)) {
                        connectListener(nextMappedData);
                    }
                    lastMappedData = nextMappedData;
                }
                this.lazyListeners.push(lazyListener);
                // first emit
                lazyListener(this.store.getState());
                return { unbind };
            }
            digest() {
                const state = this.store.getState();
                const count = this.lazyListeners.length;
                // no changes in store
                if (this.prevState !== state) {
                    for (let i = 0; i < count; i++) {
                        this.lazyListeners[i](state);
                    }
                    this.prevState = state;
                }
                this.animationFrameId = requestAnimationFrame(() => this.digest());
            }
        }
        services.LazyConnect = LazyConnect;
    })(services = app.services || (app.services = {}));
})(app || (app = {}));
