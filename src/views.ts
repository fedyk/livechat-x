import * as dom from "./dom.js";
import * as helpers from "./helpers.js";
import { $Store, Store } from "./store.js";
import { Chat, ChatRoute, Message, MyProfile, RoutingStatus, User } from "./types.js";
import { ReverseScroll } from "./reverse-scroll.js";
import { $API, API } from "./api.js";
import { getAccountsUrl } from "./config.js";
import { $CharRouteManager } from "./chat-route-manager.js";
import { ChatRouter } from "./services.js";

export class GridView implements helpers.Disposable {
  el: Element
  sidebar: GridSidebarView
  main: MainView

  constructor() {
    this.el = dom.createEl("div", {
      className: "grid"
    }, [
      (this.sidebar = new GridSidebarView()).el,
      (this.main = new MainView()).el
    ])
  }

  dispose() {
    this.sidebar.dispose()
    this.main.dispose()
    this.el.remove()
    this.el = null!
  }
}

export class GridSidebarView implements helpers.Disposable {
  el: Element
  header: HeaderView
  chatsList: ChatsListView

  constructor() {
    this.el = dom.createEl("div", {
      className: "grid-sidebar"
    }, [
      (this.header = new HeaderView()).el,
      (this.chatsList = new ChatsListView()).el
    ])
  }

  dispose() {
    this.header.dispose()
    this.chatsList.dispose()
    this.el.remove()
  }
}

interface HeaderViewConnectProps {
  myProfile: MyProfile | null
  myRoutingStatus: RoutingStatus | null
}

export class HeaderView implements helpers.Disposable {
  store: Store
  api: API
  el: Element
  routingCheckbox: CheckboxView
  avatarView?: AvatarView
  dropdown: DropdownView
  profile: Element
  search: Element
  storeListener: helpers.Listener
  routingListener: helpers.Listener

  constructor(store = $Store(), api = $API()) {
    this.store = store
    this.api = api
    this.routingCheckbox = new CheckboxView({ id: "router_status" })

    this.el = dom.createEl("div", { className: "header" }, [
      (
        this.dropdown = new DropdownView({
          content: (
            this.profile = dom.createEl("div", { className: "dropdown-profile" })
          ),
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
        })
      ).el,
      dom.createEl("div", { className: "temp-logo", textContent: "LiveChat X"}),
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
    ])

    this.routingListener = this.routingCheckbox.addListener("change", () => {
      this.changeRoutingStatus()
    })

    this.storeListener = store.connect<HeaderViewConnectProps>(state => {
      const myProfile = state.myProfile

      return {
        myProfile,
        myRoutingStatus: myProfile ? state.routingStatuses[myProfile.id] : null
      }
    }, props => this.render(props))
  }

  dispose() {
    this.storeListener.unbind()
    this.avatarView?.dispose()
    this.routingCheckbox.dispose()
    this.dropdown.dispose()
    this.profile = null!
    this.search = null!
    this.el.remove()
    this.el = null!
  }

  render(props: HeaderViewConnectProps) {
    this.renderMyProfileAvatar(props.myProfile)
    this.renderMyRoutingStatus(props.myRoutingStatus)
  }

  renderMyProfileAvatar(myProfile: MyProfile | null) {
    if (myProfile) {
      if (!this.avatarView) {
        this.profile.append(
          (this.avatarView = new AvatarView({
            alt: helpers.getInitials(myProfile.name),
            url: myProfile.avatar,
            size: 36
          })).el,
          createIconEl({ name: "caret-down-fill", size: "10" })
        )
      }
      else {
        this.avatarView.setAlt(helpers.getInitials(myProfile.name))
        this.avatarView.setAvatar(myProfile.avatar)
      }
    }
    else {
      this.avatarView?.dispose()
      this.profile.textContent = ""
    }
  }

  renderMyRoutingStatus(myRoutingStatus: RoutingStatus | null) {
    if (myRoutingStatus) {
      this.routingCheckbox.setValue(myRoutingStatus === "accepting_chats")
    }
  }

  changeRoutingStatus() {
    const acceptingChats = this.routingCheckbox.getValue()

    this.api.setRoutingStatus(acceptingChats ? "accepting_chats" : "not_accepting_chats")
      .catch(err => console.error(err))
  }
}

interface ChatsListConnectedProps {
  chatIds: string[],
}

export class ChatsListView implements helpers.Disposable {
  el: Element
  chatsListItems: Map<string, ChatsListItemView>
  storeListener: helpers.Listener

  constructor(store = $Store()) {
    this.chatsListItems = new Map()

    this.el = dom.createEl("div", { className: "chats-list" })

    this.storeListener = store.connect<ChatsListConnectedProps>(
      state => ({
        chatIds: state.chatIds
      }),
      data => this.render(data)
    )
  }

  dispose() {
    this.el.remove()
    this.el = null!
  }

