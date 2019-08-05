const lib = require('lib')({
  token: process.env.STDLIB_SECRET_TOKEN
});

const { getReviewRequest } = require('../../../../helpers');

/**
* An HTTP endpoint that acts as a webhook for GitHub pull_request review_request_removed event
* When a request for review is removed, delete the reminder in Slack and the record from Airtable
* @param {object} event
* @returns {any}
*/
module.exports = async event => {
  let pullRequestId = event.number;
  let repository = event.repository.full_name;
  let githubUsername = event.requested_reviewer.login;

  let reviewRequest = await getReviewRequest({ pullRequestId, repository, githubUsername });
  if (!reviewRequest) {
    throw new Error(
      `Could not find a review request for "${githubUsername}" in "${repository}" for pull request number ${pullRequestId}.`
    );
  }

  await lib.airtable.records['@0.2.1'].destroy({
    table: 'Review Requests',
    id: reviewRequest.id
  });

  await lib.slack.messages['@0.4.5'].destroy({
    id: reviewRequest.fields.Reviewer['Slack Id'],
    ts: reviewRequest.fields['Last Reminder']
  });

  return;
};
