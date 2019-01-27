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

  public get headers(): any {
    return {
      Authorization: `token ${this.token}`
    }
  }

  public issues(repo: string, labels: string) {
    const res = UrlFetchApp.fetch(`${this.apiEndpoint}repos/${repo}/issues?per_page=100&labels=${labels}`, {
      method: 'get',
      headers: this.headers
    })

    return JSON.parse(res.getContentText())
  }
}