  render(data: ChatsListConnectedProps) {
    const chatsListItems = this.chatsListItems

    dom.selectAll(this.el)
      .data(data.chatIds, chatId => chatId)
      .join(
        enter => enterChatsListItem(enter),
        update => updateChatsListItem(update),
        exit => exitChatsListItem(exit)
      )

    function enterChatsListItem(enter: dom.EnterNode<string>) {
      const chatsListItem = new ChatsListItemView({ chatId: enter.d })

      chatsListItems.set(enter.d, chatsListItem)

      enter.append(chatsListItem.el)
    }

    function updateChatsListItem(update: dom.ElementWithDatum<string>) {

    }

    function exitChatsListItem(exit: dom.ElementWithDatum<string>) {
      const d = dom.getDatum(exit)

      if (!d) {
        return
      }

      const chatsListItem = chatsListItems.get(d)

      if (chatsListItem) {
        chatsListItem.dispose()
      }
      else {
        console.warn("unexpected missed instance for element"), exit.remove()
      }
    }
  }
}


/**
 * This view handle only child content. the wrapper should be passed from outside
 */

interface ChatsListItemProps {
  chatId: string
}

interface ChatsListItemConnectedProps {
  chat?: Chat
  selectedChatId: string | null
}

export class ChatsListItemView implements helpers.Disposable {
  el: Element
  chatId: string
  itemAvatarEl: Element
  avatar: AvatarView
  chatSummaryEl: Element
  chatTitle: Element
  chatMeta: Element
  chatSubtitle: Element
  storeListener: helpers.Listener
  clickListener: helpers.Listener
  store: Store

  constructor(
    props: ChatsListItemProps,
    store = $Store()
  ) {
    this.chatId = props.chatId
    this.store = store
    this.el = dom.createEl("div", { className: "chats-list-item", }, [
      this.itemAvatarEl = dom.createEl("div", {
        className: "chat-list-item-avatar"
      },
        [
          (this.avatar = new AvatarView({
            url: "https://i.pravatar.cc/512?img=3",
            size: 48,
            alt: "TU",
          })).el
        ]),
      this.chatSummaryEl = dom.createEl("div", { className: "chat-summary", }, [
        dom.createEl("div", { className: "chat-summary-row", }, [
          this.chatTitle = dom.createEl("div", { className: "chat-title", textContent: "Unnamed visitor" }),
          this.chatMeta = dom.createEl("div", { className: "chat-meta" })
        ]),
        this.chatSubtitle = dom.createEl("div", { className: "chat-subtitle" })
      ])
    ])

    this.clickListener = dom.addListener(this.el, "click", () => this.selectChat())

    this.storeListener = store.connect<ChatsListItemConnectedProps>(state => ({
      chat: state.chatsByIds[props.chatId],
      selectedChatId: state.selectedChatId,
    }), props => this.render(props))
  }

  dispose() {
    this.storeListener.unbind()
    this.clickListener.unbind()
    this.chatSubtitle = null!
    this.chatMeta = null!
    this.chatTitle = null!
    this.chatSummaryEl = null!
    this.avatar.dispose()
    this.itemAvatarEl.remove()
  }

  render(props: ChatsListItemConnectedProps) {
    if (props.chat) {
      const customer = helpers.getChatCustomer(props.chat)
      const lastMessage = helpers.getChatLastMessage(props.chat)

      this.chatTitle.textContent = customer?.name ?? "Unnamed visitor"

      if (lastMessage) {
        this.chatSubtitle.textContent = helpers.stringifyMessage(lastMessage)
      }
    }

    // update selected item
    if (this.chatId === props.selectedChatId) {
      this.el.classList.add("selected")
    }
    else {
      this.el.classList.remove("selected")
    }
  }

  selectChat() {
    this.store.setSelectedChatId(this.chatId)
  }
}


export class MainView implements helpers.Disposable {
  el: Element
  chatFeed: ChatsView

  constructor() {
    this.el = dom.createEl("div", { className: "grid-main" }, [
      (this.chatFeed = new ChatsView()).el
    ])
  }

  dispose() {
    this.chatFeed.dispose()
    this.el.remove()
    this.el = null!
  }
}

interface ChatsViewConnectedProps {
  selectedChatId: string | null
}

export class ChatsView implements helpers.Disposable {
  el: Element
  lruCache: helpers.LRUCache<ChatView>
  cacheListener: helpers.Listener
  storeListener: helpers.Listener

  constructor(store = $Store()) {
    this.lruCache = new helpers.LRUCache(10)
    this.el = dom.createEl("div", { className: "chats" })

    this.cacheListener = this.lruCache.addListener("removed", chatView => {
      chatView.dispose()
    })

    this.storeListener = store.connect<ChatsViewConnectedProps>(state => ({
      selectedChatId: state.selectedChatId
    }), props => this.render(props))
  }

