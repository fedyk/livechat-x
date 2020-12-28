import { Chat, Thread, ChatRoute, ChatsSegments, Event } from "./types"

export interface Disposable {
  dispose(): void
}

export interface Listener {
  unbind(): void;
}

/**
 * Home for active listeners
 */
export class Listeners {
  listeners: Listener[]

  constructor() {
    this.listeners = []
  }

  register(...listener: Listener[]) {
    this.listeners.push(...listener)
  }

  unbindAll() {
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i].unbind()
    }

    // remove all items
    this.listeners.splice(0, this.listeners.length)
  }
}

/**
 * Typed Event Emitter
 */
export type TypedArguments<T> = [T] extends [(...args: infer U) => any]
  ? U
  : [T] extends [void] ? [] : [T]

export class TypedEventEmitter<T> {
  listeners: Map<any, Function[]>

  constructor() {
    this.listeners = new Map()
  }

  addListener<K extends keyof T>(event: K, listener: (...args: TypedArguments<T[K]>) => void): Listener {
    let listeners = this.listeners.get(event)

    if (typeof listener !== "function") {
      throw new Error("listener is not executable")
    }

    if (!listeners) {
      this.listeners.set(event, [listener])
    }
    else {
      listeners.push(listener)
    }

    return {
      unbind: () => this.removeListener(event, listener)
    }
  }

  removeListener<K extends keyof T>(event: K, listener: (...args: TypedArguments<T[K]>) => void) {
    let listeners = this.listeners.get(event)

    if (listeners) {
      const index = listeners.indexOf(listener)

      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  emit<K extends keyof T>(event: K, ...args: TypedArguments<T[K]>) {
    const listeners = this.listeners.get(event)

    if (!listeners) {
      return
    }

    for (let i = 0; i < listeners.length; i++) {
      listeners[i](...args)
    }
  }
}

/** Abort Error */
export class AbortError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AbortError"
  }
}

/** Error with type */
export class ErrorWithType extends Error {
  type: string
  status?: number

  constructor(message: string, type: string, status?: number) {
    super(message);
    this.type = type
    this.status = status;
  }
}



/** @source https://github.com/facebook/react/blob/master/packages/shared/shallowEqual.js */
export function shallowEqual(objA: any, objB: any): boolean {
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

export function indexBy<T>(items: T[], prop: keyof T): { [key: string]: T } {
  const result = {};

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = item[prop]

    if (key != null) {
      // @ts-ignore
      result[key] = item;
    }
  }

  return result;
}

export function getChatRoute(chat: Chat, myProfileId: string): ChatRoute {
  const activeThread = getActiveThread(chat)

  if (!activeThread) {
    return chat.properties.routing.pinned ? "pinned" : "closed"
  }

  const currentAgent = chat.users[myProfileId]

  if (currentAgent && currentAgent.present) {
    return "my"
  }

  const presentAgent = getPresentAgent(chat.users)

  if (!presentAgent) {
    if (chat.properties.routing.continuous && !activeThread.queue) {
      return "unassigned"
    }
    else {
      return "queued"
    }
  }

  if (chat.properties.supervising.agentIds.includes(myProfileId)) {
    return "supervised"
  }

  return "other"
}

export function getActiveThread(chat: Chat) {
  // only the first thread can be active
  if (chat.threadIds.length > 0) {
    const threadId = chat.threadIds[0]

    if (chat.threads[threadId] && chat.threads[threadId].active) {
      return chat.threads[threadId]
    }
  }
}

export function getRecentThread(chat: Chat) {
  for (let i = 0; i < chat.threadIds.length; i++) {
    const threadId = chat.threadIds[i]
    const thread = chat.threads[threadId]

    if (thread) {
      return thread
    }
  }
}

export function getPresentAgent(users: Chat["users"]) {
  const usersIds = Object.keys(users);

  // lookup for first present user
  for (let i = 0; i < usersIds.length; i++) {
    const userId = usersIds[i]
    const user = users[userId]

    if (user.type === "agent" && user.present) {
      return user;
    }
  }
}

