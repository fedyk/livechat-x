export interface Credentials {
  accessToken: string
  expiredAt: number
  scopes: string[]
}

export interface SelectedChatSegment {
  segment: "my" | "queued" | "supervised" | "unassigned" | "archived"
}

export interface ChatsSegments {
  myChatIds: string[] 
  queuedChatIds: string[]
  supervisedChatIds: string[]
  unassignedChatIds: string[]
}

export interface Chat {
  id: string
  sneakPeek: SneakPeek | null
  customerId?: string
  properties: ChatProperties
  groupId: number
  users: {
    [userId: string]: User
  }
  threadIds: string[]
  threads: {
    [threadId: string]: Thread
  }
  history: {
    status: "incomplete" | "up-to-date"
    foundThreads: number | null
    nextPageId: string | null
  }
}

export interface License {
  id: number
}

export interface SneakPeek {
  authorId: string
  text: string
  timestamp: number
}

export interface ChatProperties {
  routing: {
    continuous: boolean
    pinned: boolean
  }
  source: {
    customerClientId: string
  }
  supervising: {
    agentIds: string[]
  }
}

export interface Thread {
  id: string
  tags: string[]
  active: boolean
  messages: Event[]
  createdAt: number
  properties: ThreadProperties
  incomplete: boolean
  restrictedAccess?: string
  highlights: Highlight[]
  sessionFields?: Fields
  queue: Queue | null
}

export interface ThreadProperties {
  routing: {
    idle: boolean
    lastTransferTimestamp: number
    unassigned: boolean
  }
  rating: {
    score?: number | null
    comment: string | null
  }
}

export interface Queue {
  position: number
  waitTime: number
  queuedAt: number
}

// export type AgentStat = {
//   id: string;
//   label: string;
//   value: string | number | null;
// };

// export type AgentGroup = {
//   id: number;
//   name: string;
// }

// export type WorkingHours = {
//   label: string;
//   start: string;
//   end: string;
// }

// export type Permission = "normal" | "administrator" | "owner" | "viceowner"

// export interface Agent {
//   id: string
//   name: string
//   jobTitle: string
//   avatar?: string
//   status: RoutingStatus
//   permission: Permission
//   isBot: boolean
//   groups: AgentGroup[]
//   chatsLimit: number
//   dailySummaryEnabled: boolean
//   weeklySummaryEnabled: boolean
//   workScheduler: WorkingHours[]
//   awaitingApproval: boolean
// }

export type RoutingStatus = "accepting_chats" | "not_accepting_chats" | "offline"

// export interface Me {
//   id: string
//   name: string
//   email: string
//   avatar: string
//   permission: Permission
//   groups: Array<{
//     id: number
//     name: string
//   }>
//   licenseId: number
//   notifications: {
//     send_new_customer: boolean
//     send_returning_customer: boolean
//     send_new_queued_chat: boolean
//     send_new_unassigned_chat: boolean
//     mute_all: boolean
//   }
//   instances: {
//     appInfo: string;
//     version: string;
//   }[]
// }

export interface MyProfile {
  id: string
  name: string
  email: string
  avatar: string
  routingStatus: RoutingStatus
}

export type User = UserAgent | UserCustomer;

export interface UserAgent {
  id: string
  name: string
  email: string
  type: "agent"
  avatar?: string
  present: boolean
  /** @type {number} Timestamp in MILLISECONDS */
  seenUpTo: number
}

export interface UserCustomer extends Customer {
  type: "customer"
  avatar?: string
  present: boolean
  /** @type {number} Timestamp in MILLISECONDS */
  seenUpTo: number
}

export interface Customer {
  id: string
  name: string
  email: string
  avatar?: string
  lastVisit?: CustomerLastVisit
  statistics: CustomerStatistics
  fields: Fields
}


export interface CustomerLastVisit {
  ip: string
  startedAt: number
  /** @type {number} milliseconds */
  endedAt?: number
  userAgent: string
  referrer: string
  lastPages: VisitedPage[]
  geolocation?: Geolocation
}

export interface CustomerStatistics {
  chatsCount: number
  threadCount: number
  visitsCount: number
}

