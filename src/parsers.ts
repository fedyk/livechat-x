import { indexBy } from "./helpers.js";
import {
  API$User,
  API$Chat,
  API$Event,
  API$Thread,
  API$Queue,
  API$License,
  API$ChatSummary,
  API$Geolocation,
  API$User$Customer,
  API$ChatProperties,
  API$ThreadProperties,
  API$Event$FilledForm$Field,
  API$Event$FilledForm$FieldAnswer,
  API$Customer$Visit,
  User,
  Chat,
  Event,
  Thread,
  Fields,
  License,
  MyProfile,
  Geolocation,
  ChatProperties,
  ThreadProperties,
  RoutingStatus,
  API$MyProfile,
} from "./types.js";

export function parseQueryParams(query: string) {
  const vars = query.split('&');
  const values: {
    [key: string]: string
  } = {}

  for (let i = 0; i < vars.length; i++) {
    const pair = vars[i].split('=');
    const key = decodeURIComponent(pair[0])
    const value = decodeURIComponent(pair[1])

    values[key] = value
  }

  return values
}

/**
 * Parse data from LiveChat Accounts
 * @see https://developers.livechat.com/docs/authorization/authorizing-api-calls/#step-3-get-an-access-token-from-the-url 
 */
export function parseAccountsCredentials(credentials: any) {
  const accessToken = String(credentials.access_token ?? "").trim()
  const expiresIn = Number(credentials.expires_in ?? 0)
  const scopes = String(credentials.scope ?? 0).split(",")
  const state = Number(credentials.state ?? 0)
  const expiredAt = Date.now() + (Number.isNaN(expiresIn) ? 1000 * 60 * 60 * 24 : expiresIn * 1000)

  if (accessToken.length === 0) {
    throw new Error("Invalid access token was passed")
  }

  return {
    accessToken,
    expiredAt,
    state,
    scopes
  }
}

// import {
//   Chat,
//   Message,
//   FilledFormField,
//   User,
//   Group,
//   Agent,
//   ChatProperties,
//   ThreadProperties,
//   Thread,
//   SneakPeek,
//   Geolocation,
//   FilledFormType,
//   RichMessageElement,
//   Customer,
//   CannedResponse,
//   Tag,
//   Fields,
//   VisitedPage,
//   Application,
//   WorkingHours,
//   AgentStat,
//   RoutingStatus,
//   Ban,
//   Permission,
//   Me,
//   MyProfile,
// } from '../store/types';
// import { Preferences } from '../store/preferences/types';
// import { indexBy } from '../lib/index-by';
// import { MESSENGER_CLIENT_ID } from "../config";
// import { DAY_LABELS, AGENT_DEFAULT_AVATAR_URL } from "../constant";
// import { License } from "../store/license/types";

export function parseChat(chat: API$Chat): Chat {
  const groupId = getChatGroupId(chat)
  const thread = parseThread(chat.thread)
  const users = parseChatUsers(chat.users)
  const properties = parseChatProperties(chat.properties)
  const customerId = getCustomerId(users)

  return {
    id: chat.id,
    users: indexBy(users, "id"),
    customerId,
    sneakPeek: null,
    properties,
    groupId,
    threadIds: [thread.id],
    threads: {
      [thread.id]: thread
    },
    history: {
      status: "incomplete",
      foundThreads: null,
      nextPageId: null
    }
  }
}

export function getChatGroupId(chat: Pick<API$Chat, "id" | "access">) {
  const access = chat?.access

  if (!access) {
    console.warn(`Chat has missed 'access' property`);
    return 0
  }

  if (!Array.isArray(access.group_ids) || access.group_ids.length === 0) {
    console.warn("Chat has empty group_ids property")
    return 0
  }

  if (access.group_ids.length > 1) {
    console.warn(`Chat ${chat.id} has more the one (${access.group_ids}) group ids in access`)
  }

  return access.group_ids[0] ?? 0
}


export function parseThread(thread: API$Thread): Thread {
  const createdAt = new Date(thread.created_at).getTime()

  if (Number.isNaN(createdAt)) {
    console.warn(`parseThread: invalid created_at value: ${JSON.stringify({ thread_id: thread.id, created_at: thread.created_at })}`)
  }

  return {
    id: thread.id,
    tags: thread.tags || [],
    active: thread.active,
    createdAt: createdAt,
    messages: parseThreadMessages(thread),
    properties: parseThreadProperties(thread.properties),
    incomplete: false,
    restrictedAccess: parseThreadRestrictedAccess(thread.restricted_access),
    highlights: thread.highlight || [],
    /** @todo check session variables */
    sessionFields: parseThreadSessionFields(thread.custom_variables),
    queue: parseQueue(thread.queue),
  }
}

export function parseChatUsers(users: API$User[]) {
  if (!Array.isArray(users)) {
    return []
  }

  return users.map(u => parseUser(u))
}

