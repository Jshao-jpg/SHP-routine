import React, { useState, useEffect, useMemo, useRef } from 'react'
import axios from 'axios'
import { Plus, Trash2, Upload, RefreshCw, ArrowDown, FileText, ChevronDown, ChevronUp, CheckCircle, Check } from 'lucide-react'
import './index.css'

// ComboBox component - input with dropdown arrow
function ComboBox({ value, options, onChange, placeholder }) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (opt) => {
        onChange(opt)
        setIsOpen(false)
    }

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                    type="text"
                    className="field-input"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder || '输入或选择...'}
                    style={{ flex: 1, paddingRight: '2rem' }}
                />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#64748b'
                    }}
                >
                    <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </button>
            </div>
            {isOpen && options && options.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 100,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '0.25rem'
                }}>
                    {options.map((opt, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleSelect(opt)}
                            style={{
                                padding: '0.5rem 0.75rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                background: value === opt ? '#f1f5f9' : 'transparent',
                                borderBottom: idx < options.length - 1 ? '1px solid #f1f5f9' : 'none'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                            onMouseLeave={(e) => e.target.style.background = value === opt ? '#f1f5f9' : 'transparent'}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function App() {
    const [routeOptions, setRouteOptions] = useState({})
    const [selectedNodes, setSelectedNodes] = useState([])
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(false)
    const [logs, setLogs] = useState([])
    const [showLogs, setShowLogs] = useState(false)
    const [currentFile, setCurrentFile] = useState('Built-in Template')
    const [fileMessage, setFileMessage] = useState('')
    const fileInputRef = useRef(null)

    useEffect(() => {
        fetchRoutes()
    }, [])

    const fetchRoutes = async () => {
        try {
            const res = await axios.get('/api/routes')
            setRouteOptions(res.data)
        } catch (err) {
            console.error("Error fetching routes", err)
        }
    }

    const allPossibleLocations = useMemo(() => {
        const locs = new Set()
        Object.values(routeOptions).forEach(opt => {
            opt.locations.forEach(l => locs.add(l))
        })
        return Array.from(locs).sort()
    }, [routeOptions])

    // Map state
    const [mapEditMode, setMapEditMode] = useState(false)
    const [draggingId, setDraggingId] = useState(null)
    const [boxPositions, setBoxPositions] = useState(() => {
        const saved = localStorage.getItem('map_box_positions')
        return saved ? JSON.parse(saved) : {}
    })
    const [boxLabels, setBoxLabels] = useState(() => {
        const saved = localStorage.getItem('map_box_labels')
        return saved ? JSON.parse(saved) : {}
    })
    const [boxMerges, setBoxMerges] = useState(() => {
        const saved = localStorage.getItem('map_box_merges')
        return saved ? JSON.parse(saved) : {}
    })

    const saveMapConfig = () => {
        localStorage.setItem('map_box_positions', JSON.stringify(boxPositions))
        localStorage.setItem('map_box_labels', JSON.stringify(boxLabels))
        localStorage.setItem('map_box_merges', JSON.stringify(boxMerges))
        setMapEditMode(false)
        alert('地图配置已成功保存到本地缓存 ✅')
    }

    const resetMapConfig = () => {
        if (confirm('是否重置地图布局和合并设置？')) {
            localStorage.removeItem('map_box_positions')
            localStorage.removeItem('map_box_labels')
            localStorage.removeItem('map_box_merges')
            window.location.reload()
        }
    }

    // Help function to map a location string to a box ID
    const getLocationBoxId = (loc, nodeType) => {
        if (!loc) return 'Unknown'
        const upperLoc = loc.toUpperCase()

        // 1. Specific Request Mappings
        if (upperLoc.includes('TURKEY')) return boxMerges['Vendor'] || 'Vendor'
        if (upperLoc.includes('SENSATA') || upperLoc.includes('MEXICO')) return boxMerges['Customer-Others'] || 'Customer-Others'
        if (upperLoc.includes('BATAM')) return boxMerges['Giken'] || 'Giken'

        // 2. Standard grouping logic
        let baseId = loc
        if (upperLoc.includes('WADG')) baseId = 'WADG'
        else if (upperLoc.includes('WAHL') || upperLoc.includes('WAHK')) baseId = 'WAHL'
        else if (upperLoc.includes('VENDOR') || upperLoc.includes('CHINA') || upperLoc.includes('HK')) baseId = 'Vendor'
        else if (upperLoc.includes('DYSON') || (upperLoc.includes('CUSTOMER') && nodeType === 'A')) baseId = 'Customer-Dyson'
        else if (upperLoc.includes('OTHERS') || upperLoc.includes('CUSTOMER')) baseId = 'Customer-Others'
        else if (upperLoc.includes('GIKEN')) baseId = 'Giken'

        // 3. Apply dynamic merges recursively (simple level)
        return boxMerges[baseId] || baseId
    }

    // Generate connections and boxes
    const mapData = useMemo(() => {
        const boxesMap = new Map()
        const connections = []
        const nodeKeys = Object.keys(routeOptions).sort()

        // Standard boxes definitions
        const standardBoxes = [
            { id: 'Vendor', defaultLabel: 'Vendor', x: 80, y: 350 },
            { id: 'WADG', defaultLabel: 'WADG', x: 280, y: 60 },
            { id: 'WAHL', defaultLabel: 'WAHL', x: 280, y: 230 },
            { id: 'Customer-Dyson', defaultLabel: 'Customer-Dyson', x: 880, y: 50 },
            { id: 'Customer-Others', defaultLabel: 'Customer others', x: 880, y: 160 },
            { id: 'Giken', defaultLabel: 'Giken', x: 650, y: 310 },
        ]

        standardBoxes.forEach(b => {
            // Only add if it's not merged into something else
            if (!boxMerges[b.id]) boxesMap.set(b.id, { ...b, isStandard: true })
        })

        nodeKeys.forEach(node => {
            const opt = routeOptions[node]
            if (!opt.details?.length) return

            // We use the first detail row to define the map connection for this node
            const d = opt.details[0]
            const fromBoxId = getLocationBoxId(d.from, node)
            const toBoxId = getLocationBoxId(d.to, node)

            // Ensure boxes exist
            if (!boxesMap.has(fromBoxId)) boxesMap.set(fromBoxId, { id: fromBoxId, defaultLabel: fromBoxId, x: 500, y: 350, isStandard: false })
            if (!boxesMap.has(toBoxId)) boxesMap.set(toBoxId, { id: toBoxId, defaultLabel: toBoxId, x: 600, y: 350, isStandard: false })

            connections.push({
                node,
                from: fromBoxId,
                to: toBoxId,
                bidirectional: node === 'E'
            })
        })

        return {
            boxes: Array.from(boxesMap.values()),
            connections
        }
    }, [routeOptions, boxMerges])

    // Initialize positions and labels
    useEffect(() => {
        const newPositions = { ...boxPositions }
        const newLabels = { ...boxLabels }
        let changed = false

        mapData.boxes.forEach(box => {
            if (!newPositions[box.id]) { newPositions[box.id] = { x: box.x, y: box.y }; changed = true; }
            if (!newLabels[box.id]) { newLabels[box.id] = box.defaultLabel; changed = true; }
        })

        if (changed) {
            setBoxPositions(newPositions)
            setBoxLabels(newLabels)
        }
    }, [mapData.boxes])

    // Improved Dragging Logic
    const handlePointerDown = (e, id) => {
        if (!mapEditMode) return
        setDraggingId(id)
        e.target.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e) => {
        if (!draggingId) return
        const svg = e.currentTarget
        const rect = svg.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 1000
        const y = ((e.clientY - rect.top) / rect.height) * 420

        setBoxPositions(prev => ({
            ...prev,
            [draggingId]: { x: Math.round(x), y: Math.round(y) }
        }))
    }

    const handlePointerUp = (e) => {
        if (!draggingId) return

        // Merge logic on overlap
        const dropPos = boxPositions[draggingId]
        const otherBox = mapData.boxes.find(b => {
            if (b.id === draggingId) return false
            const pos = boxPositions[b.id]
            if (!pos) return false
            const dist = Math.sqrt(Math.pow(pos.x - dropPos.x, 2) + Math.pow(pos.y - dropPos.y, 2))
            return dist < 50 // Threshold for merger
        })

        if (otherBox) {
            const dragName = boxLabels[draggingId] || draggingId
            const targetName = boxLabels[otherBox.id] || otherBox.id
            if (confirm(`是否将方框 "${dragName}" 合并到 "${targetName}"？`)) {
                setBoxMerges(prev => ({ ...prev, [draggingId]: otherBox.id }))
                // Optional: ask user for a new name for the merged target
                const newName = prompt(`请输入合并后方框的新名称:`, targetName)
                if (newName) setBoxLabels(prev => ({ ...prev, [otherBox.id]: newName }))
            }
        }

        setDraggingId(null)
    }

    const renameBox = (id) => {
        const current = boxLabels[id] || id
        const newName = prompt("Enter new name for this box:", current)
        if (newName !== null) setBoxLabels(prev => ({ ...prev, [id]: newName }))
    }


    const addNode = () => {
        const newNode = {
            id: Date.now(),
            node: '',
            location: '',
            fields: [],
            inputs: {},
            from: '',
            to: '',
            breakdown: null
        }
        setSelectedNodes([...selectedNodes, newNode])
    }

    const removeNode = (id) => {
        setSelectedNodes(selectedNodes.filter(n => n.id !== id))
    }

    const handleNodeChange = async (id, nodeName) => {
        const newNodes = [...selectedNodes]
        const idx = newNodes.findIndex(n => n.id === id)
        newNodes[idx].node = nodeName

        if (newNodes[idx].location && !routeOptions[nodeName]?.locations.includes(newNodes[idx].location)) {
            newNodes[idx].location = ''
            newNodes[idx].from = ''
            newNodes[idx].to = ''
            newNodes[idx].fields = []
            newNodes[idx].inputs = {}
        } else if (newNodes[idx].location) {
            updateFields(id, nodeName, newNodes[idx].location)
        }
        setSelectedNodes(newNodes)
    }

    const handleLocationChange = async (id, locationStr) => {
        const newNodes = [...selectedNodes]
        const idx = newNodes.findIndex(n => n.id === id)
        newNodes[idx].location = locationStr

        if (locationStr) {
            const parts = locationStr.split(' -> ')
            newNodes[idx].from = parts[0]?.trim() || ''
            newNodes[idx].to = parts[1]?.trim() || ''

            if (!newNodes[idx].node) {
                const possible = Object.keys(routeOptions).filter(n => routeOptions[n].locations.includes(locationStr))
                if (possible.length === 1) {
                    newNodes[idx].node = possible[0]
                }
            }
        } else {
            newNodes[idx].from = ''
            newNodes[idx].to = ''
        }

        if (newNodes[idx].node && locationStr) {
            updateFields(id, newNodes[idx].node, locationStr)
        } else {
            newNodes[idx].fields = []
            newNodes[idx].inputs = {}
        }
        setSelectedNodes(newNodes)
    }

    const updateFields = async (nodeId, node, location) => {
        try {
            const res = await axios.post('/api/fields', { node, location })
            const newNodes = [...selectedNodes]
            const idx = newNodes.findIndex(n => n.id === nodeId)
            newNodes[idx].fields = res.data
            newNodes[idx].inputs = {}
            setSelectedNodes(newNodes)
        } catch (err) {
            console.error("Error fetching fields", err)
        }
    }

    const handleInputChange = (nodeId, fieldName, value) => {
        const newNodes = [...selectedNodes]
        const idx = newNodes.findIndex(n => n.id === nodeId)
        newNodes[idx].inputs[fieldName] = value
        setSelectedNodes(newNodes)
    }

    const handleFileUpload = async (event) => {
        const file = event.target.files[0]
        if (!file) return
        const formData = new FormData()
        formData.append('file', file)
        try {
            await axios.post('/api/upload', formData)
            setCurrentFile(file.name)
            setFileMessage(`已加载自定义文件: ${file.name}`)
            setTimeout(() => setFileMessage(''), 5000)
            fetchRoutes()
            setSelectedNodes([])
            setResults(null)
        } catch (err) { alert("Upload failed") }
    }

    const loadBuiltin = async () => {
        try {
            await axios.post('/api/load-builtin')
            setCurrentFile('Built-in Template')
            setFileMessage('已加载内置模板')
            setTimeout(() => setFileMessage(''), 5000)
            fetchRoutes()
            setSelectedNodes([])
            setResults(null)
        } catch (err) { alert("Failed to restore") }
    }

    const downloadBuiltin = async () => {
        try {
            const response = await axios.get('/api/download-builtin', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', '5.shipping cost based on summary.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("Download failed");
        }
    }

    const calculate = async () => {
        setLoading(true)
        setLogs([])
        try {
            const payload = selectedNodes.map(n => ({
                node: n.node,
                location: n.location,
                inputs: n.inputs
            }))
            const res = await axios.post('/api/calculate', payload)
            setResults(res.data)
            setLogs(res.data.logs || [])
            setShowLogs(true)

            const updatedNodes = [...selectedNodes]

            // If calculation failed or total cost is 0, show empty breakdown
            if (!res.data.node_results || res.data.total_cost === 0) {
                updatedNodes.forEach(node => {
                    node.breakdown = { base: [], variable: [] }
                })
            } else {
                // Update breakdown for successful calculations
                res.data.node_results.forEach((nr, idx) => {
                    if (updatedNodes[idx]) {
                        updatedNodes[idx].breakdown = nr.breakdown || { base: [], variable: [] }
                    }
                })
            }

            setSelectedNodes(updatedNodes)
        } catch (err) {
            console.error(err)
            // On error, show empty breakdown
            const clearedNodes = selectedNodes.map(n => ({ ...n, breakdown: { base: [], variable: [] } }))
            setSelectedNodes(clearedNodes)
        } finally { setLoading(false) }
    }

    // Check if two sections can be connected (one's end connects to another's start)
    const validateSequence = (idx) => {
        if (idx === 0) return { valid: true }
        const prev = selectedNodes[idx - 1]
        const curr = selectedNodes[idx]

        // If either doesn't have from/to set yet, consider valid
        if (!prev.from && !prev.to) return { valid: true }
        if (!curr.from && !curr.to) return { valid: true }

        // Two sections are connected if:
        // - prev.to === curr.from (prev's end connects to curr's start) OR
        // - curr.to === prev.from (curr's end connects to prev's start - reverse order)
        const prevTo = prev.to?.toUpperCase()
        const prevFrom = prev.from?.toUpperCase()
        const currTo = curr.to?.toUpperCase()
        const currFrom = curr.from?.toUpperCase()

        if (prevTo === currFrom || currTo === prevFrom) {
            return { valid: true }
        }

        return { valid: false, msg: `Not connected: endpoints don't match` }
    }

    // Get active locations for highlighting both ends
    const getActiveLocations = () => {
        const locations = new Set()
        selectedNodes.forEach(n => {
            if (n.from) locations.add(n.from.toUpperCase())
            if (n.to) locations.add(n.to.toUpperCase())
        })
        return locations
    }

    const activeLocations = getActiveLocations()
    const isLocationActive = (loc) => activeLocations.has(loc.toUpperCase())

    return (
        <div className="container">
            <header>
                <h1>Ship Route Cost & LT System</h1>
                <div className="subtitle">Automatic sorting and calculation of shipping routes</div>
            </header>

            <div className="controls-bar">
                <button className="btn-icon glass" onClick={() => fileInputRef.current.click()}>
                    <Upload size={18} /> Load custom modification table
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-icon glass" onClick={loadBuiltin}>
                        <RefreshCw size={18} /> Restore Built-in
                    </button>
                    <button className="btn-icon glass" onClick={downloadBuiltin} title="Download the current active Excel template">
                        <FileText size={18} /> Download Template
                    </button>
                </div>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx,.xls" onChange={handleFileUpload} />
            </div>

            {/* File loading message */}
            {fileMessage && (
                <div className="file-message glass">
                    <CheckCircle size={18} color="#10b981" />
                    <span>{fileMessage}</span>
                </div>
            )}

            {/* Current file indicator */}
            <div style={{ textAlign: 'center', marginBottom: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
                当前使用: <strong>{currentFile}</strong>
            </div>

            <div className="map-container glass" style={{ position: 'relative' }}>
                {/* Map Control Buttons */}
                <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', gap: '8px', zIndex: 10 }}>
                    {mapEditMode && (
                        <>
                            <button
                                onClick={resetMapConfig}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #fca5a5',
                                    background: '#fef2f2',
                                    color: '#b91c1c',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <RefreshCw size={12} style={{ marginRight: '4px' }} /> 重置
                            </button>
                            <button
                                onClick={saveMapConfig}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #34d399',
                                    background: '#ecfdf5',
                                    color: '#047857',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <Check size={12} style={{ marginRight: '4px' }} /> 确认保存
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setMapEditMode(!mapEditMode)}
                        style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '0.5rem',
                            border: mapEditMode ? '2px solid #0ea5e9' : '1px solid #cbd5e1',
                            background: mapEditMode ? '#e0f2fe' : '#fff',
                            color: mapEditMode ? '#0369a1' : '#64748b',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        {mapEditMode ? '✓ 编辑中...' : '🔒 进入编辑'}
                    </button>
                </div>

                <svg
                    viewBox="0 0 1000 420"
                    className="map-svg"
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    style={{ touchAction: 'none' }}
                >
                    <defs>
                        {/* Smaller and sharper arrow markers */}
                        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                            <path d="M 0 0 L 8 4 L 0 8 Z" fill="#64748b" />
                        </marker>
                        <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                            <path d="M 0 0 L 8 4 L 0 8 Z" fill="#0ea5e9" />
                        </marker>
                    </defs>

                    {/* Layer 1: Connection lines (background) */}
                    {mapData.connections.map((conn, idx) => {
                        const fromPos = boxPositions[conn.from] || { x: 0, y: 0 }
                        const toPos = boxPositions[conn.to] || { x: 0, y: 0 }
                        const isActive = selectedNodes.some(n => n.node === conn.node)

                        const fromLabel = boxLabels[conn.from] || conn.from
                        const toLabel = boxLabels[conn.to] || conn.to
                        const fromW = Math.max(80, Math.min(150, (fromLabel?.length || 0) * 8 + 20))
                        const toW = Math.max(80, Math.min(150, (toLabel?.length || 0) * 8 + 20))

                        const dx = toPos.x - fromPos.x
                        const dy = toPos.y - fromPos.y
                        const angle = Math.atan2(dy, dx)

                        // Multi-line bundle logic to prevent overlap at same target
                        const targetBundle = mapData.connections.filter(c => c.to === conn.to)
                        const bundleIdx = targetBundle.indexOf(conn)
                        const bundleCount = targetBundle.length
                        const offsetStep = 12
                        const bundleOffset = bundleCount > 1 ? (bundleIdx - (bundleCount - 1) / 2) * offsetStep : 0

                        // Precise edge detection function
                        const getEdgePos = (boxCenter, boxW, boxH, targetCenter, isTo, offset = 0) => {
                            const localDX = targetCenter.x - boxCenter.x
                            const localDY = targetCenter.y - boxCenter.y
                            const hw = boxW / 2
                            const hh = boxH / 2

                            // Hit horizontal side or vertical side?
                            const useHorizontal = Math.abs(localDX) / hw > Math.abs(localDY) / hh
                            let edgeX, edgeY

                            if (useHorizontal) {
                                edgeX = localDX > 0 ? hw : -hw
                                edgeY = (localDY * edgeX) / localDX
                                if (isTo) edgeY += offset
                            } else {
                                edgeY = localDY > 0 ? hh : -hh
                                edgeX = (localDX * edgeY) / localDY
                                if (isTo) edgeX += offset
                            }

                            return { x: boxCenter.x + edgeX, y: boxCenter.y + edgeY }
                        }

                        if (conn.bidirectional) {
                            // Specialized logic for Node E (Symmetric parallel lines)
                            const shift = 10
                            const pX = -Math.sin(angle) * shift
                            const pY = Math.cos(angle) * shift

                            const edgeFrom = getEdgePos(fromPos, fromW, 40, toPos, false)
                            const edgeTo = getEdgePos(toPos, toW, 40, fromPos, true)

                            // Check active direction for E (WADG -> WAHL vs WAHL -> WADG)
                            const isActiveDown = selectedNodes.some(n => {
                                if (n.node !== 'E' || !n.location) return false
                                const parts = n.location.split('->').map(s => s.trim())
                                return getLocationBoxId(parts[0], 'E') === conn.from && getLocationBoxId(parts[1], 'E') === conn.to
                            })
                            const isActiveUp = selectedNodes.some(n => {
                                if (n.node !== 'E' || !n.location) return false
                                const parts = n.location.split('->').map(s => s.trim())
                                return getLocationBoxId(parts[0], 'E') === conn.to && getLocationBoxId(parts[1], 'E') === conn.from
                            })

                            return (
                                <g key={`${conn.node}-${idx}`}>
                                    {/* Direction 1: From -> To (e.g. WADG->WAHL) */}
                                    <path
                                        d={`M ${edgeFrom.x - pX} ${edgeFrom.y - pY} L ${edgeTo.x - pX} ${edgeTo.y - pY}`}
                                        markerEnd={`url(#arrow${isActiveDown ? '-active' : ''})`}
                                        className={`map-line ${isActiveDown ? 'active' : ''}`}
                                        style={{ strokeWidth: 2 }}
                                    />
                                    {/* Direction 2: To -> From (e.g. WAHL->WADG) */}
                                    <path
                                        d={`M ${edgeTo.x + pX} ${edgeTo.y + pY} L ${edgeFrom.x + pX} ${edgeFrom.y + pY}`}
                                        markerEnd={`url(#arrow${isActiveUp ? '-active' : ''})`}
                                        className={`map-line ${isActiveUp ? 'active' : ''}`}
                                        style={{ strokeWidth: 2 }}
                                    />
                                    <text
                                        x={(fromPos.x + toPos.x) / 2}
                                        y={(fromPos.y + toPos.y) / 2}
                                        className="node-label-txt"
                                        style={{ fill: (isActiveDown || isActiveUp) ? '#0ea5e9' : '#64748b', fontSize: '13px', fontWeight: 700, textAnchor: 'middle' }}
                                    >
                                        {conn.node}
                                    </text>
                                </g>
                            )
                        }

                        const start = getEdgePos(fromPos, fromW, 40, toPos, false)
                        const end = getEdgePos(toPos, toW, 40, fromPos, true, bundleOffset)

                        return (
                            <g key={`${conn.node}-${idx}`}>
                                <path
                                    d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
                                    markerEnd={`url(#arrow${isActive ? '-active' : ''})`}
                                    className={`map-line ${isActive ? 'active' : ''}`}
                                    style={{ strokeWidth: 2 }}
                                />
                                <text
                                    x={(start.x + end.x) / 2}
                                    y={(start.y + end.y) / 2 - 10}
                                    className="node-label-txt"
                                    style={{ fill: isActive ? '#0ea5e9' : '#64748b', fontSize: '13px', fontWeight: 700, textAnchor: 'middle' }}
                                >
                                    {conn.node}
                                </text>
                            </g>
                        )
                    })}

                    {/* Layer 2: Location boxes */}
                    {mapData.boxes.map(box => {
                        const pos = boxPositions[box.id] || { x: box.x, y: box.y }
                        const label = boxLabels[box.id] || box.defaultLabel
                        const width = Math.max(80, Math.min(150, label.length * 8 + 20))
                        const isActive = selectedNodes.some(n =>
                            routeOptions[n.node]?.details?.some(d =>
                                getLocationBoxId(d.from, n.node) === box.id ||
                                getLocationBoxId(d.to, n.node) === box.id
                            )
                        )

                        return (
                            <g
                                key={box.id}
                                transform={`translate(${pos.x - width / 2}, ${pos.y - 20})`}
                                onPointerDown={(e) => handlePointerDown(e, box.id)}
                                style={{ cursor: mapEditMode ? 'move' : 'default' }}
                            >
                                <rect
                                    width={width}
                                    height="40"
                                    rx="8"
                                    className={`map-node ${isActive ? 'active' : ''}`}
                                    style={{
                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                                        stroke: isActive ? '#0ea5e9' : '#cbd5e1',
                                        strokeWidth: isActive ? 2 : 1
                                    }}
                                />
                                <text
                                    x={width / 2}
                                    y="25"
                                    textAnchor="middle"
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        pointerEvents: 'none',
                                        fill: isActive ? '#0369a1' : '#334155'
                                    }}
                                >
                                    {label}
                                </text>

                                {mapEditMode && (
                                    <g
                                        transform={`translate(${width - 15}, 5)`}
                                        onClick={(e) => { e.stopPropagation(); renameBox(box.id); }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <circle r="8" fill="#f1f5f9" stroke="#cbd5e1" />
                                        <text y="3" textAnchor="middle" style={{ fontSize: 10 }}>✎</text>
                                    </g>
                                )}
                            </g>
                        )
                    })}

                    <text x="10" y="410" style={{ fontSize: 10, fill: '#94a3b8' }}>
                        {mapEditMode ? '💡 提示: 拖动方框调整位置，点击 ✎ 修改名称' : '节点: ' + Object.keys(routeOptions).sort().join(', ')}
                    </text>
                </svg>
            </div>

            <div className="route-flow">
                {selectedNodes.map((node, index) => {
                    const validation = validateSequence(index)
                    return (
                        <div key={node.id} className="section-container">

                            {index > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <ArrowDown size={32} color="#94a3b8" />
                                    {!validation.valid && <span className="connector-warning">{validation.msg}</span>}
                                </div>
                            )}

                            <div className="section-wrapper">
                                <div className="node-card glass" style={{ border: validation.valid ? '' : '2px solid #ef4444' }}>
                                    <span className="node-badge">Section {index + 1}</span>
                                    <button className="remove-btn" onClick={() => removeNode(node.id)} style={{ position: 'absolute', top: 15, right: 15, border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                        <Trash2 size={18} />
                                    </button>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div className="field-group">
                                            <label className="field-label">From → To</label>
                                            <select className="field-select" value={node.location} onChange={(e) => handleLocationChange(node.id, e.target.value)}>
                                                <option value="">Select Route</option>
                                                {(node.node ? routeOptions[node.node].locations : allPossibleLocations).map(loc => (
                                                    <option key={loc} value={loc}>{loc}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="field-group">
                                            <label className="field-label">Node</label>
                                            <select className="field-select" value={node.node} onChange={(e) => handleNodeChange(node.id, e.target.value)}>
                                                <option value="">Select Node</option>
                                                {Object.keys(routeOptions).map(n => {
                                                    const isAvailable = !node.location || routeOptions[n].locations.includes(node.location)
                                                    return <option key={n} value={n} disabled={!isAvailable}>{n}</option>
                                                })}
                                            </select>
                                        </div>
                                    </div>

                                    {node.fields.length > 0 && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                                            {node.fields.map(field => (
                                                <div className="field-group" key={field.name}>
                                                    <label className="field-label">{field.display_name}</label>
                                                    <ComboBox
                                                        value={node.inputs[field.name] || ''}
                                                        options={field.options || []}
                                                        onChange={(val) => handleInputChange(node.id, field.name, val)}
                                                        placeholder="输入或选择..."
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {node.breakdown && (
                                    <div className="section-breakdown glass">
                                        {node.node === 'E' ? (
                                            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', width: '100%' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>此节点不区分基础和可变费用</div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="breakdown-col">
                                                    <div className="breakdown-title">基础费用</div>
                                                    <div className="item-list">
                                                        {node.breakdown.base && node.breakdown.base.map((it, i) => (
                                                            <div key={i} className="merged-item">
                                                                <div className="merged-label">{it.name}</div>
                                                                <div className="merged-values">
                                                                    <div className="merged-row">{it.row1}</div>
                                                                    <div className="merged-row">{it.row2}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {(!node.breakdown.base || node.breakdown.base.length === 0) && <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No items</div>}
                                                    </div>
                                                </div>
                                                <div className="breakdown-col">
                                                    <div className="breakdown-title">可变费用</div>
                                                    <div className="item-list">
                                                        {node.breakdown.variable && node.breakdown.variable.map((it, i) => (
                                                            <div key={i} className="merged-item">
                                                                <div className="merged-label">{it.name}</div>
                                                                <div className="merged-values">
                                                                    <div className="merged-row">{it.row1}</div>
                                                                    <div className="merged-row">{it.row2}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {(!node.breakdown.variable || node.breakdown.variable.length === 0) && <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No items</div>}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}

                <button className="add-node-btn" onClick={addNode}>
                    <Plus size={24} />
                    <span>Add Destination / Section</span>
                </button>
            </div >

            <div style={{ textAlign: 'center', margin: '3rem 0' }}>
                <button className="btn-primary" onClick={calculate} disabled={loading || selectedNodes.length === 0 || selectedNodes.some((n, i) => !validateSequence(i).valid)}>
                    {loading ? 'Calculating...' : 'Run Total E2E Calculation'}
                </button>
            </div>

            {
                results && (
                    <div className="results-section">
                        {/* Section calculation status */}
                        {results.node_results && results.node_results.length > 0 && (
                            <div className="section-status-list glass">
                                <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#475569' }}>计算状态</div>
                                {results.node_results.map((nr, idx) => (
                                    <div key={idx} className="section-status-item">
                                        <span style={{ fontWeight: 600 }}>Section {idx + 1} ({nr.node}):</span>
                                        {nr.cost > 0 ? (
                                            <span className="status-success">✓ 成功 - HKD {nr.cost.toLocaleString()}</span>
                                        ) : (
                                            <>
                                                <span className="status-fail">✗ 失败</span>
                                                {nr.error && <span className="status-reason">原因: {nr.error}</span>}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="total-summary-card glass">
                            <div>
                                <div className="summary-label">AGGREGATED TOTAL E2E COST</div>
                                <div className="summary-value">HKD {results.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div>
                                <div className="summary-label">E2E Lead Time</div>
                                <div className="summary-value" style={{ whiteSpace: 'nowrap' }}>{results.total_lt}</div>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                logs.length > 0 && (
                    <div className="logs-section glass" style={{ marginTop: '2rem', padding: '1.5rem' }}>
                        <div
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => setShowLogs(!showLogs)}
                        >
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={20} /> Operation Logs
                            </h3>
                            {showLogs ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>

                        {showLogs && (
                            <div style={{ marginTop: '1rem', maxHeight: '400px', overflow: 'auto', background: '#0f172a', borderRadius: '0.75rem', padding: '1rem' }}>
                                <pre style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                    {logs.join('\n')}
                                </pre>
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    )
}

export default App
