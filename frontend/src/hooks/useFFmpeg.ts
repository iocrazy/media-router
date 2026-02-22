import { useState, useRef, useCallback } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'

export type FFmpegStatus = 'idle' | 'loading' | 'ready' | 'processing' | 'error'

const CORE_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'

/**
 * Determines the output file extension from an input filename.
 * Falls back to .mp4 if none is detected.
 */
function getExtension(filename: string): string {
  const match = filename.match(/\.([a-zA-Z0-9]+)$/)
  return match ? `.${match[1]}` : '.mp4'
}

/**
 * Builds a chain of atempo filters for audio speed adjustment.
 * FFmpeg's atempo filter only supports values in [0.5, 2.0], so speeds
 * outside that range need to be broken into chained filters.
 */
function buildAtempoFilters(speed: number): string {
  const filters: string[] = []
  let remaining = speed

  if (remaining > 2.0) {
    while (remaining > 2.0) {
      filters.push('atempo=2.0')
      remaining /= 2.0
    }
    filters.push(`atempo=${remaining}`)
  } else if (remaining < 0.5) {
    while (remaining < 0.5) {
      filters.push('atempo=0.5')
      remaining /= 0.5
    }
    filters.push(`atempo=${remaining}`)
  } else {
    filters.push(`atempo=${speed}`)
  }

  return filters.join(',')
}

