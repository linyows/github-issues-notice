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
  idle: IIdle
}

interface IIdle {
  period: number
  issueTitles: string[]
}

interface IStats {
  enabled: boolean
  issues: number
  pulls: number
  proactive: number
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

    return arr.filter((v) => v)
  }

  private static statsEmoji(r: number): string {
      const start = 100
      const danger = 90
      const caution = 80
      const ng = 70
      const warn = 60
      const ok = 50
      const good = 40
      const great = 30

      switch (true) {
        case r === start: return ':checkered_flag:'
        case r > danger: return ':skull:'
        case r > caution: return ':fire:'
        case r > ng: return ':jack_o_lantern:'
        case r > warn: return ':space_invader:'
        case r > ok: return ':surfer:'
        case r > good: return ':palm_tree:'
        case r > great: return ':helicopter:'
        default: return ':rocket:'
      }
  }

  private static buildStatsAttachment(task: ITask): object {
      const p = task.stats.pulls
      const i = task.stats.issues
      const a = task.stats.proactive
      const hundred = 100
      const r = hundred - Math.floor(a / (a + (i - a)) * hundred)
      const url = 'https://github.com/linyows/github-issues-notice/blob/master/docs/reactive-per.md'
      const m = 'Please applying `proactive` labels to voluntary issues'
      const info = `${GithubIssuesNotice.statsEmoji(r)} ${r === hundred ? m : `${r}%`}`

      return {
        title: `Stats for ${task.repos.length} repositories`,
        color: '#000000',
        text: '',
        footer: `Stats | <${url}|What is this?>`,
        footer_icon: 'https://octodex.github.com/images/surftocat.png',
        fields: [
          { title: 'Reactive Per', value: `${info}`, short: false },
          { title: 'Open Issues Total', value: `${i - p}`, short: true },
          { title: 'Open Pulls Total', value: `${p}`, short: true }
        ]
      }
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

  private tidyUpIssues(repo: string, idle: IIdle) {
    const oneD = 24
    const oneH = 3600
    const oneS = 1000
    const now = new Date()
    const period = now.getTime() - (idle.period * oneD * oneH * oneS)

    try {
      const issues = this.github.issues(repo, { sort: 'asc', direction: 'updated' })
      for (const i of issues) {
        if (Date.parse(i.updated_at) > period) {
          continue
        }
        this.github.closeIssue(repo, i.number)
        idle.issueTitles.push(`<${i.html_url}|${i.title}>(${repo}) by ${i.user.login}`)
      }
    } catch (e) {
      console.error(e)
    }
  }

  private doTask(task: ITask) {
    for (const repo of task.repos) {
      if (repo === '') {
        continue
      }

      if (task.idle.period > 0) {
        this.tidyUpIssues(repo, task.idle)
      }

      if (task.stats.enabled) {
        const i = this.github.issues(repo)
        const p = this.github.pulls(repo)
        const labels = 'proactive'
        const a = this.github.issues(repo, { labels })
        task.stats.issues = task.stats.issues + i.length
        task.stats.pulls = task.stats.pulls + p.length
        task.stats.proactive = task.stats.proactive + a.length
      }

      for (const l of task.labels) {
        try {
          const labels = l.name
          const issues = this.github.issues(repo, { labels })
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

  private notify(task: ITask) {
    let attachments = []
    let mention = ` ${task.mentions.join(' ')} `
    let empty = true

    if (task.stats.enabled) {
      attachments.push(GithubIssuesNotice.buildStatsAttachment(task))
    }

    for (const l of task.labels) {
      if (l.issueTitles.length === 0) {
        continue
      }
      const h = l.name.replace(/\-/g, ' ')
      const m = l.issueTitles.length > l.threshold ? ` -- ${l.message}` : ''
      empty = false
      attachments.push({
        title: `${h.toUpperCase() === h ? h : GithubIssuesNotice.CAPITALIZE(h)}${m}`,
        color: l.color,
        text: l.issueTitles.join('\n')
      })
    }

    if (task.idle.issueTitles.length > 0) {
      const url = 'https://github.com/linyows/github-issues-notice/blob/master/docs/idle-period.md'
      empty = false
      attachments.push({
        title: `Closed with no change over ${task.idle.period}days`,
        color: '#CCCCCC',
        text: task.idle.issueTitles.join('\n'),
        footer: `Idle Period | <${url}|What is this?>`,
        footer_icon: 'https://octodex.github.com/images/Sentrytocat_octodex.jpg',
        fields: [
          { title: 'Closed Total', value: `${task.idle.issueTitles.length}`, short: true }
        ]
      })
    }

    const messages = []
    if (empty) {
      messages.push(this.config.slack.textEmpty)
      attachments = []
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
    const idleColumn = 7

    const nameField = 0
    const thresholdField = 1
    const messageField = 2

    const job: ITask[] = []
    const timeLength = 2
    const timeFullLength = 4
    const minStart = 2
    const nowH = `0${this.config.now.getHours()}`.slice(-timeLength)
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

      const channels = GithubIssuesNotice.NORMALIZE(`${task[channelColumn]}`)
      const times = GithubIssuesNotice.NORMALIZE(`${task[timeColumn]}`)
      const mentions = GithubIssuesNotice.NORMALIZE(`${task[mentionColumn]}`)
      const labelsWithInfo = GithubIssuesNotice.NORMALIZE(`${task[labelColumn]}`)

      let s = task[statsColumn]
      if (typeof s !== 'boolean') {
        s = false
      }
      const stats: IStats = {
        enabled: s,
        issues: 0,
        pulls: 0,
        proactive: 0
      }

      let idlePeriod = task[idleColumn]
      if (typeof idlePeriod !== 'number') {
        idlePeriod = 0
      }
      const idle: IIdle = {
        period: idlePeriod,
        issueTitles: []
      }

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
          job.push({ channels, times, mentions, repos, labels, stats, idle })
        }
      }
    }

    return job
  }
}
