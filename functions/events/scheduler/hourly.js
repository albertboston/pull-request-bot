const lib = require('lib')({
  token: process.env.STDLIB_SECRET_TOKEN
});

const { joinReviewers, createReminderAttachments } = require('../../../helpers');

/**
* An HTTP endpoint that acts as a webhook for Scheduler hourly event
* @returns {any}
*/
module.exports = async () => {
  let reviewRequests = await lib.airtable.query['@0.2.2']
    .select({
      table: 'Review Requests',
      where: {
        'Submitted At__is_null': true
      }
    })
    .then(results => joinReviewers(results.rows));

  for (let reviewRequest of reviewRequests) {
    await sendReminder(reviewRequest).catch(console.error);
  }

  return;
};

async function sendReminder (reviewRequest) {
  let { ts } = await lib.slack.messages['@0.4.5'].create({
    id: reviewRequest.fields.Reviewer['Slack Id'],
    as_user: true,
    attachments: createReminderAttachments({
      pullRequestId: reviewRequest.fields['Pull Request Id'],
      pullRequestOpener: reviewRequest.fields['Opener'],
      pullRequestOpenerURL: reviewRequest.fields['Opener URL'],
      pullRequestTitle: reviewRequest.fields['Pull Request Title'],
      pullRequestUrl: reviewRequest.fields['Pull Request URL'],
      repository: reviewRequest.fields.Repository,
      repositoryURL: reviewRequest.fields['Repository URL']
    })
  });

  // Update Last Reminder field
  await lib.airtable.query['@0.2.2'].update({
    table: 'Review Requests',
    where: {
      Id: reviewRequest.fields.Id
    },
    fields: {
      'Last Reminder': ts
    }
  });

  // Remove previous reminder
  await lib.slack.messages['@0.4.5'].destroy({
    id: reviewRequest.fields.Reviewer['Slack Id'],
    ts: reviewRequest.fields['Last Reminder']
  });

  return;
}