  dispose() {
    this.lruCache.dispose()
    this.cacheListener.unbind()
    this.storeListener.unbind()
    this.el.remove()
    this.el = null!
  }

  render(props: ChatsViewConnectedProps) {
    if (!props.selectedChatId) {
      this.el.classList.add("chats--empty")
    }
    else {
      this.el.classList.remove("chats--empty")
    }

    if (props.selectedChatId) {
      let chatView = this._getChatViewInstance(props.selectedChatId)

      // hide other ChatViews
      this.lruCache.forEach(v => {
        if (v === chatView) {
          v.show()
        }
        else {
          v.hide()
        }
      })
    }
  }

  /**
   * create / get from cache a chat view
   * @private
   */
  _getChatViewInstance(chatId: string): ChatView {
    let chatView = this.lruCache.get(chatId)

    if (chatView) {
      return chatView
    }

    chatView = new ChatView({ chatId: chatId })

    return this.el.append(chatView.el),
      this.lruCache.set(chatId, chatView),
      chatView
  }
}


interface ChatViewProps {
  chatId: string
}

export class ChatView implements helpers.Disposable {
  chatId: string
  el: Element
  chat: ChatFeedView
  // details: DetailsView
  api: API
  abort: AbortController

  constructor(props: ChatViewProps, api = $API()) {
    this.api = api
    this.abort = new AbortController()
    this.chatId = props.chatId
    this.el = dom.createEl("div", { className: "chat-container" }, [
      (this.chat = new ChatFeedView({ chatId: props.chatId })).el,
      // (this.details = new DetailsView({ chatId: props.chatId })).el
    ])

    console.warn("uncomment this.details = ... above")
  }

  dispose() {
    this.abort.abort()
    this.chat.dispose()
    // this.details.dispose()
    this.el.remove()
    this.el = null!
  }

  show() {
    this.el.classList.remove("hidden")

    this.api.syncIncompleteThreadsAsync(this.chatId, this.abort.signal)
      .catch(err => console.warn(err))
  }

  hide() {
    this.el.classList.add("hidden")
  }
}

interface ChatFeedViewProps {
  chatId: string
}

export class ChatFeedView implements helpers.Disposable {
  el: Element
  chatHeader: ChatHeaderView
  chatBody: ChatBodyView
  chatComposer: ComposerView

  constructor(props: ChatFeedViewProps, store = $Store()) {
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
    ])
  }

  dispose() {
    this.chatHeader.dispose()
    this.chatBody.dispose()
    this.chatComposer.dispose()
    this.el.remove()
    this.el = null!
  }
}
export class ChatHeaderView implements helpers.Disposable {
  el: Element

  constructor() {
    this.el = dom.createEl("div", { className: "chat-header" })

    this.el.innerHTML = `
    <div class="chat-header-avatar">
              <div class="avatar" style="height: 36px; width: 36px;">
                <img src="https://i.pravatar.cc/512?img=3" alt="AT" height="36px" width="36px" />
              </div>
            </div>
            <div class="chat-header-details">
              <div class="chat-header-title">Unnamed Customer</div>
            </div>
            `
  }

  dispose() {
    this.el.remove()
    this.el = null!
  }
}

interface ChatBodyViewProps {
  chatId: string
}

interface ChatBodyViewConnectedProps {
  chat?: Chat
  myProfileId?: string
}

export class ChatBodyView implements helpers.Disposable {
  el: Element
  props: ChatBodyViewProps
  messages: Map<string, MessageView>
  messagesEl: Element
  reverseScroll: ReverseScroll
  storeListener: helpers.Listener

  constructor(props: ChatBodyViewProps, store = $Store()) {
    this.messages = new Map()
    this.props = props
    this.el = dom.createEl("div", { className: "chat-body" }, [
      this.messagesEl = dom.createEl("div", { className: "messages" })
    ])
    this.reverseScroll = new ReverseScroll(this.el, this.messagesEl)
    this.storeListener = store.connect<ChatBodyViewConnectedProps>(state => {
      return {
        chat: state.chatsByIds[this.props.chatId],
        myProfileId: state.myProfile?.id,
      }
    }, props => this.render(props))
  }

  dispose() {
    this.storeListener.unbind()
    this.reverseScroll.dispose()
    this.el.remove()
    this.el = null!
  }

  render(props: ChatBodyViewConnectedProps) {
    if (!props.chat || !props.myProfileId) {
      return
    }

    const messages = helpers.getChatMessages(props.chat)

    this.renderMessages(messages, props.chat, props.myProfileId)
  }