export interface VisitedPage {
  url: string
  title: string
  openedAt: number
}

export interface Geolocation {
  city: string
  country: string
  countryCode: string
  latitude: number
  longitude: number
  region: string
  timezone: string
}

export type Fields = Array<{
  name: string
  value: string
}>

export type Highlight = {
  type: "event.message"
  field: "text"
  highlight: string
} | {
  type: "event.file"
  field: "name"
  highlight: string
} | {
  type: "event.filled_form"
  field: "answer"
  highlight: string
} | {
  type: "thread"
  field: "id" | "tag"
  highlight: string
} | {
  type: "chat"
  field: "id"
  highlight: string
} | {
  type: "customer"
  field: "id" | "email" | "name" | "session-field-value"
  highlight: string
} | {
  type: "agent"
  field: "id" | "name"
  highlight: string
}

// export interface Group {
//   id: number
//   name: string
//   agentIds: string[]
//   status: RoutingStatus
// }

export interface FileEvent {
  id: string
  customId?: string
  type: "file",
  authorId: string
  createdAt: number,
  recipients: "all" | "agents"
  name: string
  url: string
  thumbnailUrl?: string
  thumbnail2xUrl?: string
  contentType: string
  size: number
  width?: number
  height?: number
}

export interface FilledFormEvent {
  id: string
  customId?: string
  type: "filled_form",
  authorId: string
  createdAt: number,
  recipients: "all" | "agents",
  formId: string
  fields: Array<string | {
    name: string
    value: string
  } | {
    groupId: number
    label: string
  }>
}

export interface MessageEvent {
  id: string
  customId?: string
  type: "message",
  authorId: string
  createdAt: number
  text: string
  postback: any
  recipients: "all" | "agents",
}

export interface RichMessageEvent {
  id: string
  customId?: string
  type: "rich_message"
  authorId: string
  createdAt: number
  recipients: "all" | "agents"
  templateId: string
  elements: Array<{
    title?: string
    subtitle?: string
    image?: {
      name: string,
      url: string
      contentType: string
      size: number
      width: number
      height: number
      alternativeText: string
    }
    buttons?: Array<{
      text: string
    }>
  }>
}

export interface SystemEvent {
  id: string
  customId?: string
  recipients: "all" | "agents"
  type: "system_message"
  createdAt: number
  text: string
  systemMessageType: string
}

export type Event = FileEvent | FilledFormEvent | MessageEvent | RichMessageEvent | SystemEvent

// export interface Event {
//   id: string
//   customId?: string
//   threadId: string

  // id: string
  // customId?: string
  // threadId: string;
  // text : string
  // /**
  //  * For use in push notifications only
  //  */
  // eventType?: string
  // authorId?: string
  // /** @type {number} Timestamp in MILLISECONDS */
  // createdAt: number
  // recipients: "agents" | "all"
  // image?: {
  //   origin: string
  //   thumbnailUrl: string
  //   thumbnail2xUrl: string
  //   // image uploaded by user
  //   localUrl?: string
  //   width: number
  //   height: number
  // }
  // sneakPeek?: boolean
  // draftFile?: {
  //   name: string
  //   uri: string
  //   type: string
  // }
  // video?: string
  // audio?: string
  // file?: string
  // system?: boolean
  // /**
  //  * For use in push notifications only
  //  */
  // systemEventType?: string
  // sent?: boolean
  // received?: boolean
  // pending?: boolean
  // notDelivered?: boolean
  // tags?: string[]
  // filledFormType?: FilledFormType
  // filledFormFields?: FilledFormField[]
  // richMessageTemplate?: "cards" | "quick_replies"
  // richMessageElements?: RichMessageElement[]
// }

// export type FilledFormAnswer = string | {
//   id: string
//   label: string
// } | {
//   group_id: number
//   label: string
// }

// export type FilledFormType = 'prechat' | 'postchat';

// /**
//  * @see https://github.com/livechat/agent-api/tree/labs/docs/api-reference/v3.2#filled-form
//  */
// export interface FilledFormField {
//   name: string;
//   value: string;
// }

// export interface RichMessageButton {
//   id: string;
//   text: string;
// }

// export interface RichMessageImage {
//   url: string;
//   name?: string;
// }

