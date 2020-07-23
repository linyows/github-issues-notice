/**
 * GitHub issues notice
 *
 * Copyright (c) 2018 Tomohisa Oda
 */

interface SlackField {
  title: string
  value: string
}

interface SlackAttachment {
  title: string
  title_link: string
  color: string
  text: string
  fields?: SlackField[]
}

interface SlackPostMessageOpts {
  username: string
  icon_emoji: string
  link_names: number
  text: string
  attachments?: string
}

interface SlackChannelsHistoryOpts {
  count?: number
  inclusive?: number
  latest?: string
  oldest?: number
  unreads?: number
}

interface SlackChatUpdateOpts {
  text: string
  ts: string
  as_user?: string
  attachments?: string
  blocks?: string
  link_names?: string
  parse?: string
}

interface SlackChannel {
  id: string
  name: string
  members: string[]
}

/**
 * Slack Client
 */
export class Slack {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  public joinChannel(channel: string): SlackChannel {
    const res = UrlFetchApp.fetch('https://slack.com/api/channels.join', {
      method: 'post',
      payload: {
        token: this.token,
        name: channel,
      },
    })

    return JSON.parse(res.getContentText()).channel
  }

  public postMessage(channel: string, opts: SlackPostMessageOpts) {
    this.joinChannel(channel)

    const res = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
      method: 'post',
      payload: { ...{ token: this.token, channel: channel }, ...opts },
    })

    return JSON.parse(res.getContentText()).ok
  }

  public channelsHistory(channel: string, opts: SlackChannelsHistoryOpts) {
    const ch = this.joinChannel(channel)

    const res = UrlFetchApp.fetch('https://slack.com/api/channels.history', {
      method: 'post',
      payload: { ...{ token: this.token, channel: ch.id }, ...opts },
    })

    return JSON.parse(res.getContentText()).messages
  }

  public chatUpdate(channel: string, opts: SlackChatUpdateOpts) {
    const ch = this.joinChannel(channel)

    const res = UrlFetchApp.fetch('https://slack.com/api/chat.update', {
      method: 'post',
      payload: { ...{ token: this.token, channel: ch.id }, ...opts },
    })

    return JSON.parse(res.getContentText()).ok
  }
}