export function useFFmpeg() {
  const [status, setStatus] = useState<FFmpegStatus>('idle')
  const [progress, setProgress] = useState(0)
  const ffmpegRef = useRef<FFmpeg | null>(null)

  const load = useCallback(async () => {
    if (ffmpegRef.current?.loaded) {
      setStatus('ready')
      return
    }

    setStatus('loading')

    try {
      const ffmpeg = new FFmpeg()

      ffmpeg.on('progress', ({ progress: p }) => {
        setProgress(Math.max(0, Math.min(1, p)))
      })

      const coreURL = await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.js`,
        'text/javascript',
      )
      const wasmURL = await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.wasm`,
        'application/wasm',
      )

      await ffmpeg.load({ coreURL, wasmURL })

      ffmpegRef.current = ffmpeg
      setStatus('ready')
    } catch (err) {
      console.error('Failed to load FFmpeg:', err)
      setStatus('error')
    }
  }, [])

  /**
   * Returns the loaded FFmpeg instance, or throws if not ready.
   */
  const getFFmpeg = useCallback((): FFmpeg => {
    const ffmpeg = ffmpegRef.current
    if (!ffmpeg || !ffmpeg.loaded) {
      throw new Error('FFmpeg is not loaded. Call load() first.')
    }
    return ffmpeg
  }, [])

  /**
   * Shared helper: writes input, runs exec, reads output, returns Blob.
   * Sets status to 'processing' during work, back to 'ready' after.
   */
  const runOperation = useCallback(
    async (
      inputFile: File,
      inputName: string,
      outputName: string,
      args: string[],
    ): Promise<Blob | null> => {
      const ffmpeg = getFFmpeg()

      setStatus('processing')
      setProgress(0)

      try {
        await ffmpeg.writeFile(inputName, await fetchFile(inputFile))
        const exitCode = await ffmpeg.exec(args)

        if (exitCode !== 0) {
          console.error(`FFmpeg exited with code ${exitCode}`)
          setStatus('ready')
          return null
        }

        const data = await ffmpeg.readFile(outputName)
        // readFile returns FileData (Uint8Array | string); cast for Blob compat
        const blob = new Blob([data as BlobPart], { type: inputFile.type || 'video/mp4' })

        // Clean up virtual filesystem
        await ffmpeg.deleteFile(inputName)
        await ffmpeg.deleteFile(outputName)

        setStatus('ready')
        return blob
      } catch (err) {
        console.error('FFmpeg operation failed:', err)
        setStatus('ready')
        return null
      }
    },
    [getFFmpeg],
  )

  const trim = useCallback(
    async (
      inputFile: File,
      startTime: number,
      endTime: number,
    ): Promise<Blob | null> => {
      const ext = getExtension(inputFile.name)
      const inputName = `input${ext}`
      const outputName = `output${ext}`

      return runOperation(inputFile, inputName, outputName, [
        '-ss', String(startTime),
        '-to', String(endTime),
        '-i', inputName,
        '-c', 'copy',
        outputName,
      ])
    },
    [runOperation],
  )

  const changeSpeed = useCallback(
    async (inputFile: File, speed: number): Promise<Blob | null> => {
      const ext = getExtension(inputFile.name)
      const inputName = `input${ext}`
      const outputName = `output${ext}`

      const videoPts = `setpts=${(1 / speed).toFixed(4)}*PTS`
      const audioFilter = buildAtempoFilters(speed)

      return runOperation(inputFile, inputName, outputName, [
        '-i', inputName,
        '-filter:v', videoPts,
        '-filter:a', audioFilter,
        outputName,
      ])
    },
    [runOperation],
  )

  const addText = useCallback(
    async (
      inputFile: File,
      text: string,
      fontSize: number,
      color: string,
    ): Promise<Blob | null> => {
      const ext = getExtension(inputFile.name)
      const inputName = `input${ext}`
      const outputName = `output${ext}`

      // Escape special characters for the drawtext filter
      const escapedText = text
        .replace(/\\/g, '\\\\\\\\')
        .replace(/'/g, "\\\\'")
        .replace(/:/g, '\\\\:')

      const drawtext = [
        `text='${escapedText}'`,
        `fontsize=${fontSize}`,
        `fontcolor=${color}`,
        'x=(w-text_w)/2',
        'y=h-text_h-40',
      ].join(':')

      return runOperation(inputFile, inputName, outputName, [
        '-i', inputName,
        '-vf', `drawtext=${drawtext}`,
        outputName,
      ])
    },
    [runOperation],
  )

  const applyFilter = useCallback(
    async (inputFile: File, filterName: string): Promise<Blob | null> => {
      const ext = getExtension(inputFile.name)
      const inputName = `input${ext}`
      const outputName = `output${ext}`

      const filterMap: Record<string, string> = {
        grayscale: 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3',
        warm: 'colortemperature=6500',
        cool: 'colortemperature=3500',
        vintage: 'curves=vintage',
        vivid: 'eq=saturation=1.5:contrast=1.1',
      }

      const filterValue = filterMap[filterName]
      if (!filterValue) {
        console.error(`Unknown filter: ${filterName}`)
        return null
      }

      return runOperation(inputFile, inputName, outputName, [
        '-i', inputName,
        '-vf', filterValue,
        outputName,
      ])
    },
    [runOperation],
  )

  const concat = useCallback(
    async (files: File[]): Promise<Blob | null> => {
      if (files.length === 0) return null

      const ffmpeg = getFFmpeg()
      setStatus('processing')
      setProgress(0)

      try {
        // Write all input files to the virtual FS
        const fileEntries: string[] = []
        for (let i = 0; i < files.length; i++) {
          const ext = getExtension(files[i].name)
          const name = `input_${i}${ext}`
          await ffmpeg.writeFile(name, await fetchFile(files[i]))
          fileEntries.push(`file '${name}'`)
        }

        // Write the concat demuxer file list
        const concatList = fileEntries.join('\n')
        await ffmpeg.writeFile('filelist.txt', concatList)

        const ext = getExtension(files[0].name)
        const outputName = `output${ext}`

        const exitCode = await ffmpeg.exec([
          '-f', 'concat',
          '-safe', '0',
          '-i', 'filelist.txt',
          '-c', 'copy',
          outputName,
        ])

        if (exitCode !== 0) {
          console.error(`FFmpeg concat exited with code ${exitCode}`)
          setStatus('ready')
          return null
        }

        const data = await ffmpeg.readFile(outputName)
        const blob = new Blob([data as BlobPart], { type: files[0].type || 'video/mp4' })

        // Clean up virtual filesystem
        for (let i = 0; i < files.length; i++) {
          const ext2 = getExtension(files[i].name)
          await ffmpeg.deleteFile(`input_${i}${ext2}`)
        }
        await ffmpeg.deleteFile('filelist.txt')
        await ffmpeg.deleteFile(outputName)

        setStatus('ready')
        return blob
      } catch (err) {
        console.error('FFmpeg concat failed:', err)
        setStatus('ready')
        return null
      }
    },
    [getFFmpeg],
  )

  return {
    status,
    progress,
    load,
    trim,
    changeSpeed,
    addText,
    applyFilter,
    concat,
  }
}
