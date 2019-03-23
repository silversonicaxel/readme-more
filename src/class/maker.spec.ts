import { Maker } from './maker'
import { assert, createSandbox, spy } from 'sinon'
import * as util from 'util'
import * as fs from 'fs'
import { expect } from 'chai'
import * as path from 'path'

describe('#Maker', () => {
  let maker: Maker
  let sandboxSet: any

  const baseFolder = 'bf'
  const docsFolder = 'df'
  const docsSection = 'Section'
  const documents = [
    '/one/FILE.md',
    '/two/FILE2.md'
  ]
  const summaryDocuments = [
    '* [FILE](one/FILE.md)',
    '* [FILE2](two/FILE2.md)'
  ]
  let executeWhenRead: Function

  beforeEach(() => {
    maker = new Maker()
    sandboxSet = createSandbox()
  })

  afterEach(() => {
    sandboxSet.restore()
  })

  describe('#constructor', () => {
    it('should setup promisify functionalities', () => {
      const promisifyStub = sandboxSet.stub(util, 'promisify')
      const scopedMaker = new Maker()

      assert.calledWith(promisifyStub, fs.readdir)
      assert.calledWith(promisifyStub, fs.stat)
    })
  })

  describe('#applySummaryMore', () => {
    it('should initialize folders in use', () => {
      sandboxSet.stub(maker, 'readSummaryFile')
      sandboxSet.stub(maker, 'readFilesFromFolder')
      maker.applySummaryMore(baseFolder, docsFolder, docsSection)

      expect(maker['summaryFileFolder']).to.equal(path.resolve(baseFolder))
    })

    it('should read summary file with no error', async () => {
      const readSummaryFileStub = sandboxSet.stub(maker, 'readSummaryFile').returns('Some content')
      sandboxSet.stub(maker, 'readFilesFromFolder')
      const consoleStub = sandboxSet.stub(console, 'error')
      const processStub = sandboxSet.stub(process, 'exit')

      await maker.applySummaryMore(baseFolder, docsFolder, docsSection)

      assert.calledOnce(readSummaryFileStub)
      assert.calledWith(readSummaryFileStub, `${baseFolder}/${maker['summaryFileName']}`)
      assert.notCalled(consoleStub)
      assert.notCalled(processStub)
    })

    it('should read summary file with an error', async () => {
      const readSummaryFileStub = sandboxSet.stub(maker, 'readSummaryFile').returns('')
      sandboxSet.stub(maker, 'readFilesFromFolder')
      const consoleStub = sandboxSet.stub(console, 'error')
      const processStub = sandboxSet.stub(process, 'exit')

      await maker.applySummaryMore(baseFolder, docsFolder, docsSection)

      assert.calledOnce(readSummaryFileStub)
      assert.calledWith(readSummaryFileStub, `${baseFolder}/${maker['summaryFileName']}`)
      assert.calledOnce(consoleStub)
      assert.calledWith(consoleStub, maker['errorNoSummaryFile'])
      assert.calledOnce(processStub)
      assert.calledWith(processStub, 1)
    })

    it('should initialize section', async () => {
      sandboxSet.stub(maker, 'readSummaryFile').returns('Some content')
      sandboxSet.stub(maker, 'readFilesFromFolder')
      await maker.applySummaryMore(baseFolder, docsFolder, docsSection)

      expect(maker['summaryFileSection']).to.equal(docsSection)
    })

    it('should read documents from folder', async () => {
      sandboxSet.stub(maker, 'readSummaryFile').returns('Some content')
      const readFilesFromFolderStub = sandboxSet.stub(maker, 'readFilesFromFolder')
      await maker.applySummaryMore(baseFolder, docsFolder, docsSection)

      assert.calledOnce(readFilesFromFolderStub)
      assert.calledWith(readFilesFromFolderStub, maker['summaryDocumentationFolder'], maker['updateSummaryFile'])
    })
  })

  describe('#readFilesFromFolder', () => {
    beforeEach(() => {
      executeWhenRead = () => { }
    })

    it('should read the initial folder', async () => {
      await maker['readFilesFromFolder'](docsFolder, executeWhenRead)

      expect(maker).to.respondTo('readDirAsync')
      expect(fs).to.respondTo('readdir')
    })

    it('should read folders recursively', async () => {
      await maker['readFilesFromFolder'](docsFolder, executeWhenRead)

      expect(path).to.respondTo('resolve')
      expect(maker).to.respondTo('statAsync')
      expect(maker).to.respondTo('readFilesFromFolder')
    })

    it('should manage error without thrown exception if folders does not exist', async () => {
      let readFilesFromFolderError

      try {
        await maker['readFilesFromFolder']('./not-existing-folder', executeWhenRead)
      } catch (error) {
        readFilesFromFolderError = error
      }

      expect(readFilesFromFolderError).to.equal(undefined)
    })
  })

  describe('#readSummaryFile', async () => {
    it('should read summary file', async () => {
      const file = './somefile.md'
      const expectedFileContent = 'Bla bla bla'
      const readFileAsyncStub = sandboxSet.stub(maker, 'readFileAsync').returns(expectedFileContent)

      const fileContent = await maker['readSummaryFile'](file)

      assert.calledOnce(readFileAsyncStub)
      assert.calledWith(readFileAsyncStub, file, 'utf8')
      expect(fileContent).to.equal(expectedFileContent)
    })

    it('should return an error', async () => {
      const file = './somefile.md'
      const readFileAsyncStub = sandboxSet.stub(maker, 'readFileAsync').yields('readError')

      const fileContent = await maker['readSummaryFile'](file)

      assert.calledOnce(readFileAsyncStub)
      assert.calledWith(readFileAsyncStub, file, 'utf8')
      expect(fileContent).to.equal('')
    })
  })

  describe('#writeSummaryFile', async () => {
    it('should write summary file', async () => {
      const file = './somefile.md'
      const fileContent = 'Text'
      const expectedIsWriteCorrect = true
      const writeFileAsyncStub = sandboxSet.stub(maker, 'writeFileAsync').returns(expectedIsWriteCorrect)

      const isWriteCorrect = await maker['writeSummaryFile'](file, fileContent)

      assert.calledOnce(writeFileAsyncStub)
      assert.calledWith(writeFileAsyncStub, file, fileContent, 'utf8')
      expect(isWriteCorrect).to.equal(expectedIsWriteCorrect)
    })

    it('should return an error', async () => {
      const file = './somefile.md'
      const fileContent = 'Text'
      const expectedIsWriteCorrect = false
      const writeFileAsyncStub = sandboxSet.stub(maker, 'writeFileAsync').yields('writeError')

      const isWriteCorrect = await maker['writeSummaryFile'](file, fileContent)

      assert.calledOnce(writeFileAsyncStub)
      assert.calledWith(writeFileAsyncStub, file, fileContent, 'utf8')
      expect(isWriteCorrect).to.equal(expectedIsWriteCorrect)
    })
  })

  describe('#updateSummaryFile', () => {
    it('should return an reading error', () => {
      const consoleStub = sandboxSet.stub(console, 'error')
      const processStub = sandboxSet.stub(process, 'exit')
      const readError = new Error('readError')

      maker['updateSummaryFile'](readError, documents)

      assert.calledOnce(consoleStub)
      assert.calledWith(consoleStub, maker['errorWrongFolder'])
      assert.calledOnce(processStub)
      assert.calledWith(processStub, 1)
    })

    it('should return an missing files error', () => {
      const consoleStub = sandboxSet.stub(console, 'error')
      const processStub = sandboxSet.stub(process, 'exit')
      const emptyError = <unknown>null

      maker['updateSummaryFile'](<Error>emptyError, [])

      assert.calledOnce(consoleStub)
      assert.calledWith(consoleStub, maker['errorNoMoreFiles'])
      assert.calledOnce(processStub)
      assert.calledWith(processStub, 1)
    })

    it('should handle the summary content', () => {
      const handleSummaryContentStub = sandboxSet.stub(maker, 'handleSummaryContent')
      const rowsSummary = ['A', 'B']
      sandboxSet.stub(maker, 'getRowsFromFileContent').returns(rowsSummary)
      const emptyError = <unknown>null
      maker['summaryFileContent'] = 'A\nB\nC\n'

      maker['updateSummaryFile'](<Error>emptyError, documents)

      assert.calledOnce(handleSummaryContentStub)
      assert.calledWith(handleSummaryContentStub, rowsSummary, summaryDocuments)
    })
  })

  describe('#getRowsFromFileContent', () => {
    it('should return rows from file content', () => {
      const fileContent = 'A\nB'
      const expectedRows = ['A', 'B']

      const rows = maker['getRowsFromFileContent'](fileContent)

      expect(rows).to.deep.equal(expectedRows)
    })
  })

  describe('#getContentFromRows', () => {
    it('should return file content from rows', () => {
      const rows = ['A', 'B']
      const expectedFileContent = 'A\nB'

      const fileContent = maker['getContentFromRows'](rows)

      expect(fileContent).to.deep.equal(expectedFileContent)
    })
  })

  describe('#checkExistingSection', () => {
    it('should return true if a line represents a provided section', () => {
      maker['summaryFileSection'] = 'Section'

      const isExistingSection = maker['checkExistingSection']('### Section', 2)

      expect(isExistingSection).to.equal(true)
    })

    it('should update section index if section exists', () => {
      maker['summaryFileSection'] = 'Section'
      const currentIndex = 3
      maker['checkExistingSection']('### Section', currentIndex)

      expect(maker['existingSectionIndex']).to.equal(currentIndex + 1)
    })

    it('should return false if a line does not represent a provided section', () => {
      maker['summaryFileSection'] = 'Section'

      const isExistingSection = maker['checkExistingSection']('### Wrong section', 2)

      expect(isExistingSection).to.equal(false)
    })
  })

  describe('#checkExistingNextSection', () => {
    it('should return true if a line represents the next section compared to the provided section', () => {
      maker['existingSectionIndex'] = 2
      maker['existingSectionNextIndex'] = 0
      const anotherIndex = maker['existingSectionIndex'] + 3

      const isExistingNextSection = maker['checkExistingNextSection']('### Another Section', anotherIndex)

      expect(isExistingNextSection).to.equal(true)
    })

    it('should update next section index if next section exists', () => {
      maker['existingSectionIndex'] = 2
      maker['existingSectionNextIndex'] = 0
      const anotherIndex = maker['existingSectionIndex'] + 3

      maker['checkExistingNextSection']('### Another Section', anotherIndex)

      expect(maker['existingSectionNextIndex']).to.equal(anotherIndex - 1)
    })

    it('should return false if a line does not represents the next section becasue it is not a section', () => {
      maker['existingSectionIndex'] = 2
      maker['existingSectionNextIndex'] = 0
      const anotherIndex = maker['existingSectionIndex'] + 3

      const isExistingNextSection = maker['checkExistingNextSection']('Some text not section title', anotherIndex)

      expect(isExistingNextSection).to.equal(false)
    })

    it('should return false if a line does not represents the next section becasue there is already a next section', () => {
      maker['existingSectionIndex'] = 2
      maker['existingSectionNextIndex'] = 4
      const anotherIndex = maker['existingSectionIndex'] + 3

      const isExistingNextSection = maker['checkExistingNextSection']('### Another Section', anotherIndex)

      expect(isExistingNextSection).to.equal(false)
    })

    it('should return false if a line does not represents the next section becasue it is a previous current section index', () => {
      maker['existingSectionIndex'] = 5
      maker['existingSectionNextIndex'] = 0
      const anotherIndex = maker['existingSectionIndex'] - 2

      const isExistingNextSection = maker['checkExistingNextSection']('### Another Section', anotherIndex)

      expect(isExistingNextSection).to.equal(false)
    })
  })

  describe('#removeExistingSection', () => {
    const checkedIndex = 5
    it('should return true if current index is lower than existing begin section index', () => {
      maker['existingSectionIndex'] = checkedIndex + 1
      maker['existingSectionNextIndex'] = checkedIndex + 5
      const isRemovable = maker['removeExistingSection']('Text', checkedIndex)
      expect(isRemovable).to.equal(true)
    })

    it('should return true if current index is bigger than existing end section index', () => {
      maker['existingSectionIndex'] = checkedIndex - 2
      maker['existingSectionNextIndex'] = checkedIndex - 1
      const isRemovable = maker['removeExistingSection']('Text', checkedIndex)
      expect(isRemovable).to.equal(true)
    })

    it('should return false if current index is in the section indexes', () => {
      maker['existingSectionIndex'] = checkedIndex - 1
      maker['existingSectionNextIndex'] = checkedIndex + 1
      const isRemovable = maker['removeExistingSection']('Text', checkedIndex)
      expect(isRemovable).to.equal(false)
    })
  })
})