// export interface RichMessageElement {
//   template?: "cards" | "quick_replies";
//   buttons?: RichMessageButton[];
//   image?: RichMessageImage;
//   title?: string;
//   subtitle?: string;
// }

export type ChatRoute =
  /** Active and assigned to me */
  "my" |
  /** Active and assigned to other agent/bot */
  "other" |
  /** Closed */
  "closed" |
  /** Active and unassigned */
  "queued" |
  /** Active, assigned to other and has me in list of supervisors */
  "supervised" |
  /** Active, unassigned, continuous, pinned */
  "unassigned" |
  /** Inactive, continuous, pinned */
  "pinned"


// export interface CannedResponse {
//   id: number
//   text: string
//   tags: string[]
//   groupId: number
//   /** tags as a string: "#tag1, #tag2" - is used for search */
//   tagsStringified: string
// }

// export interface Tag {
//   name: string
//   totalCount: number
//   groupId: number
// }

// export interface Ban {
//   ip: string
//   expiredAt: number
// }

// export interface API$Push<A, P = any> {
//   action: A
//   type: "push"
//   payload: P
//   request_id: string
// }

// export interface API$Response<Action, Success, Payload> {
//   request_id: string
//   action: Action
//   type: "response"
//   success: Success
//   payload: Payload
// }

// export type API$Responses = API$Response$Login |
//   API$Response$LoginError

// export type API$Pushes = API$Push$RoutingStatusSet |
//   API$Push$ChatDeactivated |
//   API$Push$IncomingChat |
//   API$Push$IncomingEvent |
//   API$Push$ChatTransferred |
//   API$Push$ChatThreadTagged |
//   API$Push$ChatThreadUntagged |
//   API$Push$ChatAccessGranted |
//   API$Push$ChatAccessRevoked |
//   API$Push$UserAddedToChat |
//   API$Push$UserRemovedToChat |
//   API$Push$ChatPropertiesUpdated |
//   API$Push$ChatPropertiesDeleted |
//   API$Push$ThreadPropertiesUpdated |
//   API$Push$ThreadPropertiesDeleted |
//   API$Push$EventsMarkedAsSeen |
//   API$Push$IncomingSneakPeek |
//   API$Push$AgentDisconnected |
//   API$Push$IncomingMulticast |
//   API$Push$QueuePositionsUpdated |
//   API$Push$CustomerVisitStarted |
//   API$Push$CustomerUpdated |
//   API$Push$CustomerVisitEnded;

// export type API$Messages = API$Responses | API$Pushes

// export interface API$Error {
//   type: "authentication" |
//   "authorization" |
//   "internal" |
//   "license_expired" |
//   "pending_requests_limit_reached" |
//   "requester_already_offline" |
//   "requester_awaiting_approval" |
//   "request_timeout" |
//   "requester_suspended" |
//   "validation" |
//   "wrong_product_version" |
//   "seats_limit_exceeded"
//   message: string
//   data?: object
// }

// export type API$Response$Login = API$Response<"login", true, {
//   license: API$License
//   my_profile: API$MyProfile
//   chats_summary: API$ChatSummary[]
// }>

// export type API$Response$LoginError = API$Response<"login", false, {
//   error: API$Error
// }>

// export type API$Push$IncomingChat = API$Push<"incoming_chat", {
//   chat: API$Chat
//   requester_id?: string
// }>

// export type API$Push$RoutingStatusSet = API$Push<"routing_status_set", {
//   agent_id: string
//   status: "accepting_chats" | "not_accepting_chats" | "offline"
// }>

// export type API$Push$ChatDeactivated = API$Push<"chat_deactivated", {
//   chat_id: string
//   thread_id: string
//   user_id?: string
// }>

// export type API$Push$IncomingEvent = API$Push<"incoming_event", {
//   chat_id: string
//   thread_id: string
//   event: API$Event
// }>

// export type API$Push$ChatThreadTagged = API$Push<"thread_tagged", {
//   chat_id: string,
//   thread_id: string
//   tag: string
// }>

// export type API$Push$ChatThreadUntagged = API$Push<"thread_untagged", {
//   chat_id: string,
//   thread_id: string
//   tag: string
// }>