export function mergeChats(currentChatsById: HashedChats, incomingChatsById: HashedChats, chatsSegments: ChatsSegments, myProfileId: string) {
  const myChatIdsSet = new Set(chatsSegments.myChatIds.reverse())
  const queuedChatIdsSet = new Set(chatsSegments.queuedChatIds.reverse())
  const supervisedChatIdsSet = new Set(chatsSegments.supervisedChatIds.reverse())
  const unassignedChatIdsSet = new Set(chatsSegments.unassignedChatIds.reverse())
  const { enterChatIds, updateChatIds, exitChatIds } = compareChats(currentChatsById, incomingChatsById)
  const closedChatIds = new Set<string>()
  const chatsByIds = { ...currentChatsById }

  // add new chats
  enterChatIds.forEach(function (chatId) {
    const incomingChat = incomingChatsById[chatId]
    const incomingChatRoute = getChatRoute(incomingChat, myProfileId)

    chatsByIds[chatId] = incomingChat

    // add my chat to the list
    if (incomingChatRoute === "my") {
      myChatIdsSet.add(chatId)
    }

    // add supervised chats to the list
    if (incomingChatRoute === "supervised") {
      supervisedChatIdsSet.add(chatId)
    }

    // add queued chat to the list
    if (incomingChatRoute === "queued") {
      queuedChatIdsSet.add(chatId)
    }

    // add unassigned chat to the list
    if (incomingChatRoute === "unassigned") {
      unassignedChatIdsSet.add(chatId)
    }
  })

  // update current chats
  updateChatIds.forEach(chatId => {
    const currentChat = chatsByIds[chatId]
    const incomingChat = incomingChatsById[chatId]
    const incomingChatRoute = getChatRoute(incomingChat, myProfileId)

    chatsByIds[chatId] = mergeChat(currentChat, incomingChat)

    // add chats to my chats segment
    if (incomingChatRoute === "my") {
      myChatIdsSet.add(chatId)
      queuedChatIdsSet.delete(chatId)
      supervisedChatIdsSet.delete(chatId)
      unassignedChatIdsSet.delete(chatId)
    }

    // add queued chat to list of my chats
    if (incomingChatRoute === "queued") {
      myChatIdsSet.delete(chatId)
      queuedChatIdsSet.add(chatId)
      supervisedChatIdsSet.delete(chatId)
      unassignedChatIdsSet.delete(chatId)
    }

    // add chats to my supervised segment
    if (incomingChatRoute === "supervised") {
      myChatIdsSet.delete(chatId)
      queuedChatIdsSet.delete(chatId)
      supervisedChatIdsSet.add(chatId)
      unassignedChatIdsSet.delete(chatId)
    }

    // add unassigned chat to list of my chats
    if (incomingChatRoute === "unassigned") {
      myChatIdsSet.delete(chatId)
      queuedChatIdsSet.delete(chatId)
      supervisedChatIdsSet.delete(chatId)
      unassignedChatIdsSet.add(chatId)
    }
  })

  // loop through inactive chats
  exitChatIds.forEach(function (chatId) {
    const exitChat = chatsByIds[chatId]
    const exitChatRoute = getChatRoute(exitChat, myProfileId)
    const exitActiveThread = getActiveThread(exitChat)

    // do not update inactive chats
    if (!exitActiveThread) {
      return;
    }

    // remove queued chat from the list of my chats & from segment
    if (exitChatRoute === "queued") {
      return queuedChatIdsSet.delete(chatId)
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
    }

    // invalidate thread history for closed chat
    if (chatsByIds[chatId].history.status === "up-to-date") {
      chatsByIds[chatId].history = {
        ...chatsByIds[chatId].history,
        status: "incomplete"
      }
    }

    // add chat to a list of chat chat need to be synced
    closedChatIds.add(chatId)
  })

  const newChatsSegments: ChatsSegments = {
    myChatIds: Array.from(myChatIdsSet).reverse(),
    queuedChatIds: Array.from(queuedChatIdsSet).reverse(),
    supervisedChatIds: Array.from(supervisedChatIdsSet).reverse(),
    unassignedChatIds: Array.from(unassignedChatIdsSet).reverse(),
  }

  return {
    chatsById: chatsByIds,
    chatsSegments: newChatsSegments,
    closedChatIds: closedChatIds
  }
}

/**
 * Compare current & incoming chats using `General Update Pattern`
 * @see https://bost.ocks.org/mike/join/
 */
interface HashedChats {
  [chatId: string]: Chat
}

interface CompareResult {
  enterChatIds: Set<string>   // new chats
  updateChatIds: Set<string>  // chats to update
  exitChatIds: Set<string>    // chats that are not active anymore
}

