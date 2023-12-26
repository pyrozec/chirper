
'use strict';

const Schema = use('Schema');

class ClientSchema extends Schema {
  up() {
    this.create('clients', (table) => {
      table.increments();
      table.string('name', 255).notNullable();
      table.string('email', 255).unique().notNullable();
      table.string('cash_tag', 20).unique().notNullable();
      table.string('phone', 20);
      table.timestamps();
    });
  }

  down() {
    this.drop('clients');
  }
}

module.exports = ClientSchema;