export function parseUser(user: API$User): User {
  let seenUpTo = 0;

  if (user.events_seen_up_to) {
    const eventsSeenUpTo = new Date(user.events_seen_up_to).getTime()

    if (!Number.isNaN(eventsSeenUpTo)) {
      seenUpTo = eventsSeenUpTo
    }
    else {
      console.warn("User has invalid date time in `events_seen_up_to`", user)
    }
  }

  switch (user.type) {
    case "agent":
      return {
        id: String(user.id),
        email: String(user.email),
        name: String(user.name || "Agent").trim(),
        type: "agent",
        avatar: parseAvatarUrl(user.avatar),
        seenUpTo: seenUpTo,
        present: Boolean(user.present),
      }

    case "customer":
      return {
        id: String(user.id),
        email: String(user.email),
        name: String(user.name || "Visitor").trim(),
        type: "customer",
        avatar: parseAvatarUrl(user.avatar),
        present: Boolean(user.present),
        seenUpTo: seenUpTo,
        lastVisit: parseCustomerLastVisit(user.last_visit),
        statistics: parseStatistics(user.statistics),
        fields: parseCustomerSessionFields(user.session_fields)
      }

    default:
      throw new Error("Invalid user type passed")
  }
}

export function parseChatProperties(properties: API$ChatProperties): ChatProperties {
  return {
    routing: {
      continuous: getPropertyValue<boolean>(properties, "routing", "continuous", false),
      pinned: getPropertyValue<boolean>(properties, "routing", "pinned", false),
    },
    source: {
      customerClientId: getPropertyValue<string>(properties, "source", "customer_client_id", "")
    },
    supervising: {
      agentIds: parseSupervisingAgentsIds(properties)
    },
  }
}

export function parseChatsSummary(chatSummaries: API$ChatSummary[]): Chat[] {
  if (!Array.isArray(chatSummaries)) {
    return []
  }

  return chatSummaries.map(chatSummary => parseChatSummary(chatSummary))
}

export function parseChatSummary(chat: API$ChatSummary): Chat {
  const groupId = getChatGroupId(chat)
  const users = chat.users.map(u => parseUser(u))
  const customerId = getCustomerId(users)
  const properties = parseChatProperties(chat.properties || {})
  const thread = parseLastThreadSummary(chat)

  return {
    id: chat.id,
    sneakPeek: null,
    customerId,
    properties,
    groupId,
    users: indexBy(users, "id"),
    threadIds: [thread.id],
    threads: {
      [thread.id]: thread
    },
    history: {
      status: "incomplete",
      foundThreads: null,
      nextPageId: null
    },
  }
}

export function parseLastThreadSummary(chatSummary: API$ChatSummary): Thread {
  const lastThreadSummary = chatSummary.last_thread_summary;
  const messagesPerThread = parseEventsFromLastEventPerType(chatSummary.last_event_per_type)
  const lastThreadMessages = messagesPerThread.get(lastThreadSummary.id) || []
  const createdAt = new Date(lastThreadSummary.created_at).getTime()

  if (Number.isNaN(createdAt)) {
    console.warn(`parseLastThreadSummary: invalid created_at value: ${JSON.stringify({
      lastThreadSummary
    })}`)
  }

  return {
    id: lastThreadSummary.id,
    tags: lastThreadSummary.tags || [],
    active: lastThreadSummary.active,
    messages: lastThreadMessages,
    createdAt: createdAt,
    properties: parseThreadProperties(lastThreadSummary.properties),
    incomplete: true,
    highlights: [],
    queue: parseQueue(lastThreadSummary.queue),
  }
}


export function parseEventsFromLastEventPerType(lastEventsByType: API$ChatSummary["last_event_per_type"]): Map<string, Event[]> {
  const eventsSummaries = Object.values(lastEventsByType)
    .filter(function (eventSummary) {
      return Boolean(eventSummary && eventSummary.event && eventSummary.thread_id)
    })
    .map(function (eventSummary) {
      return {
        threadId: eventSummary.thread_id,
        event: parseChatEvent(eventSummary.event)
      }
    })
    .sort(function (a, b) {
      return a.event.createdAt - b.event.createdAt
    })

  const messagesByThreadId = new Map<string, Event[]>();

  eventsSummaries.forEach(function (eventSummary) {
    const threadMessages = messagesByThreadId.get(eventSummary.threadId)

    if (threadMessages) {
      threadMessages.push(eventSummary.event)
    }
    else {
      messagesByThreadId.set(eventSummary.threadId, [eventSummary.event])
    }
  })

  return messagesByThreadId
}

export function parseThreadProperties(properties: Partial<API$ThreadProperties>): ThreadProperties {
  return {
    routing: {
      idle: getPropertyValue<boolean>(properties, "routing", "idle", false),
      lastTransferTimestamp: getNumericPropertyValue(properties, "routing", "last_transfer_timestamp", 0),
      unassigned: getPropertyValue<boolean>(properties, "routing", "unassigned", false),
    },
    rating: {
      score: getNumericPropertyValue(properties, "rating", "score", null),
      comment: getPropertyValue<string>(properties, "rating", "comment", "")
    },
  }
}

function parseThreadRestrictedAccess(restrictedAccess?: any) {
  if (typeof restrictedAccess !== "string") {
    return
  }

  if (restrictedAccess.length === 0) {
    return
  }

  return restrictedAccess
}

export function getPropertyValue<T>(properties: any, ns: string, key: string, def: T): T {
  return properties && properties[ns] && properties[ns][key] !== undefined ? properties[ns][key] : def
}

