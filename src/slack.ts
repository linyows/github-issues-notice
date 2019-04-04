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

/**
 * Slack Client
 */
export class Slack {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  public joinChannel(channel: string): boolean {
    const res = UrlFetchApp.fetch('https://slack.com/api/channels.join', {
      method: 'post',
      payload: {
        token: this.token,
        name: channel
      }
    })

    return JSON.parse(res.getContentText()).ok
  }

  public postMessage(channel: string, opts: SlackPostMessageOpts) {
    this.joinChannel(channel)

    const res = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
      method: 'post',
      payload: { ...{ token: this.token, channel: channel }, ...opts }
    })

    return JSON.parse(res.getContentText()).ok
  }
}
