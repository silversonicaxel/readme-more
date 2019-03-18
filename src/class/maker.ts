import * as fs from 'fs'
import * as path from 'path'
import * as util from 'util'

export class Maker {
  private readDirAsync: Function
  private statAsync: Function
  private readFileAsync: Function
  private foldersToExlcude: string[] = ['node_modules', 'dist', '.git']
  private extensionToRead = '.md'

  constructor() {
    this.readDirAsync = util.promisify(fs.readdir)
    this.statAsync = util.promisify(fs.stat)
    this.readFileAsync = util.promisify(fs.readFile)
  }

  createReadmeMore(folder: string, ) {
    this.readFilesFromFolder(folder, this.updateReadmeFile);
  }

  async readFilesFromFolder(folder: string, onReadFilesFromFolder: Function): Promise<void> {
    let results: string[] = []

    try {
      const readFilesList: string[] = await this.readDirAsync(folder)
      let totalFilesToRead = readFilesList.length

      if (!totalFilesToRead) {
        return onReadFilesFromFolder(null, results)
      }

      readFilesList
        .map(async(baseNameReadFile: string) => {
          let readFile = baseNameReadFile
          readFile = path.resolve(folder, readFile)

          const stat = await this.statAsync(readFile)

          if (stat && stat.isDirectory()) {
            this.readFilesFromFolder(readFile, (readFilesFromFolderError: Error, readData: string[]) => {
              if (!this.foldersToExlcude.includes(baseNameReadFile)) {
                results = results.concat(readData)
              }

              if (!--totalFilesToRead) {
                onReadFilesFromFolder(null, results)
              }
            })
          } else {
            if (readFile.indexOf(this.extensionToRead) >= 0) {
              results.push(readFile)
            }

            if (!--totalFilesToRead) {
              onReadFilesFromFolder(null, results)
            }
          }
        })
    } catch (readFeatureFilesFromFolderError) {
      onReadFilesFromFolder(readFeatureFilesFromFolderError, [])
    }
  }

  async readReadmeFile(file: string): Promise<string> {
    try {
      return await this.readFileAsync(file, 'utf8')

    } catch (readContentFeatureFileError) {
      return ''
    }
  }

  async updateReadmeFile(readError: Error, readFiles: string[]): Promise<void> {
    if (readError) {
      console.error(readError)
      process.exit(1)
      return
    }

    console.log(readFiles)
  }
}