export function getNumericPropertyValue(properties: Partial<API$ChatProperties | API$ThreadProperties>, ns: string, key: string, def: any): number {
  let value = getPropertyValue<number>(properties, ns, key, def)

  // do not force parsing for default value
  if (value === def) {
    return value
  }

  if (typeof value !== "number") {
    value = parseInt(value, 10)
  }

  if (Number.isNaN(value)) {
    return def
  }

  return value
}

export function parseSupervisingAgentsIds(properties: Partial<API$ChatProperties>): string[] {
  const stringifiedAgentsIds = getPropertyValue<string>(properties, "supervising", "agent_ids", "")

  if (typeof stringifiedAgentsIds !== "string") {
    console.warn(`Parser: wrong type of supervising agents ids property:`, typeof stringifiedAgentsIds)
    return [];
  }

  if (stringifiedAgentsIds === "") {
    return [];
  }

  return stringifiedAgentsIds.split(",").map(agentId => agentId.trim().toLowerCase()).filter(Boolean);
}

export function hasPropertyValue(properties: any, ns: string, key: string) {
  return properties && properties[ns] && properties[ns][key] !== undefined
}

// function getDefaultMessage(event: API$Event, threadId: string) {
//   const { id, recipients = "all" } = event;

//   return {
//     id,
//     threadId,
//     recipients,
//     text: "Unsupported type of message",
//     createdAt: parseEventCreatedAt(event),
//     system: true
//   }
// }

// API$Event -> Message
export function parseChatEvent(event: API$Event): Event {
  const { id, type } = event;
  const createdAt = new Date(event.created_at).getTime()

  if (Number.isNaN(createdAt)) {
    console.warn("Event has invalid creating date: " + JSON.stringify(event))
  }

  switch (event.type) {
    case "message":
      return {
        id,
        type: "message",
        customId: event.custom_id,
        text: event.text,
        recipients: event.recipients,
        authorId: event.author_id,
        createdAt: createdAt,
        postback: {},
      }

    case "filled_form":
      return {
        id,
        customId: event.custom_id,
        recipients: event.recipients,
        authorId: event.author_id,
        formId: event.form_id,
        createdAt,
        fields: parseFilledFormFields(event.fields),
        type: "filled_form"
      }

    case "system_message":
      return {
        id,
        recipients: event.recipients,
        text: event.text,
        createdAt,
        type: "system_message",
        systemMessageType: event.system_message_type
      }

    case "file":
      return {
        id,
        customId: event.custom_id,
        authorId: event.author_id,
        recipients: event.recipients,
        createdAt,
        type: "file",
        name: event.name,
        url: event.name,
        thumbnailUrl: event.thumbnail_url,
        thumbnail2xUrl: event.thumbnail2x_url,
        contentType: event.content_type,
        size: event.size,
        width: event.width,
        height: event.height,
      }

    case "rich_message":
      return {
        id: event.id,
        customId: event.custom_id,
        type: "rich_message",
        authorId: event.author_id,
        createdAt,
        recipients: event.recipients,
        templateId: event.template_id,
        elements: Array.isArray(event.elements) ? event.elements.map(el => {
          return {
            title: el.title,
            subtitle: el.subtitle,
            image: el.image ? {
              name: el.image.name || "",
              url: el.image.url,
              contentType: String(el.image.content_type ?? ""),
              size: el.image.size,
              width: el.image.width,
              height: el.image.height,
              alternativeText: String(el.image.alternative_text ?? ""),
            } : void 0,
            buttons: Array.isArray(el.buttons) ? el.buttons.map(button => {
              return {
                text: button.text
              }
            }) : void 0
          }
        }) : []
      }

    case "annotation":
      console.warn(`Parser: Unknown message type ${type}, ${JSON.stringify(event, null, 2)}`)

      return {
        id: event.id,
        recipients: event.recipients,
        type: "system_message",
        systemMessageType: "unknown",
        text: "Unsupported type of message",
        createdAt,
      }

    default: {
      console.warn(`Parser: Unknown message type ${type}, ${JSON.stringify(event, null, 2)}`)

      return {
        id: event.id,
        recipients: event.recipients,
        type: "system_message",
        systemMessageType: "unknown",
        text: "Unsupported type of message",
        createdAt,
      }
    }
  }
}

export function parseFilledFormFields(fields?: API$Event$FilledForm$Field[]) {
  if (!fields) {
    return [];
  }
  return fields.map(field => ({
    name: field.label,
    value: parseFilledFormAnswer(field.value || field.answer || field.answers) || ''
  }))
}

function parseFilledFormAnswer(answer: API$Event$FilledForm$FieldAnswer | API$Event$FilledForm$FieldAnswer[] | void): string {
  if (!answer) {
    return ''
  }

  if (typeof answer === "string") {
    return answer
  }

  if (typeof answer === 'boolean') {
    return answer ? "Yes" : "No";
  }

  if (Array.isArray(answer)) {
    return answer.map(v => parseFilledFormAnswer(v)).filter(Boolean).join(", ")
  }

  if (answer && answer.label) {
    return answer.label
  }

  return '';
}


