/**
 * Home for active listeners
 */
export class Listeners {
    constructor(...listener) {
        this.listeners = listener;
    }
    register(...listener) {
        this.listeners.push(...listener);
    }
    unbindAll() {
        for (let i = 0; i < this.listeners.length; i++) {
            this.listeners[i].unbind();
        }
        // remove all items
        this.listeners.splice(0, this.listeners.length);
    }
}
export class TypedEventEmitter {
    constructor() {
        this.listeners = new Map();
    }
    addListener(event, listener) {
        let listeners = this.listeners.get(event);
        if (typeof listener !== "function") {
            throw new Error("listener is not executable");
        }
        if (!listeners) {
            this.listeners.set(event, [listener]);
        }
        else {
            listeners.push(listener);
        }
        return {
            unbind: () => this.removeListener(event, listener)
        };
    }
    removeListener(event, listener) {
        let listeners = this.listeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    emit(event, ...args) {
        const listeners = this.listeners.get(event);
        if (!listeners) {
            return;
        }
        for (let i = 0; i < listeners.length; i++) {
            listeners[i](...args);
        }
    }
}
/** Abort Error */
export class AbortError extends Error {
    constructor(message) {
        super(message);
        this.name = "AbortError";
    }
}
/** Error with type */
export class ErrorWithType extends Error {
    constructor(message, type, status) {
        super(message);
        this.type = type;
        this.status = status;
    }
}
/**
 * Simple injector for services. Can be useful to tests
 * @example
 * const AuthService { ... }
 * const $AuthService = createInjector<AuthService>()
 * $AuthService.setInstance(new AuthService)
 *
 * const MyClass {
 *   constructor(private auth = $AuthService())
 * }
 */
export function createInjector() {
    let instance = null;
    function injector() {
        if (instance == null) {
            throw new Error("Instance hasn't been set. Please call $InjectorName.setInstance(serviceInstance)");
        }
        return instance;
    }
    injector.setInstance = function setInstance(_) {
        instance = _;
    };
    return injector;
}
export class LRUCache extends TypedEventEmitter {
    constructor(max) {
        super();
        this.max = max;
        this.cache = new Map();
    }
    dispose() {
        for (let [key, item] of this.cache) {
            this.emit("removed", item);
            this.cache.delete(key);
        }
    }
    get(key) {
        let item = this.cache.get(key);
        // move top
        if (item) {
            this.cache.delete(key);
            this.cache.set(key, item);
        }
        return item;
    }
    set(key, val) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        // kill the oldest
        else if (this.cache.size == this.max) {
            const key = this.first();
            const item = this.cache.get(key);
            if (item) {
                this.emit("removed", item);
            }
            this.cache.delete(key);
        }
        this.cache.set(key, val);
    }
    first() {
        return this.cache.keys().next().value;
    }
    /**
     * this method does not change order of values
     */
    forEach(callback) {
        this.cache.forEach(callback);
    }
}
/** @source https://github.com/facebook/react/blob/master/packages/shared/shallowEqual.js */
export function shallowEqual(objA, objB) {
    if (objA === objB) {
        return true;
    }
    if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
        return false;
    }
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) {
        return false;
    }
    // Test for A's keys different from B.
    for (let i = 0; i < keysA.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(objB, keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
            return false;
        }
    }
    return true;
}
export function indexBy(items, prop) {
    const result = {};
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const key = item[prop];
        if (key != null) {
            // @ts-ignore
            result[key] = item;
        }
    }
    return result;
}
export function getChatRoute(chat, myProfileId) {
    const activeThread = getActiveThread(chat);
    if (!activeThread) {
        return chat.properties.routing.pinned ? "pinned" : "closed";
    }
    const currentAgent = chat.users[myProfileId];
    if (currentAgent && currentAgent.present) {
        return "my";
    }
    const presentAgent = getPresentAgent(chat.users);
    if (!presentAgent) {
        if (chat.properties.routing.continuous && !activeThread.queue) {
            return "unassigned";
        }
        else {
            return "queued";
        }
    }
    if (chat.properties.supervising.agentIds.includes(myProfileId)) {
        return "supervised";
    }
    return "other";
}
export function getActiveThread(chat) {
    // only the first thread can be active
    if (chat.threadIds.length > 0) {
        const threadId = chat.threadIds[0];
        if (chat.threads[threadId] && chat.threads[threadId].active) {
            return chat.threads[threadId];
        }
    }
}
export function getRecentThread(chat) {
    for (let i = 0; i < chat.threadIds.length; i++) {
        const threadId = chat.threadIds[i];
        const thread = chat.threads[threadId];
        if (thread) {
            return thread;
        }
    }
}
export function getPresentAgent(users) {
    const usersIds = Object.keys(users);
    // lookup for first present user
    for (let i = 0; i < usersIds.length; i++) {
        const userId = usersIds[i];
        const user = users[userId];
        if (user.type === "agent" && user.present) {
            return user;
        }
    }
}
export function mergeChats(currentChatsById, incomingChatsById, chatIds, myProfileId) {
    const chatIdsSet = new Set(chatIds.reverse());
    const { enterChatIds, updateChatIds, exitChatIds } = compareChats(currentChatsById, incomingChatsById);
    const closedChatIds = new Set();
    const chatsByIds = { ...currentChatsById };
    // add new chats
    enterChatIds.forEach(function (chatId) {
        const incomingChat = incomingChatsById[chatId];
        const incomingChatRoute = getChatRoute(incomingChat, myProfileId);
        chatsByIds[chatId] = incomingChat;
        // add my chat to the list
        if (incomingChatRoute === "my") {
            chatIdsSet.add(chatId);
        }
        // add supervised chats to the list
        if (incomingChatRoute === "supervised") {
            chatIdsSet.add(chatId);
        }
        // add queued chat to the list
        if (incomingChatRoute === "queued") {
            chatIdsSet.add(chatId);
        }
        // add unassigned chat to the list
        if (incomingChatRoute === "unassigned") {
            chatIdsSet.add(chatId);
        }
    });
    // update current chats
    updateChatIds.forEach(chatId => {
        const currentChat = chatsByIds[chatId];
        const incomingChat = incomingChatsById[chatId];
        const incomingChatRoute = getChatRoute(incomingChat, myProfileId);
        chatsByIds[chatId] = mergeChat(currentChat, incomingChat);
        // add chats to my chats segment
        if (incomingChatRoute === "my") {
            chatIdsSet.add(chatId);
        }
        // add queued chat to list of my chats
        if (incomingChatRoute === "queued") {
            chatIdsSet.add(chatId);
        }
        // add chats to my supervised segment
        if (incomingChatRoute === "supervised") {
            chatIdsSet.add(chatId);
        }
        // add unassigned chat to list of my chats
        if (incomingChatRoute === "unassigned") {
            chatIdsSet.add(chatId);
        }
    });
    // loop through inactive chats
    exitChatIds.forEach(function (chatId) {
        const exitChat = chatsByIds[chatId];
        const exitChatRoute = getChatRoute(exitChat, myProfileId);
        const exitActiveThread = getActiveThread(exitChat);
        // do not update inactive chats
        if (!exitActiveThread) {
            return;
        }
        // remove queued chat from the list of my chats & from segment
        if (exitChatRoute === "queued") {
            return chatIdsSet.delete(chatId);
        }
        // mark chat as closed
        chatsByIds[chatId] = {
            ...exitChat,
            threads: {
                ...exitChat.threads,
                [exitActiveThread.id]: {
                    ...exitActiveThread,
                    // thread is no more active
                    active: false,
                    // mark as incomplete, as it can have missed messages
                    incomplete: true
                }
            },
        };
        // invalidate thread history for closed chat
        if (chatsByIds[chatId].history.status === "up-to-date") {
            chatsByIds[chatId].history = {
                ...chatsByIds[chatId].history,
                status: "incomplete"
            };
        }
        // add chat to a list of chat chat need to be synced
        closedChatIds.add(chatId);
    });
    return {
        chatsById: chatsByIds,
        chatIds: Array.from(chatIdsSet).reverse(),
        closedChatIds: closedChatIds
    };
}
export function compareChats(chats, incomingChats) {
    const enterChatIds = new Set();
    const updateChatIds = new Set();
    const exitChatIds = new Set();
    for (const chatId in chats) {
        if (chats.hasOwnProperty(chatId)) {
            if (incomingChats.hasOwnProperty(chatId)) {
                updateChatIds.add(chatId);
            }
            else {
                exitChatIds.add(chatId);
            }
        }
    }
    for (const chatId in incomingChats) {
        if (incomingChats.hasOwnProperty(chatId)) {
            if (chats.hasOwnProperty(chatId) === false) {
                enterChatIds.add(chatId);
            }
        }
    }
    return {
        enterChatIds,
        updateChatIds,
        exitChatIds
    };
}
export function mergeChat(currentChat, incomingChat) {
    const threads = { ...currentChat.threads };
    const threadIds = [...currentChat.threadIds];
    const pagination = { ...currentChat.history };
    const currentRecentThread = getRecentThread(currentChat);
    const incomingRecentThread = getRecentThread(incomingChat);
    if (currentChat.id !== incomingChat.id) {
        throw new RangeError("Cannot merge chats with different id");
    }
    if (!currentRecentThread) {
        throw new RangeError("Current chat should have at least one thread");
    }
    if (!incomingRecentThread) {
        throw new RangeError("Incoming chat should have at least one thread");
    }
    // only last thread can be active
    if (currentRecentThread.active && currentRecentThread.id !== incomingRecentThread.id) {
        threads[currentRecentThread.id] = {
            ...currentRecentThread,
            active: false,
            incomplete: true
        };
    }
    if (currentRecentThread.id !== incomingRecentThread.id) {
        // add new thread to the chat
        threads[incomingRecentThread.id] = incomingRecentThread;
        // prepend new active thread to the top of the list
        threadIds.unshift(incomingRecentThread.id);
        // invalidate thread_summary
        if (pagination.status === "up-to-date") {
            pagination.status = "incomplete";
        }
    }
    // merge thread messages
    if (currentRecentThread.id === incomingRecentThread.id) {
        const currentLastMessage = getThreadLastMessage(currentRecentThread);
        const incomingLastMessage = getThreadLastMessage(incomingRecentThread);
        let incomplete = currentRecentThread.incomplete;
        // threads are empty, but it can be caused by API-5897
        if (!currentLastMessage && !incomingLastMessage) {
            incomplete = true;
        }
        // current thread is empty, inherit incomplete property from incoming thread
        if (!currentLastMessage && incomingLastMessage) {
            incomplete = incomingRecentThread.incomplete;
        }
        // incoming thread is empty most probably due to API-5897
        if (currentLastMessage && !incomingLastMessage) {
            incomplete = true;
        }
        // current and incoming messages are different, inherit incomplete property from incoming thread
        if (currentLastMessage && incomingLastMessage && currentLastMessage.id !== incomingLastMessage.id) {
            incomplete = incomingRecentThread.incomplete;
        }
        // append incoming message
        const messages = mergeMessages(Object.values(currentRecentThread.messages), Object.values(incomingRecentThread.messages));
        // thread is not complete
        threads[currentRecentThread.id] = {
            ...currentRecentThread,
            incomplete,
            messages: messages,
        };
    }
    return {
        id: incomingChat.id,
        sneakPeek: null,
        customerId: incomingChat.customerId,
        properties: incomingChat.properties,
        users: incomingChat.users,
        groupId: incomingChat.groupId,
        threadIds,
        threads,
        history: pagination
    };
}
export function getChatLastMessage(chat) {
    if (chat.sneakPeek) {
        return sneakPeekToMessage(chat.sneakPeek);
    }
    const lastThread = getLastThread(chat);
    if (!lastThread) {
        return;
    }
    return getThreadLastMessage(lastThread);
}
export function getLastThread(chat) {
    for (let i = chat.threadIds.length - 1; i >= 0; i++) {
        const threadId = chat.threadIds[i];
        if (threadId && chat.threads[threadId]) {
            return chat.threads[threadId];
        }
    }
}
export function getIncompleteThreadIds(chat) {
    const threadIds = [];
    for (let i = 0; i < chat.threadIds.length; i++) {
        const threadId = chat.threadIds[i];
        if (chat.threads[threadId] && chat.threads[threadId].incomplete) {
            threadIds.push(threadId);
        }
    }
    return threadIds;
}
export function getThreadLastMessage(thread) {
    if (thread.messages.length > 0) {
        return thread.messages[thread.messages.length - 1];
    }
}
export function mergeMessages(target, ...sources) {
    const targetMessageIds = new Set();
    const targetCustomIds = new Set();
    const result = target.concat();
    // collect messages ids and customIds for target collection
    target.forEach(function (message) {
        targetMessageIds.add(message.id);
        if (message.customId) {
            targetCustomIds.add(message.customId);
        }
    });
    sources.forEach(function (messages) {
        messages.forEach(function (message) {
            // message with the same id already present in target
            if (targetMessageIds.has(message.id)) {
                return;
            }
            // message with the same custom ID already present in target
            if (message.customId && targetCustomIds.has(message.customId)) {
                return;
            }
            result.push(message);
        });
    });
    // free memory
    targetMessageIds.clear();
    targetCustomIds.clear();
    // sort messages in creating order
    result.sort(function (a, b) {
        return a.createdAt - b.createdAt;
    });
    return result;
}
/**
 * Get a user who participates in the chat(by default it is customer, but can be other agent)
 */