// export type API$Push$ChatAccessGranted = API$Push<"chat_access_granted", {
//   id: string
//   access: {
//     groups_ids: number[]
//   }
// }>

// export type API$Push$ChatAccessRevoked = API$Push<"chat_access_revoked", {
//   id: string
//   access: {
//     groups_ids: number[]
//   }
// }>

// export type API$Push$UserAddedToChat = API$Push<"user_added_to_chat", {
//   chat_id: string
//   thread_id: string
//   user: API$User
//   requester_id?: string
// }>

// export type API$Push$UserRemovedToChat = API$Push<"user_removed_from_chat", {
//   chat_id: string
//   thread_id: string
//   user_id: string
//   requester_id?: string
// }>

// export type API$Push$ChatTransferred = API$Push<"chat_transferred", {
//   chat_id: string
//   thread_id: string
//   requester_id?: string
//   transferred_to: {
//     group_ids: number[]
//     agent_ids: string[]
//   }
//   queue?: {
//     position: number
//     wait_time: number
//     queued_at: string
//   }
// }>

// export type API$Push$EventsMarkedAsSeen = API$Push<"events_marked_as_seen", {
//   chat_id: string
//   thread_id: string
//   seen_up_to: string
//   user_id: string
// }>

// export type API$Push$ChatPropertiesUpdated = API$Push<"chat_properties_updated", {
//   chat_id: string
//   properties: Partial<API$ChatProperties>
// }>

// export type API$Push$ChatPropertiesDeleted = API$Push<"chat_properties_deleted", {
//   chat_id: string
//   properties: {
//     [namespace: string]: string[]
//   }
// }>

// export type API$Push$ThreadPropertiesUpdated = API$Push<"thread_properties_updated", {
//   chat_id: string
//   thread_id: string
//   properties: Partial<API$ThreadProperties>
// }>

// export type API$Push$ThreadPropertiesDeleted = API$Push<"thread_properties_deleted", {
//   chat_id: string
//   thread_id: string
//   properties: {
//     [namespace: string]: string[]
//   }
// }>

// export type API$Push$IncomingSneakPeek = API$Push<"incoming_sneak_peek", {
//   chat_id: string
//   thread_id: string
//   sneak_peek: API$SneakPeek
// }>

// export type API$Push$AgentDisconnected = API$Push<"agent_disconnected", {
//   reason: "connection_timeout" |
//   "access_token_revoked" |
//   "access_token_expired" |
//   "license_expired" |
//   "agent_deleted" |
//   "agent_logged_out_remotely" |
//   "agent_disconnected_by_server" |
//   "unsupported_version" |
//   "ping_timeout" |
//   "internal_error" |
//   "too_many_connections" |
//   "misdirected_request" |
//   "product_version_changed" |
//   "license_not_found"
// }>

// export type API$Push$IncomingMulticast = API$Push<"incoming_multicast", {
//   author_id: string
//   content: {
//     type: "mobile",
//     action: "preferences_updated"
//     payload: MOBILE_API$Preferences
//   }
// }>

// export type API$Push$QueuePositionsUpdated = API$Push<"queue_positions_updated", Array<{
//   chat_id: string
//   thread_id: string
//   queue: {
//     position: number
//     wait_time: number
//   }
// }>>

// export type API$Push$CustomerVisitStarted = API$Push<"customer_visit_started", {
//   customer_id: string
//   visit_id?: number
// }>

// export type API$Push$CustomerUpdated = API$Push<"customer_updated", {
//   customer: API$Customer
// }>

// export type API$Push$CustomerVisitEnded = API$Push<"customer_visit_ended", {
//   customer_id: string
// }>

export interface API$Chat {
  id: string
  users: Array<API$User$Agent | API$User$Customer>
  thread: API$Thread
  access?: {
    group_ids: number[]
  }
  is_followed: boolean
  properties: API$ChatProperties
}


export interface API$ChatProperties {
  routing?: {
    continuous?: boolean
    pinned?: boolean
    was_pinned?: boolean
  }
  source?: {
    client_id: string
  }
  supervising?: {
    agent_ids: string
  }
}