// export function parseFilledFormType(properties?: API$Event$FilledForm['properties']): FilledFormType | undefined {
//   const type = getPropertyValue(properties, 'lc2', 'form_type', undefined);
//   if (type === 'prechat' || type === 'postchat') {
//     return type;
//   }
//   return;
// }

// export function parseRichMessageCards(event: API$Event$RichMessage, threadId: string): Message {
//   const { id, author_id, elements = [], recipients } = event;
//   const text = "Rich Message";

//   return {
//     id,
//     threadId,
//     text,
//     createdAt: parseEventCreatedAt(event),
//     authorId: author_id,
//     sent: true,
//     recipients,
//     eventType: "rich_message",
//     richMessageTemplate: "cards",
//     richMessageElements: elements.map(el => {
//       const { title, subtitle, buttons, image } = el;
//       let acc: RichMessageElement = {};

//       if (title) acc.title = title;
//       if (subtitle) acc.subtitle = subtitle;
//       if (Array.isArray(buttons)) {
//         acc.buttons = buttons.map(b => ({ id: b.postback_id, text: b.text }))
//       }
//       if (image) {
//         acc.image = {
//           url: image.url,
//           ...(image.name && { name: image.name })
//         }
//       }

//       return acc;
//     })
//   }
// }

// export function parseRichMessageQuickReplies(event: API$Event$RichMessage, threadId: string): Message {
//   const { id, author_id, elements = [], recipients } = event;
//   const messageBase: Message = {
//     id,
//     threadId,
//     recipients,
//     text: "Rich Message",
//     createdAt: parseEventCreatedAt(event),
//     authorId: author_id,
//     eventType: "rich_message",
//     sent: true,
//     richMessageTemplate: 'quick_replies',
//     richMessageElements: []
//   }

//   if (!elements[0]) {
//     return messageBase;
//   }

//   const title = elements[0].title || messageBase.text;
//   const buttons = Array.isArray(elements[0].buttons) ? elements[0].buttons.map(b => ({ id: b.postback_id, text: b.text })) : [];

//   const richMessageElements: RichMessageElement[] = [
//     {
//       title,
//       buttons
//     }
//   ];

//   messageBase.text = title;
//   messageBase.richMessageElements = richMessageElements

//   return messageBase;
// }

// export function parseRichMessage(event: API$Event$RichMessage, threadId: string): Message {
//   if (event.template_id === 'cards') {
//     return parseRichMessageCards(event, threadId);
//   }

//   return parseRichMessageQuickReplies(event, threadId);
// }

// export function parseAnnotation(event: API$Event$Annotation, threadId: string): Message {
//   let text = '';

//   if (event.annotation_type === 'rating' && event.properties.rating) {
//     const { rating } = event.properties;

//     if (rating.score) {
//       if (rating.score.value === 0) {
//         text = 'Recipient rated the chat as bad.';
//       } else if (rating.score.value === 1) {
//         text = 'Recipient rated the chat as good.';
//       }
//     }

//     if (rating.comment) {
//       text = `Recipient left the following comment: ${rating.comment.value}`;
//     }
//   }

//   if (event.annotation_type === 'rating_cancel') {
//     text = `Recipient canceled the chat rating.`
//   }

//   if (!text) {
//     console.warn(`Parser: Unknown message type ${event.type}, ${JSON.stringify(event, null, 2)}`)

//     return getDefaultMessage(event, threadId)
//   }

//   return {
//     id: event.id,
//     threadId,
//     recipients: event.recipients,
//     text: text,
//     createdAt: parseEventCreatedAt(event),
//     system: true,
//     eventType: "annotation",
//   }
// }

export function parseMyProfile(myProfile: API$MyProfile): MyProfile {
  return {
    id: String(myProfile.id),
    name: String(myProfile.name),
    email: String(myProfile.email),
    avatar: String(myProfile.avatar),
    routingStatus: parseRoutingStatus(myProfile.routing_status) || "offline"
  }
}

// export function parsePermission(permission: any): Permission | void {
//   if (permission === "normal") {
//     return "normal"
//   }

//   if (permission === "administrator") {
//     return "administrator"
//   }

//   if (permission === "owner") {
//     return "owner"
//   }

//   if (permission === "viceowner") {
//     return "viceowner"
//   }

//   return console.warn(`Unsuported permission was passed: ${JSON.stringify(permission)}`);
// }

// export function parseMe(me: REST$Me): Me {
//   const groups = Array.isArray(me.groups) ? me.groups.map(function (group) {
//     return {
//       id: Number(group.id),
//       name: String(group.name),
//     }
//   }) : []

//   const instances = Array.isArray(me.instances) ? me.instances.map(function (instance) {
//     return {
//       appInfo: String(instance.app_info),
//       version: String(instance.version),
//     }
//   }) : []

//   return {
//     id: String(me.login),
//     name: String(me.name).trim(),
//     email: String(me.email),
//     avatar: parseAvatarUrl(me.avatar) || AGENT_DEFAULT_AVATAR_URL,
//     permission: parsePermission(me.permission) || "normal",
//     groups: groups,
//     licenseId: Number(me.license_id),
//     instances: instances,
//     notifications: {
//       send_new_customer: Boolean(me.notifications.new_visitor),
//       send_returning_customer: Boolean(me.notifications.returning_visitor),
//       send_new_queued_chat: Boolean(me.notifications.queued_visitor),
//       send_new_unassigned_chat: Boolean(me.notifications.unassigned_chats),
//       mute_all: Boolean(me.mute_all_sounds)
//     }
//   }
// }