  renderMessages(messages: Message[], chat: Chat, myProfileId: string) {
    const messageViews = this.messages

    dom.selectAll(this.messagesEl)
      .data(messages, m => m?.id)
      .join(
        enter => enterMessage(enter),
        update => updateMessage(update),
        exit => exitMessage(exit)
      )

    function enterMessage(enterNode: dom.EnterNode<Message>) {
      const messageView = new MessageView({
        message: enterNode.d,
        author: getMessageAuthor(enterNode.d),
        messageMetaState: getMessageMetaState(enterNode.d),
        myProfileId: myProfileId,
      })

      // save reference to View
      messageViews.set(enterNode.d.id, messageView)

      // append to DOM
      enterNode.append(messageView.el)
    }

    function updateMessage(updateNode: dom.ElementWithDatum<Message>) {
      const d = dom.getDatum(updateNode)

      if (!d) {
        return
      }

      const messageView = messageViews.get(d.id)

      if (!messageView) {
        return
      }

      const messageMetaState = getMessageMetaState(d)

      if (messageMetaState) {
        messageView.setMessageState(messageMetaState)
      }

      if (d.type === "sneak_peek") {
        messageView.setText(d.text)
      }
    }

    function exitMessage(exitNode: dom.ElementWithDatum<Message>) {
      const d = dom.getDatum(exitNode)

      if (!d) {
        return
      }

      const messageView = messageViews.get(d.id)

      if (!messageView) {
        return
      }

      // remove from DOM
      messageView.dispose()

      // remove reference to view
      messageViews.delete(d.id)
    }

    function getMessageMetaState(message: Message): void | MessageMetaState {
      if (message.type === "system_message" || message.authorId !== myProfileId) {
        return
      }

      if (message.type === "message" && message.isSending) {
        return "sending"
      }

      const customer = helpers.getChatCustomer(chat)

      if (customer && customer.seenUpTo > message.createdAt) {
        return "seen"
      }

      return "sent"
    }

    function getMessageAuthor(message: Message) {
      return message.type !== "system_message" ? chat.users[message.authorId] : void 0
    }
  }
}

interface ComposerViewProps {
  chatId: string
}

export class ComposerView implements helpers.Disposable {
  el: HTMLDivElement
  actions: Element
  inputContainer: Element
  input: HTMLInputElement
  submit: Element
  buttons: Element
  listeners: helpers.Listeners

  constructor(
    protected props: ComposerViewProps,
    protected api = $API(),
    protected store = $Store(),
    protected charRouteManager = $CharRouteManager(),
  ) {
    this.el = dom.createEl("div", { className: "composer" }, [
      this.actions = dom.createEl("div", { className: "composer-actions" }, [
        // dom.createEl("div", { className: "composer-action active", textContent: "/transfer" }),
        // dom.createEl("div", { className: "composer-action", textContent: "/close" }),
        // dom.createEl("div", { className: "composer-action", textContent: "/note" }),
      ]),
      this.inputContainer = dom.createEl("div", { className: "composer-input-container" }, [
        this.input = dom.createEl("input", { className: "composer-input", placeholder: "Message", autofocus: true }),
        this.submit = dom.createEl("button", { className: "composer-send" }, [
          createIconEl({ name: "arrow-right-circle", size: "1.5em" })
        ])
      ]),
      this.buttons = dom.createEl("div", { className: "composer-buttons" }, [
        dom.createEl("button", { className: "composer-button" }, ["Assign to me"])
      ])
    ])

    this.listeners = new helpers.Listeners(
      dom.addListener(this.input, "keyup", (event) => this.handleKeyUp(event)),
    )

    this.listeners.register(charRouteManager.subscribe(props.chatId, chatRoute => {
      this.renderChatRouter(chatRoute)
    }))
  }

  dispose() {
    this.listeners.unbindAll()
    this.el.remove()
  }

  protected handleKeyUp(event: KeyboardEvent) {
    if (event.defaultPrevented) {
      return // Do nothing if event already handled
    }

    if (event.code === "Enter") {
      return this.handleSend()
    }
  }

  protected handleSend() {
    const text = this.input.value.trim()

    if (text.length === 0) {
      return // nothing to send
    }

    this.api.sendMessage(this.props.chatId, text).catch(err => {
      console.warn(err)
    })

    this.input.value = ""
  }

  protected renderChatRouter(chatRoute: ChatRoute) {
    if (chatRoute === "queued" || chatRoute === "unassigned" || chatRoute === "pinned") {
      dom.toggleEl(this.actions, false)
      dom.toggleEl(this.inputContainer, false)
      dom.toggleEl(this.buttons, true)
      this.renderActionsButtons([{
        title: "Assign to me",
        handler: () => this.api.startChat(this.props.chatId)
      }])
    }
    else if (chatRoute === "closed") {
      console.error(new Error("TODO"))
    }
    else if (chatRoute === "other") {
      console.error(new Error("TODO"))
    }
    else if (chatRoute === "supervised") {
      console.error(new Error("TODO"))
    }
    else if (chatRoute === "my") {
      dom.toggleEl(this.actions, false)
      dom.toggleEl(this.inputContainer, true)
      dom.toggleEl(this.buttons, false)
      this.renderActionsButtons([])
    }
  }

