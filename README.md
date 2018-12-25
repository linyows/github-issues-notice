GitHub Issue Notice
==

<a href="https://travis-ci.org/linyows/github-issue-notice" title="travis"><img src="https://img.shields.io/travis/linyows/github-issue-notice.svg?style=for-the-badge"></a>
<a href="https://github.com/google/clasp" title="clasp"><img src="https://img.shields.io/badge/built%20with-clasp-4285f4.svg?style=for-the-badge"></a>
<a href="https://github.com/linyows/github-issue-notice/blob/master/LICENSE" title="MIT License"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge"></a>

Usage
-----

1. Deploy this
    ```sh
    $ npm i
    $ npx clasp login
    $ npx clasp create 'GitHub Issue Notice' --rootDir ./src
    $ npx clasp push
    ```
1. Create google spreadsheet
1. Set environments
    - SLACK_ACCESS_TOKEN
    - GITHUB_ACCESS_TOKEN
    - SHEET_ID
    - GITHUB_API_ENDPOINT(optional)
1. Add triger

Contribution
------------

1. Fork (https://github.com/linyows/github-issue-notice/fork)
1. Create a feature branch
1. Commit your changes
1. Rebase your local changes against the master branch
1. Run test suite with the `npm ci` command and confirm that it passes
1. Create a new Pull Request

Author
------

[linyows](https://github.com/linyows)
