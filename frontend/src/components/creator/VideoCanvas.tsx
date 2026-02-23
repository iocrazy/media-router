import { useState, useRef } from 'react'
import { Stage, Layer, Text, Rect } from 'react-konva'
import type Konva from 'konva'
import CanvasToolbar from './CanvasToolbar'

interface CanvasElement {
  id: string
  type: 'text' | 'sticker' | 'shape'
  x: number
  y: number
  text?: string
  fontSize?: number
  fill?: string
  width?: number
  height?: number
}

interface VideoCanvasProps {
  width: number
  height: number
}

let nextId = 1

export default function VideoCanvas({ width, height }: VideoCanvasProps) {
  const [elements, setElements] = useState<CanvasElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const stageRef = useRef<Konva.Stage>(null)

  const addElement = (el: Omit<CanvasElement, 'id'>) => {
    const id = `el_${nextId++}`
    setElements((prev) => [...prev, { ...el, id }])
    setSelectedId(id)
  }

  const handleAddText = () => {
    addElement({
      type: 'text',
      x: width / 2 - 40,
      y: height / 2 - 12,
      text: '双击编辑',
      fontSize: 24,
      fill: '#FFFFFF',
    })
  }

  const handleAddSticker = () => {
    addElement({
      type: 'sticker',
      x: width / 2 - 16,
      y: height / 2 - 16,
      text: '⭐',
      fontSize: 40,
    })
  }

  const handleAddShape = () => {
    addElement({
      type: 'shape',
      x: width / 2 - 30,
      y: height / 2 - 30,
      width: 60,
      height: 60,
      fill: 'rgba(255,255,255,0.3)',
    })
  }

  const handleAddImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      addElement({
        type: 'sticker',
        x: width / 2 - 30,
        y: height / 2 - 30,
        text: '🖼️',
        fontSize: 48,
      })
    }
    input.click()
  }

  const handleDelete = () => {
    if (selectedId) {
      setElements((prev) => prev.filter((el) => el.id !== selectedId))
      setSelectedId(null)
    }
  }

  const handleDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    setElements((prev) =>
      prev.map((el) =>
        el.id === id ? { ...el, x: e.target.x(), y: e.target.y() } : el,
      ),
    )
  }

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Canvas */}
      <div className="px-4">
        <div
          className="relative rounded-lg overflow-hidden bg-black/20"
          style={{ width, height }}
        >
          <Stage
            ref={stageRef}
            width={width}
            height={height}
            onClick={handleStageClick}
            onTap={handleStageClick}
          >
            <Layer>
              {elements.map((el) => {
                if (el.type === 'text' || el.type === 'sticker') {
                  return (
                    <Text
                      key={el.id}
                      x={el.x}
                      y={el.y}
                      text={el.text}
                      fontSize={el.fontSize}
                      fill={el.fill || '#FFFFFF'}
                      draggable
                      onClick={() => setSelectedId(el.id)}
                      onTap={() => setSelectedId(el.id)}
                      onDragEnd={(e) => handleDragEnd(el.id, e)}
                      shadowColor={selectedId === el.id ? '#3B82F6' : undefined}
                      shadowBlur={selectedId === el.id ? 10 : 0}
                      shadowOpacity={selectedId === el.id ? 0.8 : 0}
                    />
                  )
                }
                if (el.type === 'shape') {
                  return (
                    <Rect
                      key={el.id}
                      x={el.x}
                      y={el.y}
                      width={el.width}
                      height={el.height}
                      fill={el.fill}
                      draggable
                      onClick={() => setSelectedId(el.id)}
                      onTap={() => setSelectedId(el.id)}
                      onDragEnd={(e) => handleDragEnd(el.id, e)}
                      stroke={selectedId === el.id ? '#3B82F6' : undefined}
                      strokeWidth={selectedId === el.id ? 2 : 0}
                      cornerRadius={4}
                    />
                  )
                }
                return null
              })}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Toolbar */}
      <CanvasToolbar
        onAddText={handleAddText}
        onAddSticker={handleAddSticker}
        onAddImage={handleAddImage}
        onAddShape={handleAddShape}
        onDelete={handleDelete}
        hasSelection={!!selectedId}
      />

      {elements.length === 0 && (
        <p className="text-xs text-gray-400 text-center">
          使用上方工具添加元素到画布，可自由拖拽调整位置
        </p>
      )}
    </div>
  )
}
