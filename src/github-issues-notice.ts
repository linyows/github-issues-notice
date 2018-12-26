/**
 * GitHub issues notice
 *
 * Copyright (c) 2018 Tomohisa Oda
 */

/**
 * Github Client
 */
class Github {
  private token: string
  private apiEndpoint: string

  constructor(token: string, apiEndpoint?: string) {
    this.token = token
    if (apiEndpoint) {
      this.apiEndpoint = apiEndpoint
    } else {
      this.apiEndpoint = 'https://api.github.com/'
    }
  }

  public get headers(): any {
    return {
      Authorization: `token ${this.token}`
    }
  }

  public issues(repo: string, labels: string) {
    const res = UrlFetchApp.fetch(`${this.apiEndpoint}repos/${repo}/issues?labels=${labels}`, {
      method: 'get',
      headers: this.headers
    })

    return JSON.parse(res.getContentText())
  }
}

interface ISlackField {
  title: string
  value: string
}

interface ISlackAttachment {
  title: string
  title_link: string
  color: string
  text: string
  fields?: ISlackField[]
}

interface ISlackPostMessageOpts {
  username: string
  icon_emoji: string
  link_names: number
  text: string
  attachments?: string
}

/**
 * Slack Client
 */
class Slack {
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

  public postMessage(channel: string, opts: ISlackPostMessageOpts) {
    this.joinChannel(channel)

    const res = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
      method: 'post',
      payload: { ...{ token: this.token, channel: channel }, ...opts }
    })

    return JSON.parse(res.getContentText()).ok
  }
}

interface IGithubConfig {
  token: string
  apiEndpoint?: string
}

interface ISlackConfig {
  token: string
  username: string
  textSuffix: string
  textEmpty: string
  textDefault: string
}

interface ISpreadsheetsConfig {
  id: string
  url: string
}

interface IConfig {
  now: Date
  slack: ISlackConfig
  github: IGithubConfig
  spreadsheets: ISpreadsheetsConfig
}

interface ITask {
  channels: string[]
  times: string[]
  mentions: string[]
  repos: string[]
  labels: ILabel[]
}

interface ILabel {
  name: string
  threshold: number
  message: string
  color: string
  issueTitles: string[]
}

/**
 * GithubIssuesNotice
 */
class GithubIssuesNotice {

  private get slack(): any {
    if (this.pSlack === undefined) {
      this.pSlack = new Slack(this.config.slack.token)
    }

    return this.pSlack
  }

  private get github(): any {
    if (this.pGithub === undefined) {
      if (this.config.github.apiEndpoint) {
        this.pGithub = new Github(this.config.github.token, this.config.github.apiEndpoint)
      } else {
        this.pGithub = new Github(this.config.github.token)
      }
    }

    return this.pGithub
  }

  private get sheet(): any {
    if (this.pSheet === undefined) {
      const s = SpreadsheetApp.openById(this.config.spreadsheets.id)
      this.pSheet = s.getSheetByName('config')
    }

    return this.pSheet
  }

  private get data(): any {
    if (this.pData === undefined) {
      const startRow = 2
      const startColumn = 1
      const numRow = this.sheet.getLastRow()
      const numColumn = this.sheet.getLastColumn()
      this.pData = this.sheet.getSheetValues(startRow, startColumn, numRow, numColumn)
    }

    return this.pData
  }

  public config: IConfig
  private pSheet: any
  private pSlack: any
  private pGithub: any
  private pData: any

  constructor(c: IConfig) {
    this.config = c
  }

  public static IS_HOLIDAY(date: Date): boolean {
    const startWeek = 0
    const endWeek = 6
    const weekInt = date.getDay()
    if (weekInt <= startWeek || endWeek <= weekInt) {
      return true
    }
    const calendarId = 'ja.japanese#holiday@group.v.calendar.google.com'
    const calendar = CalendarApp.getCalendarById(calendarId)
    const events = calendar.getEventsForDay(date)

    return events.length > 0
  }

  public static CAPITALIZE(word: string): string {
    if (!word) {
      return word
    }

    return word.replace(/\w\S*/g, (t) => {
      return `${t.charAt(0)
                 .toUpperCase()}${t.substr(1)
                                   .toLowerCase()}`
    })
  }

