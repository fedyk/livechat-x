import * as dom from "./dom.js";
import * as helpers from "./helpers.js";
import { $Store } from "./store.js";
import { ReverseScroll } from "./reverse-scroll.js";
import { $API } from "./api.js";
import { getAccountsUrl } from "./config.js";
import { $CharRouteManager } from "./chat-route-manager.js";
import { $LazyConnect } from "./lazy-connect.js";
export class GridView {
    constructor() {
        this.el = dom.createEl("div", {
            className: "grid"
        }, [
            (this.sidebar = new GridSidebarView()).el,
            (this.main = new MainView()).el
        ]);
    }
    dispose() {
        this.sidebar.dispose();
        this.main.dispose();
        this.el.remove();
        this.el = null;
    }
}
export class GridSidebarView {
    constructor() {
        this.el = dom.createEl("div", {
            className: "grid-sidebar"
        }, [
            (this.header = new HeaderView()).el,
            (this.chatsList = new ChatsListView()).el
        ]);
    }
    dispose() {
        this.header.dispose();
        this.chatsList.dispose();
        this.el.remove();
    }
}
export class HeaderView {
    constructor(store = $Store(), api = $API()) {
        this.store = store;
        this.api = api;
        this.routingCheckbox = new CheckboxView({ id: "router_status" });
        this.el = dom.createEl("div", { className: "header" }, [
            (this.dropdown = new DropdownView({
                content: (this.profile = dom.createEl("div", { className: "dropdown-profile" })),
                menuContent: ([
                    dom.createEl("label", { className: "dropdown-item dropdown-router-status", htmlFor: "router_status" }, [
                        dom.createEl("span", { textContent: "Accept chats" }),
                        this.routingCheckbox.el
                    ]),
                    dom.createEl("div", { className: "dropdown-divider" }),
                    dom.createEl("a", { className: "dropdown-item", href: getAccountsUrl("signout"), textContent: "Logout" }),
                    dom.createEl("div", { className: "dropdown-footer" }, [
                        dom.createEl("a", { href: "#", textContent: "Report problem" }),
                        dom.createEl("a", { href: "#", textContent: "About" })
                    ])
                ])
            })).el,
            dom.createEl("div", { className: "temp-logo", textContent: "LiveChat X" }),
            this.search = dom.createEl("div", { className: "search hidden" }, [
                dom.createEl("label", { className: "search-label", htmlFor: "search", }, [
                    createIconEl({ name: "search", size: 14 })
                ]),
                dom.createEl("input", {
                    id: "search",
                    type: "text",
                    placeholder: "Search",
                    className: "search-input",
                    autocomplete: "off",
                })
            ])
        ]);
        this.routingListener = this.routingCheckbox.addListener("change", () => {
            this.changeRoutingStatus();
        });
        this.storeListener = store.connect(state => {
            const myProfile = state.myProfile;
            return {
                myProfile,
                myRoutingStatus: myProfile ? state.routingStatuses[myProfile.id] : null
            };
        }, props => this.render(props));
    }
    dispose() {
        this.storeListener.unbind();
        this.avatarView?.dispose();
        this.routingCheckbox.dispose();
        this.dropdown.dispose();
        this.profile = null;
        this.search = null;
        this.el.remove();
        this.el = null;
    }
    render(props) {
        this.renderMyProfileAvatar(props.myProfile);
        this.renderMyRoutingStatus(props.myRoutingStatus);
    }
    renderMyProfileAvatar(myProfile) {
        if (myProfile) {
            if (!this.avatarView) {
                this.profile.append((this.avatarView = new AvatarView({
                    alt: helpers.getInitials(myProfile.name),
                    src: myProfile.avatar,
                    size: 36
                })).el, createIconEl({ name: "caret-down-fill", size: "10" }));
            }
            else {
                this.avatarView.setAlt(myProfile.name);
                this.avatarView.setSrc(myProfile.avatar);
            }
        }
        else {
            this.avatarView?.dispose();
            this.profile.textContent = "";
        }
    }
    renderMyRoutingStatus(myRoutingStatus) {
        if (myRoutingStatus) {
            this.routingCheckbox.setValue(myRoutingStatus === "accepting_chats");
        }
    }
    changeRoutingStatus() {
        const acceptingChats = this.routingCheckbox.getValue();
        this.api.setRoutingStatus(acceptingChats ? "accepting_chats" : "not_accepting_chats")
            .catch(err => console.error(err));
    }
}
export class ChatsListView {
    constructor(store = $Store()) {
        this.chatsListItems = new Map();
        this.el = dom.createEl("div", { className: "chats-list" });
        this.storeListener = store.connect(state => ({
            chatIds: state.chatIds
        }), data => this.render(data));
    }
    dispose() {
        this.el.remove();
        this.el = null;
    }
    render(data) {
        const chatsListItems = this.chatsListItems;
        dom.selectAll(this.el)
            .data(data.chatIds, chatId => chatId)
            .join(enter => enterChatsListItem(enter), update => updateChatsListItem(update), exit => exitChatsListItem(exit));
        function enterChatsListItem(enter) {
            const chatsListItem = new ChatsListItemView({ chatId: enter.d });
            chatsListItems.set(enter.d, chatsListItem);
            enter.append(chatsListItem.el);
        }
        function updateChatsListItem(update) {
        }
        function exitChatsListItem(exit) {
            const d = dom.getDatum(exit);
            if (!d) {
                return;
            }
            const chatsListItem = chatsListItems.get(d);
            if (chatsListItem) {
                chatsListItem.dispose();
            }
            else {
                console.warn("unexpected missed instance for element"), exit.remove();
            }
        }
    }
}
export class ChatsListItemView {
    constructor(props, store = $Store(), charRouteManager = $CharRouteManager(), lazyConnect = $LazyConnect()) {
        this.props = props;
        this.store = store;
        this.charRouteManager = charRouteManager;
        this.lazyConnect = lazyConnect;
        const connProps = this.storeMapper(this.store.getState());
        const customer = connProps.chat ? helpers.getChatRecipient(connProps.chat) : void 0;
        this.el = dom.createEl("div", { className: "chats-list-item", }, [
            this.itemAvatarEl = dom.createEl("div", { className: "chat-list-item-avatar" }, [
                (this.avatar = new AvatarView({
                    size: 48,
                    alt: customer ? customer.name : "Visitor",
                    src: customer ? customer.avatar : void 0
                })).el
            ]),
            this.chatSummaryEl = dom.createEl("div", { className: "chat-summary", }, [
                dom.createEl("div", { className: "chat-summary-row", }, [
                    this.chatTitle = dom.createEl("div", { className: "chat-title", textContent: "Unnamed visitor" }),
                    this.chatMeta = dom.createEl("div", { className: "chat-meta" })
                ]),
                this.chatSubtitle = dom.createEl("div", { className: "chat-subtitle" })
            ])
        ]);
        this.clickListener = dom.addListener(this.el, "click", () => this.selectChat());
        this.chatRoute = this.charRouteManager.getCurrentChatRoute(props.chatId);
        this.storeListener = lazyConnect.connect(state => this.storeMapper(state), props => this.render(props));
        this.chatRouteListener = this.charRouteManager.subscribe(props.chatId, nextChatRoute => {
            this.chatRoute = nextChatRoute;
            if (this.connectedProps) {
                this.render(this.connectedProps);
            }
        });
    }
    dispose() {
        this.storeListener.unbind();
        this.clickListener.unbind();
        this.chatRouteListener.unbind();
        this.avatar.dispose();
        this.itemAvatarEl.remove();
        this.el.remove();
    }
    render(props) {
        if (props.chat) {
            const customer = helpers.getChatRecipient(props.chat);
            const lastMessage = helpers.getChatLastMessage(props.chat);
            this.chatTitle.textContent = customer ? customer.name : "Unnamed visitor";
            if (this.chatRoute === "queued") {
                this.chatSubtitle.textContent = `Waiting in a queue`;
            }
            else if (this.chatRoute === "unassigned") {
                this.chatSubtitle.textContent = `Unassigned chat waiting for reply`;
            }
            else if (lastMessage) {
                this.chatSubtitle.textContent = helpers.stringifyMessage(lastMessage);
            }
        }
        // update selected item
        if (this.props.chatId === props.selectedChatId) {
            this.el.classList.add("selected");
        }
        else {
            this.el.classList.remove("selected");
        }
    }
    selectChat() {
        this.store.setSelectedChatId(this.props.chatId);
    }
    storeMapper(state) {
        return {
            chat: state.chatsByIds[this.props.chatId],
            selectedChatId: state.selectedChatId,
        };
    }
}
export class MainView {
    constructor() {
        this.el = dom.createEl("div", { className: "grid-main" }, [
            (this.chatFeed = new ChatsView()).el
        ]);
    }
    dispose() {
        this.chatFeed.dispose();
        this.el.remove();
        this.el = null;
    }
}
export class ChatsView {
    constructor(store = $Store()) {
        this.lruCache = new helpers.LRUCache(10);
        this.el = dom.createEl("div", { className: "chats" });
        this.cacheListener = this.lruCache.addListener("removed", chatView => {
            chatView.dispose();
        });
        this.storeListener = store.connect(state => ({
            selectedChatId: state.selectedChatId
        }), props => this.render(props));
    }
    dispose() {
        this.lruCache.dispose();
        this.cacheListener.unbind();
        this.storeListener.unbind();
        this.el.remove();
        this.el = null;
    }
    render(props) {
        if (!props.selectedChatId) {
            this.el.classList.add("chats--empty");
        }
        else {
            this.el.classList.remove("chats--empty");
        }
        if (props.selectedChatId) {
            let chatView = this._getChatViewInstance(props.selectedChatId);
            // hide other ChatViews
            this.lruCache.forEach(v => {
                if (v === chatView) {
                    v.show();
                }
                else {
                    v.hide();
                }
            });
        }
    }
    /**
     * create / get from cache a chat view
     * @private
     */
    _getChatViewInstance(chatId) {
        let chatView = this.lruCache.get(chatId);
        if (chatView) {
            return chatView;
        }
        chatView = new ChatView({ chatId: chatId });
        return this.el.append(chatView.el),
            this.lruCache.set(chatId, chatView),
            chatView;
    }
}
export class ChatView {
    constructor(props, api = $API()) {
        this.api = api;
        this.abort = new AbortController();
        this.chatId = props.chatId;
        this.el = dom.createEl("div", { className: "chat-container" }, [
            (this.chat = new ChatFeedView({ chatId: props.chatId })).el,
            (this.details = new CustomerDetailsView({ chatId: props.chatId })).el
        ]);
        console.warn("uncomment this.details = ... above");
    }
    dispose() {
        this.abort.abort();
        this.chat.dispose();
        // this.details.dispose()
        this.el.remove();
        this.el = null;
    }
    show() {
        this.el.classList.remove("hidden");
        this.api.syncIncompleteThreadsAsync(this.chatId, this.abort.signal)
            .catch(err => console.warn(err));
    }
    hide() {
        this.el.classList.add("hidden");
    }
}
export class ChatFeedView {
    constructor(props, store = $Store()) {
        this.el = dom.createEl("div", {
            className: "chat-feed"
        }, [
            (this.chatHeader = new ChatHeaderView()).el,
            (this.chatBody = new ChatBodyView({
                chatId: props.chatId
            })).el,
            (this.chatComposer = new ComposerView({
                chatId: props.chatId
            })).el,
        ]);
    }
    dispose() {
        this.chatHeader.dispose();
        this.chatBody.dispose();
        this.chatComposer.dispose();
        this.el.remove();
        this.el = null;
    }
}
export class ChatHeaderView {
    constructor() {
        this.el = dom.createEl("div", { className: "chat-header" });
        this.el.innerHTML = `
    <div class="chat-header-avatar">
              <div class="avatar" style="height: 36px; width: 36px;">
                <img src="https://i.pravatar.cc/512?img=3" alt="AT" height="36px" width="36px" />
              </div>
            </div>
            <div class="chat-header-details">
              <div class="chat-header-title">Unnamed Customer</div>
            </div>
            `;
    }
    dispose() {
        this.el.remove();
        this.el = null;
    }
}
export class ChatBodyView {
    constructor(props, store = $Store()) {
        this.messages = new Map();
        this.props = props;
        this.el = dom.createEl("div", { className: "chat-body" }, [
            this.messagesEl = dom.createEl("div", { className: "messages" })
        ]);
        this.reverseScroll = new ReverseScroll(this.el, this.messagesEl);
        this.storeListener = store.connect(state => {
            return {
                chat: state.chatsByIds[this.props.chatId],
                myProfileId: state.myProfile?.id,
            };
        }, props => this.render(props));
    }
    dispose() {
        this.storeListener.unbind();
        this.reverseScroll.dispose();
        this.el.remove();
        this.el = null;
    }
    render(props) {
        if (!props.chat || !props.myProfileId) {
            return;
        }
        const messages = helpers.getChatMessages(props.chat);
        this.renderMessages(messages, props.chat, props.myProfileId);
    }
    renderMessages(messages, chat, myProfileId) {
        const messageViews = this.messages;
        dom.selectAll(this.messagesEl)
            .data(messages, m => m?.id)
            .join(enter => enterMessage(enter), update => updateMessage(update), exit => exitMessage(exit));
        function enterMessage(enterNode) {
            const messageView = new MessageView({
                message: enterNode.d,
                author: getMessageAuthor(enterNode.d),
                messageMetaState: getMessageMetaState(enterNode.d),
                myProfileId: myProfileId,
            });
            // save reference to View
            messageViews.set(enterNode.d.id, messageView);
            // append to DOM
            enterNode.append(messageView.el);
        }
        function updateMessage(updateNode) {
            const d = dom.getDatum(updateNode);
            if (!d) {
                return;
            }
            const messageView = messageViews.get(d.id);
            if (!messageView) {
                return;
            }
            const messageMetaState = getMessageMetaState(d);
            if (messageMetaState) {
                messageView.setMessageState(messageMetaState);
            }
            if (d.type === "sneak_peek") {
                messageView.setText(d.text);
            }
        }
        function exitMessage(exitNode) {
            const d = dom.getDatum(exitNode);
            if (!d) {
                return;
            }
            const messageView = messageViews.get(d.id);
            if (!messageView) {
                return;
            }
            // remove from DOM
            messageView.dispose();
            // remove reference to view
            messageViews.delete(d.id);
        }
        function getMessageMetaState(message) {
            if (message.type === "system_message" || message.authorId !== myProfileId) {
                return;
            }
            if (message.type === "message" && message.isSending) {
                return "sending";
            }
            const customer = helpers.getChatRecipient(chat);
            if (customer && customer.seenUpTo > message.createdAt) {
                return "seen";
            }
            return "sent";
        }
        function getMessageAuthor(message) {
            return message.type !== "system_message" ? chat.users[message.authorId] : void 0;
        }
    }
}
export class ComposerView {
    constructor(props, api = $API(), store = $Store(), charRouteManager = $CharRouteManager()) {
        this.props = props;
        this.api = api;
        this.store = store;
        this.charRouteManager = charRouteManager;
        this.chatRoute = null;
        this.showActions = false;
        this.selectedActionsIndex = 0;
        this.actions = this.filteredActions = [{
                id: "/transfer",
                title: "Transfer to..",
                visible: true
            }, {
                id: "/close",
                title: "Close chat",
                visible: true
            }, {
                id: "/note",
                title: "Add private note",
                visible: true
            }, {
                id: "/note2",
                title: "Add private note",
                visible: true
            }, {
                id: "/note3",
                title: "Add private note",
                visible: true
            }, {
                id: "/note4",
                title: "Add private note",
                visible: true
            }, {
                id: "/note5",
                title: "Add private note",
                visible: true
            }];
        this.buttons = [{
                id: "start-chat",
                title: "Assign to me",
                handler: () => this.api.startChat(this.props.chatId)
            }];
        this.el = dom.createEl("div", { className: "composer" }, [
            this.actionsEl = dom.createEl("div", { className: "composer-actions" }),
            this.inputContainer = dom.createEl("div", { className: "composer-input-container" }, [
                this.input = dom.createEl("input", { className: "composer-input", placeholder: "Message", autofocus: true }),
                this.submit = dom.createEl("button", { className: "composer-send" }, [
                    createIconEl({ name: "arrow-right-circle", size: "1.5em" })
                ])
            ]),
            this.buttonsEl = dom.createEl("div", { className: "composer-buttons" }, [
                dom.createEl("button", { className: "composer-button" }, ["Assign to me"])
            ])
        ]);
        this.listeners = new helpers.Listeners();
        this.listeners.register(dom.addListener(this.input, "keyup", (event) => this.handleKeyUp(event)));
        this.listeners.register(dom.addListener(this.input, "keydown", (event) => this.handleKeyDown(event)));
        this.listeners.register(dom.addListener(this.input, "input", (event) => this.handleInputChange(event)));
        this.listeners.register(charRouteManager.subscribe(props.chatId, chatRoute => {
            this.chatRoute = chatRoute, this.render();
        }));
    }
    dispose() {
        this.listeners.unbindAll();
        this.el.remove();
    }
    handleKeyUp(event) {
        if (event.defaultPrevented) {
            return; // Do nothing if event already handled
        }
        if (event.code === "Enter") {
            return this.handleSend();
        }
    }
    handleKeyDown(event) {
        if (this.showActions && (event.code === "ArrowDown" || event.code === "ArrowUp")) {
            const direction = event.code === "ArrowDown" ? 1 : -1;
            event.preventDefault();
            if (this.filteredActions[this.selectedActionsIndex + direction]) {
                this.selectedActionsIndex = this.selectedActionsIndex + direction;
            }
            else if (event.code === "ArrowDown") {
                this.selectedActionsIndex = 0;
            }
            else {
                this.selectedActionsIndex = this.filteredActions.length - 1;
            }
        }
        this.render();
    }
    handleInputChange(event) {
        const selectionStart = Math.max(0, this.input.selectionStart, this.input.selectionEnd);
        const actionsFilter = this.input.value.substring(0, selectionStart);
        // filter out actions
        if (actionsFilter.length > 0) {
            this.filteredActions = this.actions.filter(action => action.visible = action.id.indexOf(actionsFilter) === 0);
        }
        else {
            this.filteredActions = this.actions;
        }
        if (this.input.value[0] === "/" && /\s/.test(actionsFilter) === false && this.filteredActions.length > 0) {
            if (this.showActions === false) {
                this.selectedActionsIndex = 0;
            }
            this.showActions = true;
            if (!this.filteredActions[this.selectedActionsIndex]) {
                this.selectedActionsIndex = 0;
            }
        }
        else {
            this.showActions = false;
        }
        this.render();
    }
    handleSend() {
        const text = this.input.value.trim();
        if (text.length === 0) {
            return; // nothing to send
        }
        this.api.sendMessage(this.props.chatId, text).catch(err => {
            console.warn(err);
        });
        this.input.value = "";
    }
    render() {
        this.renderActions();
        this.renderComposer();
        this.renderButtons();
    }
    renderActions() {
        dom.toggleEl(this.actionsEl, this.showActions);
        dom.selectAll(this.actionsEl)
            .data(this.filteredActions, action => action?.id)
            .join(enter => enter.append(dom.createEl("div", { className: "composer-action" }, [
            dom.createEl("div", { textContent: enter.d.title }),
            dom.createEl("div", { className: "text-small", textContent: enter.d.id })
        ])), (update, i) => {
            dom.toggleEl(update, dom.getDatum(update)?.visible);
            update.classList.toggle("active", this.selectedActionsIndex === i);
        }, exit => exit.remove());
    }
    renderComposer() {
        dom.toggleEl(this.inputContainer, this.chatRoute === "my" || this.chatRoute === "supervised");
        // tbd
    }
    renderButtons() {
        dom.toggleEl(this.buttonsEl, this.chatRoute !== "my" && this.chatRoute !== "supervised");
        dom.selectAll(this.buttonsEl)
            .data(this.buttons, button => button?.id)
            .join(enter => enter.append(dom.createEl("button", {
            className: "composer-button",
            textContent: enter.d.title,
            onclick: enter.d.handler
        })), update => update, exit => {
            exit.onclick = null;
            exit.remove();
        });
    }
}
export class MessageView {
    constructor(props) {
        const isMyMessage = props.message.type !== "system_message" && (props.message.authorId === props.myProfileId);
        const author = props.author;
        this.el = dom.createEl("div", {
            className: helpers.classNames("message", {
                "message-right": isMyMessage
            })
        });
        if (props.message.type === "system_message") {
            this.el.append(dom.createEl("div", {
                className: "message-system",
                textContent: props.message.text,
            }));
        }
        else if (props.message.type === "file") {
            if (author && !isMyMessage) {
                this.el.append(dom.createEl("div", { className: "message-avatar" }, [
                    (this.avatar = new AvatarView({
                        src: author.avatar,
                        alt: author.name,
                        size: 36
                    })).el
                ]));
            }
            this.el.append(dom.createEl("div", { className: "message-bubble" }, [
                dom.createEl("div", { className: "message-file" }, [
                    dom.createEl("div", { className: "message-file-icon" }, [
                        createIconEl({ name: "file-earmark", size: 24 })
                    ]),
                    dom.createEl("div", { className: "message-file-details" }, [
                        dom.createEl("div", {
                            className: "message-file-title",
                            textContent: props.message.name,
                        }),
                        dom.createEl("div", {
                            className: "message-file-subtitle",
                            textContent: props.message.size + "mb",
                        })
                    ])
                ]),
                props.messageMetaState ? (this.messageMeta = new MessageMetaView({
                    time: helpers.formatTime(props.message.createdAt),
                    isSticky: true,
                    isFloat: false,
                    inContrast: false,
                    state: props.messageMetaState
                })).el : ""
            ]));
        }
        else if (props.message.type === "filled_form") {
            if (author && !isMyMessage) {
                this.el.append(dom.createEl("div", { className: "message-avatar" }, [
                    (this.avatar = new AvatarView({
                        src: author.avatar,
                        alt: author.name,
                        size: 36
                    })).el
                ]));
            }
            this.el.append(dom.createEl("div", { className: "message-bubble" }, [
                dom.createEl("dl", { className: "definitions-list" }, props.message.fields.reduce((prevVal, field) => {
                    prevVal.push(dom.createEl("dt", {
                        textContent: field.name
                    }));
                    prevVal.push(dom.createEl("dd", {
                        textContent: field.value
                    }));
                    return prevVal;
                }, [])),
                props.messageMetaState ? (this.messageMeta = new MessageMetaView({
                    time: helpers.formatTime(props.message.createdAt),
                    isSticky: true,
                    isFloat: false,
                    inContrast: false,
                    state: props.messageMetaState
                })).el : ""
            ]));
        }
        else if (props.message.type === "rich_message") {
            if (author && !isMyMessage) {
                this.el.append(dom.createEl("div", { className: "message-avatar" }, [
                    (this.avatar = new AvatarView({
                        src: author.avatar,
                        alt: author.name,
                        size: 36
                    })).el
                ]));
            }
            if (props.message.templateId === "quick_replies") {
                this.el.append(dom.createEl("div", { className: "message-rich" }, [
                    dom.createEl("div", { className: "message-rich-title", textContent: "Hello" }, [
                        props.messageMetaState ? (this.messageMeta = new MessageMetaView({
                            time: helpers.formatTime(props.message.createdAt),
                            isSticky: true,
                            isFloat: false,
                            inContrast: false,
                            state: props.messageMetaState
                        })).el : ""
                    ]),
                    dom.createEl("div", { className: "message-buttons" }, [
                        dom.createEl("button", { className: "message-button", textContent: "button.text" }),
                        dom.createEl("button", { className: "message-button", textContent: "button.text" }),
                        dom.createEl("button", { className: "message-button", textContent: "button.text" }),
                        dom.createEl("button", { className: "message-button", textContent: "button.text" }),
                        dom.createEl("button", { className: "message-button", textContent: "button.text" }),
                    ])
                ]));
            }
            else {
                this.el.append(dom.createEl("div", {
                    className: "message-bubble",
                    textContent: "Unsupported type of rich message"
                }));
            }
        }
        else if (props.message.type === "message") {
            if (author && !isMyMessage) {
                this.el.append(dom.createEl("div", { className: "message-avatar" }, [
                    (this.avatar = new AvatarView({
                        src: author.avatar,
                        alt: author.name,
                        size: 36
                    })).el
                ]));
            }
            this.el.append(dom.createEl("div", { className: "message-bubble" }, [
                dom.createEl("span", { className: "message-text", textContent: props.message.text }),
                props.messageMetaState ? (this.messageMeta = new MessageMetaView({
                    time: helpers.formatTime(props.message.createdAt),
                    isSticky: false,
                    isFloat: false,
                    inContrast: false,
                    state: props.messageMetaState
                })).el : ""
            ]));
        }
        else if (props.message.type === "sneak_peek") {
            if (author && !isMyMessage) {
                this.el.append(dom.createEl("div", { className: "message-avatar" }, [
                    (this.avatar = new AvatarView({
                        src: author.avatar,
                        alt: author.name,
                        size: 36
                    })).el
                ]));
            }
            this.el.append(dom.createEl("div", { className: "message-bubble" }, [
                dom.createEl("span", { textContent: "✍️ " }),
                this.textEl = dom.createEl("span", { className: "message-text", textContent: props.message.text }),
                props.messageMetaState ? (this.messageMeta = new MessageMetaView({
                    time: helpers.formatTime(props.message.createdAt),
                    isSticky: false,
                    isFloat: false,
                    inContrast: false,
                    state: props.messageMetaState
                })).el : ""
            ]));
        }
    }
    setMessageState(state) {
        this.messageMeta?.setState(state);
    }
    setText(text) {
        if (this.textEl) {
            this.textEl.textContent = text;
        }
    }
    dispose() {
        this.messageMeta?.dispose();
        this.avatar?.dispose();
        this.el.remove();
    }
}
class MessageMetaView {
    constructor(props) {
        const className = helpers.classNames("message-meta", {
            "message-meta-float": props.isFloat,
            "message-meta-sticky": props.isSticky,
            "message-meta-contrast": props.inContrast,
        });
        this.el = dom.createEl("div", { className: className }, [
            dom.createEl("span", { textContent: props.time }),
            createIconEl({ name: "clock", size: "1em", className: "message-meta-clock" }),
            createIconEl({ name: "check2", size: "1em", className: "message-meta-check2" }),
            createIconEl({ name: "check2-all", size: "1em", className: "message-meta-check2-all" }),
        ]);
        this.el.dataset.state = props.state ?? "";
    }
    setState(state) {
        this.el.dataset.state = state;
    }
    dispose() {
        this.el.remove();
        this.el = null;
    }
}
export class CustomerDetailsView {
    constructor(props, store = $Store(), lazyConnect = $LazyConnect()) {
        this.props = props;
        this.store = store;
        this.lazyConnect = lazyConnect;
        this.connProps = this.storeMapper(this.store.getState());
        this.el = dom.createEl("div", { className: "details" }, [
            dom.createEl("div", { className: "details-header" }, [
                dom.createEl("div", { className: "details-title", textContent: "Details" }),
                dom.createEl("button", {
                    className: "details-close hidden", innerHTML: `
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          </svg>
        `
                }),
            ]),
            dom.createEl("div", { className: "details-body" }, [
                dom.createEl("div", { className: "details-row" }, [
                    this.detailsAvatar = dom.createEl("div", { className: "details-avatar" }),
                    dom.createEl("div", {}, [
                        this.name = dom.createEl("div", { className: "text-primary", textContent: this.connProps.user ? this.connProps.user.name : "" }),
                        this.email = dom.createEl("div", { className: "text-small", textContent: this.connProps.user ? this.connProps.user.email : "" })
                    ])
                ]),
                this.locationRow = dom.createEl("div", { className: "details-row" }, [
                    dom.createEl("div", {
                        className: "details-icon", innerHTML: `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-geo-alt" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M12.166 8.94C12.696 7.867 13 6.862 13 6A5 5 0 0 0 3 6c0 .862.305 1.867.834 2.94.524 1.062 1.234 2.12 1.96 3.07A31.481 31.481 0 0 0 8 14.58l.208-.22a31.493 31.493 0 0 0 1.998-2.35c.726-.95 1.436-2.008 1.96-3.07zM8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10z" />
              <path fill-rule="evenodd" d="M8 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            </svg>
          `
                    }),
                    this.location = dom.createEl("div", { className: "text-primary", textContent: "..." })
                ]),
                this.ipRow = dom.createEl("div", { className: "details-row" }, [
                    dom.createEl("div", {
                        className: "details-icon", innerHTML: `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-wifi" viewBox="0 0 16 16">
              <path d="M15.385 6.115a.485.485 0 0 0-.048-.736A12.443 12.443 0 0 0 8 3 12.44 12.44 0 0 0 .663 5.379a.485.485 0 0 0-.048.736.518.518 0 0 0 .668.05A11.448 11.448 0 0 1 8 4c2.507 0 4.827.802 6.717 2.164.204.148.489.13.668-.049z" />
              <path d="M13.229 8.271c.216-.216.194-.578-.063-.745A9.456 9.456 0 0 0 8 6c-1.905 0-3.68.56-5.166 1.526a.48.48 0 0 0-.063.745.525.525 0 0 0 .652.065A8.46 8.46 0 0 1 8 7a8.46 8.46 0 0 1 4.577 1.336c.205.132.48.108.652-.065zm-2.183 2.183c.226-.226.185-.605-.1-.75A6.472 6.472 0 0 0 8 9c-1.06 0-2.062.254-2.946.704-.285.145-.326.524-.1.75l.015.015c.16.16.408.19.611.09A5.478 5.478 0 0 1 8 10c.868 0 1.69.201 2.42.56.203.1.45.07.611-.091l.015-.015zM9.06 12.44c.196-.196.198-.52-.04-.66A1.99 1.99 0 0 0 8 11.5a1.99 1.99 0 0 0-1.02.28c-.238.14-.236.464-.04.66l.706.706a.5.5 0 0 0 .708 0l.707-.707z" />
            </svg>
          `
                    }),
                    this.ip = dom.createEl("div", { className: "text-primary", textContent: "..." })
                ]),
                this.generalInfoRow = dom.createEl("div", { className: "details-row" }, [
                    this.generalInfoList = dom.createEl("dl", { className: "definitions-list" })
                ]),
                this.sessionFieldsRow = dom.createEl("div", { className: "details-row" }, [
                    dom.createEl("div", {}, [
                        dom.createEl("div", { className: "regular-text py-2", textContent: "Session Fields" }),
                        this.sessionFieldsList = dom.createEl("dl", { className: "definitions-list" })
                    ])
                ]),
                this.lastPagesRow = dom.createEl("div", { className: "details-row" }, [
                    dom.createEl("div", {}, [
                        dom.createEl("div", { className: "regular-text py-2", textContent: "Last Pages" }),
                        this.lastPagesList = dom.createEl("dl", { className: "definitions-list" })
                    ])
                ]),
                /**
                 * @todo add handlers
                 */
                dom.createEl("div", { className: "details-actions hidden" }, [
                    dom.createEl("a", { className: "details-action", textContent: "Edit visitor" }),
                    dom.createEl("a", { className: "details-action details-action-destroy", textContent: "Ban visitor" })
                ])
            ])
        ]);
        this.storeListener = lazyConnect.connect(s => this.storeMapper(s), p => this.render(p));
    }
    dispose() {
        this.el.remove();
        this.avatar?.dispose();
        this.storeListener.unbind();
    }
    storeMapper(state) {
        const chat = state.chatsByIds[this.props.chatId];
        const customer = chat ? helpers.getChatRecipient(chat) : void 0;
        return { user: customer };
    }
    render(props) {
        const user = props.user;
        const lastVisit = user && user.type === "customer" ? user.lastVisit : void 0;
        const statistics = user && user.type === "customer" ? user.statistics : void 0;
        const fields = user && user.type === "customer" ? user.fields : void 0;
        const geolocation = lastVisit ? lastVisit.geolocation : void 0;
        this.name.textContent = user ? user.name : "Unnamed customer";
        this.email.textContent = user ? user.email : "-";
        this.location.textContent = geolocation ? helpers.stringifyGeolocation(geolocation) : "Mars 🛸";
        this.ip.textContent = lastVisit ? lastVisit.ip : "127.0.0.1";
        // show or hide row
        dom.toggleEl(this.locationRow, Boolean(geolocation));
        dom.toggleEl(this.ipRow, Boolean(lastVisit));
        this.renderAvatar(user);
        this.renderGeneralInfo(lastVisit, statistics);
        this.renderSessionFields(fields);
        this.renderLastPages(lastVisit?.lastPages);
    }
    renderAvatar(user) {
        dom.toggleEl(this.detailsAvatar, Boolean(user));
        if (!user) {
            this.avatar?.dispose();
        }
        else {
            if (!this.avatar) {
                this.avatar = new AvatarView({
                    size: 48,
                    alt: user.name,
                    src: user.avatar
                });
                this.detailsAvatar.append(this.avatar.el);
            }
            else {
                this.avatar.setAlt(user.name);
                this.avatar.setSrc(user.avatar);
            }
        }
    }
    renderGeneralInfo(lastVisit, statistics) {
        dom.toggleEl(this.generalInfoList, Boolean(lastVisit && statistics));
        const data = [];
        if (lastVisit?.referrer) {
            data.push("Referrer", lastVisit.referrer);
        }
        if (lastVisit?.userAgent) {
            data.push("Browser", lastVisit.userAgent);
        }
        if (statistics) {
            data.push("Total visits", String(statistics.visitsCount));
        }
        this.renderList(this.generalInfoList, data);
    }
    renderSessionFields(fields) {
        const data = (fields || []).reduce((prev, curr) => {
            return prev.push(curr.name, curr.value), prev;
        }, []);
        dom.toggleEl(this.sessionFieldsRow, data.length > 0);
        this.renderList(this.sessionFieldsList, data);
    }
    renderLastPages(lastPages) {
        const data = (lastPages || []).reduce((prev, curr) => {
            return prev.push(curr.title, curr.title), prev;
        }, []);
        dom.toggleEl(this.lastPagesRow, data.length > 0);
        this.renderList(this.lastPagesList, data);
    }
    renderList(container, data) {
        dom.selectAll(container)
            .data(data, (d, i) => i)
            .join(enter, update, exit);
        function enter(enterNode, i) {
            enterNode.append(dom.createEl(i % 2 ? "dd" : "dt", { textContent: enterNode.d }));
        }
        function update(updateNode) {
            updateNode.textContent = dom.getDatum(updateNode) ?? "n/a";
        }
        function exit(exitNode) {
            exitNode.remove();
        }
    }
}
export class AvatarView {
    constructor(props) {
        this.props = props;
        const className = helpers.classNames("avatar", { "avatar-no-img": !props.src });
        const altText = helpers.getInitials(props.alt);
        this.el = dom.createEl("div", { className: className }, [
            props.src ? (this.img = dom.createEl("img", {
                className: "avatar-img",
                src: props.src,
                height: props.size,
                width: props.size,
            })) : "",
            this.alt = dom.createEl("div", { className: "avatar-alt", textContent: altText })
        ]);
        this.el.style.width = `${props.size}px`;
        this.el.style.height = `${props.size}px`;
        this.alt.style.lineHeight = `${props.size}px`;
        if (this.img) {
            this.imgListener = dom.addListener(this.img, "error", this.handleImgError);
        }
    }
    dispose() {
        this.imgListener?.dispose();
        this.el.remove();
    }
    setAlt(alt) {
        if (this.props.alt === alt)
            return; // no changes
        if (this.img)
            this.img.alt = alt;
        this.alt.textContent = helpers.getInitials(alt);
        this.props.alt === alt;
    }
    setSrc(src) {
        if (this.props.src === src) {
            return; // no changes
        }
        if (this.img && src) {
            this.img.src = src;
        }
        /**
         * @todo handle case when src has changed to empty
         */
        this.props.src = src;
    }
    handleImgError() {
        this.el.classList.add("avatar-no-img");
    }
}
export function createIconEl(props) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const size = String(props.size ?? 16);
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", "0 0 16 16");
    if (props.className) {
        svg.setAttribute("class", props.className);
    }
    if (props.name === "moon") {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill-rule", "evenodd");
        path.setAttribute("d", "M14.53 10.53a7 7 0 0 1-9.058-9.058A7.003 7.003 0 0 0 8 15a7.002 7.002 0 0 0 6.53-4.47z");
        svg.appendChild(path);
    }
    else if (props.name === "search") {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill-rule", "evenodd");
        path2.setAttribute("fill-rule", "evenodd");
        path.setAttribute("d", "M10.442 10.442a1 1 0 0 1 1.415 0l3.85 3.85a1 1 0 0 1-1.414 1.415l-3.85-3.85a1 1 0 0 1 0-1.415z");
        path2.setAttribute("d", "M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z");
        svg.appendChild(path);
        svg.appendChild(path2);
    }
    else if (props.name === "file-earmark") {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M4 0h5.5v1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h1V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z");
        path2.setAttribute("d", "M9.5 3V0L14 4.5h-3A1.5 1.5 0 0 1 9.5 3z");
        svg.appendChild(path);
        svg.appendChild(path2);
    }
    else if (props.name === "arrow-right-circle") {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill-rule", "evenodd");
        path2.setAttribute("fill-rule", "evenodd");
        path.setAttribute("d", "M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z");
        path2.setAttribute("d", "M4 8a.5.5 0 0 0 .5.5h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5A.5.5 0 0 0 4 8z");
        svg.appendChild(path);
        svg.appendChild(path2);
    }
    else if (props.name === "clock") {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill-rule", "evenodd");
        path2.setAttribute("fill-rule", "evenodd");
        path.setAttribute("d", "M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm8-7A8 8 0 1 1 0 8a8 8 0 0 1 16 0z");
        path2.setAttribute("d", "M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z");
        svg.appendChild(path);
        svg.appendChild(path2);
    }
    else if (props.name === "check2") {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill-rule", "evenodd");
        path.setAttribute("d", "M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z");
        svg.appendChild(path);
    }
    else if (props.name === "check2-all") {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill-rule", "evenodd");
        path2.setAttribute("fill-rule", "evenodd");
        path.setAttribute("d", "M12.354 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z");
        path2.setAttribute("d", "M6.25 8.043l-.896-.897a.5.5 0 1 0-.708.708l.897.896.707-.707zm1 2.414l.896.897a.5.5 0 0 0 .708 0l7-7a.5.5 0 0 0-.708-.708L8.5 10.293l-.543-.543-.707.707z");
        svg.appendChild(path);
        svg.appendChild(path2);
    }
    else if (props.name === "caret-down-fill") {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill-rule", "evenodd");
        path.setAttribute("d", "M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z");
        svg.appendChild(path);
    }
    else {
        throw new Error("Unsupported name for icons");
    }
    return svg;
}
export class CheckboxView extends helpers.TypedEventEmitter {
    constructor(props) {
        super();
        this.el = dom.createEl("span", { className: "checkbox-container" }, [
            this.input = dom.createEl("input", { type: "checkbox", className: "checkbox", id: props.id }),
            this.label = dom.createEl("label", { className: "checkbox-label", htmlFor: props.id })
        ]);
        this.changeListener = dom.addListener(this.input, "change", event => this.handleChange(event));
        this.clickListener = dom.addListener(this.el, "click", event => {
            event.stopPropagation();
        });
    }
    dispose() {
        this.changeListener.unbind();
        this.clickListener.unbind();
        this.label = null;
        this.input = null;
        this.el.remove();
        this.el = null;
    }
    getValue() {
        return this.input.checked;
    }
    setValue(value) {
        this.input.checked = value;
    }
    handleChange(event) {
        this.emit("change", {
            nativeEvent: event,
            value: this.input.checked
        });
    }
}
class DropdownView {
    constructor(props) {
        this.el = dom.createEl("div", { className: "dropdown" }, [
            props.content,
            dom.createEl("div", { className: "dropdown-menu" }, props.menuContent)
        ]);
        this.listeners = new helpers.Listeners(dom.addListener(this.el, "mouseenter", () => this.handleMouseEnter()), dom.addListener(this.el, "mouseleave", () => this.handleMouseLeave()));
    }
    dispose() {
        debugger;
        clearTimeout(this.timerId);
        this.listeners.unbindAll();
        this.el.remove();
        this.el = null;
    }
    handleMouseEnter() {
        clearTimeout(this.timerId);
        this.el.classList.add("dropdown-mouse-enter");
    }
    handleMouseLeave() {
        clearTimeout(this.timerId);
        this.timerId = setTimeout(() => {
            this.el.classList.remove("dropdown-mouse-enter");
        }, 200);
    }
}