  protected renderActionsButtons<T extends { title: string; handler: () => void }>(actions: T[]) {
    dom.selectAll(this.buttons)
      .data(actions, (d, i) => i)
      .join(
        enter,
        update,
        exit
      )

    function enter(enterNode: dom.EnterNode<T>) {
      enterNode.append(dom.createEl("button", {
        className: "composer-button",
        textContent: enterNode.d.title,
        onclick: enterNode.d.handler
      }))
    }

    function update(updateNode: dom.ElementWithDatum<T>) {
      const d = dom.getDatum(updateNode)

      if (d) {
        updateNode.textContent = d.title
        updateNode.onclick = d.handler
      }
    }

    function exit(exitNode: dom.ElementWithDatum<T>) {
      exitNode.onclick = null
      exitNode.remove()
    }
  }
}

export interface MessageViewProps {
  message: Message
  author?: User
  myProfileId: string
  messageMetaState: MessageMetaState | void
}

export class MessageView implements helpers.Disposable {
  el: Element
  avatar?: AvatarView
  textEl?: HTMLSpanElement
  messageMeta?: MessageMetaView

  constructor(props: MessageViewProps) {
    const isMyMessage = props.message.type !== "system_message" && (props.message.authorId === props.myProfileId)
    const author = props.author

    this.el = dom.createEl("div", {
      className: helpers.classNames("message", {
        "message-right": isMyMessage
      })
    })

    if (props.message.type === "system_message") {
      this.el.append(
        dom.createEl("div", {
          className: "message-system",
          textContent: props.message.text,
        })
      )
    }
    else if (props.message.type === "file") {
      if (author && !isMyMessage) {
        this.el.append(
          dom.createEl("div", { className: "message-avatar" }, [
            (this.avatar = new AvatarView({
              url: author.avatar,
              alt: helpers.getInitials(author.name),
              size: 36
            })).el
          ])
        )
      }

      this.el.append(
        dom.createEl("div", { className: "message-bubble" }, [
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
        ])
      )
    }
    else if (props.message.type === "filled_form") {
      if (author && !isMyMessage) {
        this.el.append(
          dom.createEl("div", { className: "message-avatar" }, [
            (this.avatar = new AvatarView({
              url: author.avatar,
              alt: helpers.getInitials(author.name),
              size: 36
            })).el
          ])
        )
      }

      this.el.append(
        dom.createEl("div", { className: "message-bubble" }, [
          dom.createEl(
            "dl",
            { className: "definitions-list" },
            props.message.fields.reduce<HTMLElement[]>((prevVal, field) => {
              prevVal.push(dom.createEl("dt", {
                textContent: field.name
              }))
              prevVal.push(dom.createEl("dd", {
                textContent: field.value
              }))

              return prevVal;
            }, [])
          ),
          props.messageMetaState ? (this.messageMeta = new MessageMetaView({
            time: helpers.formatTime(props.message.createdAt),
            isSticky: true,
            isFloat: false,
            inContrast: false,
            state: props.messageMetaState
          })).el : ""
        ])
      )
    }
    else if (props.message.type === "rich_message") {
      if (author && !isMyMessage) {
        this.el.append(
          dom.createEl("div", { className: "message-avatar" }, [
            (this.avatar = new AvatarView({
              url: author.avatar,
              alt: helpers.getInitials(author.name),
              size: 36
            })).el
          ])
        )
      }

      if (props.message.templateId === "quick_replies") {
        this.el.append(
          dom.createEl("div", { className: "message-rich" }, [
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
          ]),
        )
      }
      else {
        this.el.append(
          dom.createEl("div", {
            className: "message-bubble",
            textContent: "Unsupported type of rich message"
          })
        )
      }
    }
    else if (props.message.type === "message") {
      if (author && !isMyMessage) {
        this.el.append(
          dom.createEl("div", { className: "message-avatar" }, [
            (this.avatar = new AvatarView({
              url: author.avatar,
              alt: helpers.getInitials(author.name),
              size: 36
            })).el
          ])
        )
      }

      this.el.append(
        dom.createEl("div", { className: "message-bubble" }, [
          dom.createEl("span", { className: "message-text", textContent: props.message.text }),
          props.messageMetaState ? (this.messageMeta = new MessageMetaView({
            time: helpers.formatTime(props.message.createdAt),
            isSticky: false,
            isFloat: false,
            inContrast: false,
            state: props.messageMetaState
          })).el : ""
        ]),
      )
    }
    else if (props.message.type === "sneak_peek") {
      if (author && !isMyMessage) {
        this.el.append(
          dom.createEl("div", { className: "message-avatar" }, [
            (this.avatar = new AvatarView({
              url: author.avatar,
              alt: helpers.getInitials(author.name),
              size: 36
            })).el
          ])
        )
      }

      this.el.append(
        dom.createEl("div", { className: "message-bubble" }, [
          dom.createEl("span", { textContent: "✍️ " }),
          this.textEl = dom.createEl("span", { className: "message-text", textContent: props.message.text }),
          props.messageMetaState ? (this.messageMeta = new MessageMetaView({
            time: helpers.formatTime(props.message.createdAt),
            isSticky: false,
            isFloat: false,
            inContrast: false,
            state: props.messageMetaState
          })).el : ""
        ]),
      )
    }
  }

