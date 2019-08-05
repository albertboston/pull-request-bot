const lib = require('lib')({
  token: process.env.STDLIB_SECRET_TOKEN
});

const { getReviewRequest } = require('../../../../helpers');

/**
* An HTTP endpoint that acts as a webhook for GitHub pull_request_review submitted event
* When a review is submitted, update the "Submitted At" field in Airtable and delete the reminder in Slack
* @param {object} event
* @returns {any}
*/
module.exports = async event => {
  let pullRequestId = event.pull_request.number;
  let repository = event.repository.full_name;
  let githubUsername = event.review.user.login;

  let reviewRequest = await getReviewRequest({ pullRequestId, repository, githubUsername });
  if (!reviewRequest) {
    throw new Error(
      `Could not find a review request for "${githubUsername}" in "${repository}" for pull request number ${pullRequestId}.`
    );
  }

  await lib.airtable.query['@0.2.2'].update({
    table: 'Review Requests',
    where: {
      Id: reviewRequest.fields.Id
    },
    fields: {
      'Submitted At': new Date().toISOString()
    }
  });

  await lib.slack.messages['@0.4.5'].destroy({
    id: reviewRequest.fields.Reviewer['Slack Id'],
    ts: reviewRequest.fields['Last Reminder']
  });

  return;
};