  public doJob(): void {
    if (GithubIssuesNotice.IS_HOLIDAY(this.config.now)) {
      return
    }

    const job = this.selectJobMatchTime()
    for (const t of job) {
      this.doTask(t)
    }
  }

  private doTask(task: ITask) {
    for (const repo of task.repos) {
      if (repo === '') {
        continue
      }
      for (const l of task.labels) {
        const issues = this.github.issues(repo, l.name)
        for (const i of issues) {
          for (const ll of i.labels) {
            if (l.name === ll.name) {
              l.color = ll.color
            }
          }
          l.issueTitles.push(`<${i.html_url}|${i.title}>(${repo}) by ${i.user.login}`)
        }
      }
    }
    this.notify(task)
  }

  private notify(task: ITask) {
    const attachments = []
    const messages = []
    let mention = ` ${task.mentions.join(' ')} `

    for (const l of task.labels) {
      if (l.issueTitles.length === 0) {
        continue
      }
      const h = l.name.replace(/\-/g, ' ')
      attachments.push({
        title: `${h.toUpperCase() === h ? h : GithubIssuesNotice.CAPITALIZE(h)}s`,
        color: l.color,
        text: l.issueTitles.join('\n')
      })
      if (l.issueTitles.length > l.threshold) {
        messages.push(l.message)
      }
    }

    if (messages.length === 0) {
      if (attachments.length === 0) {
        messages.push(this.config.slack.textEmpty)
        mention = ''
      } else {
        messages.push(this.config.slack.textDefault)
      }
    }

    for (const ch of task.channels) {
      this.slack.postMessage(ch, {
        username: this.config.slack.username,
        icon_emoji: ':octocat:',
        link_names: 1,
        text: `${mention}${messages.join(' ')}${this.config.slack.textSuffix}`,
        attachments: JSON.stringify(attachments)
      })
    }
  }

  private selectJobMatchTime(): any {
    const channelColumn = 0
    const timeColumn = 1
    const mentionColumn = 2
    const repoColumn = 3
    const labelColumn = 4

    const nameField = 0
    const thresholdField = 1
    const messageField = 2

    const job: ITask[] = []

    for (const task of this.data) {
      const channels = `${task[channelColumn]}`.split('\n')
      const times = `${task[timeColumn]}`.split('\n')
      const mentions = `${task[mentionColumn]}`.split('\n')
      const repos = `${task[repoColumn]}`.split('\n')
      const labelsWithInfo = `${task[labelColumn]}`.split('\n')

      for (const time of times) {
        const timeLength = 2
        const timeFullLength = 4
        const minStart = 2
        const hour = time.substr(0, timeLength)
        const min = time.length === timeFullLength ? time.substr(minStart, timeLength) : '00'
        if (hour === `${this.config.now.getHours()}` && min === `${this.config.now.getMinutes()}`) {
          const labels: ILabel[] = []
          for (const l of labelsWithInfo) {
            const arr = `${l}`.split(',')
            labels.push({
              name: arr[nameField],
              threshold: +arr[thresholdField],
              message: arr[messageField],
              color: '',
              issueTitles: []
            })
          }
          job.push({ channels, times, mentions, repos, labels })
        }
      }
    }

    return job
  }
}

/**
 * Main
 */
const sheetId = PropertiesService
  .getScriptProperties()
  .getProperty('SHEET_ID')
const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
const projectUrl = 'https://github.com/linyows/github-issues-notice'

const notice = new GithubIssuesNotice({
  now: new Date(),
  github: {
    token: PropertiesService
      .getScriptProperties()
      .getProperty('GITHUB_ACCESS_TOKEN'),
    apiEndpoint: PropertiesService
      .getScriptProperties()
      .getProperty('GITHUB_API_ENDPOINT')
  },
  slack: {
    token: PropertiesService
      .getScriptProperties()
      .getProperty('SLACK_ACCESS_TOKEN'),
    username: 'GitHub Issues Notice',
    textSuffix: ` <${sheetUrl}|通知設定> <${projectUrl}|これは何？>`,
    textEmpty: 'Wow, We did it! :tada:',
    textDefault: 'チェックしてね :muscle:'
  },
  spreadsheets: {
    id: sheetId,
    url: sheetUrl
  }
})

/**
 * notify notify labeled issues to slack
 */
function notify() {
  notice.doJob()
}