export interface API$Thread {
  id: string
  active: boolean
  events?: API$Event
  user_ids: string[]
  tags: string[] | undefined
  access: {
    group_ids: number[]
  }
  highlight?: API$Highlight[]
  properties: API$ThreadProperties
  restricted_access?: string
  custom_variables?: {
    key: string,
    value: string
  }[]
  created_at: string
  queue?: API$Queue
}


export interface API$ChatSummary {
  id: string;
  last_event_per_type: {
    filled_form: {
      thread_id: string
      thread_order: 1
      event: API$Event$FilledForm
    }
    message: {
      thread_id: string
      thread_order: number
      event: API$Event$Message
    }
    system_message: {
      thread_id: string
      thread_order: number
      event: API$Event$System
    }
  },
  users: Array<API$User$Agent | API$User$Customer>
  last_thread_summary: API$ThreadSummary
  properties?: API$ChatProperties
  access?: {
    group_ids: number[]
  },
  order: number,
  is_followed: boolean
}

export interface API$ThreadSummary {
  id: string
  tags: string[]
  active: boolean
  user_ids: string[]
  created_at: string
  properties: API$ThreadProperties
  queue?: API$Queue
  access: {
    group_ids: number[]
  }
}

export interface API$Queue {
  position: number
  wait_time: number
  queued_at?: string
}


export type API$Event = API$Event$Message |
  API$Event$System |
  API$Event$FilledForm |
  API$Event$File |
  API$Event$Annotation |
  API$Event$Custom |
  API$Event$RichMessage;

export interface API$Event$Message {
  id: string
  text: string
  created_at: string
  author_id: string
  custom_id: string
  recipients: "all" | "agents"
  type: "message"
  properties?: {
    lc2?: {
      greeting_id?: {
        value: number
      }
      greeting_unique_id?: {
        value: string
      }
      welcome_message?: {
        value: boolean
      }
    }
  }
  postback?: {
    type: string
  }
}

export interface API$Event$System {
  id: string
  type: "system_message"
  custom_id: string
  created_at: string
  text: string
  recipients: "all" | "agents"
  system_message_type: string
  text_vars: {
    [key: string]: string
  }
}

export interface API$Event$FilledForm {
  id: string
  type: "filled_form"
  custom_id: string
  author_id: string
  created_at: string
  form_id: string
  recipients: "all" | "agents"
  properties?: any
  fields?: API$Event$FilledForm$Field[]
}

export interface API$Event$FilledForm$Field {
  id?: string
  type: "name" | "email" | "question" | "textarea" | "radio" | "select" | "checkbox" | "group_chooser"
  label: string
  value?: string
  answer?: API$Event$FilledForm$FieldAnswer
  answers?: API$Event$FilledForm$FieldAnswer[]
}

export type API$Event$FilledForm$FieldAnswer = string | {
  id: string
  label: string
} | {
  group_id: number
  label: string
}

export interface API$Event$File {
  id: string
  custom_id: string
  type: "file"
  author_id: string
  created_at: string
  recipients: "all" | "agents"
  name: string
  url: string
  content_type: string // e.g. "image/png"
  size: number
  /** Optional. Available only for images */
  thumbnail_url?: string
  /** Optional. Available only for images */
  thumbnail2x_url?: string
  /** Optional. Available only for images */
  width?: number
  /** Optional. Available only for images */
  height?: number
  properties?: any
}

export interface API$Event$Annotation {
  id: string
  custom_id: string
  type: "annotation"
  author_id: string
  created_at: string
  recipients: "all" | "agents"
  annotation_type: "rating" | "rating_cancel"
  properties: {
    rating?: {
      score?: {
        value: number
      }
      comment?: {
        value: string
      }
    }
  }
}

export interface API$Event$Custom {
  id: string
  custom_id?: string
  author_id: string
  recipients: "agents" | "all"
  type: "custom"
  created_at: string
  // TODO..
}

