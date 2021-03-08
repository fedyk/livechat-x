"use strict";
var app;
(function (app) {
    var demo;
    (function (demo) {
        var indexBy = app.helpers.indexBy;
        var $Store = app.store.$Store;
        demo.agent1 = {
            id: "agent_1",
            name: "Current Agent",
            email: "agent1@example.com",
            type: "agent",
            avatar: "https://i.pravatar.cc/512?img=3",
            present: true,
            seenUpTo: Date.now()
        };
        demo.customer1 = {
            id: "customer_1",
            name: "Visitor 1",
            email: "customer1@example.com",
            type: "customer",
            avatar: void 0,
            present: true,
            seenUpTo: Date.now() - 1000 * 60 * 7,
            statistics: {
                chatsCount: 0,
                threadCount: 0,
                visitsCount: 0,
            },
            fields: [{
                    name: "field 1",
                    value: "value https://example.com with html"
                }]
        };
        demo.customer2 = {
            id: "customer_2",
            name: "Visitor 2",
            email: "customer2@example.com",
            type: "customer",
            avatar: void 0,
            present: true,
            seenUpTo: Date.now(),
            statistics: {
                chatsCount: 0,
                threadCount: 0,
                visitsCount: 0,
            },
            fields: [{
                    name: "field 1",
                    value: "value https://example.com with html"
                }]
        };
        const messages1 = [
            {
                id: "thread_1_1",
                type: "message",
                text: "First message from agent",
                authorId: demo.agent1.id,
                createdAt: Date.now() - 1000 * 60 * 10,
                postback: {},
                recipients: "all",
            }, {
                id: "thread_1_2",
                type: "message",
                text: "First message from customer",
                authorId: demo.customer1.id,
                createdAt: Date.now() - 1000 * 60 * 10,
                postback: {},
                recipients: "all",
            }, {
                id: "thread_1_3",
                type: "file",
                authorId: demo.customer1.id,
                name: "File from customer1",
                url: "https://cdn.livechatinc.com/cloud/?uri=https%3A%2F%2Flivechat.s3.amazonaws.com%2Fdefault%2Favatars%2F394ad6e3df2320941ab8e0ca147d5221.png",
                contentType: "image/png",
                createdAt: Date.now() - 1000 * 60 * 5,
                size: 50000000,
                recipients: "all",
            }, {
                id: "thread_1_4",
                type: "file",
                authorId: demo.agent1.id,
                name: "File from agent1",
                url: "https://cdn.livechatinc.com/cloud/?uri=https%3A%2F%2Flivechat.s3.amazonaws.com%2Fdefault%2Favatars%2F394ad6e3df2320941ab8e0ca147d5221.png",
                contentType: "image/png",
                createdAt: Date.now() - 1000 * 60 * 5,
                size: 500000,
                recipients: "all",
            }, {
                id: "thread_1_5",
                type: "filled_form",
                authorId: demo.customer1.id,
                createdAt: Date.now() - 1000 * 60 * 5,
                recipients: "all",
                formId: "1",
                fields: [
                    {
                        name: "Name",
                        value: "Barron"
                    },
                    {
                        name: "email",
                        value: "Barron@example.com"
                    },
                    {
                        name: "I agree to have my personal data processed by LiveChat, Inc. for chat support. Full policy",
                        value: "Agree"
                    }
                ],
            }, {
                id: "thread_1_6",
                type: "rich_message",
                authorId: demo.customer1.id,
                createdAt: Date.now() - 1000 * 60 * 5,
                recipients: "all",
                templateId: "quick_replies",
                elements: [{
                        title: "title",
                        subtitle: "subtitle",
                        buttons: [{
                                text: "Button 1"
                            }, {
                                text: "Button 2"
                            }, {
                                text: "Button 3"
                            }]
                    }]
            }, {
                id: "thread_1_7",
                type: "system_message",
                text: "Date & time format with a resolution of microseconds, UTC string; generated",
                createdAt: Date.now() - 1000 * 60 * 1,
                recipients: "agents",
            }
        ];
        const thread1 = {
            id: "thread_1",
            tags: ["tag1", "tag2", "tag3"],
            active: true,
            messages: messages1,
            createdAt: Date.now() - 1000 * 60 * 60,
            properties: {
                routing: {
                    idle: true,
                    lastTransferTimestamp: 0,
                },
                rating: {
                    score: null,
                    comment: null
                },
            },
            incomplete: false,
            restrictedAccess: void 0,
            highlights: [],
            queue: null
        };
        const messages2 = [
            {
                id: "thread_2_1",
                type: "message",
                text: "First message",
                authorId: demo.agent1.id,
                createdAt: Date.now(),
                postback: {},
                recipients: "all",
            }
        ];
        const thread2 = {
            id: "thread_2",
            tags: ["tag1", "tag2", "tag3"],
            active: true,
            messages: messages2,
            createdAt: Date.now() - 1000 * 60 * 5,
            properties: {
                routing: {
                    idle: true,
                    lastTransferTimestamp: 0,
                },
                rating: {
                    score: null,
                    comment: null
                },
            },
            incomplete: false,
            restrictedAccess: void 0,
            highlights: [],
            queue: null
        };
        demo.chat1 = {
            id: "chat_1",
            sneakPeek: {
                authorId: demo.customer1.id,
                text: "Sneak peek from customer 1",
                timestamp: Date.now()
            },
            customerId: demo.customer1.id,
            properties: {
                routing: {
                    continuous: false,
                    pinned: false
                },
                source: {
                    customerClientId: "customer_client_id_1"
                },
                supervising: {
                    agentIds: []
                }
            },
            groupId: 0,
            users: indexBy([demo.agent1, demo.customer1], "id"),
            threadIds: [thread1.id],
            threads: indexBy([thread1], "id"),
            history: {
                status: "up-to-date",
                foundThreads: 1,
                nextPageId: null
            }
        };
        demo.chat2 = {
            id: "chat_2",
            sneakPeek: null,
            customerId: demo.customer2.id,
            properties: {
                routing: {
                    continuous: false,
                    pinned: false
                },
                source: {
                    customerClientId: "customer_client_id_1"
                },
                supervising: {
                    agentIds: []
                }
            },
            groupId: 0,
            users: indexBy([demo.agent1, demo.customer2], "id"),
            threadIds: [thread2.id],
            threads: indexBy([thread2], "id"),
            history: {
                status: "up-to-date",
                foundThreads: 1,
                nextPageId: null
            }
        };
        demo.initialState = {
            chatsByIds: indexBy([demo.chat1, demo.chat2], "id"),
            chatIds: [demo.chat1.id, demo.chat2.id],
            routingStatuses: {
                [demo.agent1.id]: "accepting_chats"
            },
            selectedChatId: null,
            myProfile: {
                id: demo.agent1.id,
                name: demo.agent1.name,
                avatar: "https://cdn.livechatinc.com/cloud/?uri=https%3A%2F%2Flivechat.s3.amazonaws.com%2Fdefault%2Favatars%2F394ad6e3df2320941ab8e0ca147d5221.png",
                email: demo.agent1.email,
            },
            license: null,
            cannedResponses: {}
        };
        function fakeIncomingMessages(store = $Store()) {
            const chatId = demo.chat1.id;
            const threadId = thread1.id;
            const authorId = demo.customer1.id;
            setInterval(function () {
                store.addMessage(chatId, threadId, {
                    id: Math.random() + "",
                    type: "message",
                    createdAt: Date.now(),
                    recipients: "all",
                    authorId,
                    text: new Date().toISOString(),
                    postback: {},
                });
            }, 1000);
        }
        demo.fakeIncomingMessages = fakeIncomingMessages;
    })(demo = app.demo || (app.demo = {}));
})(app || (app = {}));
