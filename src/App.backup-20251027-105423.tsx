
import React, { useMemo, useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx-js-style'

type Estado = 'Colocada' | 'Libre'

type Cancion = {
  id: string
  titulo: string
  estado: Estado
  estilo?: string

  editorial?: string
  splitAutoria?: string   // multiline support
  tempoKey?: string
  vocalistaDemo?: string
  productoresDemo?: string
  fechaCreacion?: string
  letra?: string
  registrada?: boolean
  notas?: string
  linkMP3Demo?: string
  clienteObjetivo?: string
  sociedadGestion?: string
  duracion?: string

  // Para colocadas
  artista?: string
  fechaColocacion?: string
  fechaLanzamiento?: string
  ingresosAutoriaManuEditorial?: number
  porcentajeAutoriaManuEditorial?: number
  totalAutoriaGenerado?: number
  splitMaster?: string
  porcentajeRoyaltiesMasterManu?: number
  ingresosMasterManu?: number
  totalMasterGenerado?: number
  productoresFinales?: string
  contratoProduccion?: string
  contratosEdicion?: string
  linkStreaming?: string
  linkStemsMaster?: string
  isrc?: string
  iswc?: string
  linkMP3Master?: string
  editoriales?: string  // Múltiples editoriales
  propiedadMaster?: string
  contratoEdicionLibres?: string  // Para libres
}

function safeUUID(){ return (Date.now().toString(36)+Math.random().toString(36).slice(2,10)).toUpperCase() }

function useLocalStore(key: string, initial: Cancion[]) {
  const [data, setData] = useState<Cancion[]>(() => {
    try{ const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw) }catch{}; return initial
  })
  useEffect(()=>{ try{ localStorage.setItem(key, JSON.stringify(data)) }catch{} }, [key, data])
  return [data, setData] as const
}

function useLocalPreference<T>(key: string, initial: T) {
  const [data, setData] = useState<T>(() => {
    try{ const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw) }catch{}; return initial
  })
  useEffect(()=>{ try{ localStorage.setItem(key, JSON.stringify(data)) }catch{} }, [key, data])
  return [data, setData] as const
}

function currency(n?: number){ if(n==null||isNaN(n)) return '—'; return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n) }

function normalizeDropbox(url?: string){
  if(!url) return ''
  return url.replace('?dl=0','?raw=1').replace('&dl=0','&raw=1')
}

// Global audio player manager
let currentAudioElement: HTMLAudioElement | null = null
let currentAudioPlayerId: string | null = null

function pauseCurrentAudio(newPlayerId: string){
  if(currentAudioElement && !currentAudioElement.paused && currentAudioPlayerId !== newPlayerId){
    currentAudioElement.pause()
    currentAudioElement = null
    currentAudioPlayerId = null
  }
}

