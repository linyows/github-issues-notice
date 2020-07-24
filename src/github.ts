/**
 * GitHub issues notice
 *
 * Copyright (c) 2018 Tomohisa Oda
 */

/**
 * Github Client
 */
export class Github {
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

  public static IsPullRequestIssue(i: Issue): boolean {
    return i.pull_request !== undefined
  }

  private static buildOptionUrl(opts: IssueOptions): string {
    let u = ''

    if (opts.labels) {
      u += `&labels=${opts.labels}`
    }
    if (opts.direction) {
      u += `&direction=${opts.direction}`
    }
    if (opts.sort) {
      u += `&sort=${opts.sort}`
    }

    return u
  }

  public get headers(): Headers {
    return {
      Authorization: `token ${this.token}`,
    }
  }

  public issues(repo: string, opts?: IssueOptions): Issue[] {
    const defaultUrl = `${this.apiEndpoint}repos/${repo}/issues?per_page=100`
    const optionUrl = opts ? Github.buildOptionUrl(opts) : ''
    const res = UrlFetchApp.fetch(`${defaultUrl}${optionUrl}`, {
      method: 'get',
      headers: this.headers,
    })

    return JSON.parse(res.getContentText())
  }

  public closeIssue(repo: string, num: number): Issue[] {
    const res = UrlFetchApp.fetch(
      `${this.apiEndpoint}repos/${repo}/issues/${num}`,
      {
        method: 'patch',
        headers: this.headers,
        payload: JSON.stringify({ state: 'closed' }),
      }
    )

    return JSON.parse(res.getContentText())
  }

  public pulls(repo: string, opts?: IssueOptions): PullRequest[] {
    const defaultUrl = `${this.apiEndpoint}repos/${repo}/pulls?per_page=100`
    const optionUrl = opts ? Github.buildOptionUrl(opts) : ''
    const res = UrlFetchApp.fetch(`${defaultUrl}${optionUrl}`, {
      method: 'get',
      headers: this.headers,
    })

    return JSON.parse(res.getContentText())
  }

  public pullsWithoutDraft(repo: string, opts?: IssueOptions): PullRequest[] {
    return this.pulls(repo, opts)
      .map(p => {
        if (!p.draft) {
          return p
        }
      })
      .filter(p => {
        return p !== undefined
      })
  }
}

export type User = {
  login: string
  id: number
  node_id: string
  avatar_url: string
  gravatar_id: string
  url: string
  html_url: string
  followers_url: string
  following_url: string
  gists_url: string
  starred_url: string
  subscriptions_url: string
  organizations_url: string
  repos_url: string
  events_url: string
  received_events_url: string
  type: string
  site_admin: boolean
}

export type Label = {
  id: number
  node_id: string
  url: string
  name: string
  color: string
  default: boolean
  description: string
}

export type Milestone = {
  url: string
  html_url: string
  labels_url: string
  id: number
  node_id: string
  number: number
  title: string
  description: string
  creator: User
  open_issues: number
  closed_issues: number
  state: string
  created_at: string
  updated_at: string
  due_on: string
  closed_at: null | string
}

export type Team = {
  id: number
  node_id: string
  url: string
  html_url: string
  name: string
  slug: string
  description: string
  privacy: string
  permission: string
  members_url: string
  repositories_url: string
  parent: null
}

export type Issue = {
  url: string
  repository_url: string
  labels_url: string
  comments_url: string
  events_url: string
  html_url: string
  id: number
  node_id: string
  number: number
  title: string
  user: User
  labels: Label[]
  state: string
  locked: boolean
  assignee: null | User
  assignees: User[]
  milestone: null | Milestone
  comments: number
  created_at: string
  updated_at: string
  author_association: string
  pull_request?: {
    url: string
    html_url: string
    diff_url: string
    patch_url: string
  }
  body: string
}

export type PullRequest = {
  url: string
  id: number
  node_id: string
  html_url: string
  diff_url: string
  patch_url: string
  issue_url: string
  number: number
  state: string
  locked: boolean
  title: string
  user: User
  body: string
  created_at: string
  updated_at: string
  closed_at: null | string
  merged_at: null | string
  merge_commit_sha: string
  assignee: null | User
  assignees: User[]
  requested_reviewers: User[]
  requested_teams: Team[]
  labels: Label[]
  milestone: null | Milestone
  draft: boolean
  commits_url: string
  review_comments_url: string
  review_comment_url: string
  comments_url: string
  statuses_url: string
  //head: any
  //base: any
  //_links: any
  author_association: string
}

type IssueOptions = {
  labels?: string
  since?: string
  sort?: string
  direction?: string
  state?: string
}

type Headers = {
  Authorization: string
}
