/**
 * GitHub issues notice
 *
 * Copyright (c) 2018 Tomohisa Oda
 */

import {Github, Issue, PullRequest} from './github'
import {Slack} from './slack'

interface GithubConfig {
  token: string
  apiEndpoint?: string
}

interface SlackConfig {
  token: string
  username: string
  textSuffix: string
  textEmpty: string
  textDefault: string
}

interface SpreadsheetsConfig {
  id: string
  url: string
}

interface Config {
  now: Date
  slack: SlackConfig
  github: GithubConfig
  spreadsheets: SpreadsheetsConfig
}

interface Task {
  channels: string[]
  times: string[]
  mentions: string[]
  repos: string[]
  labels: Label[]
  stats: Stats
  idle: Idle
  relations: boolean
  onlyPulls: boolean
  labelProtection: boolean
}

interface Idle {
  period: number
  issueTitles: string[]
}

interface Stats {
  enabled: boolean
  issues: number
  pulls: number
  proactive: number
}

interface Label {
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

  public config: Config
  private pSheet: any
  private pSlack: any
  private pGithub: any
  private pData: any

  constructor(c: Config) {
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
      const danger = 90
      const caution = 80
      const ng = 70
      const warn = 60
      const ok = 50
      const good = 40
      const great = 30

      switch (true) {
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

  private static buildStatsAttachment(task: Task): object {
      const p = task.stats.pulls
      const i = task.stats.issues
      const a = task.stats.proactive
      const hundred = 100
      const r = hundred - Math.floor(a / (a + (i - a)) * hundred)
      const url = 'https://github.com/linyows/github-issues-notice/blob/master/docs/reactive-per.md'
      const m = '--% :point_right: Please applying `proactive` label to voluntary issues'
      const info = r === hundred ? m : `${GithubIssuesNotice.statsEmoji(r)} ${r}%`

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

  private tidyUpIssues(repo: string, idle: Idle) {
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

  private doTask(task: Task) {
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
          if (!task.onlyPulls) {
            // Issues without Pull Request
            const state = task.labelProtection ? 'all' : 'open'
            const issues = this.github.issues(repo, { labels, state })
            for (const i of issues) {
              if (Github.IsPullRequestIssue(i)) {
                continue
              }
              for (const ll of i.labels) {
                if (l.name === ll.name) {
                  l.color = ll.color
                }
              }
              const warn = task.labelProtection && i.state === 'closed' ? ':warning: Closed: ' : ''
              l.issueTitles.push(`${warn}<${i.html_url}|${i.title}>(${repo}) by ${i.user.login}${task.relations ? this.buildIssueRelations(i) : ''}`)
            }
          }
          // Pull Requests without Draft
          const pulls = this.github.pullsWithoutDraft(repo, { labels })
          for (const i of pulls) {
            for (const ll of i.labels) {
              if (l.name === ll.name) {
                l.color = ll.color
              }
            }
            l.issueTitles.push(`<${i.html_url}|${i.title}>(${repo}) by ${i.user.login}${task.relations ? this.buildPullRelations(i) : ''}`)
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
    this.notify(task)
  }

  private buildIssueRelations(i: Issue): string {
    if (i.assignees.length == 0) {
      return ''
    }
    return ` (Assignees: ${i.assignees.map(u => { return u.login }).join(', ')})`
  }

  private buildPullRelations(i: PullRequest): string {
    if (i.assignees.length == 0 && i.requested_reviewers.length == 0) {
      return ''
    }
    const r = []
    if (i.assignees.length > 0) {
      r.push('Assignees: ' + i.assignees.map(u => { return u.login }).join(', '))
    }
    if (i.requested_reviewers.length > 0) {
      r.push('Reviewers: ' + i.requested_reviewers.map(u => { return u.login }).join(', '))
    }
    return ` (${r.join(', ')})`
  }

  private getTsIfDuplicated(ch: string): string {
    const msgs = this.slack.channelsHistory(ch, { count: 1 })
    const msg = msgs[0]

    return (msg.username === this.config.slack.username &&
      msg.text.indexOf(this.config.slack.textEmpty) !== -1) ? msg.ts : ''
  }

  private postMessageOrUpdate(ch: string) {
    const ts = this.getTsIfDuplicated(ch)
    if (ts === '') {
      this.slack.postMessage(ch, {
        username: this.config.slack.username,
        icon_emoji: ':octocat:',
        link_names: 1,
        text: `${this.config.slack.textEmpty}${this.config.slack.textSuffix}`
      })
    } else {
      const updatedAt = ` -- :hourglass: last updated at: ${this.config.now}`
      this.slack.chatUpdate(ch, {
        text: `${this.config.slack.textEmpty}${this.config.slack.textSuffix}${updatedAt}`,
        ts: ts
      })
    }
  }

  private notify(task: Task) {
    const attachments = []
    const mention = ` ${task.mentions.join(' ')} `
    let empty = true

    if (task.stats.enabled) {
      attachments.push(GithubIssuesNotice.buildStatsAttachment(task))
    }

    for (const l of task.labels) {
      if (l.issueTitles.length === 0) {
        continue
      }
      const h = l.name.replace(/\-/g, ' ')
      const m = l.issueTitles.length > l.threshold ? `${l.name.length > 0 ? ' -- ' : ''}${l.message}` : ''
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
    if (!empty) {
      messages.push(this.config.slack.textDefault)
    }

    for (const ch of task.channels) {
      try {
        if (empty) {
          this.postMessageOrUpdate(ch)
        } else {
          this.slack.postMessage(ch, {
            username: this.config.slack.username,
            icon_emoji: ':octocat:',
            link_names: 1,
            text: `${mention}${messages.join(' ')}${this.config.slack.textSuffix}`,
            attachments: JSON.stringify(attachments)
          })
        }

      } catch (e) {
        console.error(e)
      }
    }
  }

  private getJobByMatchedTime(): Task[] {
    const enabledColumn = 0
    const channelColumn = 1
    const timeColumn = 2
    const mentionColumn = 3
    const repoColumn = 4
    const labelColumn = 5
    const statsColumn = 6
    const idleColumn = 7
    const relationsColumn = 8
    const onlyPullsColumn = 9
    const labelProtectionColumn = 10

    const nameField = 0
    const thresholdField = 1
    const messageField = 2

    const job: Task[] = []
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

      let relations = task[relationsColumn]
      if (typeof relations !== 'boolean') {
        relations = false
      }
      let onlyPulls = task[onlyPullsColumn]
      if (typeof onlyPulls !== 'boolean') {
        onlyPulls = false
      }
      let labelProtection = task[labelProtectionColumn]
      if (typeof labelProtection !== 'boolean') {
        labelProtection = false
      }

      let s = task[statsColumn]
      if (typeof s !== 'boolean') {
        s = false
      }
      const stats: Stats = {
        enabled: s,
        issues: 0,
        pulls: 0,
        proactive: 0
      }

      let idlePeriod = task[idleColumn]
      if (typeof idlePeriod !== 'number') {
        idlePeriod = 0
      }
      const idle: Idle = {
        period: idlePeriod,
        issueTitles: []
      }

      for (const time of times) {
        const hour = time.substr(0, timeLength)
        const min = time.length === timeFullLength ? time.substr(minStart, timeLength) : '00'

        if (hour === nowH && min === nowM) {
          const labels: Label[] = []
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
          job.push({ channels, times, mentions, repos, labels, stats, idle, relations, onlyPulls, labelProtection })
        }
      }
    }

    return job
  }
}
