"use strict";
var app;
(function (app) {
    var services;
    (function (services) {
        var WebAPI = app.services.WebAPI;
        var Listeners = app.helpers.Listeners;
        var TypedEventEmitter = app.helpers.TypedEventEmitter;
        var mergeChats = app.helpers.mergeChats;
        var indexBy = app.helpers.indexBy;
        var createInjector = app.helpers.createInjector;
        var getActiveThread = app.helpers.getActiveThread;
        var getIncompleteThreadIds = app.helpers.getIncompleteThreadIds;
        var parseChatsSummary = app.parsers.parseChatsSummary;
        var parseLicense = app.parsers.parseLicense;
        var parseMyProfile = app.parsers.parseMyProfile;
        var parseRoutingStatus = app.parsers.parseRoutingStatus;
        var parseChatEvent = app.parsers.parseChatEvent;
        var parseChat = app.parsers.parseChat;
        var parseSneakPeek = app.parsers.parseSneakPeek;
        var parseChatTransferredPayload = app.parsers.parseChatTransferredPayload;
        var parseUser = app.parsers.parseUser;
        var parseQueue = app.parsers.parseQueue;
        var getAgentAPIHost = app.config.getAgentAPIHost;
        services.$API = createInjector();
        class API extends TypedEventEmitter {
            constructor(auth, store, chatRouter, chatRouteManager) {
                super();
                this.handleOpen = () => {
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
                    this.rtm.performAsync("login", payload)
                        .then(response => {
                        const state = this.store.getState();
                        const chats = parseChatsSummary(response.chats_summary);
                        const license = parseLicense(response.license);
                        const myProfile = parseMyProfile(response.my_profile);
                        const routingStatus = parseRoutingStatus(response.my_profile?.routing_status);
                        const mergeResults = mergeChats(state.chatsByIds, indexBy(chats, "id"), state.chatIds, myProfile.id);
                        if (mergeResults.closedChatIds.size > 0) {
                            /** @todo: sync the content of archived chats */
                        }
                        this.store.setChatIds(mergeResults.chatIds);
                        this.store.setChats(mergeResults.chatsById);
                        this.store.setLicense(license);
                        this.store.setMyProfile(myProfile);
                        if (routingStatus) {
                            this.store.setRoutingStatus(myProfile.id, routingStatus);
                        }
                        services.Storage.setMyProfile(myProfile);
                    })
                        .catch(err => this.emit("loginError", err));
                };
                this.handleClose = (manualClose) => {
                    this.chatRouter.reset();
                    if (manualClose) {
                        return;
                    }
                    this.connect();
                };
                this.handleError = (err) => {
                    console.error(err);
                };
                this.handlePush = (push) => {
                    this.chatRouter.tick();
                    switch (push.action) {
                        // Chats
                        case "incoming_chat":
                            return this.handleIncomingChat(push);
                        case "chat_deactivated":
                            return this.handleChatDeactivated(push);
                        // Chat access
                        // case "chat_access_granted":
                        //   return this.handleChatAccessGranted(push)
                        // case "chat_access_revoked":
                        //   return this.handleChatAccessRevoked(push)
                        case "chat_transferred":
                            return this.handleChatTransferred(push);
                        // Chat users
                        case "user_added_to_chat":
                            return this.handleUserAddedToChat(push);
                        case "user_removed_from_chat":
                            return this.handleUserRemovedFromChat(push);
                        // Events
                        case "incoming_event":
                            return this.handleIncomingEvent(push);
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
                            return this.handleEventsMarkedAsSeen(push);
                        case "incoming_sneak_peek":
                            return this.handleIncomingSneakPeek(push);
                        // case "incoming_typing_indicator":
                        //   return this.handle_incoming_typing_indicator(push)
                        // case "incoming_multicast":
                        //   return this.handle_incoming_multicast(push)
                        // case "chat_unfollowed":
                        //   return this.handle_chat_unfollowed(push)
                        case "queue_positions_updated":
                            return this.handleQueuePositionsUpdated(push);
                    }
                    console.log("unhandled push", push);
                };
                this.rtmListeners = new Listeners();
                this.auth = auth;
                this.store = store;
                this.chatRouter = chatRouter;
                this.chatRouteManager = chatRouteManager;
                this.web = new WebAPI(auth);
            }
            dispose() {
                this.rtm?.close();
            }
            performAsync(action, payload, options) {
                return this.rtm
                    ? this.rtm.performAsync(action, payload, options?.signal)
                    : this.web.performAsync(action, payload, options);
            }
            connect() {
                const region = this.auth.getRegion();
                const url = `wss://${getAgentAPIHost(region)}/v3.3/agent/rtm/ws`;
                this.rtm = new services.RTM(url);
                this.rtmListeners.unbindAll();
                this.rtmListeners.register(this.rtm.addListener("open", this.handleOpen), this.rtm.addListener("close", this.handleClose), this.rtm.addListener("error", this.handleError), this.rtm.addListener("push", this.handlePush));
            }
            handleIncomingChat(push) {
                const chat = parseChat(push.payload?.chat);
                const requesterId = String(push?.payload?.requester_id ?? "");
                const chatTransition = this.chatRouteManager.beginChatTransition(chat.id);
                this.store.setChat(chat);
                chatTransition.commitChatTransition(requesterId);
            }
            handleChatTransferred(push) {
                const payload = parseChatTransferredPayload(push.payload);
                const chat = this.store.getState().chatsByIds[payload.chatId];
                if (!chat) {
                    return;
                }
                const chatTransition = this.chatRouteManager.beginChatTransition(payload.chatId);
                const chatUpdates = {};
                if (payload.transferredTo?.groupId != null && payload.transferredTo.groupId !== chat.groupId) {
                    chatUpdates.groupId = payload.transferredTo.groupId;
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
                    };
                    // mark user who is assigned to chat as present
                    chatUpdates.users = {
                        ...chat.users,
                        [agentId]: { ...agent, present: true }
                    };
                }
                const thread = chat.threads[payload.threadId];
                if (thread) {
                    chatUpdates.threads = {
                        ...chat.threads,
                        [payload.threadId]: { ...thread, queue: payload.queue }
                    };
                }
                this.store.updateChat(payload.chatId, chatUpdates);
                chatTransition.commitChatTransition(payload.requesterId);
            }
            handleUserAddedToChat(push) {
                const chatId = String(push?.payload?.chat_id);
                const requesterId = String(push.payload.requester_id ?? "") || void 0;
                const user = parseUser(push?.payload?.user);
                const chat = this.store.getState().chatsByIds[chatId];
                if (!chat) {
                    return;
                }
                const transition = this.chatRouteManager.beginChatTransition(chat.id);
                const chatUsers = { ...chat.users, [user.id]: user };
                this.store.updateChat(chat.id, { users: chatUsers });
                transition.commitChatTransition(requesterId);
            }
            handleUserRemovedFromChat(push) {
                const chatId = String(push?.payload?.chat_id);
                const requesterId = String(push?.payload?.requester_id ?? "") || void 0;
                const userId = String(push?.payload?.user_id);
                const chat = this.store.getState().chatsByIds[chatId];
                if (!chat) {
                    return;
                }
                const user = chat.users[userId];
                if (!user) {
                    return;
                }
                const transition = this.chatRouteManager.beginChatTransition(chat.id);
                const chatUsers = {
                    ...chat.users,
                    [user.id]: {
                        ...user,
                        present: false
                    }
                };
                this.store.updateChat(chat.id, { users: chatUsers });
                transition.commitChatTransition(requesterId);
            }
            handleChatDeactivated(push) {
                const chatId = String(push?.payload?.chat_id ?? "");
                const threadId = String(push?.payload?.thread_id ?? "");
                const requesterId = String(push?.payload?.user_id ?? "");
                const chatTransition = this.chatRouteManager.beginChatTransition(chatId);
                this.store.updateChatThread(chatId, threadId, { active: false });
                chatTransition.commitChatTransition(requesterId);
            }
            handleIncomingEvent(push) {
                const chatId = String(push?.payload?.chat_id);
                const threadId = String(push?.payload?.thread_id);
                const message = parseChatEvent(push?.payload?.event);
                this.store.addMessage(chatId, threadId, message);
                this.store.setSneakPeek(chatId, null);
            }
            handleEventsMarkedAsSeen(push) {
                const chatId = String(push?.payload?.chat_id);
                const userId = String(push?.payload?.user_id);
                const seenUpTo = new Date(push?.payload?.seen_up_to);
                if (Number.isNaN(seenUpTo.getTime())) {
                    console.warn(`invalid date was passed`);
                }
                this.store.updateChatUser(chatId, userId, {
                    seenUpTo: seenUpTo.getTime()
                });
            }
            handleIncomingSneakPeek(push) {
                const chatId = String(push?.payload?.chat_id);
                const sneakPeek = parseSneakPeek(push?.payload?.sneak_peek);
                this.store.setSneakPeek(chatId, sneakPeek);
            }
            handleQueuePositionsUpdated(push) {
                const payload = Array.isArray(push?.payload) ? push.payload : [];
                for (let i = 0; i < payload.length; i++) {
                    const chatId = String(payload[i].chat_id);
                    const threadId = String(payload[i].thread_id);
                    const queue = parseQueue(payload[i].queue);
                    const chat = this.store.getState().chatsByIds[chatId];
                    if (!chat) {
                        continue;
                    }
                    if (!chat.threads[threadId]) {
                        continue;
                    }
                    const transition = this.chatRouteManager.beginChatTransition(chatId);
                    this.store.updateChatThread(chatId, threadId, { queue });
                    transition.commitChatTransition();
                }
            }
            async sendMessage(chatId, text) {
                const customId = "LiveChatX_" + Math.random().toString(36).substr(2, 9);
                const state = this.store.getState();
                const authorId = state.myProfile?.id;
                const chat = state.chatsByIds[chatId];
                if (!chat) {
                    throw new Error("Chat does not present in memory");
                }
                if (!authorId) {
                    throw new Error("sendMessage: `authorId` can't be empty");
                }
                const thread = getActiveThread(chat);
                if (!thread) {
                    throw new Error("chat should be activated");
                }
                const threadId = thread.id;
                const message = {
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
                };
                const event = {
                    id: customId,
                    custom_id: customId,
                    type: "message",
                    text: text,
                    recipients: "all",
                };
                const payload = {
                    chat_id: chatId,
                    event: event
                };
                this.store.addMessage(chatId, threadId, message);
                await this.performAsync("send_event", payload)
                    .then(response => {
                    const chatId = String(response.event_id);
                    this.store.updateMessage(chatId, threadId, customId, { id: chatId });
                })
                    .catch(err => {
                    alert(err.message);
                    // this.store.updateMessage(chatId, threadId, customId, {
                    //   error: err.message
                    // })
                })
                    .finally(() => {
                    this.store.updateMessage(chatId, threadId, customId, { isSending: false });
                });
            }
            async syncIncompleteThreadsAsync(chatId, signal) {
                const chat = this.store.getState().chatsByIds[chatId];
                if (!chat || chat.isSyncingIncompleteThreads) {
                    return;
                }
                const incompleteThreadIds = getIncompleteThreadIds(chat);
                if (incompleteThreadIds.length === 0) {
                    return;
                }
                this.store.updateChat(chatId, { isSyncingIncompleteThreads: true });
                const promises = incompleteThreadIds.map(threadId => {
                    return this.performAsync("get_chat", { chat_Id: chatId, thread_id: threadId }, { signal }).then(response => {
                        const currentChat = this.store.getState().chatsByIds[chatId];
                        const incomingChat = parseChat(response);
                        const nextThreads = {
                            ...currentChat.threads,
                            ...incomingChat.threads
                        };
                        this.store.updateChat(chatId, {
                            threads: nextThreads
                        });
                    });
                });
                return Promise.all(promises).finally(() => {
                    this.store.updateChat(chatId, { isSyncingIncompleteThreads: false });
                });
            }
            setRoutingStatus(status) {
                return this.performAsync("set_routing_status", {
                    status,
                    agent_id: this.store.getState().myProfile?.id
                });
            }
            startChat(chatId) {
                const chatRoute = this.chatRouteManager.getCurrentChatRoute(chatId);
                const myProfileId = this.store.getState().myProfile?.id;
                if (!myProfileId) {
                    throw new Error(`myProfileId can't be empty.`);
                }
                if (chatRoute === "queued") {
                    return this.performAsync("add_user_to_chat", {
                        chat_id: chatId,
                        user_id: myProfileId,
                        user_type: "agent"
                    });
                }
            }
        }
        services.API = API;
    })(services = app.services || (app.services = {}));
})(app || (app = {}));
