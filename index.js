const moment = require('moment')
const validator = require('validator')
const Mailgun = require('./lib/mailgun.js')

const EMAIL_SUBJECT_PREFIX = process.env.WATCHMEN_MAILGUN_PREFIX || '[watchmen]'
const DEBOUNCE_TIME = process.env.WATCHMEN_MAILGUN_DEBOUNCE && parseInt(process.env.WATCHMEN_MAILGUN_DEBOUNCE, 10) || 30000; // 30s
const RECIPIENT_EMAIL = process.env.WATCHMEN_MAILGUN_RECIPIENT; // 30s

if(!RECIPIENT_EMAIL) {
    return console.error('No recipient is specified.');
}

const email_template = (title, outages, date) => `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Simple Transactional Email</title>
    <style>
    /* -------------------------------------
        INLINED WITH htmlemail.io/inline
    ------------------------------------- */
    /* -------------------------------------
        RESPONSIVE AND MOBILE FRIENDLY STYLES
    ------------------------------------- */
    @media only screen and (max-width: 620px) {
      table[class=body] h1 {
        font-size: 28px !important;
        margin-bottom: 10px !important;
      }
      table[class=body] p,
            table[class=body] ul,
            table[class=body] ol,
            table[class=body] td,
            table[class=body] span,
            table[class=body] a {
        font-size: 16px !important;
      }
      table[class=body] .wrapper,
            table[class=body] .article {
        padding: 10px !important;
      }
      table[class=body] .content {
        padding: 0 !important;
      }
      table[class=body] .container {
        padding: 0 !important;
        width: 100% !important;
      }
      table[class=body] .main {
        border-left-width: 0 !important;
        border-radius: 0 !important;
        border-right-width: 0 !important;
      }
      table[class=body] .btn table {
        width: 100% !important;
      }
      table[class=body] .btn a {
        width: 100% !important;
      }
      table[class=body] .img-responsive {
        height: auto !important;
        max-width: 100% !important;
        width: auto !important;
      }
    }

    /* -------------------------------------
        PRESERVE THESE STYLES IN THE HEAD
    ------------------------------------- */
    @media all {
      .ExternalClass {
        width: 100%;
      }
      .ExternalClass,
            .ExternalClass p,
            .ExternalClass span,
            .ExternalClass font,
            .ExternalClass td,
            .ExternalClass div {
        line-height: 100%;
      }
      .apple-link a {
        color: inherit !important;
        font-family: inherit !important;
        font-size: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
        text-decoration: none !important;
      }
      #MessageViewBody a {
        color: inherit;
        text-decoration: none;
        font-size: inherit;
        font-family: inherit;
        font-weight: inherit;
        line-height: inherit;
      }
      .btn-primary table td:hover {
        background-color: #34495e !important;
      }
      .btn-primary a:hover {
        background-color: #34495e !important;
        border-color: #34495e !important;
      }
    }
    </style>
  </head>
  <body class="" style="background-color: #f6f6f6; font-family: sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
    <table border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; background-color: #f6f6f6;">
      <tr>
        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;">&nbsp;</td>
        <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; Margin: 0 auto; max-width: 580px; padding: 10px; width: 580px;">
          <div class="content" style="box-sizing: border-box; display: block; Margin: 0 auto; max-width: 580px; padding: 10px;">

            <!-- START CENTERED WHITE CONTAINER -->
            <table class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; background: #ffffff; border-radius: 3px;">

              <!-- START MAIN CONTENT AREA -->
              <tr>
                <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;">
                  <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;">
                    <tr>
                      <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;">
                        <p style="font-family: sans-serif; font-size: 24px; font-weight: normal; margin: 0; Margin-bottom: 15px;">${title}</p>
                        <table border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; box-sizing: border-box;">
                          <tbody>
                                ${
                                    outages.map(outage => `<tr><td style="font-family: sans-serif; font-size: 16px; vertical-align: top; padding-bottom: 15px;">
                                      &bull; <strong>[${outage.service.group}]</strong> ${outage.service.name} (${date(outage.data)}).
                                    </td>
                                    <td style="font-family: sans-serif; font-size: 14px; vertical-align: top; padding-bottom: 15px;">
                                      <a href="${process.env.WATCHMEN_BASE_URL}/services/${outage.service.id}/view" style="background: #D44946; color: white; font-size: 12px; text-decoration: none; padding: 4px 10px; ">Details</a>
                                    </td></tr>`).join(' ')
                                }
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            <!-- END MAIN CONTENT AREA -->
            </table>

          <!-- END CENTERED WHITE CONTAINER -->
          </div>
        </td>
        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;">&nbsp;</td>
      </tr>
    </table>
  </body>
</html>
`;