export function compareChats(chats: HashedChats, incomingChats: HashedChats): CompareResult {
  const enterChatIds = new Set<string>()
  const updateChatIds = new Set<string>()
  const exitChatIds = new Set<string>()

  for (const chatId in chats) {
    if (chats.hasOwnProperty(chatId)) {
      if (incomingChats.hasOwnProperty(chatId)) {
        updateChatIds.add(chatId)
      }
      else {
        exitChatIds.add(chatId)
      }
    }
  }

  for (const chatId in incomingChats) {
    if (incomingChats.hasOwnProperty(chatId)) {
      if (chats.hasOwnProperty(chatId) === false) {
        enterChatIds.add(chatId)
      }
    }
  }

  return {
    enterChatIds,
    updateChatIds,
    exitChatIds
  }
}

export function mergeChat(currentChat: Chat, incomingChat: Chat): Chat {
  const threads = { ...currentChat.threads }
  const threadIds = [...currentChat.threadIds]
  const pagination = { ...currentChat.history }
  const currentRecentThread = getRecentThread(currentChat)
  const incomingRecentThread = getRecentThread(incomingChat)

  if (currentChat.id !== incomingChat.id) {
    throw new RangeError("Cannot merge chats with different id")
  }

  if (!currentRecentThread) {
    throw new RangeError("Current chat should have at least one thread")
  }

  if (!incomingRecentThread) {
    throw new RangeError("Incoming chat should have at least one thread")
  }

  // only last thread can be active
  if (currentRecentThread.active && currentRecentThread.id !== incomingRecentThread.id) {
    threads[currentRecentThread.id] = {
      ...currentRecentThread,
      active: false,
      incomplete: true
    }
  }

  if (currentRecentThread.id !== incomingRecentThread.id) {

    // add new thread to the chat
    threads[incomingRecentThread.id] = incomingRecentThread

    // prepend new active thread to the top of the list
    threadIds.unshift(incomingRecentThread.id)

    // invalidate thread_summary
    if (pagination.status === "up-to-date") {
      pagination.status = "incomplete"
    }
  }

  // merge thread messages
  if (currentRecentThread.id === incomingRecentThread.id) {
    const currentLastMessage = getThreadLastMessage(currentRecentThread)
    const incomingLastMessage = getThreadLastMessage(incomingRecentThread)
    let incomplete = currentRecentThread.incomplete

    // threads are empty, but it can be caused by API-5897
    if (!currentLastMessage && !incomingLastMessage) {
      incomplete = true
    }

    // current thread is empty, inherit incomplete property from incoming thread
    if (!currentLastMessage && incomingLastMessage) {
      incomplete = incomingRecentThread.incomplete
    }

    // incoming thread is empty most probably due to API-5897
    if (currentLastMessage && !incomingLastMessage) {
      incomplete = true
    }

    // current and incoming messages are different, inherit incomplete property from incoming thread
    if (currentLastMessage && incomingLastMessage && currentLastMessage.id !== incomingLastMessage.id) {
      incomplete = incomingRecentThread.incomplete
    }

    // append incoming message
    const messages = mergeMessages(currentRecentThread.messages, incomingRecentThread.messages)

    // thread is not complete
    threads[currentRecentThread.id] = {
      ...currentRecentThread,
      incomplete,
      messages,
    }
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
  }
}

export function getThreadLastMessage(thread: Thread): Event | undefined {
  if (thread.messages.length > 0) {
    return thread.messages[thread.messages.length - 1]
  }
}
export function mergeMessages(target: Event[], ...sources: Event[][]) {
  const targetMessageIds = new Set<string>()
  const targetCustomIds = new Set<string>()
  const result = target.concat()

  // collect messages ids and customIds for target collection
  target.forEach(function (message) {
    targetMessageIds.add(message.id)

    if (message.customId) {
      targetCustomIds.add(message.customId)
    }
  })

  sources.forEach(function (messages) {
    messages.forEach(function (message) {
      // message with the same id already present in target
      if (targetMessageIds.has(message.id)) {
        return
      }

      // message with the same custom ID already present in target
      if (message.customId && targetCustomIds.has(message.customId)) {
        return
      }

      result.push(message)
    })
  })

  // free memory
  targetMessageIds.clear()
  targetCustomIds.clear()

  // sort messages in creating order
  result.sort(function (a, b) {
    return a.createdAt - b.createdAt
  })

  return result
}
