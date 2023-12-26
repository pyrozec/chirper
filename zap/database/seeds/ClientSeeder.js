'use strict'

/*
|--------------------------------------------------------------------------
| ClientSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory')

class ClientSeeder {
  async run () {
    await Factory.model('App/Models/Client').createMany(50); // Change the number as needed
  }
}

module.exports = ClientSeeder