const config = {
  from: process.env.WATCHMEN_MAILGUN_FROM,
  domain: process.env.WATCHMEN_MAILGUN_DOMAIN,
  api_key: process.env.WATCHMEN_MAILGUN_API_KEY
}

const debounce = (fn, time) => {
  let timeout;

  return function() {
    const functionCall = () => fn.apply(this, arguments);

    clearTimeout(timeout);
    timeout = setTimeout(functionCall, time);
  }
}

function sendNotificationIfPeopleSubscribed (options) {
  var rcpts = RECIPIENT_EMAIL;
  if (rcpts.length) {
    var mg = new Mailgun(config)
    options = {
      to: rcpts,
      title: options.title,
      body: options.body
    }
    mg.send(options, function (err, data) {
      if (err) {
        console.log('error sending notification')
        console.error(err)
      } else {
        console.log('notification sent successfully to ' + RECIPIENT_EMAIL)
      }
    })
  }
}


const debouncedProcessEvents = debounce(processOutageEvents, DEBOUNCE_TIME);

let currentOutages = {};
let currentBacks = {};

async function processOutageEvents() {
    const outages = Object.keys(currentOutages).map(k => currentOutages[k]);
    const backs = Object.keys(currentBacks).map(k => currentBacks[k]);

    if(outages.length) {
        sendNotificationIfPeopleSubscribed({
          title: EMAIL_SUBJECT_PREFIX + ` New ${outages.length} ${outages.length > 1 ? 'outages' : 'outage'}.`,
          body: email_template('🛑 New outages:', outages, (data) => moment(data.timestamp).format('llll'))
        })

        currentOutages = {};
    }

    if(backs.length) {
        sendNotificationIfPeopleSubscribed({
          title: EMAIL_SUBJECT_PREFIX + ` ${backs.length} ${backs.length > 1 ? ' services are back on-line.' : 'service is back on-line.'}`,
          body: email_template('✅ The following services are back on-line: ', backs, (data) => {
              const duration = moment.duration(Date.now() - data.timestamp);

              return `down for ${duration.humanize()}`;
          })
        })

        currentBacks = {};
    }
}

var eventHandlers = {

  /**
   * On a new outage
   * @param service
   * @param outage
   */

  onNewOutage: function (service, data) {
    currentOutages[service.id] = currentOutages[service.id] || {service, data};

    if(currentBacks[service.id]) { // if the service was back but it is outaged in the meantime
        currentBacks[service.id] = null;
        delete currentBacks[service.id];
    }

    debouncedProcessEvents();
  },

  /**
   * Service is back up online
   * @param service
   * @param lastOutage
   */

  onServiceBack: function (service, data) {
      if(currentOutages[service.id]) { // if the service was outaged but it is back in the meantime
          currentOutages[service.id] = null;
          delete currentOutages[service.id];
      }

      currentBacks[service.id] = currentBacks[service.id] || {service, data};

      debouncedProcessEvents();
  }

}

function getRecipients (service) {
  function parseEmailStringsToArray (commaSeparatedEmails) {
    var emails = (commaSeparatedEmails || '').split(',')
    return emails.map(function (s) { return s.trim() }).filter(function (i) { return validator.isEmail(i) })
  }
  return [...new Set([
      ...parseEmailStringsToArray(service.alertTo),
      ...parseEmailStringsToArray(process.env.WATCHMEN_NOTIFICATIONS_ALWAYS_ALERT_TO)
  ])]
}

function MailgunPlugin (watchmen) {
  watchmen.on('new-outage', eventHandlers.onNewOutage)
  watchmen.on('service-back', eventHandlers.onServiceBack)
}

exports = module.exports = MailgunPlugin
