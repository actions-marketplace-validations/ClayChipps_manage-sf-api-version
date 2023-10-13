import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import {globSync} from 'glob'
import * as xml2js from 'xml2js'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const apiVersion = core.getInput('api-version')

    core.debug(`Rewriting sfdx-project.json...`)

    const projectJsonFiles = globSync('./**/sfdx-project.json')

    for (const projectJsonFile of projectJsonFiles) {
      const filepath = path.normalize(path.join(process.cwd(), projectJsonFile))

      core.debug(`Found sfdx-project.json at ${filepath}`)

      fs.readFile(projectJsonFile, 'utf-8', (readError, data) => {
        if (readError) {
          throw new Error(readError?.message)
        }

        const projectJson = JSON.parse(data)
        projectJson.sourceApiVersion = `${apiVersion}.0`

        fs.writeFile(
          filepath,
          JSON.stringify(projectJson, null, 2),
          writeError => {
            if (writeError) {
              throw new Error(writeError?.message)
            }
          }
        )
      })
    }

    core.debug(`Rewriting meta.xml...`)

    const metadataXmlFiles = globSync('./**/*-meta.xml')

    for (const metadataXmlFile of metadataXmlFiles) {
      const filepath = path.normalize(path.join(process.cwd(), metadataXmlFile))

      core.debug(`Found meta.xml at ${filepath}`)

      fs.readFile(metadataXmlFile, (readError, data) => {
        if (readError) {
          throw new Error(readError?.message)
        }

        const parser = new xml2js.Parser({explicitArray: false})
        parser.parseString(data, (parseError, xmlJson) => {
          if (parseError) {
            throw new Error(parseError?.message)
          }

          if (xmlJson.ApexClass) {
            xmlJson.ApexClass.apiVersion = `${apiVersion}.0`
          } else if (xmlJson.LightningComponentBundle) {
            xmlJson.LightningComponentBundle.apiVersion = `${apiVersion}.0`
          } else if (xmlJson.AuraDefinitionBundle) {
            xmlJson.AuraDefinitionBundle.apiVersion = `${apiVersion}.0`
          }

          fs.writeFile(
            filepath,
            new xml2js.Builder().buildObject(xmlJson),
            writeError => {
              if (writeError) {
                throw new Error(writeError?.message)
              }
            }
          )
        })
      })
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}