export function parseLicense(license: API$License): License {
  return {
    id: Number(license.id),
  }
}

export function parseRoutingStatus(routingStatus: any): RoutingStatus | void {
  if (routingStatus === "accepting_chats" || routingStatus === "accepting chats") {
    return "accepting_chats"
  }

  if (routingStatus === "not_accepting_chats" || routingStatus === "not accepting chats") {
    return "not_accepting_chats"
  }

  if (routingStatus === "offline") {
    return "offline"
  }

  return console.warn("Unsupported routing status: " + routingStatus)
}


export function parseAvatarUrl(avatarUrl?: string) {
  if (!avatarUrl) {
    return;
  }

  if (avatarUrl.startsWith("http://")) {
    return avatarUrl.replace("http://", "https://");
  }

  if (!avatarUrl.startsWith("http")) {
    return "https://" + avatarUrl;
  }

  return avatarUrl
}

export function parseGeolocation(geolocation?: API$Geolocation): Geolocation | undefined {
  if (!geolocation) {
    return void 0
  }

  // geolocation can be an empty object
  if (Object.values(geolocation).length === 0) {
    return void 0
  }

  return {
    country: geolocation.country,
    countryCode: geolocation.country_code,
    region: geolocation.region,
    city: geolocation.city,
    timezone: geolocation.timezone,
    latitude: Number(geolocation.latitude),
    longitude: Number(geolocation.longitude),
  }
}

export function parseStatistics(statistics: API$User$Customer["statistics"]) {
  return {
    chatsCount: Number(statistics?.chats_count ?? 0),
    threadCount: Number(statistics?.threads_count ?? 0),
    visitsCount: Number(statistics?.visits_count ?? 0),
  }
}

export function parseThreadMessages(thread: API$Thread) {
  if (Array.isArray(thread.events)) {
    return thread.events.map(event => parseChatEvent(event));
  }

  return []
}

// export function isEventGreeting(event: API$Event$Message): boolean {
//   return !!(event.properties
//     && event.properties.lc2
//     && event.properties.lc2.greeting_id
//   )
// }

// export function isEventWelcomeMessage(event: API$Event$Message): boolean {
//   return !!(event.properties
//     && event.properties.lc2
//     && event.properties.lc2.welcome_message
//     && event.properties.lc2.welcome_message.value
//   )
// }


// export function getOnlineGroupIds(groups: Group[]): number[] {
//   const onlineGroupIds: number[] = []

//   for (let i = 0; i < groups.length; i++) {
//     if (groups[i].status !== "offline") {
//       onlineGroupIds.push(groups[i].id)
//     }
//   }

//   return onlineGroupIds;
// }

// export function parseAgents(agents: REST$AgentFullInfo[]): Agent[] {
//   return agents.map(function (agent) {
//     return parseAgent(agent);
//   })
// }

// export function parseAgent(agent: REST$AgentFullInfo): Agent {
//   return {
//     id: agent.login,
//     name: String(agent.name ?? "").trim(),
//     jobTitle: String(agent.job_title ?? "").trim(),
//     avatar: parseAvatarUrl(agent.avatar),
//     status: parseRoutingStatus(agent.status) || "offline",
//     permission: parsePermission(agent.permission) || "normal",
//     isBot: parseIsAgentBot(agent),
//     groups: agent.groups || [],
//     chatsLimit: Number(agent.max_chats_count),
//     dailySummaryEnabled: Boolean(agent.daily_summary),
//     weeklySummaryEnabled: Boolean(agent.weekly_summary),
//     workScheduler: parseAgentWorkScheduler(agent.work_scheduler),
//     awaitingApproval: Boolean(Number(agent.awaiting_approval))
//   }
// }

// function parseIsAgentBot(agent: REST$AgentFullInfo) {
//   if (agent.is_bot) {
//     return true;
//   }

//   // different property from request of single agent
//   if (agent.bot) {
//     return true;
//   }

//   return false;
// }

// export function parseAgentWorkScheduler(workScheduler?: REST$WorkScheduler) {
//   const result: WorkingHours[] = [];

//   if (!workScheduler) {
//     return result;
//   }

//   // follow the same order pattern as in Date `getDay` method
//   const daysKeys = ["sunday", "monday", "thursday", "wednesday", "tuesday", "friday", "saturday"]

//   for (let i = 0; i <= daysKeys.length - 1; i++) {
//     const daySchedule = workScheduler[daysKeys[i]];

//     if (!daySchedule) {
//       continue;
//     }

//     if (!daySchedule.enabled) {
//       continue;
//     }

//     if (typeof daySchedule.start !== 'string' || typeof daySchedule.end !== "string") {
//       continue;
//     }

//     // omit, API seams to used 00:00 time for start and end to mark not enabled day
//     if (daySchedule.start === daySchedule.end) {
//       continue;
//     }

//     result.push({
//       label: DAY_LABELS[i],
//       start: daySchedule.start,
//       end: daySchedule.end
//     })
//   }

//   return result;
// }

