/**
 * GitHub issues notice
 *
 * Copyright (c) 2018 Tomohisa Oda
 */

import {Github} from './github'
import {Slack} from './slack'

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
  stats: IStats
}

interface IStats {
  issues: number
  pulls: number
  proactive: number
  coefficient: number
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
export class GithubIssuesNotice {

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

  public static NORMALIZE(str: string): string[] {
    const arr = str.split('\n')
    for (let v of arr) {
      v = v.trim()
    }

    return arr
  }

  public doJob(): void {
    if (GithubIssuesNotice.IS_HOLIDAY(this.config.now)) {
      return
    }

    const job = this.getJobByMatchedTime()
    for (const t of job) {
      this.doTask(t)
    }
  }

  private doTask(task: ITask) {
    for (const repo of task.repos) {
      if (repo === '') {
        continue
      }

      if (task.stats.coefficient > 0) {
        const issues_all = this.github.issues(repo, '')
        const pulls_all = this.github.pulls(repo, '')
        const issues_proactive = this.github.issues(repo, 'proactive')
        task.stats.issues = task.stats.issues + issues_all.length
        task.stats.pulls = task.stats.pulls + pulls_all.length
        task.stats.proactive = task.stats.proactive + issues_proactive.length
      }

      for (const l of task.labels) {
        try {
          const issues = this.github.issues(repo, l.name)
          for (const i of issues) {
            for (const ll of i.labels) {
              if (l.name === ll.name) {
                l.color = ll.color
              }
            }
            l.issueTitles.push(`<${i.html_url}|${i.title}>(${repo}) by ${i.user.login}`)
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
    this.notify(task)
  }

  private buildStatsAttachment(task: ITask): object {
      const p = task.stats.pulls
      const i = task.stats.issues
      const a = task.stats.proactive
      let attachment = {
        title: 'Stats',
        color: '#000000',
        text: '',
        fields: [
          { title: 'Repos', value: `${task.repos.length}`, short: false },
          { title: 'Issues Total', value: `${i-p}`, short: true },
          { title: 'Pulls Total', value: `${p}`, short: true },
        ]
      }

      if (a > 0) {
        const x = task.stats.coefficient
        const r = 100-Math.floor(a*x/(a*x+(i-a))*100)
        attachment.fields.push(
          { title: 'Reactive Per', value: `${r} % :${r <= 50 ? 'palm_tree' : 'fire'}:`, short: false }
        )
      }

      return attachment
  }

  private notify(task: ITask) {
    const attachments = []
    let mention = ` ${task.mentions.join(' ')} `
    let empty = true

    if (task.stats.coefficient > 0) {
      attachments.push(this.buildStatsAttachment(task))
    }

    for (const l of task.labels) {
      if (l.issueTitles.length === 0) {
        continue
      }
      const h = l.name.replace(/\-/g, ' ')
      const m = l.issueTitles.length > l.threshold ? ` -- ${l.message}` : ''
      empty = false
      attachments.push({
        title: `${h.toUpperCase() === h ? h : GithubIssuesNotice.CAPITALIZE(h)}s${m}`,
        color: l.color,
        text: l.issueTitles.join('\n')
      })
    }

    const messages = []
    if (empty) {
      messages.push(this.config.slack.textEmpty)
      mention = ''
    } else {
      messages.push(this.config.slack.textDefault)
    }

    for (const ch of task.channels) {
      try {
        this.slack.postMessage(ch, {
          username: this.config.slack.username,
          icon_emoji: ':octocat:',
          link_names: 1,
          text: `${mention}${messages.join(' ')}${this.config.slack.textSuffix}`,
          attachments: JSON.stringify(attachments)
        })
      } catch (e) {
        console.error(e)
      }
    }
  }

  private getJobByMatchedTime(): ITask[] {
    const enabledColumn = 0
    const channelColumn = 1
    const timeColumn = 2
    const mentionColumn = 3
    const repoColumn = 4
    const labelColumn = 5
    const statsColumn = 6

    const nameField = 0
    const thresholdField = 1
    const messageField = 2

    const job: ITask[] = []
    const timeLength = 2
    const timeFullLength = 4
    const minStart = 2
    const nowH = `${this.config.now.getHours()}`
    const nowM = `00${this.config.now.getMinutes()}`.slice(-timeLength)

    for (const task of this.data) {
      const repos = GithubIssuesNotice.NORMALIZE(`${task[repoColumn]}`)
      if (repos.length === 0) {
        continue
      }

      const enabled = task[enabledColumn]
      if (typeof enabled === 'boolean') {
        if (!enabled) {
          continue
        }
      } else {
        console.error(`"enabled" columns must be of type boolean: ${enabled}`)
      }

      let stats = task[statsColumn]
      if (typeof enabled === 'number') {
        stats = { cofficient: stats }
      } else {
        console.error(`"stats" columns must be of type number: ${stats}`)
        stats = { cofficient: 0 }
      }

      const channels = GithubIssuesNotice.NORMALIZE(`${task[channelColumn]}`)
      const times = GithubIssuesNotice.NORMALIZE(`${task[timeColumn]}`)
      const mentions = GithubIssuesNotice.NORMALIZE(`${task[mentionColumn]}`)
      const labelsWithInfo = GithubIssuesNotice.NORMALIZE(`${task[labelColumn]}`)

      for (const time of times) {
        const hour = time.substr(0, timeLength)
        const min = time.length === timeFullLength ? time.substr(minStart, timeLength) : '00'

        if (hour === nowH && min === nowM) {
          const labels: ILabel[] = []
          for (const l of labelsWithInfo) {
            const arr = `${l}`.split('/')
            labels.push({
              name: arr[nameField],
              threshold: +arr[thresholdField],
              message: arr[messageField],
              color: '',
              issueTitles: []
            })
          }
          job.push({ channels, times, mentions, repos, labels, stats })
        }
      }
    }

    return job
  }
}
