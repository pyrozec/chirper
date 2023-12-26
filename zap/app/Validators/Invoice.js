'use strict';

class Invoice {
  get rules() {
    return {
      amount: 'required|number|above:0',
      description: 'required|string|max:225',
      due_date: 'required|date',
    };
  }

  get messages() {
    return {
      'amount.required': 'Amount is required',
      'amount.number': 'Amount must be a number',
      'amount.above': 'Amount must be greater than 0',
      'description.required': 'Description is required',
      'description.string': 'Description must be a word',
      'description.max': 'Description must be less than 225 characters',
      'due_date.required': 'Due date is required',
      'due_date.date': 'Invalid due date format',
    };
  }
}

module.exports = Invoice;