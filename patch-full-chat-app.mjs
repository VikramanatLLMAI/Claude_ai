// Targeted patch script for full-chat-app.tsx
// Applies 6 surgical edits to integrate ArtifactPanelWrapper
import { readFileSync, writeFileSync } from 'fs'

const filePath = 'C:/Python_project/Antigravity_folder/chatbot_ui/components/full-chat-app.tsx'
let content = readFileSync(filePath, 'utf8')

// Track changes applied
const changes = []

// ============================================================================
// CHANGE 1: Update import - replace ArtifactPreview with ArtifactPanelWrapper
// ============================================================================
const oldImport = `import { ArtifactPreview } from "@/components/artifact-preview"`
const newImport = `import { ArtifactPanelWrapper } from "@/components/artifact-panel-wrapper"`

if (content.includes(oldImport)) {
  content = content.replace(oldImport, newImport)
  changes.push('1. Replaced ArtifactPreview import with ArtifactPanelWrapper import')
} else {
  console.error('ERROR: Could not find ArtifactPreview import')
  process.exit(1)
}

// ============================================================================
// CHANGE 2: Add artifactPanelMounted state after showArtifactPreview state
// ============================================================================
const oldState = `const [showArtifactPreview, setShowArtifactPreview] = useState(false)`
const newState = `const [showArtifactPreview, setShowArtifactPreview] = useState(false)
  const [artifactPanelMounted, setArtifactPanelMounted] = useState(false) // Stays true during exit animation for smooth unmount`

if (content.includes(oldState)) {
  content = content.replace(oldState, newState)
  changes.push('2. Added artifactPanelMounted state for delayed unmount')
} else {
  console.error('ERROR: Could not find showArtifactPreview state declaration')
  process.exit(1)
}

// ============================================================================
// CHANGE 3: In openArtifactPanel, also set artifactPanelMounted(true)
// ============================================================================
const oldOpenLine = `    setShowArtifactPreview(true)

    userClosedArtifactRef.current = false // Reset the manual close flag
  }, [setSidebarOpen]) // Removed showArtifactPreview - using ref instead`

const newOpenLine = `    setShowArtifactPreview(true)
    setArtifactPanelMounted(true)

    userClosedArtifactRef.current = false // Reset the manual close flag
  }, [setSidebarOpen]) // Removed showArtifactPreview - using ref instead`

if (content.includes(oldOpenLine)) {
  content = content.replace(oldOpenLine, newOpenLine)
  changes.push('3. Added setArtifactPanelMounted(true) in openArtifactPanel')
} else {
  console.error('ERROR: Could not find openArtifactPanel setShowArtifactPreview(true) block')
  process.exit(1)
}

// ============================================================================
// CHANGE 4: Modify closeArtifactPanel - don't immediately clear state
// Add handleArtifactExitComplete callback after it
// ============================================================================
const oldClose = `  // Close artifact and restore sidebar
  const closeArtifactPanel = useCallback(() => {
    userClosedArtifactRef.current = true // Mark as manually closed by user
    lastDetectedArtifactIdRef.current = null // Reset tracking
    manuallySelectedArtifactRef.current = false // Reset manual selection flag
    setShowArtifactPreview(false)
    setActiveArtifact(null)

    setSidebarOpen(true) // Expand sidebar
  }, [setSidebarOpen])`

const newClose = `  // Close artifact - starts exit animation (panel stays mounted until animation completes)
  const closeArtifactPanel = useCallback(() => {
    userClosedArtifactRef.current = true // Mark as manually closed by user
    lastDetectedArtifactIdRef.current = null // Reset tracking
    manuallySelectedArtifactRef.current = false // Reset manual selection flag
    setShowArtifactPreview(false) // Triggers exit animation via ArtifactPanelWrapper
    // Don't clear activeArtifact or unmount yet - wait for exit animation to complete
  }, [])

  // Called when artifact panel exit animation completes - safe to fully unmount
  const handleArtifactExitComplete = useCallback(() => {
    setArtifactPanelMounted(false)
    setActiveArtifact(null)
    setSidebarOpen(true) // Restore sidebar after panel is gone
  }, [setSidebarOpen])`