  setMessageState(state: MessageMetaState) {
    this.messageMeta?.setState(state)
  }

  setText(text: string) {
    if (this.textEl) {
      this.textEl.textContent = text
    }
  }

  dispose() {
    this.messageMeta?.dispose()
    this.messageMeta = null!
    this.avatar?.dispose()
    this.avatar = null!
    this.el.remove()
    this.el = null!
  }
}

/**
 * It shows time when message was create, sending progress and reading indicator
 */

type MessageMetaState = "sending" | "sent" | "seen"

interface MessageMetaViewProps {
  time: string
  isFloat: boolean
  isSticky: boolean
  inContrast: boolean
  state: MessageMetaState
}

class MessageMetaView implements helpers.Disposable {
  el: HTMLDivElement

  constructor(props: MessageMetaViewProps) {
    const className = helpers.classNames("message-meta", {
      "message-meta-float": props.isFloat,
      "message-meta-sticky": props.isSticky,
      "message-meta-contrast": props.inContrast,
    })

    this.el = dom.createEl("div", { className: className }, [
      dom.createEl("span", { textContent: props.time }),
      createIconEl({ name: "clock", size: "1em", className: "message-meta-clock" }),
      createIconEl({ name: "check2", size: "1em", className: "message-meta-check2" }),
      createIconEl({ name: "check2-all", size: "1em", className: "message-meta-check2-all" }),
    ])

    this.el.dataset.state = props.state ?? ""
  }

  setState(state: MessageMetaState) {
    this.el.dataset.state = state
  }

  dispose() {
    this.el.remove()
    this.el = null!
  }
}


interface DetailsViewProps {
  chatId: string
}

export class DetailsView implements helpers.Disposable {
  el: Element

  constructor(props: DetailsViewProps) {
    this.el = dom.createEl("div", {
      className: "details",
      innerHTML: `
          <div class="details-header">
            <div class="details-title">Visitor Info ${props.chatId}</div>
            <button class="details-close">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" class="bi bi-x"
                viewBox="0 0 16 16">
                <path fill-rule="evenodd"
                  d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
              </svg>
            </button>
          </div>

          <div class="details-body">
            <div class="details-row">
              <div class="details-avatar">
                <div class="avatar">
                  <img src="https://i.pravatar.cc/512?img=2" height="48px" width="48px" />
                </div>
              </div>
              <div class="details-basic">
                <div class="text-primary">John Wick</div>
                <div class="text-muted">john@sec.email</div>
              </div>
            </div>

            <div class="details-row">
              <div class="details-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-geo-alt"
                  viewBox="0 0 16 16">
                  <path fill-rule="evenodd"
                    d="M12.166 8.94C12.696 7.867 13 6.862 13 6A5 5 0 0 0 3 6c0 .862.305 1.867.834 2.94.524 1.062 1.234 2.12 1.96 3.07A31.481 31.481 0 0 0 8 14.58l.208-.22a31.493 31.493 0 0 0 1.998-2.35c.726-.95 1.436-2.008 1.96-3.07zM8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10z" />
                  <path fill-rule="evenodd" d="M8 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                </svg>
              </div>
              <div class="text-primary">Lviv, Ukraine</div>
            </div>
            <div class="details-row">
              <div class="details-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-wifi"
                  viewBox="0 0 16 16">
                  <path
                    d="M15.385 6.115a.485.485 0 0 0-.048-.736A12.443 12.443 0 0 0 8 3 12.44 12.44 0 0 0 .663 5.379a.485.485 0 0 0-.048.736.518.518 0 0 0 .668.05A11.448 11.448 0 0 1 8 4c2.507 0 4.827.802 6.717 2.164.204.148.489.13.668-.049z" />
                  <path
                    d="M13.229 8.271c.216-.216.194-.578-.063-.745A9.456 9.456 0 0 0 8 6c-1.905 0-3.68.56-5.166 1.526a.48.48 0 0 0-.063.745.525.525 0 0 0 .652.065A8.46 8.46 0 0 1 8 7a8.46 8.46 0 0 1 4.577 1.336c.205.132.48.108.652-.065zm-2.183 2.183c.226-.226.185-.605-.1-.75A6.472 6.472 0 0 0 8 9c-1.06 0-2.062.254-2.946.704-.285.145-.326.524-.1.75l.015.015c.16.16.408.19.611.09A5.478 5.478 0 0 1 8 10c.868 0 1.69.201 2.42.56.203.1.45.07.611-.091l.015-.015zM9.06 12.44c.196-.196.198-.52-.04-.66A1.99 1.99 0 0 0 8 11.5a1.99 1.99 0 0 0-1.02.28c-.238.14-.236.464-.04.66l.706.706a.5.5 0 0 0 .708 0l.707-.707z" />
                </svg>
              </div>
              <div class="text-primary">132.234.543.2</div>
            </div>
            <div class="details-row">
              <dl class="definitions-list">
                <dt>Referrer</dt>
                <dd>http://www.google.com/</dd>

                <dt>Browser</dt>
                <dd>Chrome 47 on Windows 40</dd>

                <dt>Total visits</dt>
                <dd>12</dd>
              </dl>
            </div>
            <div class="details-row">
              <div>
                <div class="regular-text">Session fields </div>

                <dl class="definitions-list">
                  <dt>username</dt>
                  <dd>@gsefs</dd>

                  <dt>cart_value</dt>
                  <dd>450</dd>

                  <dt>order date</dt>
                  <dd>05/21/2019</dd>
                </dl>
              </div>
            </div>
            <div class="details-row">
              <div class="">
                <div class="regular-text">Last pages </div>

                <dl class="definitions-list">
                  <dt>LiveChat sdsd</dt>
                  <dd>livechat.com/sdfsdf/sadfs</dd>

                  <dt>LiveChat - Tour</dt>
                  <dd>https://www.livechatinc.com/tour</dd>

                  <dt>LiveChat - Homepage</dt>
                  <dd>https://www.livechatinc.com/</dd>
                </dl>
              </div>
            </div>
            <div class="details-actions">
              <a href="#" class="details-action">
                Edit visitor
              </a>
              <a href="#" class="details-action details-action-destroy">
                Ban visitor
              </a>
            </div>
          </div>
    `
    })
  }

