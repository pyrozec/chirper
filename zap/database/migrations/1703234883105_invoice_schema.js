'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class InvoiceSchema extends Schema {
  up () {
    this.create('invoices', (table) => {
      table.increments();
      table.integer('client_id').unsigned().references('id').inTable('clients').onDelete('cascade');      
      table.string('username', 80).notNullable()
      table.string('cashtag', 20).notNullable()
      table.string('email', 254).notNullable()
      table.decimal('amount', 10, 2).notNullable();
      table.string('description').notNullable();
      table.date('due_date').notNullable();
      table.timestamps();
    });
  }

  down () {
    this.drop('invoices')
  }
}

module.exports = InvoiceSchema