// export function getSatisfactionPercentage(ratedGood: number, ratedBad: number) {
//   const total = ratedGood + ratedBad;

//   if (total === 0) {
//     return null;
//   }

//   return `${Math.ceil(ratedGood / total * 100)}%`;
// }

// export function parseAgentStats(stats: REST$AgentPerformanceReport): AgentStat[] {
//   return [
//     {
//       id: 'goals',
//       label: "Goals achieved",
//       value: stats.chats.goals
//     },
//     {
//       id: 'total-chats',
//       label: "Total chats",
//       value: stats.chats.total_chats
//     },
//     {
//       id: 'chat-satisfaction',
//       label: "Chat satisfaction",
//       value: getSatisfactionPercentage(stats.chats.ratings.good, stats.chats.ratings.bad)
//     }
//   ]
// }

// export function parseAgentsForTransfer(agentsForTransfer: API$Response$ListAgentsForTransfer) {
//   if (!Array.isArray(agentsForTransfer)) {
//     return []
//   }

//   return agentsForTransfer.map(function (agentForTransfer) {
//     const agentId = String(agentForTransfer?.agent_id ?? "")
//     const totalActiveChats = Number(agentForTransfer?.total_active_chats ?? 0)

//     return {
//       agentId,
//       totalActiveChats
//     }
//   })
// }

// export function parseInvitationToken(invitationToken: ACCOUNTS$InvitationToken) {
//   return String(invitationToken.access_token)
// }

// export function parseGroups(groups: REST$GET$Groups): Group[] {
//   if (!Array.isArray(groups)) {
//     return []
//   }

//   return groups.map(function (group) {
//     return parseGroup(group);
//   })
// }

// export function parseGroup(group: REST$Group): Group {
//   const status = parseRoutingStatus(group.status) || "offline"

//   return {
//     id: group.id,
//     name: (group.name || "").trim(),
//     agentIds: Array.isArray(group.agents) ? group.agents : [],
//     status,
//   }
// }

// export function parseCustomersSummary(customers: MOBILE_API$CustomerSummary[]): Customer[] {
//   return customers.map(function (customer) {
//     return parseCustomerSummary(customer);
//   })
// }

export function parseCustomerLastVisit(lastVisit?: API$Customer$Visit) {
  if (!lastVisit) {
    return
  }

  const lastPages = Array.isArray(lastVisit.last_pages)
    ? lastVisit.last_pages.map(function (last_page) {
      return {
        url: last_page.url,
        title: last_page.title,
        openedAt: new Date(last_page.opened_at).getTime()
      }
    })
    : []

  return {
    ip: lastVisit.ip,
    referrer: String(lastVisit.referrer ?? "").trim(),
    startedAt: lastVisit.started_at ? new Date(lastVisit.started_at).getTime() : Date.now(),
    userAgent: lastVisit.user_agent ?? "Unknown device",
    lastPages: lastPages,
    geolocation: parseGeolocation(lastVisit.geolocation)
  }
}

// export function parseCustomerSummary(customer: MOBILE_API$CustomerSummary): Customer {
//   const { id, name, email, statistics, chat_id: chatId, group_id } = customer;

//   return {
//     id,
//     name: name || 'Customer',
//     email: email || '',
//     /** we don't have avatar in customer_summary (yet?) */
//     avatar: void 0,
//     lastVisit: parseCustomerLastVisit(customer.last_visit),
//     chatId,
//     statistics: {
//       chatsCount: statistics.chats_count,
//       threadCount: statistics.threads_count,
//       visitsCount: statistics.visits_count
//     },
//     groupId: group_id,
//     fields: parseCustomerSessionFields(customer.session_fields)
//   };
// }

// export function parseCustomer(customer: API$Customer): Customer {
//   const chatId = Array.isArray(customer.chat_ids) ? customer.chat_ids[0] : void 0;

//   return {
//     id: customer.id,
//     name: customer.name ?? "Customer",
//     email: customer.email ?? "",
//     avatar: customer.avatar ? String(customer.avatar) : void 0,
//     lastVisit: parseCustomerLastVisit(customer.last_visit),
//     chatId,
//     statistics: {
//       chatsCount: customer.statistics.chats_count ?? 0,
//       threadCount: customer.statistics.threads_count ?? 0,
//       visitsCount: customer.statistics.visits_count ?? 1,
//     },
//     groupId: 0,
//     fields: parseCustomerSessionFields(customer.session_fields)
//   }
// }

export function parseCustomerSessionFields(fields?: object[]): Fields {
  const result: Fields = []

  if (!Array.isArray(fields)) {
    return result
  }

  fields.forEach(function (field) {
    if (typeof field !== "object") {
      return
    }

    if (field.hasOwnProperty("__details_json")) {

      // @ts-ignore
      result.push(...parseDetailsJson(field["__details_json"]))
    }
    else {
      // { key: "val" } -> { name: "key", value: "val" }
      const keys = Object.keys(field)
      const key = keys.length === 1 ? keys[0] : void 0

      if (!key) {
        return
      }

      result.push({
        name: key,
        // @ts-ignore
        value: String(field[key])
      })
    }
  })

  return result
}

/**
 * When the chat is activated a copy of session_fields is stored in custom_variables field of the thread
 * This is just a snapshot and is never updated
 */