  dispose() {
    this.el.remove()
    this.el = null!
  }
}

interface AvatarProps {
  url?: string
  alt: string
  size: number
}

export class AvatarView implements helpers.Disposable {
  el: Element
  img?: HTMLImageElement
  imgListener?: dom.DomListener

  constructor(props: AvatarProps) {
    this.el = dom.createEl("div", {
      className: helpers.classNames("avatar", {
        "avatar-broken": !props.url
      }),
    }, [
      props.url
        ? (
          this.img = dom.createEl("img", {
            className: "avatar-img",
            src: props.url,
            height: props.size,
            width: props.size,
          })
        )
        : "",
      dom.createEl("div", {
        className: "avatar-alt",
        textContent: helpers.getInitials(props.alt) || "👻",
      })
    ])

    // @ts-ignore
    this.el.style.width = `${props.size}px`

    // @ts-ignore
    this.el.style.height = `${props.size}px`

    if (this.img) {
      this.imgListener = dom.addListener(this.img, "error", this.handleError)
    }
  }

  setAlt(alt: string) {
    if (this.img) {
      this.img.alt = alt
    }
  }

  setAvatar(avatar: string) {
    if (this.img) {
      this.img.src = avatar
    }
  }

  handleError = () => {
    this.el.classList.add("avatar-broken")
  }

  dispose() {
    this.imgListener?.dispose()
    this.el.remove()
    this.el = null!
  }
}

interface IconViewProps {
  name: "moon" | "search" | "file-earmark" | "arrow-right-circle" | "clock" | "check2" | "check2-all" | "caret-down-fill"
  size?: string | number
  className?: string
}

