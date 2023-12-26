'use strict'

const User = use('App/Models/User')
const Event = use('Event')

class AuthController {
    loginView({ view }) {
        return view.render('auth.login')
    }

    registrationView({ view }) {
        return view.render('auth.register')
    }

    async postLogin({ request, auth, response}) {
        await auth.attempt(request.input('email'), request.input('password'))
        return response.route('index')
    }

    async postRegister({ request, session, response }) {
        const user = await User.create({
            username: request.input('name'),
            email: request.input('email'),
            password: request.input('password')
        })
        await Event.fire('user::register', user);

        session.flash({ successmessage: 'User have been created successfully'})
        return response.route('login.create');
    }

    async logout ({ auth, response }) {
        await auth.logout()
        return response.route('/')
    }
}

module.exports = AuthController
