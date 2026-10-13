package dev.humaneye

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.editor.*
import com.intellij.openapi.editor.event.*
import com.intellij.openapi.editor.ex.FoldingListener
import com.intellij.openapi.editor.ex.FoldingModelEx
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.wm.WindowManager
import com.intellij.util.Alarm

class HumanEyeEditorListener : EditorFactoryListener {
    override fun editorCreated(event: EditorFactoryEvent) { HumanEyeEditors.get().attach(event.editor) }
    override fun editorReleased(event: EditorFactoryEvent) { HumanEyeEditors.get().detach(event.editor) }
}

@Service(Service.Level.APP)
class HumanEyeEditors : Disposable {
    private val sessions = mutableMapOf<Editor, Session>()
    fun attach(editor: Editor) {
        if (editor.project == null || editor.isDisposed || sessions.containsKey(editor)) return
        val session = Session(editor)
        sessions[editor] = session
        Disposer.register(this, session)
        session.schedule()
    }
    fun detach(editor: Editor) { sessions.remove(editor)?.let(Disposer::dispose) }
    fun refreshAll() {
        EditorFactory.getInstance().allEditors.forEach(::attach)
        sessions.values.forEach { it.schedule(true) }
    }
    override fun dispose() { sessions.clear() }

    private class Managed(val region: FoldRegion, val borrowed: Boolean, val placeholder: String, val expanded: Boolean)
    private class Session(private val editor: Editor) : Disposable {
        private val alarm = Alarm(Alarm.ThreadToUse.SWING_THREAD, this)
        private val managed = mutableListOf<Managed>()
        private var applying = false
        private var forceVisibility = false
        private var lastStamp = -1L
        init {
            editor.document.addDocumentListener(object : DocumentListener {
                override fun documentChanged(event: DocumentEvent) { schedule() }
            }, this)
            (editor.foldingModel as? FoldingModelEx)?.addListener(object : FoldingListener {
                override fun onFoldProcessingEnd() { if (!applying) schedule() }
            }, this)
        }
        fun schedule(force: Boolean = false) {
            forceVisibility = forceVisibility || force
            alarm.cancelAllRequests()
            alarm.addRequest({ refresh() }, 150)
        }
        private fun restore(item: Managed) {
            if (!item.region.isValid) return
            if (item.borrowed) {
                item.region.setPlaceholderText(item.placeholder)
                item.region.isExpanded = item.expanded
            } else editor.foldingModel.removeFoldRegion(item.region)
        }
        private fun refresh() {
            if (editor.isDisposed || editor.project?.isDisposed != false) return
            val document = editor.document
            val settings = HumanEyeSettings.get()
            val changed = lastStamp != document.modificationStamp
            val annotations = AnnotationParser.parse(document.text)
            applying = true
            try {
                editor.foldingModel.runBatchFoldingOperationDoNotCollapseCaret {
                    if (changed || !settings.state.enabled) {
                        managed.forEach(::restore)
                        managed.clear()
                    }
                    if (settings.state.enabled) for (annotation in annotations) {
                        val line = annotation.startLine - 1
                        val start = document.getLineStartOffset(line) + document.getText(com.intellij.openapi.util.TextRange(document.getLineStartOffset(line), document.getLineEndOffset(line))).takeWhile { it.isWhitespace() }.length
                        val end = document.getLineEndOffset(annotation.endLine - 1)
                        if (end <= start) continue
                        var item = managed.firstOrNull { it.region.isValid && it.region.startOffset == start && it.region.endOffset == end }
                        val fresh = item == null
                        if (item == null) {
                            val existing = editor.foldingModel.getFoldRegion(start, end)
                            val region = existing ?: editor.foldingModel.addFoldRegion(start, end, "@agent-context ${annotation.type} …") ?: continue
                            item = Managed(region, existing != null, region.placeholderText, region.isExpanded)
                            region.setPlaceholderText("@agent-context ${annotation.type} …")
                            managed.add(item)
                        }
                        if (fresh || forceVisibility) item.region.isExpanded = settings.visible(annotation.type)
                    }
                }
                lastStamp = document.modificationStamp
                forceVisibility = false
                editor.project?.let { WindowManager.getInstance().getStatusBar(it)?.updateWidget("HumanEye") }
            } finally { applying = false }
        }
        override fun dispose() {
            if (!editor.isDisposed) {
                applying = true
                editor.foldingModel.runBatchFoldingOperation { managed.forEach(::restore) }
            }
            managed.clear()
        }
    }
    companion object { fun get() = ApplicationManager.getApplication().getService(HumanEyeEditors::class.java) }
}
