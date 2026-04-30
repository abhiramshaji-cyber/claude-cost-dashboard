import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import { useStore } from '../store'
import { processRows } from '../utils'
import type { RawRow } from '../types'

export default function Upload() {
  const navigate = useNavigate()
  const setData = useStore(s => s.setData)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setLoading(true)
    setError('')
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, errors }) => {
        if (errors.length && !data.length) {
          setError('Failed to parse CSV.')
          setLoading(false)
          return
        }
        const processed = processRows(data)
        setData(processed, file.name)
        navigate('/overview')
      },
    })
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.csv')) handleFile(f)
    else setError('Please drop a .csv file.')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          width: 480,
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 16,
          padding: '64px 48px',
          textAlign: 'center',
          cursor: loading ? 'default' : 'pointer',
          background: dragging ? 'rgba(99,102,241,0.05)' : 'transparent',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          {loading ? 'Parsing…' : 'Drop your CSV here'}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
          claude_api_cost_*.csv
        </div>
        {!loading && (
          <div style={{
            display: 'inline-block',
            padding: '10px 28px',
            background: 'var(--accent)',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
          }}>
            Browse file
          </div>
        )}
        {error && (
          <div style={{ marginTop: 16, color: 'var(--red)', fontSize: 13 }}>{error}</div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>
    </div>
  )
}
