'use strict'

const Mail = use('Mail');

class User {
  onUserRegister(user) {
    this.sendRegistrationEmail(user);
    // Add more event listeners if needed
  }

  async sendRegistrationEmail(user) {
    // Send registration email to the user
    await Mail.send('emails.welcome', { user }, (message) => {
      message
        .to(user.email)
        .from('service@chirper.com') // Set your email address here
        .subject('Welcome to Chirper Flashing App');
    });
  }
}

module.exports = User;