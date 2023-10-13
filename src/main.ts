import * as core from '@actions/core'
import * as glob from '@actions/glob'
import {promises as fs} from 'fs'
import * as xml2js from 'xml2js'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const apiVersion = core.getInput('api-version')

    core.debug(`Rewriting sfdx-project.json...`)
    const projectJsonGlobber = await glob.create('**/sfdx-project.json')

    for await (const projectJsonFile of projectJsonGlobber.globGenerator()) {
      core.debug(`Found sfdx-project.json at ${projectJsonFile}`)

      const fileData = await fs.readFile(projectJsonFile, 'utf-8')

      const projectJson = JSON.parse(fileData)
      projectJson.sourceApiVersion = `${apiVersion}.0`

      await fs.writeFile(projectJsonFile, JSON.stringify(projectJson, null, 2))
    }

    core.debug(`Rewriting meta.xml...`)

    const metadataXmlGlobber = await glob.create('./**/*-meta.xml')

    for await (const metadataXmlFile of metadataXmlGlobber.globGenerator()) {
      core.debug(`Found meta.xml at ${metadataXmlFile}`)

      const fileData = await fs.readFile(metadataXmlFile)

      const xmlJson = await xml2js.parseStringPromise(fileData)

      if (xmlJson.ApexClass) {
        xmlJson.ApexClass.apiVersion = `${apiVersion}.0`
      } else if (xmlJson.LightningComponentBundle) {
        xmlJson.LightningComponentBundle.apiVersion = `${apiVersion}.0`
      } else if (xmlJson.AuraDefinitionBundle) {
        xmlJson.AuraDefinitionBundle.apiVersion = `${apiVersion}.0`
      }

      await fs.writeFile(
        metadataXmlFile,
        new xml2js.Builder().buildObject(xmlJson)
      )
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
