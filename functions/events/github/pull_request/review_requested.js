const lib = require('lib')({
  token: process.env.STDLIB_SECRET_TOKEN
});

const { createReminderAttachments } = require('../../../../helpers');

/**
* An HTTP endpoint that acts as a webhook for GitHub pull_request review_request event
* @param {object} event
* @returns {any}
*/
module.exports = async event => {
  let requestedReviewerUsername = event.requested_reviewer.login;

  let reviewer = await lib.airtable.query['@0.2.2']
    .select({
      table: 'Reviewers',
      where: {
        'GitHub Username': requestedReviewerUsername
      }
    })
    .then(results => results.rows.pop());

  if (!reviewer) {
    throw new Error(`"${requestedReviewerUsername}" not found in Reviewers table.`);
  }

  let pullRequestId = event.number;
  let pullRequestUrl = event.pull_request.html_url;
  let pullRequestTitle = event.pull_request.title;
  let pullRequestOpener = event.pull_request.user.login;
  let pullRequestOpenerURL = event.pull_request.user.html_url;

  let repository = event.repository.full_name;
  let repositoryURL = event.repository.html_url;

  let message = await lib.slack.messages['@0.4.5'].create({
    id: reviewer.fields['Slack Id'],
    as_user: true,
    attachments: createReminderAttachments({
      pullRequestId,
      pullRequestOpener,
      pullRequestOpenerURL,
      pullRequestTitle,
      pullRequestUrl,
      repository,
      repositoryURL
    })
  });

  await lib.airtable.query['@0.2.2'].insert({
    table: 'Review Requests',
    fields: {
      'Pull Request Id': pullRequestId,
      Opener: pullRequestOpener,
      Reviewer: [reviewer.id],
      Repository: repository,
      'Last Reminder': message.ts,
      'Pull Request Title': pullRequestTitle
    }
  });

  return;
};