export function createIconEl(props: IconViewProps) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  const size = String(props.size ?? 16)

  svg.setAttribute("fill", "currentColor")
  svg.setAttribute("width", size)
  svg.setAttribute("height", size)
  svg.setAttribute("viewBox", "0 0 16 16")

  if (props.className) {
    svg.setAttribute("class", props.className)
  }

  if (props.name === "moon") {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("fill-rule", "evenodd")
    path.setAttribute("d", "M14.53 10.53a7 7 0 0 1-9.058-9.058A7.003 7.003 0 0 0 8 15a7.002 7.002 0 0 0 6.53-4.47z")
    svg.appendChild(path)
  }
  else if (props.name === "search") {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path")

    path.setAttribute("fill-rule", "evenodd")
    path2.setAttribute("fill-rule", "evenodd")
    path.setAttribute("d", "M10.442 10.442a1 1 0 0 1 1.415 0l3.85 3.85a1 1 0 0 1-1.414 1.415l-3.85-3.85a1 1 0 0 1 0-1.415z")
    path2.setAttribute("d", "M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z")
    svg.appendChild(path)
    svg.appendChild(path2)
  }
  else if (props.name === "file-earmark") {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path")

    path.setAttribute("d", "M4 0h5.5v1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h1V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z")
    path2.setAttribute("d", "M9.5 3V0L14 4.5h-3A1.5 1.5 0 0 1 9.5 3z")
    svg.appendChild(path)
    svg.appendChild(path2)
  }
  else if (props.name === "arrow-right-circle") {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path")

    path.setAttribute("fill-rule", "evenodd")
    path2.setAttribute("fill-rule", "evenodd")
    path.setAttribute("d", "M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z")
    path2.setAttribute("d", "M4 8a.5.5 0 0 0 .5.5h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5A.5.5 0 0 0 4 8z")
    svg.appendChild(path)
    svg.appendChild(path2)
  }
  else if (props.name === "clock") {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path")

    path.setAttribute("fill-rule", "evenodd")
    path2.setAttribute("fill-rule", "evenodd")
    path.setAttribute("d", "M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm8-7A8 8 0 1 1 0 8a8 8 0 0 1 16 0z")
    path2.setAttribute("d", "M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z")
    svg.appendChild(path)
    svg.appendChild(path2)
  }
  else if (props.name === "check2") {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")

    path.setAttribute("fill-rule", "evenodd")
    path.setAttribute("d", "M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z")
    svg.appendChild(path)
  }
  else if (props.name === "check2-all") {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path")

    path.setAttribute("fill-rule", "evenodd")
    path2.setAttribute("fill-rule", "evenodd")
    path.setAttribute("d", "M12.354 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z")
    path2.setAttribute("d", "M6.25 8.043l-.896-.897a.5.5 0 1 0-.708.708l.897.896.707-.707zm1 2.414l.896.897a.5.5 0 0 0 .708 0l7-7a.5.5 0 0 0-.708-.708L8.5 10.293l-.543-.543-.707.707z")
    svg.appendChild(path)
    svg.appendChild(path2)
  }
  else if (props.name === "caret-down-fill") {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")

    path.setAttribute("fill-rule", "evenodd")
    path.setAttribute("d", "M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z")
    svg.appendChild(path)
  }
  else {
    throw new Error("Unsupported name for icons")
  }

  return svg
}

interface CheckboxViewProps {
  id: string
}

interface CheckboxChangeEvent {
  nativeEvent: Event
  value: boolean
}

interface CheckboxViewEvents {
  change(event: CheckboxChangeEvent): void
}

export class CheckboxView extends helpers.TypedEventEmitter<CheckboxViewEvents> implements helpers.Disposable {
  el: Element
  input: HTMLInputElement
  label: Element
  changeListener: helpers.Listener
  clickListener: helpers.Listener

  constructor(props: CheckboxViewProps) {
    super()

    this.el = dom.createEl("span", { className: "checkbox-container" }, [
      this.input = dom.createEl("input", { type: "checkbox", className: "checkbox", id: props.id }),
      this.label = dom.createEl("label", { className: "checkbox-label", htmlFor: props.id })
    ])

    this.changeListener = dom.addListener(this.input, "change", event => this.handleChange(event))
    this.clickListener = dom.addListener(this.el, "click", event => {
      event.stopPropagation()
    })
  }

  dispose() {
    this.changeListener.unbind()
    this.clickListener.unbind()
    this.label = null!
    this.input = null!
    this.el.remove()
    this.el = null!
  }

  getValue() {
    return this.input.checked
  }

  setValue(value: boolean) {
    this.input.checked = value
  }

  handleChange(event: Event) {
    this.emit("change", {
      nativeEvent: event,
      value: this.input.checked
    })
  }
}

interface DropdownViewProps {
  content: Element
  menuContent: (string | Node)[]
}

class DropdownView implements helpers.Disposable {
  el: Element
  timerId?: number
  listeners: helpers.Listeners

  constructor(props: DropdownViewProps) {
    this.el = dom.createEl("div", { className: "dropdown" }, [
      props.content,
      dom.createEl("div", { className: "dropdown-menu" }, props.menuContent)
    ])
    this.listeners = new helpers.Listeners(
      dom.addListener(this.el, "mouseenter", () => this.handleMouseEnter()),
      dom.addListener(this.el, "mouseleave", () => this.handleMouseLeave()),
    )
  }

  dispose() {
    debugger
    clearTimeout(this.timerId)
    this.listeners.unbindAll()
    this.el.remove()
    this.el = null!
  }

  handleMouseEnter() {
    clearTimeout(this.timerId)
    this.el.classList.add("dropdown-mouse-enter")
  }

  handleMouseLeave() {
    clearTimeout(this.timerId)
    this.timerId = setTimeout(() => {
      this.el.classList.remove("dropdown-mouse-enter")
    }, 200)
  }
}