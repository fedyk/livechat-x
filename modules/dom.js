/**
 * DOM
 * The collection of utils for dealing with DOM
 */
export class DomListener {
    constructor(node, type, handler, options) {
        this.node = node;
        this.type = type;
        this.handler = handler;
        this.options = (options || false);
        this.node.addEventListener(this.type, this.handler, this.options);
    }
    dispose() {
        if (!this.handler) {
            // Already disposed
            return;
        }
        this.node.removeEventListener(this.type, this.handler, this.options);
        // Prevent leakers from holding on to the dom or handler func
        this.node = null;
        this.handler = null;
    }
    unbind() {
        this.dispose();
    }
}
export function addListener(node, type, handler, useCaptureOrOptions) {
    return new DomListener(node, type, handler, useCaptureOrOptions);
}
/**
 * Simple implementation of General Update Patter. basically it is how React renders list, but in less code
 * @example
 * selectAll(container).data([1, 2, 3], datum => datum)
 *   .join(
 *     enterEl => enter.append(document.createElement("ul")),
 *     (update, d) => update.textContent = d,
 *     exit => exit.remove()
 *   )
 */
export function selectAll(parent, selector) {
    const group = selector ? parent.querySelectorAll(selector) : parent.childNodes;
    return {
        data(data, key) {
            // @ts-ignore
            return new DataBinder(parent, group, data, key);
        }
    };
}
export class DataBinder {
    constructor(parent, group, data, key) {
        const groupLength = group.length;
        const dataLength = data.length;
        this.enterGroup = new Array(dataLength);
        this.updateGroup = new Array(dataLength);
        this.exitGroup = new Array(groupLength);
        // bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);
        // bind by key
        const nodeByKeyValue = new Map;
        const keyValues = new Array(groupLength);
        let node;
        let keyValue;
        // Compute the key for each node.
        // If multiple nodes have the same key, the duplicates are added to exit.
        for (let i = 0; i < groupLength; ++i) {
            if (node = group[i]) {
                keyValues[i] = keyValue = key(node.__data__, i, node) + "";
                if (nodeByKeyValue.has(keyValue)) {
                    this.exitGroup[i] = node;
                }
                else {
                    nodeByKeyValue.set(keyValue, node);
                }
            }
        }
        // Compute the key for each datum.
        // If there a node associated with this key, join and add it to update.
        // If there is not (or the key is a duplicate), add it to enter.
        for (let i = 0; i < dataLength; ++i) {
            keyValue = key(data[i], i, parent) + "";
            if (node = nodeByKeyValue.get(keyValue)) {
                this.updateGroup[i] = node;
                node.__data__ = data[i];
                nodeByKeyValue.delete(keyValue);
            }
            else {
                this.enterGroup[i] = new EnterNode(parent, data[i]);
            }
        }
        // Add any remaining nodes that were not bound to data to exit.
        for (let i = 0; i < groupLength; ++i) {
            if ((node = group[i]) && (nodeByKeyValue.get(keyValues[i]) === node)) {
                this.exitGroup[i] = node;
            }
        }
        // Now connect the enter nodes to their following update node, such that
        // appendChild can insert the materialized enter node before this node,
        // rather than at the end of the parent node.
        for (var i0 = 0, i1 = 0; i0 < dataLength; ++i0) {
            let previous = this.enterGroup[i0];
            let next;
            if (previous) {
                if (i0 >= i1)
                    i1 = i0 + 1;
                while (!(next = this.updateGroup[i1]) && ++i1 < dataLength)
                    ;
                previous.next = next || null;
            }
        }
    }
    join(enter, update, exit) {
        if (typeof enter === "function") {
            this.enter(enter);
        }
        if (typeof update === "function") {
            this.update(update);
        }
        if (typeof exit === "function") {
            this.exit(exit);
        }
        const dataLength = this.enterGroup.length;
        const merge = new Array(dataLength);
        // merge enter and update nodes in one array
        for (let i = 0, node; i < dataLength; ++i) {
            if (node = this.updateGroup[i] || (this.enterGroup[i] && this.enterGroup[i].node)) {
                merge[i] = node;
            }
        }
        // sort the nodes
        for (let i = merge.length - 1, next = merge[i], node; --i >= 0;) {
            if (node = merge[i]) {
                if (next && node.compareDocumentPosition(next) ^ 4) {
                    next.parentNode.insertBefore(node, next);
                }
                next = node;
            }
        }
    }
    enter(cb) {
        for (let i = 0; i < this.enterGroup.length; i++) {
            const node = this.enterGroup[i];
            if (node) {
                cb(this.enterGroup[i], i);
            }
        }
        return this;
    }
    update(cb) {
        for (let i = 0; i < this.updateGroup.length; i++) {
            const node = this.updateGroup[i];
            if (node) {
                cb(this.updateGroup[i]);
            }
        }
        return this;
    }
    exit(cb) {
        for (let i = 0; i < this.exitGroup.length; i++) {
            const node = this.exitGroup[i];
            if (node) {
                cb(this.exitGroup[i]);
            }
        }
        return this;
    }
}
export class EnterNode {
    constructor(parent, d) {
        this.parent = parent;
        this.d = d;
        this.node = null;
        this.next = null;
    }
    append(node) {
        this.node = node;
        this.node.__data__ = this.d;
        if (this.next) {
            this.parent.insertBefore(this.node, this.next);
        }
        else {
            this.parent.appendChild(this.node);
        }
        return this.node;
    }
}
export function createEl(tagName, attrs, child) {
    const newBorn = document.createElement(tagName);
    if (attrs) {
        Object.assign(newBorn, attrs);
    }
    if (child) {
        newBorn.append(...child);
    }
    return newBorn;
}
export function getDatum(node) {
    return node.__data__;
}
/**
 * @example safeHTML`Hello ${userName}`
 */
export function safeHTML(data, ...args) {
    let result = data[0];
    for (var i = 0; i < args.length; i++) {
        var arg = String(arguments[i]);
        // Escape special characters in the substitution.
        result += arg.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        // Don't escape special characters in the template.
        result += data[i];
    }
    return result;
}
export function toggleEl(el, visible) {
    if (visible === true) {
        return el.classList.remove("hidden");
    }
    if (visible === false) {
        return el.classList.add("hidden");
    }
    if (el.classList.contains("hidden")) {
        el.classList.remove("hidden");
    }
    else {
        el.classList.add("hidden");
    }
}
