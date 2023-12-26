'use strict'

const Client = use('App/Models/Client');

class ClientController {
  async index({ view }) {
    const clients = await Client.all();
    return view.render('index', { 
     clients: clients.toJSON() 
    });
  }

  async create({ view }) {
    return view.render('client.create-client');
  }

  async store({ request, response, session }) {
    const client = await Client.create({
      name: request.input('name'),
      email: request.input('email'),
      cash_tag: request.input('cashtag'),
      phone: request.input('phone')
    })
      session.flash({ successmessage: 'Client enrolled successfully!' });
      return response.redirect('/');
    }


  async show({ params, view }) {
    const client = await Client.find(params.id);
    return view.render('client.view-client', { 
     client: client.toJSON() 
    });
  }

  async edit({ params, view }) {
    const client = await Client.find(params.id);
    return view.render('client.edit-client', { 
     client: client.toJSON() 
    });
  }

  async update({ params, request, response, session }) {
    const client = await Client.find(params.id);
      client.name = request.input('name'),
      client.email = request.input('email'),
      client.cash_tag = request.input('cashtag'),
      client.phone = request.input('phone')

      await client.save();
      session.flash({ successmessage: 'Client updated successfully!' });
      return response.route('/');
    }
  

  async destroy({ params, response, session }) {
    const client = await Client.find(params.id);
    await client.delete();
    session.flash({ successmessage: 'Client deleted successfully!' });

    return response.redirect('/');
  }
}


module.exports = ClientController;