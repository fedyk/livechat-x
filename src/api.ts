import { API$Response$Login } from "./types.js";
import { getAgentAPIHost } from "./config.js";
import { Store } from "./store.js";
import { RTM, Auth } from "./services.js";
import {
  Disposable,
  Listeners,
  ErrorWithType,
  TypedEventEmitter,
  mergeChats,
  indexBy
} from "./helpers.js";
import {
  parseChatsSummary,
  parseLicense,
  parseMyProfile
} from "./parsers.js";


interface APIEvents {
  loginError(err: ErrorWithType): void
}

export class API extends TypedEventEmitter<APIEvents> implements Disposable {
  rtm?: RTM;
  rtmListeners: Listeners;
  auth: Auth;
  store: Store;

  constructor(auth: Auth, store: Store) {
    super();
    this.rtmListeners = new Listeners();
    this.auth = auth;
    this.store = store;
  }

  dispose() {
    this.rtm?.close()
  }

  connect() {
    const region = this.auth.getRegion();
    const url = `wss://${getAgentAPIHost(region)}/v3.3/agent/rtm/ws`;

    this.rtm = new RTM(url);
    this.rtmListeners.unbindAll();
    this.rtmListeners.register(
      this.rtm.addListener("open", this.handleOpen),
      this.rtm.addListener("close", this.handleClose),
      this.rtm.addListener("error", this.handleError),
      this.rtm.addListener("push", this.handlePush)
    );
  }

  handleOpen = () => {
    if (!this.rtm) {
      throw new Error("how it even possible?");
    }

    const accessToken = this.auth.getAccessToken();
    const payload = {
      token: `Bearer ${accessToken}`
    };

    this.rtm.performAsync<API$Response$Login>("login", payload)
      .then(response => {
        const state = this.store.getState()
        const chats = parseChatsSummary(response.chats_summary)
        const license = parseLicense(response.license)
        const myProfile = parseMyProfile(response.my_profile)
        const mergeResults = mergeChats(state.chatsByIds, indexBy(chats, "id"), state.chatsSegments, myProfile.id)

        if (mergeResults.closedChatIds.size > 0) {
          /** @todo: sync the content of archived chats */
        }

        this.store.setChats(mergeResults.chatsById)
        this.store.setChatsSegments(mergeResults.chatsSegments)
        this.store.setLicense(license)
        this.store.setMyProfile(myProfile)
      })
      .catch(err => this.emit("loginError", err));
  };

  handleClose = (manualClose: boolean) => {
    if (manualClose) {
      return
    }

    this.connect()
  }

  handleError = (err: Error) => {
    console.error(err);
  }

  handlePush = (push: any) => {
    console.log(push);
  }
}
