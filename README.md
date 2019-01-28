GitHub Issues Notice
==

Notify slack the title of the specified repository and label issues on GAS.

<a href="https://travis-ci.org/linyows/github-issues-notice" title="travis"><img src="https://img.shields.io/travis/linyows/github-issues-notice.svg?style=for-the-badge"></a>
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

    Enabled | Channel | Time           | Mention | Repository         | Label/Threshold/Message                                   | Stats
    ---     | ---     | ---            | ---     | ---                | ---                                                       | ---
    [x]     | general | 09<br>13<br>17 | @dev    | foo/bar<br>foo/baz | WIP/5/There are a lot of things in progress.              | 1
    [x]     | dev     | 13<br>1750     | @sre    | foo/abc            | needs-review/3/@techlead Please need review.<br>WIP/5/Yo. | 2
    [ ]     | ...     | ...            | ...     | ...                | ...                                                       | 0
    - Sheet name is `config`
    - Config start 2nd row, 1st row is subject
    - Stats column is coefficient number(No stats if zero)
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
