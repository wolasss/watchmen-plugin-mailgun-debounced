exports = module.exports = Mailgun

function Mailgun (config) {
  this.config = config
}

Mailgun.prototype.checkConfiguration = function () {
  var err = 'invalid configuration for service Mailgun. Please fix it in config/notification-services/mailgun. missing field: '

  if (!this.config.from) { return err + '"from"' }

  if (!this.config.api_key) { return err + '"api_key"' }

  if (!this.config.domain) { return err + '"domain"' }
}

Mailgun.prototype.send = function (options, cb) {
  var errors = this.checkConfiguration()
  if (errors) {
    return cb(errors)
  }

  if (!options.to || !options.to.length || !options.title || !options.body) {
    errors = 'invalid options calling Mailgun'
    return cb(errors)
  }

  var mailgun = require('mailgun-js')({apiKey: this.config.api_key, domain: this.config.domain})

  var data = {
    from: this.config.from,
    to: options.to,
    subject: options.title,
    html: options.body
  }

  mailgun.messages().send(data, function (err, body) {
    cb(err, body)
  })
}
