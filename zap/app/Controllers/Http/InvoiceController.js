'use strict'


const Invoice = use('App/Models/Invoice');
const Client = use('App/Models/Client');

class InvoiceController {
  async index({ view }) {
  const invoices = await Invoice.all()
    return view.render('invoice._partial.index', { 
      invoices: invoices.toJSON() 
    });
  }

  async create({ view, params }) {
    const client = await Client.findOrFail(params.id)
    return view.render('invoice.create-invoice', {
      client: client.toJSON()
    })
  }

  async store({ request, response, session }) {
    // Create a new invoice for the client
    const invoice = await Invoice.create({
      username: request.input('name'),
      cashtag: request.input('cashtag'),
      email: request.input('email'),
      amount: request.input('amount'),
      description: request.input('description'),
      due_date: request.input('due_date')
    })

      session.flash({ successmessage: 'Deposit created successfully!' });
      return response.redirect('/invoices')
    }


  async show({ params, view }) {
    const invoice = await Invoice.find(params.id);
    return view.render('invoice.view-invoice', { 
      invoice: invoice.toJSON() 
    })
  }

  async edit({ params, view }) {
    const invoice = await Invoice.find(params.id);
    return view.render('invoice.edit-invoice', { 
      invoice: invoice.toJSON()
    })
  }

  async update({ params, request, response, session }) {
    const invoice = await Invoice.find(params.id);
    invoice.username = request.input('name'),
    invoice.cashtag = request.input('cashtag'),
    invoice.email = request.input('email'),
    invoice.amount = request.input('amount'),
    invoice.description = request.input('description'),
    invoice.due_date = request.input('due_date')
      await invoice.save();
      session.flash({ successmessage: 'Deposit updated successfully!' });
      return response.redirect('/invoices')
    }

  async destroy({ params, response, session }) {
    const invoice = await Invoice.find(params.id);
    await invoice.delete();
    session.flash({ successmessage: 'Deposit deleted successfully!' });
    return response.redirect('/invoices')
  }
}

module.exports = InvoiceController;
