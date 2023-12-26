'use strict'

const { Command } = require('@adonisjs/ace')
const { promisify } = require('util')
const exec = promisify(require('child_process').exec)
const fs = require('fs')
const path = require('path')

class GenerateResource extends Command {
  static get signature () {
    return 'make:resource {name: Name of the resource}'
  }

  static get description () {
    return 'Generate a full CRUD resource (controller, model, migration, views)'
  }

  async handle (args, options) {
    const resourceName = args.name

    // Generate Model
    await this.generateModel(resourceName)
    
    // Generate Validator
    await this.generateValidator(resourceName)

    // Generate Controller
    await this.generateController(resourceName)

    // Generate Views
    await this.generateViews(resourceName)

    this.success(`Resource ${this.chalk.cyan(resourceName)} generated successfully ✔`)
  }

  async generateModel (name) {
    const modelCommand = `adonis make:model ${name} -m`
    await this.runCommand(modelCommand)
  }
  
  async generateValidator(name) {
    const validatorCommand = `adonis make:validator ${name}`
    await this.runCommand(validatorCommand)
  }

  async generateController (name) {
    const controllerCommand = `adonis make:controller ${name} --type http`
    await this.runCommand(controllerCommand)
  }

  async generateViews (name) {
    const viewsPath = path.join('resources', 'views', name.toLowerCase())
    if (!fs.existsSync(viewsPath)) {
      fs.mkdirSync(viewsPath)
    }

    // You can customize the view files based on your project structure and needs
    const viewFiles = [`index.edge`, `create-${name}.edge`, `edit-${name}.edge`, `view-${name}.edge`]

    viewFiles.forEach(async (view) => {
      const viewContent = `<!-- ${name} ${view} view -->`
      const viewFilePath = path.join(viewsPath, view)
      fs.writeFileSync(viewFilePath, viewContent)
    })
  }

  async runCommand (command) {
    try {
      await exec(command)
    } catch (error) {
      this.error(`Error running command: ${this.chalk.grey(command)}\n${error.message}`)
    }
  }
}

module.exports = GenerateResource