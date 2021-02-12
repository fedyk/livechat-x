"use strict";
var app;
(function (app) {
    var config;
    (function (config) {
        config.__DEV__ = location.hostname === "localhost";
        config.LIVECHAT_CLIENT_ID = "b71bb162a2aaebf04bdc4abcb91632ae";
        config.LIVEHCAT_REDIRECT_URL = config.__DEV__ ? "http://localhost:8080" : "https://fedyk.github.io/livechat-x/";
        config.AGENT_API_HOSTS = {
            dal: "api.livechatinc.com",
            fra: "api-fra.livechatinc.com",
        };
        function getAccountsUrl(path = "", state = "") {
            return `https://accounts.livechat.com/${path}` +
                `?response_type=token` +
                `&client_id=${encodeURIComponent(config.LIVECHAT_CLIENT_ID)}` +
                `&redirect_uri=${encodeURIComponent(config.LIVEHCAT_REDIRECT_URL)}` +
                `&state=${encodeURIComponent(state)}`;
        }
        config.getAccountsUrl = getAccountsUrl;
        function getAgentAPIHost(region) {
            const host = config.AGENT_API_HOSTS[region];
            if (!host) {
                throw new Error(`Unsupported region ${region}`);
            }
            return host;
        }
        config.getAgentAPIHost = getAgentAPIHost;
    })(config = app.config || (app.config = {}));
})(app || (app = {}));
