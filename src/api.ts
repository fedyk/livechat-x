import {
  API$Event$Message,
  API$Push$ChatDeactivated,
  API$Push$EventsMarkedAsSeen,
  API$Push$IncomingSneakPeek,
  API$Push$QueuePositionsUpdated,
  API$Push$IncomingChat,
  API$Push$IncomingEvent,
  API$Pushes,
  API$Response$Login,
  TextMessage,
  API$Response$GetChat,
  API$Push$ChatTransferred,
  Chat,
  API$Push$UserAddedToChat,
  API$Push$UserRemovedToChat
} from "./types.js";
import { getAgentAPIHost } from "./config.js";
import { Store } from "./store.js";
import { RTM, Auth, Storage, ChatRouter, WebAPI } from "./services.js";
import { CharRouteManager } from "./chat-route-manager.js";
import {
  Disposable,
  Listeners,
  ErrorWithType,
  TypedEventEmitter,
  mergeChats,
  indexBy,
  createInjector,
  getActiveThread,
  getIncompleteThreadIds
} from "./helpers.js";
import {
  parseChatsSummary,
  parseLicense,
  parseMyProfile,
  parseRoutingStatus,
  parseChatEvent,
  parseChat,
  parseSneakPeek,
  parseChatTransferredPayload,
  parseUser,
  parseQueue
} from "./parsers.js";
import { customer1 } from "./demo.js";

interface APIEvents {
  loginError(err: ErrorWithType): void
}

export const $API = createInjector<API>()

export class API extends TypedEventEmitter<APIEvents> implements Disposable {
  rtm?: RTM
  rtmListeners: Listeners
  auth: Auth
  store: Store
  chatRouter: ChatRouter
  chatRouteManager: CharRouteManager
  web: WebAPI

  constructor(auth: Auth, store: Store, chatRouter: ChatRouter, chatRouteManager: CharRouteManager) {
    super();
    this.rtmListeners = new Listeners();
    this.auth = auth;
    this.store = store;
    this.chatRouter = chatRouter
    this.chatRouteManager = chatRouteManager
    this.web = new WebAPI(auth)
  }

  dispose() {
    this.rtm?.close()
  }

  performAsync<T>(action: string, payload: any, options?: { signal: AbortSignal }) {
    return this.rtm
      ? this.rtm.performAsync<T>(action, payload, options?.signal)
      : this.web.performAsync<T>(action, payload, options)
  }

  connect() {
    const region = this.auth.getRegion()
    const url = `wss://${getAgentAPIHost(region)}/v3.3/agent/rtm/ws`;

    this.rtm = new RTM(url)
    this.rtmListeners.unbindAll()
    this.rtmListeners.register(
      this.rtm.addListener("open", this.handleOpen),
      this.rtm.addListener("close", this.handleClose),
      this.rtm.addListener("error", this.handleError),
      this.rtm.addListener("push", this.handlePush)
    )
  }

  handleOpen = () => {
    if (!this.rtm) {
      throw new Error("how it even possible?");
    }

    const accessToken = this.auth.getAccessToken();
    const payload = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      token: `Bearer ${accessToken}`,
      customer_push_level: "my",
      application: {
        name: "LiveChat X",
        version: "0.0.1"
      }
    };