export function parseThreadSessionFields(fields?: API$Thread['custom_variables']): Fields {
  const result: Fields = []

  if (!Array.isArray(fields)) {
    return result
  }

  fields.forEach(function (field) {
    if (typeof field !== "object") {
      return
    }

    if (field.hasOwnProperty("__details_json")) {
      // @ts-ignore
      result.push(...parseDetailsJson(field["__details_json"]))
    }
    else {
      if (!field.key || !field.value) {
        return
      }

      result.push({
        name: field.key,
        value: String(field.value)
      })
    }
  })

  return result
}

export function parseDetailsJson(details: string): Fields {
  const result: Fields = []

  if (typeof details !== "string") {
    return result
  }

  let data;

  try {
    data = JSON.parse(details)
  }
  catch (err) {
    return [{
      name: "__details_json",
      value: "failed to parse: " + err.message
    }]
  }

  if (!Array.isArray(data)) {
    return result
  }

  data.forEach(function (item) {
    if (!Array.isArray(item?.fields)) {
      return
    }

    // @ts-ignore
    item.fields.forEach(function (field) {
      const name = field.name || field.value
      const value = field.url || field.value

      result.push({ name, value })
    })
  })

  return result
}

// export function parseVisitedPages(visitedPages: MOBILE_API$VisitedPage[]): VisitedPage[] {
//   if (!Array.isArray(visitedPages)) {
//     return []
//   }

//   return visitedPages.map(function (visitedPage) {
//     return parseVisitedPage(visitedPage)
//   })
// }

// export function parseVisitedPage(visitedPage: MOBILE_API$VisitedPage): VisitedPage {
//   return {
//     url: visitedPage.url,
//     title: visitedPage.title,
//     openedAt: new Date(visitedPage.opened_at).getTime(),
//   }
// }

// export function parseCannedResponses(cannedResponses: REST$CannedResponse[]): CannedResponse[] {
//   const parsedCannedResponses = cannedResponses.map(function (cannedResponse) {
//     return parseCannedResponse(cannedResponse)
//   })

//   parsedCannedResponses.sort(function (a, b) {
//     return a.tagsStringified.localeCompare(b.tagsStringified);
//   })

//   return parsedCannedResponses
// }

// export function parseCannedResponse(cannedResponse: REST$CannedResponse): CannedResponse {
//   const tags = cannedResponse.tags || [];
//   const tagsStringified = stringifyCannedResponseTags(tags)

//   return {
//     id: Number(cannedResponse.id),
//     groupId: Number(cannedResponse.group),
//     text: String(cannedResponse.text).trim(),
//     tags,
//     tagsStringified,
//   }
// }

// function stringifyCannedResponseTags(tags: string[]) {
//   return tags.map(function (tag) {
//     return "#" + tag
//   }).join(", ")
// }

// export function parseTags(tags: REST$Tag[]): Tag[] {
//   const hashedTags: { [tagName: string]: Tag } = {}

//   for (let i = 0; i < tags.length; i++) {
//     const tag = tags[i]
//     const parsedTag = parseTag(tag)

//     hashedTags[parsedTag.name] = parsedTag
//   }

//   const parsedTags = Object.values(hashedTags);

//   parsedTags.sort(function (a, b) {
//     return b.totalCount - a.totalCount
//   })

//   return parsedTags;
// }

// export function parseTag(tag: REST$Tag): Tag {
//   const parsedTag: Tag = {
//     name: tag.name,
//     totalCount: 0,
//     groupId: Number(tag.group)
//   }

//   if (tag.count) {
//     parsedTag.totalCount = tag.count.inChats + tag.count.inTickets
//   }

//   return parsedTag;
// }

// export function parseSneakPeek(sneakPeek: API$SneakPeek): SneakPeek | null {
//   if (!sneakPeek.text || typeof sneakPeek.text === "string" && sneakPeek.text.trim().length === 0) {
//     return null
//   }

//   return {
//     authorId: sneakPeek.author_id,
//     text: sneakPeek.text,
//     timestamp: sneakPeek.timestamp
//   }
// }

// export function parsePreferences(preferences: MOBILE_API$Preferences): Preferences {
//   return {
//     revision: Number(preferences.revision),
//     send_new_unassigned_chat: Boolean(preferences.send_new_unassigned_chat),
//     send_new_queued_chat: Boolean(preferences.send_new_queued_chat),
//     dnd_when_aa_online: Boolean(preferences.dnd_when_aa_online),
//     dnd_when_not_accepting_chats: Boolean(preferences.dnd_when_not_accepting_chats),
//     send_supervised_message: Boolean(preferences.send_supervised_message),
//     send_chat_idle_message: Boolean(preferences.send_chat_idle_message),
//     send_chat_rate_message: Boolean(preferences.send_chat_rate_message),
//     send_chat_archived_message: Boolean(preferences.send_chat_archived_message),
//     send_new_customer: Boolean(preferences.send_new_customer),
//     send_returning_customer: Boolean(preferences.send_returning_customer),
//     mute_all: Boolean(preferences.mute_all),
//     in_app_with_sound: Boolean(preferences.in_app_with_sound),
//     in_app_with_vibration: Boolean(preferences.in_app_with_vibration),
//   }
// }

