"use strict";
var app;
(function (app) {
    var store;
    (function (store) {
        var createInjector = app.helpers.createInjector;
        var shallowEqual = app.helpers.shallowEqual;
        var mergeMessages = app.helpers.mergeMessages;
        store.$Store = createInjector();
        class Store {
            constructor(initialState = {
                chatIds: [],
                myProfile: null,
                license: null,
                selectedChatId: null,
                chatsByIds: {},
                routingStatuses: {},
                cannedResponses: {},
            }) {
                this.state = initialState;
                this.listeners = [];
                this.isDispatching = false;
            }
            dispose() {
                this.state = null;
                this.listeners = [];
            }
            setChats(chats) {
                return this.dispatch({
                    type: "SET_CHATS",
                    payload: chats
                });
            }
            setChat(chat) {
                return this.dispatch({
                    type: "SET_CHAT",
                    payload: chat
                });
            }
            updateChat(chatId, chat) {
                return this.dispatch({
                    type: "UPDATE_CHAT",
                    payload: { chatId, chat }
                });
            }
            updateChatThread(chatId, threadId, thread) {
                return this.dispatch({
                    type: "UPDATE_CHAT_THREAD",
                    payload: { chatId, threadId, thread }
                });
            }
            updateChatUser(chatId, userId, user) {
                return this.dispatch({
                    type: "UPDATE_CHAT_USER",
                    payload: { chatId, userId, user }
                });
            }
            setSneakPeek(chatId, sneakPeek) {
                return this.dispatch({
                    type: "SET_SNEAK_PEEK",
                    payload: { chatId, sneakPeek }
                });
            }
            setChatIds(chatIds) {
                return this.dispatch({
                    type: "SET_CHAT_IDS",
                    payload: chatIds
                });
            }
            setSelectedChatId(chatId) {
                return this.dispatch({
                    type: "SET_SELECTED_CHAT",
                    payload: chatId
                });
            }
            setMyProfile(myProfile) {
                return this.dispatch({
                    type: "SET_MY_PROFILE",
                    payload: myProfile
                });
            }
            setLicense(license) {
                return this.dispatch({
                    type: "SET_LICENCE",
                    payload: license
                });
            }
            setRoutingStatus(agentId, routingStatus) {
                return this.dispatch({
                    type: "SET_ROUTING_STATUS",
                    payload: { agentId, routingStatus }
                });
            }
            addMessage(chatId, threadId, message) {
                this.dispatch({
                    type: "ADD_MESSAGE",
                    payload: {
                        chatId, threadId, message
                    }
                });
            }
            updateMessage(chatId, threadId, messageId, message) {
                this.dispatch({
                    type: "UPDATE_MESSAGE",
                    payload: {
                        chatId, threadId, messageId, message
                    }
                });
            }
            setCannedResponses(cannedResponses, groupId) {
                this.dispatch({
                    type: "SET_CANNED_RESPONSES",
                    payload: { cannedResponses, groupId }
                });
            }
            addCannedResponse(cannedResponse, groupId) {
                this.dispatch({
                    type: "ADD_CANNED_RESPONSE",
                    payload: { cannedResponse, groupId }
                });
            }
            updateCannedResponse(cannedResponse, groupId) {
                this.dispatch({
                    type: "UPDATE_CANNED_RESPONSE",
                    payload: { cannedResponse, groupId }
                });
            }
            removeCannedResponse(id, groupId) {
                this.dispatch({
                    type: "REMOVE_CANNED_RESPONSE",
                    payload: { id, groupId }
                });
            }
            getState() {
                return this.state;
            }
            subscribe(listener) {
                if (typeof listener !== "function") {
                    throw new Error("listener should be executable");
                }
                this.listeners.push(listener);
                return {
                    unbind: () => this.unsubscribe(listener)
                };
            }
            unsubscribe(listener) {
                const index = this.listeners.indexOf(listener);
                if (index !== -1) {
                    this.listeners.splice(index, 1);
                }
            }
            /**
             * @example
             * const connect = store.connect(
             *   state => ({
             *     user: state.users[userId]
             *   }),
             *   data => this.userName = data.user.name
             * )
             *
             * connect.unbind()
             */
            connect(mapStateToProps, connectListener) {
                let lastMappedData = mapStateToProps(this.state);
                connectListener(lastMappedData);
                return this.subscribe(() => {
                    const nextMappedData = mapStateToProps(this.state);
                    if (!shallowEqual(lastMappedData, nextMappedData)) {
                        setTimeout(function () {
                            connectListener(nextMappedData);
                        }, 0);
                    }
                    lastMappedData = nextMappedData;
                });
            }
            dispatch(action) {
                if (this.isDispatching) {
                    throw new Error(`What? Store dispatch in dispatch. Please be more careful: ${action.type}`);
                }
                this.isDispatching = true;
                try {
                    const prevState = this.state;
                    const nextState = this.reducer(prevState, action);
                    // no changes
                    if (prevState === nextState) {
                        return;
                    }
                    // update state with new value
                    this.state = nextState;
                    const listeners = this.listeners;
                    for (let i = 0; i < listeners.length; i++) {
                        listeners[i]();
                    }
                }
                catch (err) {
                    throw err;
                }
                finally {
                    this.isDispatching = false;
                }
            }
            reducer(state, action) {
                switch (action.type) {
                    case "SET_CHATS":
                        return { ...state, chatsByIds: action.payload };
                    case "SET_CHAT":
                        return {
                            ...state,
                            chatsByIds: {
                                ...state.chatsByIds,
                                [action.payload.id]: action.payload
                            }
                        };
                    case "UPDATE_CHAT":
                        return {
                            ...state,
                            chatsByIds: {
                                ...state.chatsByIds,
                                [action.payload.chatId]: {
                                    ...state.chatsByIds[action.payload.chatId],
                                    ...action.payload.chat
                                }
                            }
                        };
                    case "UPDATE_CHAT_THREAD":
                        return updateChatThread(state, action);
                    case "UPDATE_CHAT_USER":
                        return updateChatUser(state, action);
                    case "SET_SNEAK_PEEK":
                        return setSneakPeek(state, action);
                    case "SET_CHAT_IDS":
                        return { ...state, chatIds: action.payload };
                    case "SET_SELECTED_CHAT":
                        return { ...state, selectedChatId: action.payload };
                    case "SET_LICENCE":
                        return { ...state, license: action.payload };
                    case "SET_MY_PROFILE":
                        return { ...state, myProfile: action.payload };
                    case "SET_ROUTING_STATUS":
                        return {
                            ...state, routingStatuses: {
                                ...state.routingStatuses,
                                [action.payload.agentId]: action.payload.routingStatus
                            }
                        };
                    case "ADD_MESSAGE":
                        return addMessageReducer(state, action);
                    case "UPDATE_MESSAGE":
                        return updateMessageReducer(state, action);
                    case "SET_CANNED_RESPONSES":
                        return {
                            ...state,
                            cannedResponses: {
                                ...state.cannedResponses,
                                [action.payload.groupId]: action.payload.cannedResponses
                            }
                        };
                    case "ADD_CANNED_RESPONSE": {
                        const cannedResponses = state.cannedResponses[action.payload.groupId];
                        if (!cannedResponses) {
                            return state;
                        }
                        return {
                            ...state,
                            cannedResponses: {
                                ...state.cannedResponses,
                                [action.payload.groupId]: [action.payload.cannedResponse].concat(cannedResponses)
                            }
                        };
                    }
                    case "UPDATE_CANNED_RESPONSE": {
                        const cannedResponses = state.cannedResponses[action.payload.groupId];
                        if (!cannedResponses) {
                            return state;
                        }
                        return {
                            ...state,
                            cannedResponses: {
                                ...state.cannedResponses,
                                [action.payload.groupId]: cannedResponses.map(function (v) {
                                    if (v.id === action.payload.cannedResponse.id) {
                                        return {
                                            ...v,
                                            ...action.payload.cannedResponse
                                        };
                                    }
                                    else {
                                        return v;
                                    }
                                })
                            }
                        };
                    }
                    case "REMOVE_CANNED_RESPONSE": {
                        const cannedResponses = state.cannedResponses[action.payload.groupId];
                        if (!cannedResponses) {
                            return state;
                        }
                        return {
                            ...state,
                            cannedResponses: {
                                ...state.cannedResponses,
                                [action.payload.groupId]: cannedResponses.filter(v => v.id !== action.payload.id)
                            }
                        };
                    }
                    default:
                        return console.warn("Action", action, "is unhandled"), state;
                }
            }
        }
        store.Store = Store;
        function addMessageReducer(state, action) {
            const chat = state.chatsByIds[action.payload.chatId];
            const thread = chat ? chat.threads[action.payload.threadId] : void 0;
            if (!thread) {
                return state;
            }
            const nextThread = {
                ...thread,
                messages: mergeMessages(thread.messages, [action.payload.message])
            };
            const nextChat = {
                ...chat,
                threads: {
                    ...chat.threads,
                    [nextThread.id]: nextThread
                }
            };
            return {
                ...state,
                chatsByIds: {
                    ...state.chatsByIds,
                    [nextChat.id]: nextChat
                }
            };
        }
        function updateMessageReducer(state, action) {
            const chatId = action.payload.chatId;
            const threadId = action.payload.threadId;
            const messageId = action.payload.messageId;
            const chat = state.chatsByIds[chatId];
            const thread = chat ? chat.threads[threadId] : void 0;
            if (!thread) {
                return state;
            }
            const nextMessages = thread.messages.map(message => {
                if (message.id === messageId) {
                    return {
                        ...message,
                        ...action.payload.message
                    };
                }
                else {
                    return message;
                }
            });
            const nextThread = {
                ...thread,
                messages: nextMessages,
            };
            const nextChat = {
                ...chat,
                threads: {
                    ...chat.threads,
                    [nextThread.id]: nextThread
                }
            };
            return {
                ...state,
                chatsByIds: {
                    ...state.chatsByIds,
                    [nextChat.id]: nextChat
                }
            };
        }
        function updateChatThread(state, action) {
            const chat = state.chatsByIds[action.payload.chatId];
            const thread = chat ? chat.threads[action.payload.threadId] : void 0;
            if (!thread) {
                return state;
            }
            const nextThread = { ...thread, ...action.payload.thread };
            const nextChat = {
                ...chat,
                threads: {
                    ...chat.threads,
                    [nextThread.id]: nextThread
                }
            };
            return {
                ...state,
                chatsByIds: {
                    ...state.chatsByIds,
                    [action.payload.chatId]: nextChat
                }
            };
        }
        function updateChatUser(state, action) {
            const chat = state.chatsByIds[action.payload.chatId];
            const users = chat?.users;
            if (!users || !users[action.payload.userId]) {
                return state;
            }
            const nextUsers = Object.assign({}, users, {
                [action.payload.userId]: {
                    ...users[action.payload.userId],
                    ...action.payload.user
                }
            });
            const nextChat = {
                ...chat,
                users: nextUsers
            };
            return {
                ...state,
                chatsByIds: {
                    ...state.chatsByIds,
                    [action.payload.chatId]: nextChat
                }
            };
        }
        function setSneakPeek(state, action) {
            const chat = state.chatsByIds[action.payload.chatId];
            if (!chat) {
                return state;
            }
            const nextChat = {
                ...chat,
                sneakPeek: action.payload.sneakPeek,
            };
            return {
                ...state,
                chatsByIds: {
                    ...state.chatsByIds,
                    [action.payload.chatId]: nextChat
                }
            };
        }
    })(store = app.store || (app.store = {}));
})(app || (app = {}));