export interface API$Event$RichMessage {
  id: string
  custom_id?: string
  author_id: string
  type: "rich_message"
  created_at: string
  recipients: "agents" | "all"
  template_id: "cards" | "quick_replies"
  elements?: Array<{
    title?: string
    subtitle?: string
    image?: {
      name?: string
      url: string
      content_type?: string
      size: number
      width: number
      height: number
      alternative_text?: number
    }
    buttons?: Array<{
      type: "message" | "phone"
      text: string
      value?: string
      webview_height?: "compact" | "tall" | "full"
      postback_id: string
      user_ids?: string[]
    }>
  }>
}





// export interface API$Response$ListChats {
//   chats_summary: API$ChatSummary[]
//   found_chats: number,
//   next_page_id?: string
//   previous_page_id?: string
// }

// export interface API$Request$ListChats {
//   filters?: {
//     include_active?: boolean
//     group_ids?: number[],
//     properties?: {
//       routing?: {
//         pinned?: {
//           values: boolean[]
//         }
//       }
//     }
//   }
//   order?: string
//   limit?: number
//   page_id?: string
// }

// export interface API$Request$ListThreads {
//   chat_id: string
//   page_id?: string
//   sort_order?: "asc" | "desc"
//   limit?: number
//   min_events_count?: number
// }

// export interface API$Response$ListThreads {
//   threads: API$Thread[]
//   found_threads: number
//   next_page_id?: string
//   previous_page_id: string
// }

// export interface API$Response$ListArchives {
//   chats: API$Chat[]
//   found_chats: number
//   next_page_id?: string
//   previous_page_id?: string
// }

// export interface API$Response$StartChat {
//   chat_id: string;
//   thread_id: string;
//   event_ids?: string[];
// }

// export interface API$StartChatParams {
//   chat: {
//     users: {
//       id: string;
//       type: string;
//     }[]
//     thread?: {
//       events?: {
//         type: string;
//         text: string;
//         recipients: string;
//       }[]
//     }
//     access?: {
//       group_ids: number[]
//     }
//   };
// };

// export interface API$Response$ActivateChat {
//   chat_id: string;
//   thread_id: string;
//   event_ids?: string[];
// }

// export interface API$ActivateChatParams {
//   chat: {
//     id: string;
//     access?: {
//       group_ids: number[]
//     }
//     thread?: {
//       events?: {
//         type: string;
//         text: string;
//         recipients: string;
//       }[];
//     };
//   };
// };

// export interface API$UpdateChatPropertiesParams {
//   chat_id: string;
//   properties: {
//     routing?: {
//       pinned?: boolean
//     }
//     supervising?: {
//       agent_ids: string
//     }
//   };
// }

// export interface MOBILE_API$GetCustomersSummary {
//   customers_summary: MOBILE_API$CustomerSummary[]
// }

// export interface MOBILE_API$GetCustomerSummary {
//   customer_summary: MOBILE_API$CustomerSummary
// }



export type API$User = API$User$Agent | API$User$Customer;

export interface API$User$Agent {
  id: string
  type: "agent"
  name: string
  email: string
  present: true
  events_seen_up_to?: string
  avatar?: string,
}

export interface API$User$Customer {
  id: string
  name: string
  email: string
  type: "customer"
  present: true,
  avatar?: string,
  created_at?: string
  last_visit?: API$Customer$Visit
  events_seen_up_to?: string
  statistics?: {
    chats_count: number,
    threads_count?: number
    visits_count?: number
  }
  session_fields?: {
    [key: string]: string
  }[]
  agent_last_event_created_at?: string
  customer_last_event_created_at?: string
}

export interface API$Customer$Visit {
  started_at: string
  ip: string
  user_agent: string
  referrer?: string
  geolocation: API$Geolocation
  last_pages?: {
    opened_at: string;
    title: string;
    url: string;
  }[]
}

// export interface API$Customer {
//   id: string
//   name: string
//   email: string
//   type: "customer"
//   avatar?: string
//   created_at?: string
//   last_visit?: {
//     started_at: string
//     ip: string
//     user_agent: string
//     referrer?: string
//     geolocation: API$Geolocation
//     last_pages?: Array<{
//       opened_at: string;
//       title: string;
//       url: string;
//     }>
//   }
//   session_fields: Array<object>
//   agent_last_event_created_at?: string
//   customer_last_event_created_at?: string
//   chat_ids: string[]
//   statistics: {
//     chats_count: number,
//     threads_count: number,
//     visits_count: number
//     page_views_count: number
//     greetings_shown_count: number
//     greetings_accepted_count: number
//   }
// }

