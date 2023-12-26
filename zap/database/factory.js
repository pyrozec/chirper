'use strict'

/*
|--------------------------------------------------------------------------
| Factory
|--------------------------------------------------------------------------
|
| Factories are used to define blueprints for database tables or Lucid
| models. Later you can use these blueprints to seed your database
| with dummy data.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
// const Factory = use('Factory')

// Factory.blueprint('App/Models/User', (faker) => {
//   return {
//     username: faker.username()
//   }
// })

const Factory = use('Factory');

Factory.blueprint('App/Models/Client', (faker) => {
  const cashTagPrefix = faker.word({ length: 5 }).toLowerCase();
  const cashTagSuffix = faker.string({ length: 6, alpha: true, numeric: true }).toLowerCase();

  const formattedPhoneNumber = `+1 (${faker.integer({ min: 200, max: 999 })}) ${faker.integer({
    min: 100,
    max: 999,
  })}-${faker.integer({ min: 1000, max: 9999 })}`;

  return {
    name: faker.username(),
    email: faker.email(),
    cash_tag: `$${cashTagPrefix}${cashTagSuffix}`,
    phone: formattedPhoneNumber, // Generating an unformatted US phone number
  };
});