export function getChatRecipient(chat) {
    if (chat.customerId && chat.users[chat.customerId]) {
        return chat.users[chat.customerId];
    }
    const users = Object.values(chat.users);
    // lookup for first present user
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        if (user.present) {
            return user;
        }
    }
    // just return first user
    if (users.length > 0) {
        return users[0];
    }
    return;
}
export function getChatMessages(chat) {
    const messages = [];
    for (let i = 0; i < chat.threadIds.length; i++) {
        const threadId = chat.threadIds[i];
        const thread = chat.threads[threadId];
        if (!thread) {
            continue;
        }
        // thread with restricted access
        if (thread.restrictedAccess != null) {
            messages.push({
                id: `${thread.id}_restricted_access`,
                text: `🔓 ${thread.restrictedAccess}`,
                type: "system_message",
                createdAt: thread.createdAt,
                recipients: "all",
            });
            continue;
        }
        for (let j = 0; j < thread.messages.length; j++) {
            const message = thread.messages[j];
            if (message) {
                messages.push(message);
            }
        }
        if (!thread.active && thread.tags.length > 0) {
            messages.push({
                id: `${thread.id}_tags`,
                type: "system_message",
                text: "Chat has been tagged. TODO: show the tags",
                createdAt: thread.createdAt,
                // tags: thread.tags,
                recipients: "all",
            });
        }
    }
    if (chat.sneakPeek != null) {
        messages.push(sneakPeekToMessage(chat.sneakPeek));
    }
    return messages;
}
export function sneakPeekToMessage(sneakPeek) {
    return {
        id: "sneak_peek",
        type: "sneak_peek",
        text: sneakPeek.text,
        recipients: "all",
        authorId: sneakPeek.authorId,
        createdAt: sneakPeek.timestamp * 1000,
    };
}
export function classNames(...args) {
    let className = "";
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (typeof arg === "string") {
            className += arg + " ";
        }
        if (typeof arg === "object") {
            Object.keys(arg).forEach(function (key) {
                if (arg[key]) {
                    className += key + " ";
                }
            });
        }
    }
    return className.trim();
}
export function getInitials(name) {
    let rgx = new RegExp(/(\p{L}{1})\p{L}+/, 'gu');
    let initials = [...name.matchAll(rgx)] || [];
    return ((initials.shift()?.[1] || '') + (initials.pop()?.[1] || '')).toUpperCase();
}
export function unique(...args) {
    const result = [];
    const seen = new Set();
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        for (let j = 0; j < arg.length; j++) {
            const value = arg[j];
            if (seen.has(value)) {
                continue;
            }
            seen.add(value);
            result.push(value);
        }
    }
    // free memory
    seen.clear();
    return result;
}
export function formatTime(time) {
    const date = new Date(time);
    const now = new Date();
    // the same day
    if (date.toDateString() === now.toDateString()) {
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        return `${hours}:${minutes}`;
    }
    return new Intl.DateTimeFormat().format(date);
}
export function stringifyMessage(message) {
    if (message.type === "sneak_peek") {
        return `✍️ ${message.text}`;
    }
    if (message.type === "message" || message.type === "system_message") {
        return message.text;
    }
    if (message.type === "filled_form") {
        return "📝 Survey";
    }
    if (message.type === "rich_message") {
        return "🖼 Rich message";
    }
    if (message.type === "file") {
        return "File";
    }
    return "You should not see this";
}
