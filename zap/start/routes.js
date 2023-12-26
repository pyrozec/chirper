'use strict'

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URL's and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use('Route')

Route.get('/','ClientController.index').as('index')
Route.get('/register','AuthController.registrationView').as('register.create')
Route.post('/register-store','AuthController.postRegister').as('register.store').validator('Register')
Route.get('/login','AuthController.loginView').as('login.create')
Route.post('/login-store','AuthController.postLogin').as('login.store')
Route.get('/view-client/:id','ClientController.show').as('view.client')
Route.get('/view-invoice/:id','InvoiceController.show').as('view.invoice')


Route.group(() => {
    Route.get('/create-client','ClientController.create').as('create.client')
    Route.post('/store-client','ClientController.store').as('store.client').validator('Client')
    Route.get('/view-client/:id', 'ClientController.show').as('view.client')
    Route.get('/edit-client/:id','ClientController.edit').as('edit.client')
    Route.post('/update-client/:id','ClientController.update').as('update.client')
    Route.get('/delete-client/:id','ClientController.destroy').as('delete.client')
}).middleware(['auth'])

Route.group(() => {
    Route.get('/invoices','InvoiceController.index').as('index')
    Route.get('/invoices/create-invoice/:id','InvoiceController.create').as('create.invoice')
    Route.post('/invoices/store-invoice','InvoiceController.store').as('store.invoice').validator('Invoice')
    Route.get('/invoices/edit-invoice/:id','InvoiceController.edit').as('edit.invoice')
    Route.get('/invoices/view-invoice/:id', 'InvoiceController.show').as('view.invoice')
    Route.post('/invoices/update-invoice/:id','InvoiceController.update').as('update.invoice')
    Route.get('/invoices/delete-invoice/:id','InvoiceController.destroy').as('delete.invoice')
}).middleware(['auth'])