/**
 * GitHub issues notice
 *
 * Copyright (c) 2018 Tomohisa Oda
 */

/**
 * Slack Client
 */
export class Slack {
  private token: string
  private channels: Channel[]

  constructor(token: string) {
    this.token = token
    this.channels = []
  }

  public request<T>({ endpoint, body }: Request): T {
    const res = UrlFetchApp.fetch(`https://slack.com/api/${endpoint}`, {
      method: 'post',
      payload: {
        token: this.token,
        ...body,
      },
    })
    console.log(endpoint, body, res.getContentText())
    return JSON.parse(res.getContentText())
  }

  public channelList(c: string): ListConversationResponse {
    return this.request<ListConversationResponse>({
      endpoint: 'conversations.list',
      body: {
        exclude_archived: true,
        limit: 1000,
        cursor: c,
      },
    })
  }

  public channelListAll(): Channel[] {
    if (this.channels.length > 0) {
      return this.channels
    }
    let channels: Channel[] = []
    let cursor = ''

    /* eslint no-constant-condition: 0 */
    while (true) {
      const c = this.channelList(cursor)
      channels = [...channels, ...c.channels]
      cursor = c.response_metadata.next_cursor
      if (cursor === '') {
        break
      }
    }
    this.channels = channels
    return channels
  }

  public joinConversation(channel: string): Channel {
    return this.request<JoinConversationResponse>({
      endpoint: 'conversations.join',
      body: { channel },
    }).channel
  }

  public joinChannel(channel: string): Channel {
    const c = this.channelListAll().find(v => v.name === channel)
    return this.joinConversation(c.id)
  }

  public postMessage(body: PostMessage): boolean {
    this.joinChannel(body.channel)
    return this.request<PostMessageResponse>({
      endpoint: 'chat.postMessage',
      body,
    }).ok
  }

  public conversationsHistory(body: ConversationsHistory): ConversationsHistoryMessage[] {
    const ch = this.joinChannel(body.channel)
    body.channel = ch.id
    return this.request<ConversationsHistoryResponse>({
      endpoint: 'conversations.history',
      body,
    }).messages
  }

  public chatUpdate(body: ChatUpdate): boolean {
    const ch = this.joinChannel(body.channel)
    body.channel = ch.id
    return this.request<ChatUpdateResponse>({
      endpoint: 'chat.update',
      body,
    }).ok
  }
}

type Request = {
  endpoint: string
  body: { name: string } | PostMessage | ConversationsHistory | ChatUpdate | ListConversation
}

type PostMessage = {
  channel: string
  username: string
  icon_emoji?: string
  link_names: number
  text: string
  attachments?: string
}

type PostMessageResponse = {
  ok: boolean
  channel: string
  ts: string
  message: {
    type: string
    subtype: string
    text: string
    ts: string
    username: string
    //icon_emoji?: any
    bot_id?: string
    //attachments?: any
  }
}

type Channel = {
  id: string
  name: string
  members: string[]
}

type JoinConversationResponse = {
  ok: boolean
  channel: Channel
}

type ChatUpdateResponse = {
  ok: boolean
  channel?: string
  ts: string
  text: string
  message: {
    text: string
    user: string
  }
}

export type Field = {
  title: string
  value: string
  short: boolean
}

export type Attachment = {
  title: string
  title_link?: string
  color: string
  text: string
  fields?: Field[]
  footer?: string
  footer_icon?: string
}

export type ConversationsHistory = {
  channel: string
  cursor?: string
  inclusive?: number
  latest?: string
  limit?: number
  oldest?: number
}

export type ChatUpdate = {
  channel: string
  text: string
  ts: string
  as_user?: string
  attachments?: string
  blocks?: string
  link_names?: string
  parse?: string
}

type Reaction = {
  name: string
  count: number
  users: string[]
}

type ConversationsHistoryAttachment = {
  text: string
  id: number
  fallback: string
}

export type ConversationsHistoryMessage = {
  type: string
  ts: string
  user?: string
  text?: string
  is_starred?: boolean
  reactions?: Reaction[]
  username?: string
  bot_id?: string
  subtype?: string
  attachments?: ConversationsHistoryAttachment[]
}

type ConversationsHistoryResponse = {
  ok: boolean
  messages: ConversationsHistoryMessage[]
  has_more: boolean
}

type ListConversation = {
  exclude_archived: boolean
  limit: number
  cursor: string
}

type ListConversationResponse = {
  ok: boolean
  channels: Channel[]
  response_metadata: {
    next_cursor: string
  }
}
