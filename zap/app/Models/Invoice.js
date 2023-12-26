'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Invoice extends Model {
  static get table() {
    return 'invoices';
  }

  static get primaryKey() {
    return 'id';
  }

  // Define the fields of the invoice
  static get fillable() {
    return ['username', 'cashtag', 'email', 'amount', 'description', 'due_date'];
  }

  // Define relationships
  client() {
    return this.belongsTo('App/Models/Client');
  }
}

module.exports = Invoice;