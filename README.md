GitHub Issues Notice
==

Notify slack the title of the specified repository and label issues on GAS.

<a href="https://github.com/linyows/github-issues-notice/actions" title="actions"><img src="https://img.shields.io/github/workflow/status/linyows/github-issues-notice/Build?style=for-the-badge"></a>
<a href="https://github.com/google/clasp" title="clasp"><img src="https://img.shields.io/badge/built%20with-clasp-4285f4.svg?style=for-the-badge"></a>
<a href="https://github.com/linyows/github-issues-notice/blob/master/LICENSE" title="MIT License"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge"></a>

Slack notification example is:

<img src="https://github.com/linyows/github-issues-notice/blob/master/misc/example.png" alt="example" width="400">

Usage
-----

1. Deploy this
    ```sh
    $ npm i
    $ npx clasp login
    $ npx clasp create 'GitHub Issues Notice' --rootDir ./src
    $ npx clasp push
    ```
1. Create google spreadsheet. For example:

    Enabled | Channel | Time           | Mention | Repository         | Label/Threshold/Message                                   | Stats | Idle Period | Add Relations | Only P/R | Label Protection
    ---     | ---     | ---            | ---     | ---                | ---                                                       | ---   | ---         | ---           | ---      | ---
    [x]     | general | 09<br>13<br>17 | @dev    | foo/bar<br>foo/baz | WIP/5/There are a lot of things in progress.              | [x]   | 60          | [x]           | [ ]      | [ ]
    [x]     | dev     | 13<br>1750     | @sre    | foo/abc            | needs-review/3/@techlead Please need review.<br>WIP/5/Yo. | [x]   | 45          | [ ]           | [x]      | [ ]
    [ ]     | ...     | ...            | ...     | ...                | ...                                                       | [ ]   |             | [ ]           | [ ]      | [x]
    - Sheet name is `config`
    - Config start 2nd row, 1st row is subject
1. Set script properties as ENV(File > Project properties > Script properties)
    - SLACK_ACCESS_TOKEN
    - GITHUB_ACCESS_TOKEN
    - SHEET_ID
    - GITHUB_API_ENDPOINT(optional)
1. Add project trigger(Edit > Current project's triggers > Add trigger)
    - Choose which function to run: `notify`
    - Which run at deployment: `head`
    - Select event source: `Time-driven`
    - Select type of time based trigger: `Minute timer`
    - Select hour interval: `Every minute`

Stats
--

Stats reports issues total count, pull-requests total count and reactive percent.
Reactive percent derives from `proactive` labeled issues and other issues count.
If no proactive labels, no reports.
By attaching `proactive` label to issues, it will be visible whether the work of
the team is healthy.

Idle Period
--

If there is a number of days in the Idle period, it will be automatically closed
if there are no issues or pulls that have not been updated over that number of days.
If you do not want to use this function, please set it to blank or 0.

Add Relations
--

Add relationship to notifications to Slack. Specifically, include assignees and reviewers.
If you use this option, you should set [code review assignments](https://docs.github.com/en/github/setting-up-and-managing-organizations-and-teams/managing-code-review-assignment-for-your-team) on Github.

Only P/R
--

The target of monitoring is only pull requests other than draft.

Label Protection
--

Closed Issue is also monitored for Issue label. This will notify you of any issues that have been accidentally closed.

Contribution
------------

1. Fork (https://github.com/linyows/github-issues-notice/fork)
1. Create a feature branch
1. Commit your changes
1. Rebase your local changes against the master branch
1. Run test suite with the `npm ci` command and confirm that it passes
1. Create a new Pull Request

Author
------

[linyows](https://github.com/linyows)
