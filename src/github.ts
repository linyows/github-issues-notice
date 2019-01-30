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
    const optionUrl = opts ? `&labels=${opts.labels}&direction=${opts.direction || 'created'}&sort=${opts.sort || 'desc'}` : ''
    const res = UrlFetchApp.fetch(`${defaultUrl}${optionUrl}`, {
      method: 'get',
      headers: this.headers
    })

    return JSON.parse(res.getContentText())
  }

  public closeIssue(repo: string, id: number) {
    const res = UrlFetchApp.fetch(`${this.apiEndpoint}repos/${repo}/issues/${id}`, {
      method: 'patch',
      headers: this.headers,
      payload: { state: 'closed' }
    })

    return JSON.parse(res.getContentText())
  }

  public pulls(repo: string, opts?: IIssueOptions) {
    const defaultUrl = `${this.apiEndpoint}repos/${repo}/pulls?per_page=100`
    const optionUrl = opts ? `&labels=${opts.labels}&direction=${opts.direction || 'created'}&sort=${opts.sort || 'desc'}` : ''
    const res = UrlFetchApp.fetch(`${defaultUrl}${optionUrl}`, {
      method: 'get',
      headers: this.headers
    })

    return JSON.parse(res.getContentText())
  }
}