export interface API$Geolocation {
  country: string
  country_code: string
  region: string
  city: string
  timezone: string
  latitude: string
  longitude: string
}

export type API$Highlight = {
  type: "event.message",
  field: "text"
  highlight: string
} | {
  type: "event.file",
  field: "name"
  highlight: string
} | {
  type: "event.filled_form",
  field: "answer"
  highlight: string
}

export interface API$ThreadProperties {
  routing: {
    idle?: boolean
    last_transfer_timestamp?: number
    unassigned?: boolean
  }
  source?: {
    client_id?: string
  }
  rating?: {
    comment?: string
    score?: number
  }
}


// export interface API$SneakPeek {
//   author_id: string
//   recipients: "all"
//   text: string
//   timestamp: number
// }

// export interface API$Response$SendEvent {
//   event_id: string;
// }

// export type API$Response$ListAgentsForTransfer = Array<{
//   agent_id: string
//   total_active_chats: number
// }>

// export interface REST$Me {
//   login: string
//   email: string
//   name: string
//   permission: string
//   avatar: string
//   status: "offline" | "not accepting chats" | "accepting chats"
//   groups?: {
//     id: number,
//     name: string
//     priority: 1
//   }[]
//   license_id: number
//   notifications: {
//     new_visitor: 0 | 1
//     returning_visitor: 0 | 1
//     queued_visitor: 0 | 1
//     visitor_is_typing: 0 | 1
//     new_goal: 0 | 1
//     incoming_chat: 0 | 1
//     unassigned_chats: 0 | 1
//     unassigned_chat_messages: 0 | 1
//     ticket: 0
//   },
//   work_scheduler?: object
//   timezone: string
//   active: 0 | 1
//   job_title?: string
//   mobile?: string;
//   state: "normal"
//   send_tutorials: 0 | 1
//   visited_welcome_tutorial: 0 | 1
//   max_chats_count: 2,
//   last_logout: 1569421386,
//   ticket_notifications: 0 | 1
//   visited_tickets_tutorial: 0 | 1
//   mute_all_sounds: 0 | 1
//   repeat_sound_notifications: 0 | 1
//   customers_visited: number
//   customers_enabled: number
//   chats_enabled: number
//   inactive_notifications: number
//   bot: number
//   design_version?: 2 | 3
//   suspended: 0 | 1
//   default_group_priority?: string
//   weekly_summary?: "0" | "1",
//   awaiting_approval: "0" | "1"
//   instances: {
//     push: boolean
//     app_info: string  // Mobile/ios, Mobile/android, Web, 
//     version: string   // lc3, 1.0.2
//     ip: string
//     session_id: number
//     descriptor: number
//   }[]
//   api_key?: string
// }

// export interface REST$AgentPerformanceReport {
//   chats: {
//     goals: number
//     ratings: {
//       good: number
//       bad: number
//     }
//     total_chats: number
//   }
// }

// type REST$WorkSchedulerDay = "monday" | "thursday" | "wednesday" | "tuesday" | "friday" | "saturday" | "sunday"

// export type REST$WorkScheduler = {
//   [day in REST$WorkSchedulerDay]: {
//     enabled: 0 | 1
//     end: string
//     start: string
//   }
// }

// export interface REST$Agent {
//   login: string
//   name: string
//   permission: string
//   avatar: string
//   groups?: {
//     id: number;
//     name: string;
//     priority: number;
//   }[]
//   is_bot?: boolean
//   status: "accepting chats" | "not accepting chats" | "offline"
// }

// export interface REST$AgentFullInfo extends REST$Agent {
//   job_title: string
//   nick?: string
//   repeat_sound_notifications: boolean
//   bot?: 0 | 1
//   timezone: string
//   max_chats_count: number
//   daily_summary: number
//   weekly_summary: number
//   last_logout: number
//   work_scheduler?: REST$WorkScheduler
//   suspended: 0 | 1
//   awaiting_approval: "0" | "1"
// }

