import { createInjector, shallowEqual } from "./helpers.js";
export const $LazyConnect = createInjector();
export class LazyConnect {
    constructor(store) {
        this.store = store;
        this.lazyListeners = [];
        this.digest();
    }
    dispose() {
        this.lazyListeners = [];
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
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
