'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
// app/Models/Client.js

const Model = use('Model');

class Client extends Model {
  static get table() {
    return 'clients';
  }

  static get primaryKey() {
    return 'id';
  }

  // Define the fields of the client
  static get fillable() {
    return ['name', 'email', 'cash_tag', 'phone'];
  }

  // Define relationships
  invoices() {
    return this.belongsTo('App/Models/Invoice');
  }
}


module.exports = Client;