function getCustomerId(users: User[]) {
  const customer = users.find((user) => user.type === "customer")

  return customer ? customer.id : void 0
}

// export function parseChatTransferredPayload(payload: API$Push$ChatTransferred["payload"]) {
//   return {
//     chatId: String(payload.chat_id ?? ""),
//     threadId: String(payload.thread_id ?? ""),
//     requesterId: String(payload.requester_id ?? ""),
//     transferredTo: parseTransferredTo(payload.transferred_to),
//     queue: parseQueue(payload.queue)
//   }

//   function parseTransferredTo(data: any) {
//     if (typeof data !== "object") {
//       return
//     }

//     let groupId: number | void = void 0;
//     let agentId: string | void = void 0;

//     if (Array.isArray(data.group_ids) && data.group_ids.length > 0) {
//       groupId = Number(data.group_ids[0])
//     }

//     if (Array.isArray(data.agent_ids) && data.agent_ids.length > 0) {
//       agentId = String(data.agent_ids[0])
//     }

//     return {
//       groupId,
//       agentId,
//     }
//   }
// }

// export function parseListThreads(response: API$Response$ListThreads) {
//   const nextPageId = response.next_page_id ? String(response.next_page_id) : null
//   const foundThreads = Number(response.found_threads)
//   let threads: Thread[];

//   if (Array.isArray(response.threads)) {
//     threads = response.threads.map(thread => parseThread(thread))
//   }
//   else {
//     threads = []
//   }

//   return {
//     threads,
//     nextPageId,
//     foundThreads
//   }
// }

// export function parseApplications(applications: DEV_PLATFORM_API$Application[]): Application[] {
//   if (Array.isArray(applications)) {
//     return applications.map(a => parseApplication(a))
//   }

//   return []
// }

// export function parseApplication(application: DEV_PLATFORM_API$Application): Application {
//   const elements = application.elements ?? {}
//   const widgets = Array.isArray(elements.widgets) ? elements.widgets : []
//   const defaultIcon = "https://cdn.livechat-static.com/api/file/developers/img/applications/5XswgdMGg/RxGokdGGR-icon-960x960.png"
//   const icon = application.icons?.large ?? application.icons?.small ?? application.icons?.original ?? defaultIcon;

//   return {
//     id: application.id,
//     name: application.name,
//     icon,
//     channelIcon: application.customProps?.channelIcon && icon,
//     widgets: widgets.map(w => ({
//       id: w.id,
//       placement: w.placement,
//       url: w.url,
//       initialState: w.shortcut?.initialState ?? ""
//     })),
//     clientId: application.authorization?.clientId || ""
//   }
// }

export function parseQueue(queue?: API$Queue) {
  if (!queue) {
    return null
  }

  let position = Number(queue.position)
  let waitTime = Number(queue.wait_time)
  let queuedAt = queue.queued_at ? new Date(queue.queued_at).getTime() : 0

  if (Number.isNaN(position)) {
    console.warn(`parseQueue: invalid position: ${JSON.stringify(queue)}`)

    position = 0
  }

  if (Number.isNaN(waitTime)) {
    console.warn(`parseQueue: wait_time position: ${JSON.stringify(queue)}`)

    waitTime = 0
  }

  if (Number.isNaN(queuedAt)) {
    console.warn(`parseQueue: queued_at position: ${JSON.stringify(queue)}`)

    queuedAt = 0
  }

  return {
    position,
    waitTime,
    queuedAt
  }
}

// export function parseBanlist(banlist: REST$Response$Banlist): Ban[] {
//   const list = banlist?.banned_visitors

//   if (!Array.isArray(list)) {
//     return []
//   }

//   return list.map(function (ban) {
//     const expiredAt = new Date(ban.expiration_timestamp)

//     if (Number.isNaN(expiredAt.getTime())) {
//       console.warn(`parseBanlist: invalid date in expiration_timestamp property: ${ban.expiration_timestamp}`)
//     }

//     return {
//       ip: String(ban?.ip ?? ""),
//       customerId: String(ban?.visitor_id ?? ""),
//       expiredAt: expiredAt.getTime()
//     }
//   })
// }

// export function parseTranscriptDetails(data: any) {
//   return String(data?.chat ?? "Empty transcript")
// }

// export function parseArchivesResponse(response: API$Response$ListArchives) {
//   const chats = Array.isArray(response?.chats) ? response?.chats : []
//   const foundChats = Number(response?.found_chats)
//   const nextPageId = response?.next_page_id ? String(response.next_page_id) : void 0
//   const prevPageId = response?.previous_page_id ? String(response.previous_page_id) : void 0

//   return {
//     chats: chats.map((chat: API$Chat) => parseChat(chat)),
//     foundChats: foundChats,
//     nextPageId: nextPageId,
//     prevPageId: prevPageId,
//   }
// }

// export function parseListChatsResponse(response: API$Response$ListChats) {
//   const chats = parseChatsSummary(response?.chats_summary)
//   const foundChats = Number(response?.found_chats)
//   const nextPageId = String(response?.next_page_id ?? "")

//   return {
//     chats,
//     foundChats,
//     nextPageId
//   }
// }
