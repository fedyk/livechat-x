import { Chat, ChatsSegments, License, MyProfile } from "./types"
import { indexBy, Listener, shallowEqual } from "./helpers.js"

interface State {
  chatsByIds: {
    [key: string]: Chat
  }
  chatsSegments: ChatsSegments
  myProfile: MyProfile | null
  license: License | null
}

interface setChatsAction {
  type: "SET_CHATS"
  payload: State["chatsByIds"]
}
interface setChatsSegmentsAction {
  type: "SET_CHATS_SEGMENTS"
  payload: State["chatsSegments"]
}

interface setMyProfileAction {
  type: "SET_MY_PROFILE"
  payload: MyProfile
}

interface setLicenseAction {
  type: "SET_LICENCE"
  payload: License
}

type Actions = setChatsAction |
  setChatsSegmentsAction |
  setMyProfileAction |
  setLicenseAction;

export class Store {
  protected state: State
  protected listeners: Array<Function>

  constructor() {
    this.state = {
      myProfile: null,
      license: null,
      chatsByIds: {},
      chatsSegments: {
        myChatIds: [],
        queuedChatIds: [],
        supervisedChatIds: [],
        unassignedChatIds: [],
      }
    }
    this.listeners = []
  }

  setChats(chats: State["chatsByIds"]) {
    return this.dispatch({
      type: "SET_CHATS",
      payload: chats
    })
  }

  setChatsSegments(segments: State["chatsSegments"]) {
    return this.dispatch({
      type: "SET_CHATS_SEGMENTS",
      payload: segments
    })
  }

  setMyProfile(myProfile: MyProfile) {
    return this.dispatch({
      type: "SET_MY_PROFILE",
      payload: myProfile
    })
  }

  setLicense(license: License) {
    return this.dispatch({
      type: "SET_LICENCE",
      payload: license
    })
  }

  getState() {
    return this.state
  }

  subscribe(listener: Function): Listener {
    if (typeof listener !== "function") {
      throw new Error("listener should be executable")
    }

    this.listeners.push(listener)

    return {
      unbind: () => this.unsubscribe(listener)
    }
  }

  unsubscribe(listener: Function) {
    const index = this.listeners.indexOf(listener)

    if (index !== -1) {
      this.listeners.splice(index, 1)
    }
  }

  connect<T = {}>(mapStateToProps: (state: State) => T, connectListener: (data: T) => void) {
    let lastMappedData = mapStateToProps(this.state)

    connectListener(lastMappedData)

    return this.subscribe(() => {
      const nextMappedData = mapStateToProps(this.state)

      if (!shallowEqual(lastMappedData, nextMappedData)) {
        connectListener(lastMappedData)
      }

      lastMappedData = nextMappedData
    })
  }

  protected reducer(state: State, action: Actions): State {
    switch (action.type) {
      case "SET_CHATS":
        return { ...state, chatsByIds: action.payload }

      case "SET_LICENCE":
        return { ...state, license: action.payload }

      case "SET_MY_PROFILE":
        return { ...state, myProfile: action.payload }

      default:
        return state
    }
  }

  protected dispatch(action: Actions) {
    const prevState = this.state
    const nextState = this.reducer(prevState, action)

    // no changes
    if (prevState === nextState) {
      return
    }

    // update state with new value
    this.state = nextState

    const listeners = this.listeners

    for (let i = 0; i < listeners.length; i++) {
      listeners[i]()
    }
  }
}
