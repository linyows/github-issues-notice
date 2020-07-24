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

  constructor(token: string) {
    this.token = token
  }

  public request<T>({ endpoint, body }: Request): T {
    const res = UrlFetchApp.fetch(`https://slack.com/api/${endpoint}`, {
      method: 'post',
      payload: {
        token: this.token,
        ...body,
      },
    })
    console.log(body, res.getContentText())
    return JSON.parse(res.getContentText())
  }

  public joinChannel(channel: string): Channel {
    return this.request<JoinChannelResponse>({
      endpoint: 'channels.join',
      body: { name: channel },
    }).channel
  }

  public postMessage(body: PostMessage): boolean {
    this.joinChannel(body.channel)
    return this.request<PostMessageResponse>({
      endpoint: 'chat.postMessage',
      body,
    }).ok
  }

  public channelsHistory(body: ChannelsHistory): ChannelsHistoryMessage[] {
    const ch = this.joinChannel(body.channel)
    body.channel = ch.id
    return this.request<ChannelsHistoryResponse>({
      endpoint: 'channels.history',
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
  body: { name: string } | PostMessage | ChannelsHistory | ChatUpdate
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

type JoinChannelResponse = {
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

export type ChannelsHistory = {
  channel: string
  count?: number
  inclusive?: number
  latest?: string
  oldest?: number
  unreads?: number
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

type ChannelsHistoryAttachment = {
  text: string
  id: number
  fallback: string
}

export type ChannelsHistoryMessage = {
  type: string
  ts: string
  user?: string
  text?: string
  is_starred?: boolean
  reactions?: Reaction[]
  username?: string
  bot_id?: string
  subtype?: string
  attachments?: ChannelsHistoryAttachment[]
}

type ChannelsHistoryResponse = {
  ok: boolean
  messages: ChannelsHistoryMessage[]
  has_more: boolean
}
