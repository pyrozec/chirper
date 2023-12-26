
'use strict';

class Client {
  get rules() {
    return {
      name: 'required|string|max:255',
      email: 'required|email|unique:clients,email',
      phone: 'string|max:20',
    };
  }

  get messages() {
    return {
      'name.required': 'Client name is required',
      'name.string': 'Invalid client name format',
      'name.max': 'Client name must not exceed 255 characters',
      'email.required': 'Client email is required',
      'email.email': 'Invalid email format',
      'email.unique': 'Email address is already in use',
      'phone.string': 'Invalid phone number format',
      'phone.max': 'Phone number must not exceed 20 characters',
    };
  }
}

module.exports = Client;
