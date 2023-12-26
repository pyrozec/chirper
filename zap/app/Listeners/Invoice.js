'use strict'

const Mail = use('Mail');

class SendInvoiceNotification extends Listener {
  /**
   * Handle the event.
   */
  async handle(event) {
    // Access the invoice details from the event
    const invoice = event.data;

    // Implement logic to send the invoice notification via email
    try {
      // Send email using AdonisJS Mail Provider
      await Mail.send('emails.invoice_notification', { invoice }, (message) => {
        message
          .to(invoice.email)
          .from('your.email@gmail.com')
          .subject('Invoice Notification');
      });

      console.log('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
}

module.exports = SendInvoiceNotification;