if (content.includes(oldClose)) {
  content = content.replace(oldClose, newClose)
  changes.push('4. Modified closeArtifactPanel for animated exit + added handleArtifactExitComplete')
} else {
  console.error('ERROR: Could not find closeArtifactPanel callback')
  process.exit(1)
}

// ============================================================================
// CHANGE 5: Update Panel defaultSize to use artifactPanelMounted
// ============================================================================
const oldDefaultSize = `<Panel defaultSize={showArtifactPreview ? 50 : 100} minSize={30}>`
const newDefaultSize = `<Panel defaultSize={artifactPanelMounted ? 50 : 100} minSize={30}>`

if (content.includes(oldDefaultSize)) {
  content = content.replace(oldDefaultSize, newDefaultSize)
  changes.push('5. Updated Panel defaultSize to use artifactPanelMounted instead of showArtifactPreview')
} else {
  console.error('ERROR: Could not find Panel defaultSize')
  process.exit(1)
}

// ============================================================================
// CHANGE 6: Replace artifact panel rendering block
// ============================================================================
const oldRender = `        {/* Resize Handle + Right Panel: Artifact Preview */}
        {showArtifactPreview && activeArtifact && (
          <>
            <PanelResizeHandle className="w-2 bg-border hover:bg-primary/20 transition-colors cursor-col-resize flex items-center justify-center">
              <div className="w-0.5 h-8 bg-muted-foreground/30 rounded-full" />
            </PanelResizeHandle>
            <Panel defaultSize={50} minSize={20}>
              <ArtifactPreview
                artifact={activeArtifact}
                artifacts={allArtifacts}
                currentIndex={activeArtifactIndex}
                isStreaming={isArtifactStreaming}
                onClose={closeArtifactPanel}
                onNavigate={navigateArtifact}
                onFetchFileContent={fetchFileContent}
                onFetchFileArrayBuffer={fetchFileArrayBuffer}
                fileContentCache={getFileContentCache}
              />
            </Panel>
          </>
        )}`

const newRender = `        {/* Resize Handle + Right Panel: Artifact Preview */}
        {/* Panel stays mounted during exit animation for smooth slide-out */}
        {artifactPanelMounted && activeArtifact && (
          <>
            <PanelResizeHandle className="w-2 bg-border hover:bg-primary/20 transition-colors cursor-col-resize flex items-center justify-center">
              <div className="w-0.5 h-8 bg-muted-foreground/30 rounded-full" />
            </PanelResizeHandle>
            <Panel defaultSize={50} minSize={20}>
              <ArtifactPanelWrapper
                artifact={activeArtifact}
                artifacts={allArtifacts}
                currentIndex={activeArtifactIndex}
                isStreaming={isArtifactStreaming}
                onClose={closeArtifactPanel}
                onNavigate={navigateArtifact}
                onFetchFileContent={fetchFileContent}
                onFetchFileArrayBuffer={fetchFileArrayBuffer}
                fileContentCache={getFileContentCache}
                isOpen={showArtifactPreview}
                onExitComplete={handleArtifactExitComplete}
              />
            </Panel>
          </>
        )}`

if (content.includes(oldRender)) {
  content = content.replace(oldRender, newRender)
  changes.push('6. Replaced ArtifactPreview with ArtifactPanelWrapper in render block')
} else {
  console.error('ERROR: Could not find artifact panel render block')
  process.exit(1)
}

// Write the patched file
writeFileSync(filePath, content, 'utf8')

console.log(`\nSuccessfully applied ${changes.length} changes to full-chat-app.tsx:\n`)
changes.forEach(c => console.log(`  ${c}`))
console.log('\nDone!')