export default function App(){
  const [songs, setSongs] = useLocalStore('catalogo-bks-v4', [])
  const [tab, setTab] = useState<'libres'|'colocadas'>('libres')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Cancion | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [sortBy, setSortBy] = useLocalPreference<'nombre'|'fecha'|'estilo'>('catalogo-sort', 'nombre')
  const [showBackups, setShowBackups] = useState(false)
  const [importPreview, setImportPreview] = useState<{duplicates: string[], newSongs: Cancion[]} | null>(null)
  
  function clearAllSongs(){
    const confirmMsg = '¿Estás seguro de que quieres borrar TODAS las canciones?\n\nSe creará un backup automático que podrás restaurar.'
    if(confirm(confirmMsg)){
      // Crear backup automático con timestamp
      const timestamp = new Date().toISOString().split('T')[0]
      localStorage.setItem('catalogo-bks-v4-backup-'+timestamp, JSON.stringify(songs))
      
      // Limpiar las canciones actuales
      localStorage.removeItem('catalogo-bks-v4')
      setSongs([])
      setToast('Todas las canciones han sido borradas. Backup creado.')
      setTimeout(()=>setToast(null), 3000)
    }
  }
  
  function restoreFromBackup(){
    setShowBackups(true)
  }
  
  function getBackupList(){
    return Object.keys(localStorage)
      .filter(k => k.startsWith('catalogo-bks-v4-backup-'))
      .map(key => ({
        key,
        date: key.split('-').slice(-3).join('-'),
        data: JSON.parse(localStorage.getItem(key) || '[]')
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }
  
  function restoreBackup(backupKey: string, backupSongs: any[]){
    if(confirm(`¿Restaurar el backup del ${backupKey.split('-').slice(-3).join('-')} con ${backupSongs.length} canción(es)?\n\nSe sustituirán las canciones actuales.`)){
      setSongs(backupSongs)
      setShowBackups(false)
      setToast(`${backupSongs.length} canción(es) restauradas`)
      setTimeout(()=>setToast(null), 3000)
    }
  }
  
  function deleteBackup(backupKey: string, e: React.MouseEvent){
    e.stopPropagation()
    if(confirm('¿Eliminar este backup permanentemente?')){
      localStorage.removeItem(backupKey)
      setToast('Backup eliminado')
      setTimeout(()=>setToast(null), 2000)
      // Forzar re-render
      setShowBackups(false)
      setTimeout(()=>setShowBackups(true), 100)
    }
  }
  
  function confirmImport(allSongs: boolean){
    if(importPreview){
      if(allSongs){
        // Importar todas: sobreescribir duplicadas y añadir nuevas
        if(!confirm(`¿Confirma importar TODAS las canciones?\n\nLas ${importPreview.duplicates.length} duplicadas serán SOBRESCRITAS.\n\nEsto no se puede deshacer.`)){
          return
        }
        // Sobrescribir duplicadas y añadir nuevas
        const existingTitles = new Set(songs.map(s => s.titulo.toLowerCase()))
        const toOverwrite = importPreview.newSongs.filter(s => existingTitles.has(s.titulo.toLowerCase()))
        const newOnes = importPreview.newSongs.filter(s => !existingTitles.has(s.titulo.toLowerCase()))
        
        // Actualizar las existentes
        setSongs(prev => {
          const updated = prev.map(song => {
            const match = toOverwrite.find(n => n.titulo.toLowerCase() === song.titulo.toLowerCase())
            return match ? match : song
          })
          // Añadir las nuevas
          return [...newOnes, ...updated]
        })
        setToast(`${importPreview.newSongs.length} canción(es) importada(s) (${importPreview.duplicates.length} sobrescritas)`)
      } else {
        // Importar solo las no duplicadas
        const existingTitles = new Set(songs.map(s => s.titulo.toLowerCase()))
        const nonDuplicates = importPreview.newSongs.filter(s => !existingTitles.has(s.titulo.toLowerCase()))
        setSongs(prev => [...nonDuplicates, ...prev])
        setToast(`${nonDuplicates.length} canción(es) importada(s) (${importPreview.duplicates.length} duplicadas omitidas)`)
      }
      setTimeout(()=>setToast(null), 3000)
      setImportPreview(null)
    }
  }
  
  function cancelImport(){
    setImportPreview(null)
  }

  const filtered = useMemo(()=> songs.filter(s => s.titulo.toLowerCase().includes(query.toLowerCase())), [songs, query])
  const sorted = useMemo(()=>{
    const list = [...filtered]
    if(sortBy==='nombre'){
      return list.sort((a,b)=>a.titulo.localeCompare(b.titulo))
    }else if(sortBy==='fecha'){
      return list.sort((a,b)=>{
        const dateA = a.fechaCreacion||''
        const dateB = b.fechaCreacion||''
        return dateB.localeCompare(dateA)
      })
    }else if(sortBy==='estilo'){
      return list.sort((a,b)=>(a.estilo||'—').localeCompare(b.estilo||'—'))
    }
    return list
  }, [filtered, sortBy])
  const libres = sorted.filter(s => s.estado === 'Libre')
  const colocadas = sorted.filter(s => s.estado === 'Colocada')

  function newSong(){ const s: Cancion = { id:safeUUID(), titulo:'Nueva canción', estado:'Libre' }; setEditing(s); setOpen(true) }
  function removeSong(id:string){ 
    const song = songs.find(s => s.id === id)
    setSongs(prev=>prev.filter(p=>p.id!==id))
    if(song){
      setToast(`Canción "${song.titulo}" eliminada`)
      setTimeout(()=>setToast(null), 3000)
    }
  }

  function saveSong(next:Cancion){
    const final = { ...next }
    // Calcular totales solo si ambos valores existen y son diferentes de 0
    if(final.ingresosAutoriaManuEditorial && final.porcentajeAutoriaManuEditorial && final.porcentajeAutoriaManuEditorial > 0){
      final.totalAutoriaGenerado = Math.round(final.ingresosAutoriaManuEditorial / (final.porcentajeAutoriaManuEditorial/100))
    } else {
      final.totalAutoriaGenerado = undefined
    }
    if(final.ingresosMasterManu && final.porcentajeRoyaltiesMasterManu && final.porcentajeRoyaltiesMasterManu > 0){
      final.totalMasterGenerado = Math.round(final.ingresosMasterManu / (final.porcentajeRoyaltiesMasterManu/100))
    } else {
      final.totalMasterGenerado = undefined
    }
    setSongs(prev=>{ const i=prev.findIndex(p=>p.id===final.id); if(i==-1){ return [final, ...prev] } const c=[...prev]; c[i]=final; return c })
  }

  function importFromExcel(event: React.ChangeEvent<HTMLInputElement>){
    const file = event.target.files?.[0]
    if(!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Buscar hojas "Libres" y "Colocadas" (case insensitive)
        const libresSheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'libres')
        const colocadasSheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'colocadas')
        
        // Si no encuentra las hojas específicas, usar la primera hoja como antes (compatibilidad hacia atrás)
        const sheetNames = libresSheetName && colocadasSheetName 
          ? [libresSheetName, colocadasSheetName] 
          : [workbook.SheetNames[0]]
        
        const allRows: any[] = []
        
        for(const sheetName of sheetNames){
          const worksheet = workbook.Sheets[sheetName]
          
          // Convertir a JSON con headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
          
          if(jsonData.length < 2) continue
        
          // Headers son la primera fila
          const headers = (jsonData[0] as string[]).map(h => String(h))
          
          // Mapeo de columnas a campos
          const fieldMap: Record<string, keyof Cancion> = {
        'Título': 'titulo',
        'Estado': 'estado',
        'Estilo': 'estilo',
        'Fecha de creación': 'fechaCreacion',
        'Fecha creación': 'fechaCreacion',
        'Tempo/Key': 'tempoKey',
        'Tempo_Key': 'tempoKey',
        'Duración': 'duracion',
        'Letra': 'letra',
        '¿Registrada?': 'registrada',
        'Registrada': 'registrada',
        'Sociedad gestión': 'sociedadGestion',
        'Notas': 'notas',
        'Editorial': 'editorial',
        'Editoriales': 'editoriales',
        'Reparto': 'splitAutoria',
        'Reparto autoría': 'splitAutoria',
        'Vocalista demo': 'vocalistaDemo',
        'Productor/es': 'productoresDemo',
        'Productores demo': 'productoresDemo',
        'Cliente objetivo': 'clienteObjetivo',
        'Contrato edición': 'contratoEdicionLibres',
        'Link MP3 (Dropbox) - Demo': 'linkMP3Demo',
        'Link MP3 demo': 'linkMP3Demo',
        'Link MP3 Demo': 'linkMP3Demo',
        '% autoría Manu/editorial': 'porcentajeAutoriaManuEditorial',
        'Ingresos autoría Manu/editorial (€)': 'ingresosAutoriaManuEditorial',
        'Total autoría generado (€)': 'totalAutoriaGenerado',
        'Contratos de edición (URLs)': 'contratosEdicion',
        'Contratos edición': 'contratosEdicion',
        'Artista': 'artista',
        'Fecha lanzamiento': 'fechaLanzamiento',
        'Propiedad máster': 'propiedadMaster',
        'Reparto máster': 'splitMaster',
        '% royalties máster Manu': 'porcentajeRoyaltiesMasterManu',
        '% royalties máster': 'porcentajeRoyaltiesMasterManu',
        'Ingresos máster Manu (€)': 'ingresosMasterManu',
        'Total máster generado (€)': 'totalMasterGenerado',
        'Productores finales': 'productoresFinales',
        'Contrato producción (URL)': 'contratoProduccion',
        'Contrato producción': 'contratoProduccion',
        'Link streaming': 'linkStreaming',
        'Link stems/máster': 'linkStemsMaster',
        'Link stems': 'linkStemsMaster',
        'ISRC': 'isrc',
        'ISWC': 'iswc',
        'Link MP3 (Dropbox)': 'linkMP3Master',
        'Link MP3 máster (Dropbox)': 'linkMP3Master',
        'Link MP3 máster': 'linkMP3Master'
          }
          
          const newSongs: Cancion[] = []
          
          for(let i = 1; i < jsonData.length; i++){
            const row = jsonData[i] as any[]
            if(!row || row.length === 0) continue
            
            // Omitir fila si está completamente vacía
            const hasData = row.some((cell: any) => cell && String(cell).trim() !== '')
            if(!hasData) continue
            
            const song: any = { id: safeUUID() }
            
            headers.forEach((header, idx) => {
              const fieldName = fieldMap[header]
              if(fieldName) {
                const value = row[idx]
                
                // Verificar si el valor no está vacío o es 0
                const hasValue = value !== null && value !== undefined && value !== ''
                
                if(hasValue) {
                  if(fieldName === 'registrada'){
                    song[fieldName] = value === 'Sí' || value === 1 || value === '1' || value === 'true' || value === true
                  } else if(fieldName === 'porcentajeAutoriaManuEditorial' || fieldName === 'porcentajeRoyaltiesMasterManu' || fieldName === 'ingresosAutoriaManuEditorial' || fieldName === 'ingresosMasterManu' || fieldName === 'totalAutoriaGenerado' || fieldName === 'totalMasterGenerado'){
                    const numValue = Number(value)
                    song[fieldName] = !isNaN(numValue) ? numValue : undefined
                  } else {
                    song[fieldName] = String(value).trim() || undefined
                  }
                }
              }
            })
            
            // Asegurar que el estado existe
            if(!song.estado) song.estado = 'Libre'
            if(!song.titulo) song.titulo = 'Sin título'
            
            newSongs.push(song as Cancion)
          }
          
          allRows.push(...newSongs)
        }
        
        if(allRows.length > 0){
          // Detectar duplicados
          const existingTitles = new Set(songs.map(s => s.titulo.toLowerCase()))
          const duplicates = allRows
            .map(s => s.titulo)
            .filter(title => existingTitles.has(title.toLowerCase()))
          
          if(duplicates.length > 0){
            // Mostrar preview con duplicados
            setImportPreview({ duplicates: [...new Set(duplicates)], newSongs: allRows })
          } else {
            // Importar directamente si no hay duplicados
            setSongs(prev => [...allRows, ...prev])
            setToast(`${allRows.length} canción(es) importada(s)`)
            setTimeout(()=>setToast(null), 3000)
          }
        }
      } catch(err) {
        alert('Error al leer el archivo XLSX')
        console.error(err)
      }
    }
    
    reader.readAsArrayBuffer(file)
    event.target.value = ''
  }

  function exportToExcel(){
    
    // Headers para canciones Libres
    const headersLibres = [
      'Título', 'Estado', 'Estilo', 'Cliente objetivo', 'Fecha de creación', 'Tempo/Key', 
      'Duración', 'Letra', '¿Registrada?', 'Editorial', 'Contrato edición', 'Reparto', 
      'Vocalista demo', 'Productor/es', 'Link MP3 (Dropbox) - Demo', 'Notas'
    ]
    
    // Headers para canciones Colocadas
    const headersColocadas = [
      'Título', 'Estado', 'Artista', 'Fecha lanzamiento', 'Estilo', 'Fecha de creación', 
      'Tempo/Key', 'Duración', 'Letra', '¿Registrada?', 'Sociedad gestión', 'Editoriales', 
      'Reparto', '% autoría Manu/editorial', 'Ingresos autoría Manu/editorial (€)', 'Total autoría generado (€)', 
      'Contratos de edición (URLs)', 'Propiedad máster', '% royalties máster Manu', 
      'Ingresos máster Manu (€)', 'Total máster generado (€)', 'Productor/es', 
      'Contrato producción (URL)', 'Link stems/máster', 'ISRC', 'ISWC', 'Link MP3 (Dropbox)', 'Notas'
    ]
    
    // Separar canciones por estado y ordenar por título
    const libres = [...songs].filter(s => s.estado === 'Libre').sort((a, b) => a.titulo.localeCompare(b.titulo))
    const colocadas = [...songs].filter(s => s.estado === 'Colocada').sort((a, b) => a.titulo.localeCompare(b.titulo))
    
    // Función para crear hoja de Libres
    function createLibresSheet(){
      const rows = libres.map(c => [
        c.titulo || '',
        c.estado || '',
        c.estilo || '',
        c.clienteObjetivo || '',
        c.fechaCreacion || '',
        c.tempoKey || '',
        c.duracion || '',
        c.letra || '',
        c.registrada ? 'Sí' : 'No',
        c.editorial || '',
        c.contratoEdicionLibres || '',
        c.splitAutoria || '',
        c.vocalistaDemo || '',
        c.productoresDemo || '',
        c.linkMP3Demo || '',
        c.notas || ''
      ])
      
      const wsData = [headersLibres, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      
      const wscols = headersLibres.map(() => ({ wch: 15 }))
      ws['!cols'] = wscols
      
      // Aplicar formato
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      
      // Headers
      for(let C = 0; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
        if(!ws[cellAddress]) continue
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: 'BF9000' } },
          font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 12 },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'FFFFFF' } },
            bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
            left: { style: 'thin', color: { rgb: 'FFFFFF' } },
            right: { style: 'thin', color: { rgb: 'FFFFFF' } }
          }
        }
      }
      
      // Filas (color azul claro para Libres)
      for(let R = 1; R <= range.e.r; R++) {
        for(let C = 0; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
          if(!ws[cellAddress]) continue
          if(!ws[cellAddress].s) ws[cellAddress].s = {}
          ws[cellAddress].s = {
            ...ws[cellAddress].s,
            fill: { fgColor: { rgb: 'DCE6F1' } },
            alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: 'D0D0D0' } },
              bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
              left: { style: 'thin', color: { rgb: 'D0D0D0' } },
              right: { style: 'thin', color: { rgb: 'D0D0D0' } }
            }
          }
        }
      }
      
      return ws
    }
    
    // Función para crear hoja de Colocadas
    function createColocadasSheet(){
      const rows = colocadas.map(c => [
        c.titulo || '',
        c.estado || '',
        c.artista || '',
        c.fechaLanzamiento || '',
        c.estilo || '',
        c.fechaCreacion || '',
        c.tempoKey || '',
        c.duracion || '',
        c.letra || '',
        c.registrada ? 'Sí' : 'No',
        c.sociedadGestion || '',
        c.editoriales || '',
        c.splitAutoria || '',
        c.porcentajeAutoriaManuEditorial || '',
        c.ingresosAutoriaManuEditorial || '',
        c.totalAutoriaGenerado || '',
        c.contratosEdicion || '',
        c.propiedadMaster || '',
        c.porcentajeRoyaltiesMasterManu || '',
        c.ingresosMasterManu || '',
        c.totalMasterGenerado || '',
        c.productoresFinales || '',
        c.contratoProduccion || '',
        c.linkStemsMaster || '',
        c.isrc || '',
        c.iswc || '',
        c.linkMP3Master || '',
        c.notas || ''
      ])
      
      const wsData = [headersColocadas, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      
      const wscols = headersColocadas.map(() => ({ wch: 15 }))
      ws['!cols'] = wscols
      
      // Aplicar formato
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      
      // Headers
      for(let C = 0; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
        if(!ws[cellAddress]) continue
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: '4472C4' } },
          font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 12 },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'FFFFFF' } },
            bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
            left: { style: 'thin', color: { rgb: 'FFFFFF' } },
            right: { style: 'thin', color: { rgb: 'FFFFFF' } }
          }
        }
      }
      
      // Filas (color verde claro para Colocadas)
      for(let R = 1; R <= range.e.r; R++) {
        for(let C = 0; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
          if(!ws[cellAddress]) continue
          if(!ws[cellAddress].s) ws[cellAddress].s = {}
          ws[cellAddress].s = {
            ...ws[cellAddress].s,
            fill: { fgColor: { rgb: 'E2EFDA' } },
            alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: 'D0D0D0' } },
              bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
              left: { style: 'thin', color: { rgb: 'D0D0D0' } },
              right: { style: 'thin', color: { rgb: 'D0D0D0' } }
            }
          }
        }
      }
      
      return ws
    }
    
    // Crear workbook con dos hojas
    const wb = XLSX.utils.book_new()
    
    // Siempre crear ambas hojas, incluso si están vacías
    if(libres.length > 0) {
      const wsLibres = createLibresSheet()
      XLSX.utils.book_append_sheet(wb, wsLibres, 'Libres')
    } else {
      // Crear hoja vacía para Libres
      const wsLibresEmpty = XLSX.utils.aoa_to_sheet([headersLibres])
      const wscols = headersLibres.map(() => ({ wch: 15 }))
      wsLibresEmpty['!cols'] = wscols
      XLSX.utils.book_append_sheet(wb, wsLibresEmpty, 'Libres')
    }
    
    if(colocadas.length > 0) {
      const wsColocadas = createColocadasSheet()
      XLSX.utils.book_append_sheet(wb, wsColocadas, 'Colocadas')
    } else {
      // Crear hoja vacía para Colocadas
      const wsColocadasEmpty = XLSX.utils.aoa_to_sheet([headersColocadas])
      const wscols = headersColocadas.map(() => ({ wch: 15 }))
      wsColocadasEmpty['!cols'] = wscols
      XLSX.utils.book_append_sheet(wb, wsColocadasEmpty, 'Colocadas')
    }
    
    XLSX.writeFile(wb, `catalogo-bks-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div>
      <div className="header">
        <div className="container" style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
          <div className="brand">
            <img src="/logo.svg" alt="BKS Music" /><div className="title">Catálogo</div>
          </div>
          <div className="row" style={{gap:8}}>
            <input className="input" style={{width:260}} placeholder="Buscar…" value={query} onChange={e=>setQuery(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="container">
        <div style={{display:'flex', gap:12, alignItems:'center', fontSize:12, color:'var(--sub)', marginBottom:12}}>
          <span><span style={{fontWeight:600, color:'var(--text)'}}>{songs.length}</span> canciones</span>
          <span style={{margin:'0 4px'}}>•</span>
          <span>{libres.length} libres</span>
          <span style={{margin:'0 4px'}}>•</span>
          <span>{colocadas.length} colocadas</span>
        </div>

        <div className="tabs" style={{marginBottom:10}}>
          <div className={'tab '+(tab==='libres'?'active':'')} onClick={()=>setTab('libres')}>Libres</div>
          <div className={'tab '+(tab==='colocadas'?'active':'')} onClick={()=>setTab('colocadas')}>Colocadas</div>
        </div>

        <div style={{display:'flex', justifyContent:'flex-end', alignItems:'center', gap:8, marginBottom:8}}>
          <input type="file" accept=".xlsx,.xls" style={{display:'none'}} id="xlsx-import" onChange={importFromExcel} />
          <select className="input" value={sortBy} onChange={e=>setSortBy(e.target.value as 'nombre'|'fecha'|'estilo')} style={{width:'auto', maxWidth:200}}>
            <option value="nombre">Nombre (A-Z)</option>
            <option value="fecha">Fecha de creación</option>
            <option value="estilo">Estilo (A-Z)</option>
          </select>
          <button onClick={()=>document.getElementById('xlsx-import')?.click()} style={{background:'none', color:'white', border:'none', fontSize:10, fontWeight:100, cursor:'pointer', opacity:0.3, transition:'opacity 0.2s', paddingTop:4, marginTop:4}} onMouseEnter={e=>{e.currentTarget.style.opacity='0.6'}} onMouseLeave={e=>{e.currentTarget.style.opacity='0.3'}} title="Importar XLSX">↑</button>
          <button onClick={exportToExcel} style={{background:'none', color:'white', border:'none', fontSize:10, fontWeight:100, cursor:'pointer', opacity:0.3, transition:'opacity 0.2s', paddingTop:4, marginTop:4}} onMouseEnter={e=>{e.currentTarget.style.opacity='0.6'}} onMouseLeave={e=>{e.currentTarget.style.opacity='0.3'}} title="Exportar a Excel">↓</button>
          <button onClick={restoreFromBackup} style={{background:'none', color:'white', border:'none', fontSize:14, fontWeight:100, cursor:'pointer', opacity:0.3, transition:'opacity 0.2s', paddingTop:4, marginTop:4}} onMouseEnter={e=>{e.currentTarget.style.opacity='0.6'}} onMouseLeave={e=>{e.currentTarget.style.opacity='0.3'}} title="Restaurar backup">↺</button>
          <button onClick={clearAllSongs} style={{background:'none', color:'white', border:'none', fontSize:12, fontWeight:100, cursor:'pointer', opacity:0.3, transition:'opacity 0.2s', paddingTop:4, marginTop:4}} onMouseEnter={e=>{e.currentTarget.style.opacity='0.8'}} onMouseLeave={e=>{e.currentTarget.style.opacity='0.3'}} title="Borrar todas las canciones">🗑</button>
          <button onClick={newSong} style={{background:'none', color:'white', border:'none', fontSize:22, fontWeight:100, cursor:'pointer', opacity:0.4, transition:'opacity 0.2s', paddingTop:8, marginTop:4}} onMouseEnter={e=>{e.currentTarget.style.opacity='0.7'}} onMouseLeave={e=>{e.currentTarget.style.opacity='0.4'}} title="Nueva canción">+</button>
        </div>

        <div style={{display:tab==='libres' ? 'block' : 'none'}}>
          <List data={libres} onOpen={(c)=>{setEditing(c); setOpen(true)}} />
        </div>
        <div style={{display:tab==='colocadas' ? 'block' : 'none'}}>
          <List data={colocadas} onOpen={(c)=>{setEditing(c); setOpen(true)}} />
        </div>
      </div>

      {open && editing && <Detail cancion={editing} onClose={()=>setOpen(false)} onSave={(c)=>{saveSong(c); setOpen(false)}} onRemove={removeSong} />}
      
      {showBackups && (
        <div className="backdrop" onClick={()=>setShowBackups(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:600}}>
            <div className="modal-header">
              <h2>Backups disponibles</h2>
              <button className="btn ghost" style={{fontSize:12, padding:'6px 12px'}} onClick={()=>setShowBackups(false)}>Cerrar</button>
            </div>
            <div style={{padding:'20px 24px', maxHeight:'70vh', overflow:'auto'}}>
              {getBackupList().length === 0 ? (
                <p style={{textAlign:'center', opacity:0.6}}>No hay backups disponibles</p>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:8}}>
                  {getBackupList().map(backup => (
                    <div key={backup.key} onClick={()=>restoreBackup(backup.key, backup.data)} style={{
                      background:'rgba(255,255,255,0.03)',
                      border:'1px solid rgba(255,255,255,0.08)',
                      borderRadius:8,
                      padding:16,
                      cursor:'pointer',
                      transition:'all 0.2s'
                    }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.03)'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div>
                          <div style={{fontWeight:600, marginBottom:4}}>{backup.date}</div>
                          <div style={{fontSize:12, opacity:0.6}}>{backup.data.length} canción(es)</div>
                        </div>
                        <div style={{display:'flex', gap:8, alignItems:'center'}}>
                          <button className="btn" style={{fontSize:12, padding:'4px 12px'}} onClick={(e)=>{e.stopPropagation(); restoreBackup(backup.key, backup.data)}}>Restaurar</button>
                          <button className="btn ghost" style={{fontSize:12, padding:'4px 8px'}} onClick={(e)=>deleteBackup(backup.key, e)} title="Eliminar">🗑</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {importPreview && (
        <div className="backdrop" onClick={cancelImport}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500}}>
            <div className="modal-header">
              <h2>⚠️ Duplicados detectados</h2>
            </div>
            <div style={{padding:'20px 24px'}}>
              <p style={{marginBottom:16, opacity:0.8}}>
                Se encontraron {importPreview.duplicates.length} canción(es) con el mismo título que ya existen:
              </p>
              <div style={{
                background:'rgba(255,107,107,0.1)',
                border:'1px solid rgba(255,107,107,0.3)',
                borderRadius:8,
                padding:12,
                marginBottom:20,
                maxHeight:200,
                overflow:'auto'
              }}>
                {importPreview.duplicates.map((title, i) => (
                  <div key={i} style={{padding:'4px 0', fontSize:14}}>• {title}</div>
                ))}
              </div>
              <p style={{fontSize:13, opacity:0.7, marginBottom:20}}>
                Total de canciones en el archivo: {importPreview.newSongs.length}
              </p>
              <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <button style={{
                  fontSize:15,
                  padding:'14px 20px',
                  width:'100%',
                  fontWeight:500,
                  background:'rgba(255,255,255,0.95)',
                  color:'#1a1a1a',
                  border:'none',
                  borderRadius:8,
                  cursor:'pointer',
                  transition:'all 0.2s'
                }} onMouseEnter={e=>{e.currentTarget.style.background='#ffffff'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.95)'}} onClick={()=>confirmImport(false)}>
                  Importar solo nuevas ({importPreview.newSongs.length - importPreview.duplicates.length} canciones)
                </button>
                <button style={{
                  fontSize:15,
                  padding:'14px 20px',
                  width:'100%',
                  fontWeight:500,
                  background:'rgba(255,255,255,0.03)',
                  color:'rgba(255,255,255,0.9)',
                  border:'1px solid rgba(255,255,255,0.15)',
                  borderRadius:8,
                  cursor:'pointer',
                  transition:'all 0.2s'
                }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.03)'}} onClick={cancelImport}>
                  Cancelar
                </button>
                <button style={{
                  fontSize:11,
                  padding:'8px 12px',
                  width:'100%',
                  background:'rgba(255,107,107,0.08)',
                  border:'1px solid rgba(255,107,107,0.2)',
                  color:'rgba(255,107,107,0.9)',
                  borderRadius:6,
                  cursor:'pointer',
                  transition:'all 0.2s'
                }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,107,107,0.12)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,107,107,0.08)'}} onClick={()=>confirmImport(true)}>
                  Importar todas ({importPreview.newSongs.length} canciones, {importPreview.duplicates.length} sobrescribidas)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {toast && <Toast message={toast} />}
    </div>
  )
}

function List({ data, onOpen }:{ data:Cancion[]; onOpen:(c:Cancion)=>void }){
  return (
    <div className="card">
      <table>
        <thead><tr><th>Título</th><th>Estilo</th><th>Reproducir</th></tr></thead>
        <tbody>
          {data.map(c=>{
            const url = c.estado==='Colocada' ? c.linkMP3Master : c.linkMP3Demo
            const src = normalizeDropbox(url)
            return (
              <tr key={c.id}>
                <td><a href="#" onClick={(e)=>{e.preventDefault(); onOpen(c)}}>{c.titulo}</a></td>
                <td>{c.estilo || '—'}</td>
                <td className="audio">{src ? <AudioPlayer key={c.id} id={c.id} src={src} /> : <span className="muted">—</span>}</td>
              </tr>
            )
          })}
          {data.length===0 && <tr><td colSpan={3} className="muted">No hay canciones.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function AudioPlayer({ src, id }:{ src:string; id:string }){
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(()=>{
    const audio = audioRef.current
    if(!audio) return
    
    function handlePlay(){ 
      setPlaying(true)
      currentAudioElement = audio
      currentAudioPlayerId = id
    }
    function handlePause(){ 
      setPlaying(false)
      if(currentAudioPlayerId === id){
        currentAudioElement = null
        currentAudioPlayerId = null
      }
    }
    
    // Check if this audio is already playing
    if(audio === currentAudioElement){
      setPlaying(true)
    }
    
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handlePause)
    return ()=>{
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handlePause)
    }
  }, [id])

  function togglePlay(){
    if(audioRef.current){
      if(playing){ 
        audioRef.current.pause()
        currentAudioElement = null
        currentAudioPlayerId = null
      }else{ 
        pauseCurrentAudio(id)
        audioRef.current.play()
      }
    }
  }

  function handleSeek(e:React.ChangeEvent<HTMLInputElement>){
    if(audioRef.current){
      const newTime = parseFloat(e.target.value)
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  return (
    <div style={{display:'flex', alignItems:'center', gap:8, minWidth:200}}>
      <button onClick={togglePlay} style={{
        background:playing ? 'var(--accent)' : 'rgba(255,255,255,.08)',
        border:'none',
        width:32,
        height:32,
        borderRadius:6,
        color:'white',
        cursor:'pointer',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        fontSize:14,
        transition:'all 0.2s'
      }}>
        {playing ? '⏸' : '▶'}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 100}
        value={currentTime}
        onChange={handleSeek}
        style={{
          flex:1,
          height:4,
          background:`linear-gradient(to right, var(--accent) 0%, var(--accent) ${progress}%, rgba(255,255,255,.1) ${progress}%, rgba(255,255,255,.1) 100%)`,
          borderRadius:2,
          outline:'none',
          cursor:'pointer',
          WebkitAppearance:'none',
        }}
      />
      <div style={{fontSize:10, color:'var(--sub)', minWidth:50, textAlign:'right'}}>
        {Math.floor(currentTime/60)}:{String(Math.floor(currentTime%60)).padStart(2,'0')} / {Math.floor(duration/60)}:{String(Math.floor(duration%60)).padStart(2,'0')}
      </div>
      <a href={src} download style={{
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        width:28,
        height:28,
        borderRadius:6,
        background:'rgba(255,255,255,.08)',
        color:'white',
        cursor:'pointer',
        fontSize:14,
        textDecoration:'none',
        transition:'all 0.2s',
        opacity:0.8
      }} onMouseEnter={e=>{e.currentTarget.style.opacity='1'; e.currentTarget.style.background='rgba(255,255,255,.12)'}} onMouseLeave={e=>{e.currentTarget.style.opacity='0.8'; e.currentTarget.style.background='rgba(255,255,255,.08)'}}>
        ⬇
      </a>
      <audio ref={audioRef} src={src} onTimeUpdate={e=>setCurrentTime(e.currentTarget.currentTime)} onLoadedMetadata={e=>setDuration(e.currentTarget.duration)} />
    </div>
  )
}

function Field({label, children}:{label:string; children:React.ReactNode}){
  return (<div className="field"><div className="label">{label}</div>{children}</div>)
}

function ExpandText({value, onChange, placeholder}:{value?:string; onChange:(v:string)=>void; placeholder?:string}){
  const [open, setOpen] = useState(false)
  return (
    <div style={{position:'relative'}}>
      <textarea className="input textarea" rows={1} placeholder={placeholder} value={value||''} onChange={e=>onChange(e.target.value)} style={{paddingRight:'28px'}} />
      <button 
        onClick={()=>setOpen(true)} 
        style={{
          position:'absolute',
          right:2,
          top:6,
          background:'transparent',
          border:'none',
          color:'var(--sub)',
          fontSize:14,
          cursor:'pointer',
          padding:'2px 6px',
          opacity:0.6,
          transition:'opacity 0.2s',
          pointerEvents:'auto'
        }}
        onMouseEnter={e=>{e.currentTarget.style.opacity='1'}}
        onMouseLeave={e=>{e.currentTarget.style.opacity='0.6'}}
      >
        ✎
      </button>
      {open && (<div className="overlay" onClick={()=>setOpen(false)}>
        <div className="overlay-card" onClick={e=>e.stopPropagation()}>
          <div className="label">Editor de texto</div>
          <textarea value={value||''} onChange={e=>onChange(e.target.value)} className="input" style={{minHeight:'40vh'}} />
          <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
            <button className="btn ghost" onClick={()=>setOpen(false)}>Cerrar</button>
            <button className="btn" onClick={()=>setOpen(false)}>Guardar</button>
          </div>
        </div>
      </div>)}
    </div>
  )
}

function SplitAutoria({value, onChange}:{value?:string; onChange:(v:string)=>void}){
  const lines = (value||'').split('\n').filter(Boolean)
  return (
    <div>
      <textarea className="input textarea" rows={2} placeholder="Escribe 1 autor por línea:&#10;Manu 40%&#10;Javi 35%&#10;Peer 15%&#10;BKS 10%" value={value||''} onChange={e=>onChange(e.target.value)} />
      <div style={{marginTop:6}}>
        {lines.length>0 && <div className="muted" style={{marginBottom:6}}>Previsualización:</div>}
        {lines.map((l,i)=>(<span key={i} className="chip">{l}</span>))}
      </div>
    </div>
  )
}

function Detail({ cancion, onClose, onSave, onRemove }:{ cancion:Cancion; onClose:()=>void; onSave:(c:Cancion)=>void; onRemove:(id:string)=>void }){
  const [draft, setDraft] = useState<Cancion>({...cancion})
  function S<K extends keyof Cancion>(k:K, v:Cancion[K]){ setDraft(prev=>({...prev,[k]:v})) }

  const totalAut = React.useMemo(()=>{ 
    const i=Number(draft.ingresosAutoriaManuEditorial??0); 
    const p=Number(draft.porcentajeAutoriaManuEditorial??0); 
    if(!i || !p || p <= 0) return undefined; 
    return Math.round(i / (p/100)) 
  }, [draft.ingresosAutoriaManuEditorial, draft.porcentajeAutoriaManuEditorial])
  const totalMas = React.useMemo(()=>{ 
    const i=Number(draft.ingresosMasterManu??0); 
    const p=Number(draft.porcentajeRoyaltiesMasterManu??0); 
    if(!i || !p || p <= 0) return undefined; 
    return Math.round(i / (p/100)) 
  }, [draft.ingresosMasterManu, draft.porcentajeRoyaltiesMasterManu])

  function handleRemove(){
    if(confirm(`⚠️ ATENCIÓN: ¿Seguro que quieres borrar "${cancion.titulo}"?\n\nEsta acción no se puede deshacer.`)){
      try{
        onRemove(cancion.id)
        onClose()
      }catch(err){
        alert('Error al eliminar la canción')
      }
    }
  }

  useEffect(()=>{
    function handleEscape(e: KeyboardEvent){
      if(e.key === 'Escape'){
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return ()=>{ document.removeEventListener('keydown', handleEscape) }
  }, [onClose])

  return (
    <div className="backdrop" onClick={(e)=>{ if(e.target===e.currentTarget) onClose() }}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <header>
          <div style={{fontWeight:700}}>{draft.titulo}</div>
        </header>
        <div className="content">

          <div className="section">
            <h3>Datos generales</h3>
            <Field label="Título"><input className="input small" value={draft.titulo} onChange={e=>S('titulo', e.target.value)} /></Field>
            <Field label="Estado">
              <select className="input small" value={draft.estado} onChange={e=>S('estado', e.target.value as Estado)}>
                <option>Libre</option><option>Colocada</option>
              </select>
            </Field>
            {draft.estado==='Libre' ? (
              <>
                <Field label="Estilo"><input className="input small" value={draft.estilo||''} onChange={e=>S('estilo', e.target.value)} /></Field>
                <Field label="Cliente objetivo"><input className="input small" value={draft.clienteObjetivo||''} onChange={e=>S('clienteObjetivo', e.target.value)} /></Field>
                <Field label="Fecha de creación"><input type="date" className="input small" value={draft.fechaCreacion||''} onChange={e=>S('fechaCreacion', e.target.value)} /></Field>
                <Field label="Tempo/Key"><input className="input small" placeholder="100 BPM — A minor" value={draft.tempoKey||''} onChange={e=>S('tempoKey', e.target.value)} /></Field>
                <Field label="Duración"><input className="input small" placeholder="3:45" value={draft.duracion||''} onChange={e=>S('duracion', e.target.value)} /></Field>
                <Field label="Letra"><ExpandText value={draft.letra} onChange={(v)=>S('letra', v)} placeholder="Escribe la letra aquí" /></Field>
                <Field label="¿Registrada?"><input type="checkbox" checked={!!draft.registrada} onChange={e=>S('registrada', e.target.checked)} /></Field>
              </>
            ) : (
              <>
                <Field label="Artista"><input className="input small" value={draft.artista||''} onChange={e=>S('artista', e.target.value)} /></Field>
                <Field label="Fecha lanzamiento"><input type="date" className="input small" value={draft.fechaLanzamiento||''} onChange={e=>S('fechaLanzamiento', e.target.value)} /></Field>
                <Field label="Estilo"><input className="input small" value={draft.estilo||''} onChange={e=>S('estilo', e.target.value)} /></Field>
                <Field label="Fecha de creación"><input type="date" className="input small" value={draft.fechaCreacion||''} onChange={e=>S('fechaCreacion', e.target.value)} /></Field>
                <Field label="Tempo/Key"><input className="input small" placeholder="100 BPM — A minor" value={draft.tempoKey||''} onChange={e=>S('tempoKey', e.target.value)} /></Field>
                <Field label="Duración"><input className="input small" placeholder="3:45" value={draft.duracion||''} onChange={e=>S('duracion', e.target.value)} /></Field>
                <Field label="Letra"><ExpandText value={draft.letra} onChange={(v)=>S('letra', v)} placeholder="Escribe la letra aquí" /></Field>
                <Field label="¿Registrada?"><input type="checkbox" checked={!!draft.registrada} onChange={e=>S('registrada', e.target.checked)} /></Field>
                <Field label="Sociedad gestión"><input className="input small" value={draft.sociedadGestion||''} onChange={e=>S('sociedadGestion', e.target.value)} /></Field>
              </>
            )}
          </div>

          {draft.estado==='Libre' && (
            <div className="section">
              <h3>Demo / Pitch</h3>
              <Field label="Editorial"><input className="input small" value={draft.editorial||''} onChange={e=>S('editorial', e.target.value)} /></Field>
              <Field label="Contrato edición"><input className="input small" value={draft.contratoEdicionLibres||''} onChange={e=>S('contratoEdicionLibres', e.target.value)} /></Field>
              <Field label="Reparto"><SplitAutoria value={draft.splitAutoria} onChange={(v)=>S('splitAutoria', v)} /></Field>
              <Field label="Vocalista demo"><input className="input small" value={draft.vocalistaDemo||''} onChange={e=>S('vocalistaDemo', e.target.value)} /></Field>
              <Field label="Productor/es"><input className="input small" value={draft.productoresDemo||''} onChange={e=>S('productoresDemo', e.target.value)} /></Field>
              <Field label="Link MP3 (Dropbox)"><input className="input small" value={draft.linkMP3Demo||''} onChange={e=>S('linkMP3Demo', e.target.value)} placeholder="https://www.dropbox.com/... ?raw=1" /></Field>
              <Field label="Notas"><ExpandText value={draft.notas} onChange={(v)=>S('notas', v)} placeholder="Pitch + ideas internas" /></Field>
            </div>
          )}

          {draft.estado==='Colocada' && (
            <>
              <div className="section">
                <h3>Editoriales y Autoría</h3>
                <Field label="Editoriales"><input className="input small" value={draft.editoriales||''} onChange={e=>S('editoriales', e.target.value)} placeholder="Separar con comas" /></Field>
                <Field label="Reparto"><SplitAutoria value={draft.splitAutoria} onChange={(v)=>S('splitAutoria', v)} /></Field>
                <Field label="% autoría Manu/editorial (%)"><input type="text" className="input small" value={draft.porcentajeAutoriaManuEditorial ?? ''} onChange={e=>{const v=e.target.value; if(v===''||/^\d+(\.\d*)?$/.test(v)) S('porcentajeAutoriaManuEditorial', v===''?0:Number(v))}} /></Field>
                <Field label="Ingresos autoría Manu/editorial (€)"><input type="text" className="input small" value={draft.ingresosAutoriaManuEditorial ?? ''} onChange={e=>{const v=e.target.value; if(v===''||/^\d+(\.\d*)?$/.test(v)) S('ingresosAutoriaManuEditorial', v===''?0:Number(v))}} /></Field>
                <Field label="Total autoría generado (€)"><input className="input small" disabled value={ totalAut ?? '' } /></Field>
                <Field label="Contratos de edición (URLs)"><input className="input small" value={draft.contratosEdicion||''} onChange={e=>S('contratosEdicion', e.target.value)} placeholder="https://www.dropbox.com/..." /></Field>
              </div>

              <div className="section">
                <h3>Máster</h3>
                <Field label="Propiedad máster"><input className="input small" value={draft.propiedadMaster||''} onChange={e=>S('propiedadMaster', e.target.value)} /></Field>
                <Field label="Reparto máster"><input className="input small" value={draft.splitMaster||''} onChange={e=>S('splitMaster', e.target.value)} /></Field>
                <Field label="% royalties máster Manu (%)"><input type="text" className="input small" value={draft.porcentajeRoyaltiesMasterManu ?? ''} onChange={e=>{const v=e.target.value; if(v===''||/^\d+(\.\d*)?$/.test(v)) S('porcentajeRoyaltiesMasterManu', v===''?0:Number(v))}} /></Field>
                <Field label="Ingresos máster Manu (€)"><input type="text" className="input small" value={draft.ingresosMasterManu ?? ''} onChange={e=>{const v=e.target.value; if(v===''||/^\d+(\.\d*)?$/.test(v)) S('ingresosMasterManu', v===''?0:Number(v))}} /></Field>
                <Field label="Total máster generado (€)"><input className="input small" disabled value={ totalMas ?? '' } /></Field>
              </div>

              <div className="section">
                <h3>Producción y Distribución</h3>
                <Field label="Productor/es"><input className="input small" value={draft.productoresFinales||''} onChange={e=>S('productoresFinales', e.target.value)} /></Field>
                <Field label="Contrato producción (URL)"><input className="input small" value={draft.contratoProduccion||''} onChange={e=>S('contratoProduccion', e.target.value)} /></Field>
                <Field label="Link stems/máster"><input className="input small" value={draft.linkStemsMaster||''} onChange={e=>S('linkStemsMaster', e.target.value)} /></Field>
                <Field label="ISRC"><input className="input small" value={draft.isrc||''} onChange={e=>S('isrc', e.target.value)} /></Field>
                <Field label="ISWC"><input className="input small" value={draft.iswc||''} onChange={e=>S('iswc', e.target.value)} /></Field>
                <Field label="Link MP3 (Dropbox)"><input className="input small" value={draft.linkMP3Master||''} onChange={e=>S('linkMP3Master', e.target.value)} placeholder="https://www.dropbox.com/... ?raw=1" /></Field>
                <Field label="Notas"><ExpandText value={draft.notas} onChange={(v)=>S('notas', v)} placeholder="Notas" /></Field>
              </div>
            </>
          )}

          <div className="section">
            <div style={{borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:12, display:'flex', justifyContent:'flex-end', gap:8}}>
              <button className="btn ghost" style={{fontSize:12, padding:'6px 12px'}} onClick={onClose}>Cancelar</button>
              <button className="btn" style={{fontSize:12, padding:'6px 12px'}} onClick={()=>onSave({...draft, totalAutoriaGenerado:totalAut, totalMasterGenerado:totalMas})}>Guardar</button>
            </div>
          </div>

          <div style={{textAlign:'right', marginTop:4, opacity:0.4, transition:'opacity 0.2s'}} onMouseEnter={e=>{e.currentTarget.style.opacity='0.7'}} onMouseLeave={e=>{e.currentTarget.style.opacity='0.4'}}>
            <button style={{backgroundColor:'transparent', color:'#ff6b6b', border:'none', fontSize:14, padding:'4px', cursor:'pointer'}} onClick={handleRemove}>🗑️</button>
          </div>

        </div>
      </div>
    </div>
  )
}

function Toast({ message }:{ message:string }){
  return (
    <div style={{
      position:'fixed',
      bottom:20,
      right:20,
      backgroundColor:'#28a745',
      color:'white',
      padding:'12px 20px',
      borderRadius:8,
      boxShadow:'0 4px 12px rgba(0,0,0,0.15)',
      zIndex:10000,
      animation:'fadeIn 0.3s ease-in'
    }}>
      ✓ {message}
    </div>
  )
}
