/**
 * GitHub issues notice
 *
 * Copyright (c) 2018 Tomohisa Oda
 */

import {GithubIssuesNotice} from './github-issues-notice'

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
