/**
 * GitHub issues notice
 *
 * Copyright (c) 2018 Tomohisa Oda
 */

interface IIssueOptions {
  labels?: string
  since?: string
  sort?: string
  direction?: string
}

/**
 * Github Client
 */
export class Github {
  private token: string
  private apiEndpoint: string

  private buildOptionUrl(opts: IIssueOptions): string {
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

  public issues(repo: string, opts?: IIssueOptions) {
    const defaultUrl = `${this.apiEndpoint}repos/${repo}/issues?per_page=100`
    const optionUrl = opts ? this.buildOptionUrl(opts) : ''
    const res = UrlFetchApp.fetch(`${defaultUrl}${optionUrl}`, {
      method: 'get',
      headers: this.headers
    })

    return JSON.parse(res.getContentText())
  }

  public closeIssue(repo: string, num: number) {
    const res = UrlFetchApp.fetch(`${this.apiEndpoint}repos/${repo}/issues/${num}`, {
      method: 'patch',
      headers: this.headers,
      payload: JSON.stringify({ state: 'closed' })
    })

    return res.getContentText()
  }

  public pulls(repo: string, opts?: IIssueOptions) {
    const defaultUrl = `${this.apiEndpoint}repos/${repo}/pulls?per_page=100`
    const optionUrl = opts ? this.buildOptionUrl(opts) : ''
    const res = UrlFetchApp.fetch(`${defaultUrl}${optionUrl}`, {
      method: 'get',
      headers: this.headers
    })

    return JSON.parse(res.getContentText())
  }
}