// export interface REST$AgentUpdatePayload {
//   name: string
//   job_title: string
//   groups: number[]
//   permission: REST$Agent["permission"]
//   mute_all_sounds: 0 | 1
//   notifications: {
//     new_visitor?: 0 | 1
//     returning_visitor?: 0 | 1
//     queued_visitor?: 0 | 1
//     unassigned_chats?: 0 | 1
//   }
// }

// export interface REST$Group {
//   id: number
//   name: string
//   language: string
//   agents?: string[]
//   status: "offline" | "accepting chats" | "not accepting chats"
// }

// export type REST$GET$Group = REST$Group

// export type REST$GET$Groups = REST$Group[]

// export interface MOBILE_API$CustomerGeolocation {
//   country: string;
//   country_code: string;
//   region: string;
//   city: string;
//   timezone: string;
//   latitude: string;
//   longitude: string;
// }

// export interface MOBILE_API$CustomerSummary {
//   id: string;
//   name: string;
//   email?: string;
//   chat_id?: string;
//   last_visit: {
//     started_at: string;
//     ip: string;
//     user_agent: string;
//     referrer?: string
//     geolocation: MOBILE_API$CustomerGeolocation,
//     last_pages?: {
//       opened_at: string;
//       url: string;
//       title: string;
//     }[]
//     visited_pages_count?: number
//   },
//   statistics: {
//     chats_count: number;
//     threads_count: number;
//     visits_count: number;
//     invitations_accepted: number;
//     invitations_all: number;
//   },
//   group_id: number;
//   session_fields?: object[]
// }

// export interface MOBILE_API$VisitedPage {
//   url: string
//   title: string
//   opened_at: string
// }

// export interface REST$CannedResponse {
//   id: number
//   group: number
//   tags: string[]
//   text: string
// }

// export interface REST$Tag {
//   author: string
//   count: {
//     inChats: number
//     inTickets: number
//   }
//   creation_date: number
//   group: number
//   name: string
// }

// export interface REST$Response$Banlist {
//   banned_visitors?: {
//     expiration_timestamp: string
//     ip: string
//     visitor_id?: string
//   }[]
// }

// export interface ACCOUNTS$Session {
//   account_id: string
//   applications: {
//     name: string,
//     client_id: string,
//     session_id: string
//   }[]
//   current: boolean
//   entity_id: string
//   identity_source: "credentials"
//   ip: string
//   session_id: string
//   user_agent: string
// }

// export interface ACCOUNTS$Response<T> {
//   result: T
// }

// export interface MOBILE_API$ErrorResponse {
//   success: false
//   error: string
// }

// export interface MOBILE_API$Preferences {
//   revision: number
//   send_new_unassigned_chat: boolean
//   send_new_queued_chat: boolean
//   dnd_when_aa_online: boolean
//   dnd_when_not_accepting_chats: boolean
//   send_supervised_message: boolean
//   send_chat_idle_message: boolean
//   send_chat_rate_message: boolean
//   send_chat_archived_message: boolean
//   send_new_customer: boolean
//   send_returning_customer: boolean
//   mute_all: boolean
//   in_app_with_sound: boolean
//   in_app_with_vibration: boolean
// }

// export interface DEV_PLATFORM_API$Application {
//   id: string
//   name: string
//   icons?: {
//     large: string
//     small: string
//     original: string
//   }
//   customProps?: { [key: string]: any }
//   elements?: {
//     widgets?: Array<{
//       id: string
//       placement: "plugin" | "fullscreen" | "settings"
//       url: string
//       shortcut?: {
//         initialState: string
//       }
//     }>
//   }
//   authorization?: {
//     clientId: string
//   }
// }

// export interface ACCOUNTS$InvitationToken {
//   access_token: string
//   account_id: string
//   client_id: string
//   expires_in: number
//   organization_id: string
//   scope: string
//   token_type: string
// }

export interface API$Response$Login  {
  license: API$License
  my_profile: API$MyProfile
  chats_summary: API$ChatSummary[]
}

export interface API$MyProfile {
  id: string
  name: string
  email: string
  avatar: string
  routing_status: "accepting_chats" | "not_accepting_chats" | "offline"
  permission: string
}

export interface API$License {
  id: string
}
