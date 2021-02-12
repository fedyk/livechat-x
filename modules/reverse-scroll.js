"use strict";
var app;
(function (app) {
    var services;
    (function (services) {
        var dom = app.dom;
        const resizeObserver = new ResizeObserver(function (entries) {
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                const reverseScroll = reverseScrolls.get(entry.target);
                if (!reverseScroll) {
                    return;
                }
                if (reverseScroll.isStickyToBottom) {
                    reverseScroll.scrollToBottom();
                }
            }
        });
        const reverseScrolls = new WeakMap();
        class ReverseScroll {
            constructor(scrollEl, contentContainerEl) {
                this.scrollEl = scrollEl;
                this.contentContainerEl = contentContainerEl;
                this.isStickyToBottom = true;
                this.scrollListener = dom.addListener(this.scrollEl, "scroll", () => {
                    if (this.timerId !== void 0) {
                        clearTimeout(this.timerId);
                    }
                    this.timerId = setTimeout(() => {
                        this.checkScrollPosition();
                    }, 200);
                });
                reverseScrolls.set(this.contentContainerEl, this);
                resizeObserver.observe(this.contentContainerEl);
            }
            dispose() {
                this.scrollListener.unbind();
                reverseScrolls.delete(this.contentContainerEl);
                resizeObserver.unobserve(this.contentContainerEl);
            }
            scrollToBottom() {
                this.scrollEl.scrollTop = this.scrollEl.scrollHeight - this.scrollEl.clientHeight;
            }
            checkScrollPosition() {
                this.isStickyToBottom = this.scrollEl.scrollTop === this.scrollEl.scrollHeight - this.scrollEl.clientHeight;
            }
        }
        services.ReverseScroll = ReverseScroll;
    })(services = app.services || (app.services = {}));
})(app || (app = {}));