    this.rtm.performAsync<API$Response$Login>("login", payload)
      .then(response => {
        const state = this.store.getState()
        const chats = parseChatsSummary(response.chats_summary)
        const license = parseLicense(response.license)
        const myProfile = parseMyProfile(response.my_profile)
        const routingStatus = parseRoutingStatus(response.my_profile?.routing_status)
        const mergeResults = mergeChats(state.chatsByIds, indexBy(chats, "id"), state.chatIds, myProfile.id)

        if (mergeResults.closedChatIds.size > 0) {
          /** @todo: sync the content of archived chats */
        }

        this.store.setChatIds(mergeResults.chatIds)
        this.store.setChats(mergeResults.chatsById)
        this.store.setLicense(license)
        this.store.setMyProfile(myProfile)

        if (routingStatus) {
          this.store.setRoutingStatus(myProfile.id, routingStatus)
        }

        Storage.setMyProfile(myProfile)
      })
      .catch(err => this.emit("loginError", err));
  };

  handleClose = (manualClose: boolean) => {
    this.chatRouter.reset()

    if (manualClose) {
      return
    }

    this.connect()
  }

  handleError = (err: Error) => {
    console.error(err);
  }

  handlePush = (push: API$Pushes) => {
    this.chatRouter.tick()

    switch (push.action) {
      // Chats
      case "incoming_chat":
        return this.handleIncomingChat(push)
      case "chat_deactivated":
        return this.handleChatDeactivated(push)

      // Chat access
      // case "chat_access_granted":
      //   return this.handleChatAccessGranted(push)
      // case "chat_access_revoked":
      //   return this.handleChatAccessRevoked(push)
      case "chat_transferred":
        return this.handleChatTransferred(push)

      // Chat users
      case "user_added_to_chat":
        return this.handleUserAddedToChat(push)
      case "user_removed_from_chat":
        return this.handleUserRemovedFromChat(push)

      // Events
      case "incoming_event":
        return this.handleIncomingEvent(push)
      // case "event_updated":
      //   return this.handleEventUpdated(push)
      // case "incoming_rich_message_postback":
      //   return this.handleIncoming_rich_message_postback(push)

      // Properties
      // case "chat_properties_updated":
      //   return this.handle_chat_properties_updated(push)
      // case "chat_properties_deleted":
      //   return this.handle_chat_properties_deleted(push)
      // case "thread_properties_updated":
      //   return this.handle_thread_properties_updated(push)
      // case "thread_properties_deleted":
      //   return this.handle_thread_properties_deleted(push)
      // case "event_properties_updated":
      //   return this.handle_event_properties_updated(push)
      // case "event_properties_deleted":
      //   return this.handle_event_properties_deleted(push)

      // Thread tags
      // case "thread_tagged":
      //   return this.handle_thread_tagged(push)
      // case "thread_untagged":
      //   return this.handle_thread_untagged(push)

      // Customers
      // case "customer_visit_started":
      //   return this.handle_customer_visit_started(push)
      // case "customer_created":
      //   return this.handle_customer_created(push)
      // case "customer_updated":
      //   return this.handle_customer_updated(push)
      // case "customer_page_updated":
      //   return this.handle_customer_page_updated(push)
      // case "customer_banned":
      //   return this.handle_customer_banned(push)
      // case "customer_visit_ended":
      //   return this.handle_customer_visit_ended(push)

      // Status
      // case "routing_status_set":
      //   return this.handle_routing_status_set()
      // case "agent_disconnected":
      //   return this.handle_agent_disconnected()

      // Other
      case "events_marked_as_seen":
        return this.handleEventsMarkedAsSeen(push)
      case "incoming_sneak_peek":
        return this.handleIncomingSneakPeek(push)
      // case "incoming_typing_indicator":
      //   return this.handle_incoming_typing_indicator(push)
      // case "incoming_multicast":
      //   return this.handle_incoming_multicast(push)
      // case "chat_unfollowed":
      //   return this.handle_chat_unfollowed(push)
      case "queue_positions_updated":
        return this.handleQueuePositionsUpdated(push)

    }

    console.log(push);
  }

  handleIncomingChat(push: API$Push$IncomingChat) {
    const chat = parseChat(push.payload?.chat)
    const requesterId = String(push?.payload?.requester_id ?? "")
    const chatTransition = this.chatRouteManager.beginChatTransition(chat.id)

    this.store.setChat(chat)

    chatTransition.commitChatTransition(requesterId)
  }

  handleChatTransferred(push: API$Push$ChatTransferred) {
    const payload = parseChatTransferredPayload(push.payload)
    const chat = this.store.getState().chatsByIds[payload.chatId]

    if (!chat) {
      return
    }

    const chatTransition = this.chatRouteManager.beginChatTransition(payload.chatId)
    const chatUpdates: Partial<Chat> = {}

    if (payload.transferredTo?.groupId != null && payload.transferredTo.groupId !== chat.groupId) {
      chatUpdates.groupId = payload.transferredTo.groupId
    }

    if (payload.transferredTo?.agentId) {
      const agentId = payload.transferredTo.agentId;

      // create dummy user if user not exist
      const agent = chat.users[agentId] || {
        id: agentId,
        type: "agent",
        name: "Agent",
        email: agentId,
        present: false,
        seenUpTo: 0
      }

      // mark user who is assigned to chat as present
      chatUpdates.users = {
        ...chat.users,
        [agentId]: { ...agent, present: true }
      }
    }

    const thread = chat.threads[payload.threadId]

    if (thread) {
      chatUpdates.threads = {
        ...chat.threads,
        [payload.threadId]: { ...thread, queue: payload.queue }
      }
    }

    this.store.updateChat(payload.chatId, chatUpdates)
    chatTransition.commitChatTransition(payload.requesterId)
  }

  handleUserAddedToChat(push: API$Push$UserAddedToChat) {
    const chatId = String(push?.payload?.chat_id)
    const requesterId = String(push.payload.requester_id ?? "") || void 0
    const user = parseUser(push?.payload?.user)
    const chat = this.store.getState().chatsByIds[chatId]

    if (!chat) {
      return
    }

    const transition = this.chatRouteManager.beginChatTransition(chat.id)
    const chatUsers: Chat["users"] = { ...chat.users, [user.id]: user }

    this.store.updateChat(chat.id, { users: chatUsers })
    transition.commitChatTransition(requesterId)
  }

  handleUserRemovedFromChat(push: API$Push$UserRemovedToChat) {
    const chatId = String(push?.payload?.chat_id)
    const requesterId = String(push?.payload?.requester_id ?? "") || void 0
    const userId = String(push?.payload?.user_id)
    const chat = this.store.getState().chatsByIds[chatId]

    if (!chat) {
      return
    }

    const user = chat.users[userId]

    if (!user) {
      return
    }

    const transition = this.chatRouteManager.beginChatTransition(chat.id)
    const chatUsers: Chat["users"] = {
      ...chat.users,
      [user.id]: {
        ...user,
        present: false
      }
    }

    this.store.updateChat(chat.id, { users: chatUsers })
    transition.commitChatTransition(requesterId)
  }

  handleChatDeactivated(push: API$Push$ChatDeactivated) {
    const chatId = String(push?.payload?.chat_id ?? "")
    const threadId = String(push?.payload?.thread_id ?? "")
    const requesterId = String(push?.payload?.user_id ?? "")
    const chatTransition = this.chatRouteManager.beginChatTransition(chatId)

    this.store.updateChatThread(chatId, threadId, { active: false })

    chatTransition.commitChatTransition(requesterId)
  }

  handleIncomingEvent(push: API$Push$IncomingEvent) {
    const chatId = String(push?.payload?.chat_id)
    const threadId = String(push?.payload?.thread_id)
    const message = parseChatEvent(push?.payload?.event)

    this.store.addMessage(chatId, threadId, message)
    this.store.setSneakPeek(chatId, null)
  }

  handleEventsMarkedAsSeen(push: API$Push$EventsMarkedAsSeen) {
    const chatId = String(push?.payload?.chat_id)
    const userId = String(push?.payload?.user_id)
    const seenUpTo = new Date(push?.payload?.seen_up_to)

    if (Number.isNaN(seenUpTo.getTime())) {
      console.warn(`invalid date was passed`)
    }

    this.store.updateChatUser(chatId, userId, {
      seenUpTo: seenUpTo.getTime()
    })
  }

  handleIncomingSneakPeek(push: API$Push$IncomingSneakPeek) {
    const chatId = String(push?.payload?.chat_id)
    const sneakPeek = parseSneakPeek(push?.payload?.sneak_peek)

    this.store.setSneakPeek(chatId, sneakPeek)
  }

  handleQueuePositionsUpdated(push: API$Push$QueuePositionsUpdated) {
    const payload = Array.isArray(push?.payload) ? push.payload : []

    for (let i = 0; i < payload.length; i++) {
      const chatId = String(payload[i].chat_id)
      const threadId = String(payload[i].thread_id)
      const queue = parseQueue(payload[i].queue)
      const chat = this.store.getState().chatsByIds[chatId]

      if (!chat) {
        continue
      }

      if (!chat.threads[threadId]) {
        continue
      }

      const transition = this.chatRouteManager.beginChatTransition(chatId)

      this.store.updateChatThread(chatId, threadId, { queue })
      transition.commitChatTransition()
    }
  }

  async sendMessage(chatId: string, text: string) {
    const customId = "LiveChatX_" + Math.random().toString(36).substr(2, 9)
    const state = this.store.getState()
    const authorId = state.myProfile?.id
    const chat = state.chatsByIds[chatId]

    if (!chat) {
      throw new Error("Chat does not present in memory")
    }

    if (!authorId) {
      throw new Error("sendMessage: `authorId` can't be empty")
    }

    const thread = getActiveThread(chat)

    if (!thread) {
      throw new Error("chat should be activated")
    }

    const threadId = thread.id

    const message: TextMessage = {
      id: customId,
      customId: customId,
      isSending: true,
      // isDelivered: 
      text: text,
      type: "message",
      authorId: authorId,
      createdAt: Date.now(),
      recipients: "all",
      postback: {}
    }

    const event: Partial<API$Event$Message> = {
      id: customId,
      custom_id: customId,
      type: "message",
      text: text,
      recipients: "all",
    }

    const payload = {
      chat_id: chatId,
      event: event
    }

    this.store.addMessage(chatId, threadId, message)

    await this.performAsync<any>("send_event", payload)
      .then(response => {
        const chatId = String(response.event_id)

        this.store.updateMessage(chatId, threadId, customId, { id: chatId })
      })
      .catch(err => {
        alert(err.message)
        // this.store.updateMessage(chatId, threadId, customId, {
        //   error: err.message
        // })
      })
      .finally(() => {
        this.store.updateMessage(chatId, threadId, customId, { isSending: false })
      })
  }

  async syncIncompleteThreadsAsync(chatId: string, signal: AbortSignal) {
    const chat = this.store.getState().chatsByIds[chatId]

    if (!chat || chat.isSyncingIncompleteThreads) {
      return
    }

    const incompleteThreadIds = getIncompleteThreadIds(chat)

    if (incompleteThreadIds.length === 0) {
      return
    }

    this.store.updateChat(chatId, { isSyncingIncompleteThreads: true })

    const promises = incompleteThreadIds.map(threadId => {
      return this.performAsync<API$Response$GetChat>("get_chat", { chat_Id: chatId, thread_id: threadId }, { signal }).then(response => {
        const currentChat = this.store.getState().chatsByIds[chatId]
        const incomingChat = parseChat(response)
        const nextThreads = {
          ...currentChat.threads,
          ...incomingChat.threads
        }

        this.store.updateChat(chatId, {
          threads: nextThreads
        })
      })
    })

    return Promise.all(promises).finally(() => {
      this.store.updateChat(chatId, { isSyncingIncompleteThreads: false })
    })
  }

  setRoutingStatus(status: string) {
    return this.performAsync("set_routing_status", {
      status,
      agent_id: this.store.getState().myProfile?.id
    })
  }

  startChat(chatId: string) {
    const chatRoute = this.chatRouteManager.getCurrentChatRoute(chatId)
    const myProfileId = this.store.getState().myProfile?.id

    if (!myProfileId) {
      throw new Error(`myProfileId can't be empty.`)
    }

    if (chatRoute === "queued") {
      return this.performAsync("add_user_to_chat", {
        chat_id: chatId,
        user_id: myProfileId,
        user_type: "agent"
      })
    }
  }
}
